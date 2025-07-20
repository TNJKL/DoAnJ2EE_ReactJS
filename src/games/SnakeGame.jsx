import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const SnakeGame = ({ onGameEnd }) => {
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
  const [currentSpeed, setCurrentSpeed] = useState(150);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false); // Track đã lưu điểm chưa
  const [isSavingScore, setIsSavingScore] = useState(false); // Track đang lưu điểm

  const gridSize = 20;
  const tileCountX = 30; // Số ô theo chiều ngang
  const tileCountY = 20; // Số ô theo chiều dọc (600/20 = 30, 400/20 = 20)
  const baseSpeed = 150; // Tốc độ cơ bản
  const minSpeed = 50; // Tốc độ tối đa (nhanh nhất)

  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 0, y: 0 });

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
    const savedGameState = localStorage.getItem(`snakeGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        // Chỉ load state nếu game chưa kết thúc và không quá cũ (24h)
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setScore(gameState.score || 0);
          setSnake(gameState.snake || [{ x: 10, y: 10 }]);
          setFood(gameState.food || { x: 15, y: 15 });
          setDirection(gameState.direction || { x: 0, y: 0 });
          setGameRunning(gameState.gameRunning || false);
          setGamePaused(gameState.gamePaused || false);
          setGameOver(gameState.gameOver || false);
          setCurrentSpeed(gameState.currentSpeed || baseSpeed);
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
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 15 });
    setDirection({ x: 0, y: 0 });
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setCurrentSpeed(baseSpeed);
  };

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        snake,
        food,
        direction,
        gameRunning,
        gamePaused,
        gameOver,
        currentSpeed,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`snakeGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, snake, food, direction, gameRunning, gamePaused, gameOver, currentSpeed, gameId, isInitialized]);

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

  // Tính toán tốc độ dựa trên điểm
  const calculateSpeed = useCallback((currentScore) => {
    const speedReduction = Math.floor(currentScore / 50) * 10; // Giảm 10ms mỗi 50 điểm
    const newSpeed = Math.max(baseSpeed - speedReduction, minSpeed);
    return newSpeed;
  }, []);

  // Generate random food position - Sửa để tránh trùng với rắn
  const generateFood = useCallback(() => {
    let newFood;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      newFood = {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY)
      };
      attempts++;
    } while (
      attempts < maxAttempts && 
      snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)
    );

    setFood(newFood);
  }, [snake, tileCountX, tileCountY]);

  // Check collision - SỬA LỖI: Kiểm tra chính xác hơn cho tất cả tường
  const checkCollision = useCallback((head) => {
    // Wall collision - SỬA: Kiểm tra chính xác tất cả 4 tường với kích thước khác nhau
    const isWallCollision = head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY;
    
    if (isWallCollision) {
      console.log('Wall collision detected:', { 
        head, 
        tileCountX, 
        tileCountY,
        x: head.x, 
        y: head.y,
        bounds: { minX: 0, maxX: tileCountX - 1, minY: 0, maxY: tileCountY - 1 },
        isOutOfBounds: {
          left: head.x < 0,
          right: head.x >= tileCountX,
          top: head.y < 0,
          bottom: head.y >= tileCountY
        }
      });
      return true;
    }
    
    // Self collision - Kiểm tra với tất cả segment trừ đầu
    for (let i = 1; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        console.log('Self collision detected:', { head, segment: snake[i] });
        return true;
      }
    }
    return false;
  }, [snake, tileCountX, tileCountY]);

  // Game loop - Sửa để xử lý chính xác hơn
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { 
        x: newSnake[0].x + direction.x, 
        y: newSnake[0].y + direction.y 
      };

      // Check collision ngay lập tức
      if (checkCollision(head)) {
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
        
        return prevSnake;
      }

      newSnake.unshift(head);

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => {
          const newScore = prev + 10;
          finalScoreRef.current = newScore; // Cập nhật điểm cuối cùng
          // Chỉ cập nhật high score hiển thị, không lưu vào database
          if (newScore > highScore) {
            setHighScore(newScore);
          }
          return newScore;
        });
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameRunning, gamePaused, highScore, checkCollision, generateFood, score, onGameEnd, hasSavedScore, saveHighScore, isSavingScore]);

  // Cập nhật tốc độ khi điểm thay đổi
  useEffect(() => {
    const newSpeed = calculateSpeed(score);
    setCurrentSpeed(newSpeed);
  }, [score, calculateSpeed]);

  // Start game loop với tốc độ động
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(gameLoop, currentSpeed);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, gamePaused, gameLoop, currentSpeed]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ngăn chặn scroll page cho các phím game
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          if (direction.y !== 1) {
            setDirection({ x: 0, y: -1 });
            if (!gameRunning) setGameRunning(true);
          }
          break;
        case 'ArrowDown':
          if (direction.y !== -1) {
            setDirection({ x: 0, y: 1 });
            if (!gameRunning) setGameRunning(true);
          }
          break;
        case 'ArrowLeft':
          if (direction.x !== 1) {
            setDirection({ x: -1, y: 0 });
            if (!gameRunning) setGameRunning(true);
          }
          break;
        case 'ArrowRight':
          if (direction.x !== -1) {
            setDirection({ x: 1, y: 0 });
            if (!gameRunning) setGameRunning(true);
          }
          break;
        case ' ':
        case 'Space':
          if (gameRunning) {
            setGamePaused(prev => !prev);
          }
          break;
        case 'r':
        case 'R':
          restartGame();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameRunning, gameOver]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    // Vẽ đường kẻ dọc
    for (let i = 0; i <= tileCountX; i++) {
      ctx.beginPath();
      ctx.moveTo(i * gridSize, 0);
      ctx.lineTo(i * gridSize, canvas.height);
      ctx.stroke();
    }
    // Vẽ đường kẻ ngang
    for (let i = 0; i <= tileCountY; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * gridSize);
      ctx.lineTo(canvas.width, i * gridSize);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      const key = `snake-${index}-${segment.x}-${segment.y}`;
      if (index === 0) {
        ctx.fillStyle = '#45a049'; // Head color
      } else {
        ctx.fillStyle = '#4CAF50'; // Body color
      }
      ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });

    // Draw food
    ctx.fillStyle = '#f44336';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
  }, [snake, food, tileCountX, tileCountY, gridSize]);

  const restartGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: 0 });
    setScore(0);
    finalScoreRef.current = 0; // Reset điểm cuối cùng
    setCurrentSpeed(baseSpeed);
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setHasSavedScore(false); // Reset trạng thái lưu điểm
    setIsSavingScore(false); // Reset trạng thái đang lưu
    generateFood();
    
    // Clear saved game state
    if (gameId) {
      localStorage.removeItem(`snakeGame_${gameId}`);
    }
  };

  const handleCanvasClick = () => {
    setIsFocused(true);
    canvasRef.current?.focus();
  };

  const handleCanvasBlur = () => {
    setIsFocused(false);
  };

  // Tính toán level dựa trên điểm
  const getLevel = () => {
    return Math.floor(score / 50) + 1;
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#4CAF50', mb: 2 }}>
        🐍 Rắn Săn Mồi
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span">
          Điểm: {score}
        </Typography>
        <Typography variant="h6" component="span">
          Điểm cao nhất: {highScore}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#FF9800' }}>
          Level: {getLevel()}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#E91E63' }}>
          Tốc độ: {Math.round(1000 / currentSpeed)} FPS
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          style={{
            border: isFocused ? '3px solid #4CAF50' : '3px solid #666',
            borderRadius: '10px',
            background: '#000',
            cursor: 'pointer',
            outline: 'none'
          }}
          tabIndex={0}
          onClick={handleCanvasClick}
          onBlur={handleCanvasBlur}
        />
        
        {!gameRunning && !gameOver && (
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
              {isFocused ? 'Nhấn phím mũi tên để bắt đầu' : 'Click vào game để bắt đầu'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              ↑ ↓ ← → để di chuyển
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Space để tạm dừng
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
            <Typography variant="body2" gutterBottom>
              Level đạt được: {getLevel()}
            </Typography>
            {score > highScore && (
              <Typography variant="body2" sx={{ color: '#4CAF50', mb: 2 }}>
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
          {isFocused ? '✅ Game đã sẵn sàng! Dùng: ↑ ↓ ← → | Space | R' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
      </Box>
    </Box>
  );
};

export default SnakeGame; 