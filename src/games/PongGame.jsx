import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const PongGame = ({ onGameEnd }) => {
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
  const canvasWidth = 600;
  const canvasHeight = 400;
  const paddleWidth = 100;
  const paddleHeight = 12;
  const ballSize = 14;
  const paddleY = canvasHeight - 30;
  const baseBallSpeed = 4;

  // Game state
  const [paddleX, setPaddleX] = useState((canvasWidth - paddleWidth) / 2);
  const [ball, setBall] = useState({
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    dx: baseBallSpeed,
    dy: -baseBallSpeed,
    speed: baseBallSpeed
  });

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

    setIsInitialized(true);
  }, []);

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
      setHighScore(0);
    }
  };

  const saveHighScore = async (newScore) => {
    if (isSavingScore) return { newHighScore: false };
    try {
      setIsSavingScore(true);
      const response = await axios.post(`http://localhost:8080/api/user/games/${gameId}/score`, {
        score: newScore,
        username: username
      });
      if (response.data.newHighScore) setHighScore(response.data.newHighScore);
      return response.data;
    } catch (error) {
      return { newHighScore: false };
    } finally {
      setIsSavingScore(false);
    }
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setBall(prev => {
      let { x, y, dx, dy, speed } = prev;
      x += dx;
      y += dy;

      // Va chạm tường trái/phải
      if (x < 0) {
        x = 0;
        dx = -dx;
      }
      if (x + ballSize > canvasWidth) {
        x = canvasWidth - ballSize;
        dx = -dx;
      }
      // Va chạm tường trên
      if (y < 0) {
        y = 0;
        dy = -dy;
      }

      // Va chạm paddle
      if (
        y + ballSize >= paddleY &&
        x + ballSize > paddleX &&
        x < paddleX + paddleWidth
      ) {
        y = paddleY - ballSize;
        dy = -dy;
        // Tăng tốc bóng mỗi lần đỡ thành công
        speed = Math.min(speed + 0.3, 12);
        dx = dx > 0 ? speed : -speed;
        dy = -speed;
        setScore(prevScore => {
          const newScore = prevScore + 10;
          finalScoreRef.current = newScore;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
      }

      // Game over nếu bóng rơi xuống dưới paddle
      if (y > canvasHeight) {
        setGameOver(true);
        setGameRunning(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);

        if (finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
          setHasSavedScore(true);
          setTimeout(() => {
            saveHighScore(finalScoreRef.current).then(() => {
              if (onGameEnd) onGameEnd();
            });
          }, 200);
        }
        return prev;
      }

      return { x, y, dx, dy, speed };
    });
  }, [gameRunning, gamePaused, paddleX, highScore, hasSavedScore, isSavingScore, onGameEnd, saveHighScore]);

  // Start game loop
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(gameLoop, 16);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameRunning, gamePaused, gameLoop]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'Space', 'r', 'R'].includes(e.key)) e.preventDefault();
      if (gameOver) return;

      if (e.key === ' ' || e.key === 'Space') {
        if (!gameRunning) setGameRunning(true);
        else setGamePaused(prev => !prev);
      }
      if (!gameRunning || gamePaused) return;

      if (e.key === 'ArrowLeft') {
        setPaddleX(prev => Math.max(0, prev - 32));
      }
      if (e.key === 'ArrowRight') {
        setPaddleX(prev => Math.min(canvasWidth - paddleWidth, prev + 32));
      }
      if (e.key === 'r' || e.key === 'R') {
        restartGame();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameRunning, gamePaused, gameOver]);

  // Mouse/touch move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!gameRunning || gamePaused) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      setPaddleX(Math.max(0, Math.min(canvasWidth - paddleWidth, mouseX - paddleWidth / 2)));
    };
    canvasRef.current?.addEventListener('mousemove', handleMouseMove);
    return () => canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
  }, [gameRunning, gamePaused]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Clear
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw paddle
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(paddleX, paddleY, paddleWidth, paddleHeight);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x + ballSize / 2, ball.y + ballSize / 2, ballSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();

    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.fillText(`Điểm: ${score}`, 16, 28);
    ctx.fillText(`Kỷ lục: ${highScore}`, 16, 52);
  }, [paddleX, ball, score, highScore]);

  const restartGame = () => {
    setPaddleX((canvasWidth - paddleWidth) / 2);
    setBall({
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      dx: baseBallSpeed,
      dy: -baseBallSpeed,
      speed: baseBallSpeed
    });
    setScore(0);
    finalScoreRef.current = 0;
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setHasSavedScore(false);
    setIsSavingScore(false);
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#FFD700', mb: 2 }}>
        🏓 Pong
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span">
          Điểm: {score}
        </Typography>
        <Typography variant="h6" component="span">
          Kỷ lục: {highScore}
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
            background: '#222',
            cursor: 'pointer',
            outline: 'none'
          }}
          tabIndex={0}
          onClick={() => {
            setIsFocused(true);
            canvasRef.current?.focus();
            if (!gameRunning) setGameRunning(true);
          }}
          onBlur={() => setIsFocused(false)}
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
              {isFocused ? 'Nhấn Space hoặc Click để bắt đầu' : 'Click vào game để bắt đầu'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              ← → hoặc rê chuột để di chuyển vợt
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
          {isFocused ? '✅ Game đã sẵn sàng! Dùng: ← → | Space | R' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
      </Box>
    </Box>
  );
};

export default PongGame;