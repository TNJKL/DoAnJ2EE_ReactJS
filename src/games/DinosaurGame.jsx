import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

// Error Boundary Component
class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="h6" color="error" gutterBottom>
            Có lỗi xảy ra trong game
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Vui lòng thử tải lại trang
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Tải lại trang
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

const DinosaurGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const finalScoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Game constants
  const canvasWidth = 800;
  const canvasHeight = 300;
  const groundY = 250;
  const dinoWidth = 60;
  const dinoHeight = 60;
  const gravity = 0.8;
  const jumpForce = -15;
  const gameSpeed = 6;

  // Game state
  const [dino, setDino] = useState({ x: 50, y: groundY - dinoHeight, velocity: 0, isJumping: false, isDucking: false });
  const [obstacles, setObstacles] = useState([]);
  const [clouds, setClouds] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [scoreEffect, setScoreEffect] = useState(false);

  // Image refs
  const dinoRunImg = useRef(null);
  const dinoDuckImg = useRef(null);
  const dinoDeadImg = useRef(null);
  const cactusSmallImg = useRef(null);
  const cactusLargeImg = useRef(null);
  const pterodactylImg = useRef(null);
  const cloudImg = useRef(null);
  const groundImg = useRef(null);
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

    // Load game state từ localStorage
    const savedGameState = localStorage.getItem(`dinosaurGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setScore(gameState.score || 0);
          setDino(gameState.dino || { x: 50, y: groundY - dinoHeight, velocity: 0, isJumping: false, isDucking: false });
          setObstacles(gameState.obstacles || []);
          setClouds(gameState.clouds || []);
          setGameRunning(gameState.gameRunning || false);
          setGamePaused(gameState.gamePaused || false);
          setGameOver(gameState.gameOver || false);
          setGameStarted(gameState.gameStarted || false);
        } else {
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
    setDino({ x: 50, y: groundY - dinoHeight, velocity: 0, isJumping: false, isDucking: false });
    setObstacles([]);
    setClouds([]);
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setGameStarted(false);
    setScoreEffect(false);
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        dino,
        obstacles,
        clouds,
        gameRunning,
        gamePaused,
        gameOver,
        gameStarted,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`dinosaurGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, dino, obstacles, clouds, gameRunning, gamePaused, gameOver, gameStarted, gameId, isInitialized]);

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

  // Generate obstacles
  const generateObstacle = useCallback(() => {
    const types = ['cactus-small', 'cactus-large', 'pterodactyl'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obstacle = {
      x: canvasWidth,
      type: type,
      passed: false
    };

    if (type === 'pterodactyl') {
      obstacle.y = groundY - 80 - Math.random() * 60; // Bay ở độ cao khác nhau
      obstacle.width = 60;
      obstacle.height = 40;
    } else {
      obstacle.y = groundY - (type === 'cactus-large' ? 80 : 60);
      obstacle.width = type === 'cactus-large' ? 40 : 30;
      obstacle.height = type === 'cactus-large' ? 80 : 60;
    }

    return obstacle;
  }, []);

  // Generate clouds
  const generateCloud = useCallback(() => {
    return {
      x: canvasWidth,
      y: Math.random() * 100 + 20,
      speed: Math.random() * 2 + 1
    };
  }, []);

  // Check collision
  const checkCollision = useCallback((dino, obstacles) => {
    for (let obstacle of obstacles) {
      const dinoRight = dino.x + dinoWidth;
      const dinoBottom = dino.y + dinoHeight;
      const obstacleRight = obstacle.x + obstacle.width;
      const obstacleBottom = obstacle.y + obstacle.height;

      if (dino.x < obstacleRight && dinoRight > obstacle.x &&
          dino.y < obstacleBottom && dinoBottom > obstacle.y) {
        return true;
      }
    }
    return false;
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setDino(prevDino => {
      let newDino = { ...prevDino };
      
      // Apply gravity
      if (newDino.isJumping) {
        newDino.velocity += gravity;
        newDino.y += newDino.velocity;
        
        // Check if landed
        if (newDino.y >= groundY - dinoHeight) {
          newDino.y = groundY - dinoHeight;
          newDino.velocity = 0;
          newDino.isJumping = false;
        }
      }

      // Check collision
      if (checkCollision(newDino, obstacles)) {
        console.log('Game over - collision detected');
        setGameOver(true);
        setGameRunning(false);
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
        
        playSound('hit'); // Phát âm thanh khi game over
        
        if (finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
          console.log('Saving final score:', finalScoreRef.current);
          setHasSavedScore(true);
          setTimeout(() => {
            saveHighScore(finalScoreRef.current).then(() => {
              if (onGameEnd) {
                onGameEnd();
              }
            });
          }, 200);
        }
        
        return prevDino;
      }

      return newDino;
    });

    setObstacles(prevObstacles => {
      let newObstacles = prevObstacles.map(obstacle => ({
        ...obstacle,
        x: obstacle.x - gameSpeed
      })).filter(obstacle => obstacle.x + obstacle.width > 0);

      // Generate new obstacle
      if (newObstacles.length === 0 || newObstacles[newObstacles.length - 1].x < canvasWidth - 300) {
        newObstacles.push(generateObstacle());
      }

      // Check score
      newObstacles.forEach(obstacle => {
        if (!obstacle.passed && obstacle.x + obstacle.width < dino.x) {
          obstacle.passed = true;
          setScore(prev => {
            const newScore = prev + 10;
            finalScoreRef.current = newScore;
            if (newScore > highScore) {
              setHighScore(newScore);
            }
            setScoreEffect(true);
            setTimeout(() => setScoreEffect(false), 300);
            playSound('score'); // Phát âm thanh khi đạt điểm
            return newScore;
          });
        }
      });

      return newObstacles;
    });

    setClouds(prevClouds => {
      let newClouds = prevClouds.map(cloud => ({
        ...cloud,
        x: cloud.x - cloud.speed
      })).filter(cloud => cloud.x + 60 > 0);

      // Generate new cloud
      if (Math.random() < 0.02) {
        newClouds.push(generateCloud());
      }

      return newClouds;
    });
  }, [gameRunning, gamePaused, obstacles, dino, checkCollision, generateObstacle, generateCloud, highScore, hasSavedScore, isSavingScore, onGameEnd]);

  // Start game loop
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(gameLoop, 16);
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

  // Load images với error handling
  useEffect(() => {
    const loadImage = (imgRef, src, fallbackSrc = null) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        imgRef.current = img;
      };
      
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        if (fallbackSrc) {
          const fallbackImg = new window.Image();
          fallbackImg.crossOrigin = 'anonymous';
          fallbackImg.onload = () => {
            imgRef.current = fallbackImg;
          };
          fallbackImg.onerror = () => {
            console.warn(`Failed to load fallback image: ${fallbackSrc}`);
            imgRef.current = null;
          };
          fallbackImg.src = fallbackSrc;
        } else {
          imgRef.current = null;
        }
      };
      
      img.src = src;
    };

         // Load dino images với fallback
     loadImage(dinoRunImg, 
       'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Chrome_T-Rex_Left_Run.webp/88px-Chrome_T-Rex_Left_Run.webp.png',
       'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=88&h=88&fit=crop'
     );
     
     loadImage(dinoDuckImg, 
       'https://upload.wikimedia.org/wikipedia/commons/c/cd/Chrome_T-Rex_Right_Duck.png',
       'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=118&h=118&fit=crop'
     );
    
         loadImage(dinoDeadImg, 
       'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Dead_Chrome_T-Rex.webp/88px-Dead_Chrome_T-Rex.webp.png',
       'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=88&h=88&fit=crop'
     );
    
         // Load obstacle images với fallback
     loadImage(cactusSmallImg, 
       'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/1_Cactus_Chrome_Dino.webp/50px-1_Cactus_Chrome_Dino.webp.png',
       'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=50&h=50&fit=crop'
     );
     
     loadImage(cactusLargeImg, 
       'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/3_Cactus_Chrome_Dino.webp/104px-3_Cactus_Chrome_Dino.webp.png',
       'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=104&h=104&fit=crop'
     );
     
     loadImage(pterodactylImg, 
       'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Chrome_Pterodactyl.png/120px-Chrome_Pterodactyl.png',
       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=194&h=194&fit=crop'
     );
    
         loadImage(cloudImg, 
       'https://upload.wikimedia.org/wikipedia/commons/0/0f/Chromium_T-Rex-cloud.png',
       'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=92&h=92&fit=crop'
     );
    
    loadImage(groundImg, 
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Chromium_T-Rex-horizon.png/2400px-Chromium_T-Rex-horizon.png',
      null
    );
  }, []);

  // Sound effects
  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'score') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ([' ', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      if (e.key === ' ' || e.key === 'Space' || e.key === 'ArrowUp') {
        if (!gameStarted) {
          setGameStarted(true);
          setGameRunning(true);
        }
        
        if (gameRunning && !gamePaused && !dino.isJumping) {
          setDino(prev => ({
            ...prev,
            velocity: jumpForce,
            isJumping: true,
            isDucking: false
          }));
          playSound('jump');
        }
      }

      if (e.key === 'ArrowDown') {
        if (gameRunning && !gamePaused) {
          setDino(prev => ({
            ...prev,
            isDucking: true
          }));
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

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowDown') {
        setDino(prev => ({
          ...prev,
          isDucking: false
        }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameRunning, gameOver, gameStarted, jumpForce, playSound, dino.isJumping]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    if (groundImg.current && groundImg.current.complete) {
      try {
        ctx.drawImage(groundImg.current, 0, groundY, canvas.width, canvas.height - groundY);
      } catch (error) {
        console.warn('Error drawing ground image:', error);
        ctx.fillStyle = '#535353';
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
      }
    } else {
      ctx.fillStyle = '#535353';
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    }
    
    // Draw clouds
    clouds.forEach(cloud => {
      if (cloudImg.current && cloudImg.current.complete) {
        try {
          ctx.drawImage(cloudImg.current, cloud.x, cloud.y, 60, 30);
        } catch (error) {
          console.warn('Error drawing cloud image:', error);
          ctx.fillStyle = '#535353';
          ctx.fillRect(cloud.x, cloud.y, 60, 30);
        }
      } else {
        ctx.fillStyle = '#535353';
        ctx.fillRect(cloud.x, cloud.y, 60, 30);
      }
    });
    
    // Draw obstacles
    obstacles.forEach(obstacle => {
      if (obstacle.type === 'cactus-small') {
        if (cactusSmallImg.current && cactusSmallImg.current.complete) {
          try {
            ctx.drawImage(cactusSmallImg.current, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          } catch (error) {
            console.warn('Error drawing cactus small image:', error);
            ctx.fillStyle = '#535353';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          }
        } else {
          ctx.fillStyle = '#535353';
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
      } else if (obstacle.type === 'cactus-large') {
        if (cactusLargeImg.current && cactusLargeImg.current.complete) {
          try {
            ctx.drawImage(cactusLargeImg.current, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          } catch (error) {
            console.warn('Error drawing cactus large image:', error);
            ctx.fillStyle = '#535353';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          }
        } else {
          ctx.fillStyle = '#535353';
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
      } else if (obstacle.type === 'pterodactyl') {
        if (pterodactylImg.current && pterodactylImg.current.complete) {
          try {
            ctx.drawImage(pterodactylImg.current, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          } catch (error) {
            console.warn('Error drawing pterodactyl image:', error);
            ctx.fillStyle = '#535353';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          }
        } else {
          ctx.fillStyle = '#535353';
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
      }
    });
    
    // Draw dino
    if (gameOver) {
      if (dinoDeadImg.current && dinoDeadImg.current.complete) {
        try {
          ctx.drawImage(dinoDeadImg.current, dino.x, dino.y, dinoWidth, dinoHeight);
        } catch (error) {
          console.warn('Error drawing dead dino image:', error);
          ctx.fillStyle = '#535353';
          ctx.fillRect(dino.x, dino.y, dinoWidth, dinoHeight);
        }
      } else {
        ctx.fillStyle = '#535353';
        ctx.fillRect(dino.x, dino.y, dinoWidth, dinoHeight);
      }
    } else if (dino.isDucking) {
      if (dinoDuckImg.current && dinoDuckImg.current.complete) {
        try {
          ctx.drawImage(dinoDuckImg.current, dino.x, dino.y + 20, dinoWidth, dinoHeight - 20);
        } catch (error) {
          console.warn('Error drawing duck dino image:', error);
          ctx.fillStyle = '#535353';
          ctx.fillRect(dino.x, dino.y + 20, dinoWidth, dinoHeight - 20);
        }
      } else {
        ctx.fillStyle = '#535353';
        ctx.fillRect(dino.x, dino.y + 20, dinoWidth, dinoHeight - 20);
      }
    } else {
      if (dinoRunImg.current && dinoRunImg.current.complete) {
        try {
          ctx.drawImage(dinoRunImg.current, dino.x, dino.y, dinoWidth, dinoHeight);
        } catch (error) {
          console.warn('Error drawing run dino image:', error);
          ctx.fillStyle = '#535353';
          ctx.fillRect(dino.x, dino.y, dinoWidth, dinoHeight);
        }
      } else {
        ctx.fillStyle = '#535353';
        ctx.fillRect(dino.x, dino.y, dinoWidth, dinoHeight);
      }
    }
  }, [dino, obstacles, clouds, gameOver]);

  const restartGame = () => {
    setDino({ x: 50, y: groundY - dinoHeight, velocity: 0, isJumping: false, isDucking: false });
    setObstacles([]);
    setClouds([]);
    setScore(0);
    finalScoreRef.current = 0;
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setGameStarted(false);
    setHasSavedScore(false);
    setIsSavingScore(false);
    setScoreEffect(false);
    
    if (gameId) {
      localStorage.removeItem(`dinosaurGame_${gameId}`);
    }
  };

  const handleCanvasClick = () => {
    setIsFocused(true);
    canvasRef.current?.focus();
  };

  const handleCanvasBlur = () => {
    setIsFocused(false);
  };

  const handleJump = () => {
    if (gameOver) return;
    if (!gameStarted) {
      setGameStarted(true);
      setGameRunning(true);
    }
    if (gameRunning && !gamePaused && !dino.isJumping) {
      setDino(prev => ({
        ...prev,
        velocity: jumpForce,
        isJumping: true,
        isDucking: false
      }));
      playSound('jump');
    }
  };

  return (
    <GameErrorBoundary>
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#535353', mb: 2 }}>
          🦖 T-Rex Dino Run
        </Typography>
        
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Typography 
            variant="h6" 
            component="span"
            sx={{
              color: scoreEffect ? '#535353' : 'inherit',
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
              border: isFocused ? '3px solid #535353' : '3px solid #666',
              borderRadius: '10px',
              background: '#f7f7f7',
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
                Space/Click để nhảy
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                ↓ để cúi xuống
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Mỗi chướng ngại vật: +10 điểm
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
                <Typography variant="body2" sx={{ color: '#535353', mb: 2 }}>
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
            {isFocused ? '✅ Game đã sẵn sàng! Dùng: Space/Click | ↓ | P | R' : '💡 Click vào game để bắt đầu chơi'}
          </Typography>
        </Box>
      </Box>
    </GameErrorBoundary>
  );
};

export default DinosaurGame; 