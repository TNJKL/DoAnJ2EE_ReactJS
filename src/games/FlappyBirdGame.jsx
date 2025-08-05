import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const FlappyBirdGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const finalScoreRef = useRef(0); // Track điểm cuối cùng
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false); // Track đã lưu điểm chưa
  const [isSavingScore, setIsSavingScore] = useState(false); // Track đang lưu điểm

  // Game constants
  const canvasWidth = 400;
  const canvasHeight = 600;
  const gravity = 0.4; // Giảm từ 0.5 xuống 0.4
  const jumpForce = -7; // Giảm từ -10 xuống -7 (nhảy thấp hơn)
  const pipeWidth = 60;
  const pipeGap = 180; // Tăng từ 150 lên 180 (khe hở rộng hơn)
  const pipeSpeed = 1.5; // Giảm từ 2 xuống 1.5 (ống di chuyển chậm hơn)

  // Game state
  const [bird, setBird] = useState({ x: 100, y: 250, velocity: 0 }); // Giảm y từ 300 xuống 250
  const [pipes, setPipes] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [scoreEffect, setScoreEffect] = useState(false); // Hiệu ứng khi đạt điểm

  // Thêm refs cho ảnh
  const birdImg = useRef(null);
  const pipeImg = useRef(null);
  const groundImg = useRef(null);
  const cloudImg = useRef(null);
  const backgroundImg = useRef(null);
  const audioContextRef = useRef(null);

  // Lấy gameId từ URL và khởi tạo game
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const gameIdFromUrl = pathParts[pathParts.length - 1];
    setGameId(gameIdFromUrl);
    
    // Lấy username từ localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUsername(userData.username);
    }

    // Load game state từ localStorage để không bị reset
    const savedGameState = localStorage.getItem(`flappyBirdGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        // Chỉ load state nếu game chưa kết thúc và không quá cũ (24h)
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setScore(gameState.score || 0);
          setBird(gameState.bird || { x: 100, y: 300, velocity: 0 });
          setPipes(gameState.pipes || []);
          setGameRunning(gameState.gameRunning || false);
          setGamePaused(gameState.gamePaused || false);
          setGameOver(gameState.gameOver || false);
          setGameStarted(gameState.gameStarted || false);
        } else {
          // Nếu game đã kết thúc hoặc quá cũ, reset về default
          resetToDefault();
        }
      } catch (error) {
        console.log('Error loading game state:', error);
        resetToDefault();
      }
    } else {
      resetToDefault();
    }
    
    setIsInitialized(true);
  }, []);

  const resetToDefault = () => {
    setScore(0);
    setBird({ x: 100, y: 250, velocity: 0 }); // Cập nhật vị trí bắt đầu
    setPipes([]);
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setGameStarted(false);
    setScoreEffect(false);
  };

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        bird,
        pipes,
        gameRunning,
        gamePaused,
        gameOver,
        gameStarted,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`flappyBirdGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, bird, pipes, gameRunning, gamePaused, gameOver, gameStarted, gameId, isInitialized]);

  // Load high score từ database
  useEffect(() => {
    if (gameId && username && isInitialized) {
      loadHighScore();
    }
  }, [gameId, username, isInitialized]);

  const loadHighScore = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/user/games/${gameId}/score?username=${username}`);
      setHighScore(response.data.highScore || 0);
    } catch (error) {
      console.log('No previous high score found');
      setHighScore(0);
    }
  };

  const saveHighScore = async (newScore) => {
    // Tránh gửi nhiều request cùng lúc
    if (isSavingScore) {
      console.log('Already saving score, skipping...');
      return { newHighScore: false };
    }
    
    try {
      setIsSavingScore(true);
      console.log('Attempting to save score:', newScore);
      
      const response = await axios.post(`http://localhost:8080/api/user/games/${gameId}/score`, {
        score: newScore,
        username: username
      });
      console.log('High score save response:', response.data);
      
      // Cập nhật high score từ response nếu có
      if (response.data.newHighScore) {
        setHighScore(response.data.newHighScore);
        console.log('New high score updated:', response.data.newHighScore);
      }
      return response.data;
    } catch (error) {
      console.error('Error saving high score:', error);
      return { newHighScore: false };
    } finally {
      setIsSavingScore(false);
    }
  };

  // Generate new pipe
  const generatePipe = useCallback(() => {
    const gapY = Math.random() * (canvasHeight - pipeGap - 100) + 50;
    return {
      x: canvasWidth,
      gapY: gapY,
      passed: false
    };
  }, []);

  // Check collision
  const checkCollision = useCallback((bird, pipes) => {
    // Check ground collision
    if (bird.y + 20 > canvasHeight || bird.y < 0) {
      return true;
    }

    // Check pipe collision
    for (let pipe of pipes) {
      if (bird.x + 20 > pipe.x && bird.x < pipe.x + pipeWidth) {
        if (bird.y < pipe.gapY || bird.y + 20 > pipe.gapY + pipeGap) {
          return true;
        }
      }
    }
    return false;
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setBird(prevBird => {
      const newBird = {
        ...prevBird,
        velocity: prevBird.velocity + gravity,
        y: prevBird.y + prevBird.velocity
      };

      // Check collision
      if (checkCollision(newBird, pipes)) {
        console.log('Game over - collision detected');
        setGameOver(true);
        setGameRunning(false);
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
        
        // Chỉ lưu điểm khi game kết thúc và có điểm > 0 và chưa lưu
        if (finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
          console.log('Saving final score:', finalScoreRef.current);
          setHasSavedScore(true); // Đánh dấu đã lưu
          // Đợi một chút để đảm bảo score đã được cập nhật hoàn toàn
          setTimeout(() => {
            saveHighScore(finalScoreRef.current).then(() => {
              // Gọi callback để refresh leaderboard
              if (onGameEnd) {
                onGameEnd();
              }
            });
          }, 200); // Tăng thời gian chờ lên 200ms
        }
        
        return prevBird;
      }

      return newBird;
    });

    setPipes(prevPipes => {
      let newPipes = prevPipes.map(pipe => ({
        ...pipe,
        x: pipe.x - pipeSpeed
      })).filter(pipe => pipe.x + pipeWidth > 0);

      // Generate new pipe
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < canvasWidth - 300) { // Tăng từ 200 lên 300
        newPipes.push(generatePipe());
      }

      // Check score
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
          pipe.passed = true;
          setScore(prev => {
            const newScore = prev + 10; // Tăng từ 1 lên 10 điểm
            finalScoreRef.current = newScore; // Cập nhật điểm cuối cùng
            if (newScore > highScore) {
              setHighScore(newScore);
            }
            // Hiệu ứng khi đạt điểm
            setScoreEffect(true);
            setTimeout(() => setScoreEffect(false), 300);
            return newScore;
          });
        }
      });

      return newPipes;
    });
  }, [gameRunning, gamePaused, pipes, bird, checkCollision, generatePipe, highScore, hasSavedScore, isSavingScore, onGameEnd]);

  // Start game loop
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(gameLoop, 16); // ~60 FPS
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, gamePaused, gameLoop]);

  // Khởi tạo audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Load ảnh chim, ống cống, mặt đất, mây và background
  useEffect(() => {
    birdImg.current = new window.Image();
    birdImg.current.src = 'https://www.pngmart.com/files/12/Flappy-Bird-Logo-PNG-Pic.png';
    
    pipeImg.current = new window.Image();
    pipeImg.current.src = 'https://www.pngkey.com/png/full/183-1831473_flappy-bird-pipe-png-flappy-bird-pipe-transparent.png';
    
    groundImg.current = new window.Image();
    groundImg.current.src = 'https://www.pikpng.com/pngl/b/47-474860_ground-flappy-bird-ground-scratch-clipart.png';
    
    cloudImg.current = new window.Image();
    cloudImg.current.src = 'https://opengameart.org/sites/default/files/SingleCloud_0.png';
    
    backgroundImg.current = new window.Image();
    backgroundImg.current.src = 'https://opengameart.org/sites/default/files/fondo.png';
  }, []);

  // Âm thanh giống game gốc
  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'score') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    }
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ([' ', 'Space', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      if (e.key === ' ' || e.key === 'Space' || e.key === 'ArrowUp') {
        if (!gameStarted) {
          setGameStarted(true);
          setGameRunning(true);
        }
        
        if (gameRunning && !gamePaused) {
          setBird(prev => ({
            ...prev,
            velocity: jumpForce
          }));
          playSound('jump');
        }
      }

      if (e.key === 'p' || e.key === 'P') {
        if (gameRunning) {
          setGamePaused(prev => !prev);
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        restartGame();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameRunning, gameOver, gameStarted, jumpForce, playSound]);

  // Định nghĩa gameLoopWithSound ở ngoài useEffect
  const gameLoopWithSound = useCallback(() => {
    if (!gameRunning || gamePaused) return;
    setBird(prevBird => {
      const newBird = {
        ...prevBird,
        velocity: prevBird.velocity + gravity,
        y: prevBird.y + prevBird.velocity
      };
      if (checkCollision(newBird, pipes)) {
        setGameOver(true);
        setGameRunning(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        playSound('hit');
        if (finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
          setHasSavedScore(true);
          setTimeout(() => {
            saveHighScore(finalScoreRef.current).then(() => {
              if (onGameEnd) onGameEnd();
            });
          }, 200);
        }
        return prevBird;
      }
      return newBird;
    });
    setPipes(prevPipes => {
      let newPipes = prevPipes.map(pipe => ({ ...pipe, x: pipe.x - pipeSpeed })).filter(pipe => pipe.x + pipeWidth > 0);
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < canvasWidth - 300) {
        newPipes.push(generatePipe());
      }
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
          pipe.passed = true;
          setScore(prev => {
            const newScore = prev + 10;
            finalScoreRef.current = newScore;
            if (newScore > highScore) setHighScore(newScore);
            setScoreEffect(true);
            setTimeout(() => setScoreEffect(false), 300);
            playSound('score');
            return newScore;
          });
        }
      });
      return newPipes;
    });
  }, [gameRunning, gamePaused, pipes, bird, checkCollision, generatePipe, highScore, hasSavedScore, isSavingScore, onGameEnd, playSound]);

  // Sửa useEffect chỉ gọi setInterval với gameLoopWithSound
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(gameLoopWithSound, 16); // ~60 FPS
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, gamePaused, gameLoopWithSound]);

  // Sửa useEffect vẽ canvas: thêm background, mây và mặt đất
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Vẽ background
    if (backgroundImg.current && backgroundImg.current.complete) {
      ctx.drawImage(backgroundImg.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Vẽ mây (3-5 đám mây di chuyển)
    if (cloudImg.current && cloudImg.current.complete) {
      for (let i = 0; i < 4; i++) {
        const cloudX = (Date.now() * 0.02 + i * 150) % (canvas.width + 100) - 50;
        const cloudY = 50 + Math.sin(Date.now() * 0.001 + i) * 20;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(cloudImg.current, cloudX, cloudY, 60, 40);
      }
      ctx.globalAlpha = 1;
    }
    
    // Vẽ pipes bằng ảnh
    pipes.forEach(pipe => {
      if (pipeImg.current && pipeImg.current.complete) {
        // Ống trên
        ctx.save();
        ctx.translate(pipe.x, pipe.gapY);
        ctx.scale(1, -1);
        ctx.drawImage(pipeImg.current, 0, 0, pipeWidth, pipe.gapY);
        ctx.restore();
        // Ống dưới
        ctx.drawImage(pipeImg.current, pipe.x, pipe.gapY + pipeGap, pipeWidth, canvas.height - pipe.gapY - pipeGap);
      } else {
        // Fallback: vẽ màu
        ctx.fillStyle = '#228B22';
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
        ctx.fillRect(pipe.x, pipe.gapY + pipeGap, pipeWidth, canvas.height - pipe.gapY - pipeGap);
      }
    });
    
    // Vẽ chim bằng ảnh
    if (birdImg.current && birdImg.current.complete) {
      ctx.drawImage(birdImg.current, bird.x, bird.y, 34, 24);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(bird.x, bird.y, 20, 20);
      ctx.fillStyle = '#000';
      ctx.fillRect(bird.x + 15, bird.y + 5, 3, 3);
    }
    
    // Vẽ mặt đất bằng ảnh
    if (groundImg.current && groundImg.current.complete) {
      ctx.drawImage(groundImg.current, 0, canvas.height - 40, canvas.width, 40);
    } else {
      ctx.fillStyle = '#8FBC8F';
      ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    }
  }, [bird, pipes]);

  const restartGame = () => {
    setBird({ x: 100, y: 250, velocity: 0 }); // Cập nhật vị trí bắt đầu
    setPipes([]);
    setScore(0);
    finalScoreRef.current = 0; // Reset điểm cuối cùng
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setGameStarted(false);
    setHasSavedScore(false); // Reset trạng thái lưu điểm
    setIsSavingScore(false); // Reset trạng thái đang lưu
    setScoreEffect(false);
    
    // Clear saved game state
    if (gameId) {
      localStorage.removeItem(`flappyBirdGame_${gameId}`);
    }
  };

  const handleCanvasClick = () => {
    setIsFocused(true);
    canvasRef.current?.focus();
  };

  const handleCanvasBlur = () => {
    setIsFocused(false);
  };

  // Sửa handleJump để phát âm thanh
  const handleJump = () => {
    if (gameOver) return;
    if (!gameStarted) {
      setGameStarted(true);
      setGameRunning(true);
    }
    if (gameRunning && !gamePaused) {
      setBird(prev => ({ ...prev, velocity: jumpForce }));
      playSound('jump');
    }
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#FFD700', mb: 2 }}>
        🐦 Flappy Bird
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography 
          variant="h6" 
          component="span"
          sx={{
            color: scoreEffect ? '#FFD700' : 'inherit',
            transform: scoreEffect ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.3s ease',
            fontWeight: scoreEffect ? 'bold' : 'normal'
          }}
        >
          Điểm: {score}
        </Typography>
        <Typography variant="h6" component="span">
          Điểm cao nhất: {highScore}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: isFocused ? '3px solid #FFD700' : '3px solid #666',
            borderRadius: '10px',
            background: '#87CEEB',
            cursor: 'pointer',
            outline: 'none'
          }}
          tabIndex={0}
          onClick={handleJump}
          onBlur={handleCanvasBlur}
        />
        
        {!gameStarted && !gameOver && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: 3,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '300px'
            }}
          >
            <Typography variant="h6" gutterBottom>
              {isFocused ? 'Nhấn Space hoặc Click để bắt đầu' : 'Click vào game để bắt đầu'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Space/Click để bay lên
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Mỗi ống vượt qua: +10 điểm
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              P để tạm dừng
            </Typography>
            <Typography variant="body2">
              R để chơi lại
            </Typography>
          </Box>
        )}
        
        {gameOver && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: 3,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '300px'
            }}
          >
            <Typography variant="h5" gutterBottom>Game Over!</Typography>
            <Typography variant="body1" gutterBottom>
              Điểm của bạn: {score}
            </Typography>
            {score > highScore && (
              <Typography variant="body2" sx={{ color: '#FFD700', mb: 2 }}>
                🎉 Điểm cao mới!
              </Typography>
            )}
            <Button 
              variant="contained" 
              onClick={restartGame}
              sx={{ mt: 1 }}
            >
              Chơi lại
            </Button>
          </Box>
        )}

        {gamePaused && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: 2,
              borderRadius: 1
            }}
          >
            <Typography variant="h6">Tạm dừng</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {isFocused ? '✅ Game đã sẵn sàng! Dùng: Space/Click | P | R' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
      </Box>
    </Box>
  );
};

export default FlappyBirdGame; 