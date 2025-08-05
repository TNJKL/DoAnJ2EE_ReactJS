import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const Game2048 = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const finalScoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Audio context
  const audioContextRef = useRef(null);

  // Game constants
  const GRID_SIZE = 4;
  const TILE_SIZE = 100;
  const TILE_MARGIN = 10;
  const CANVAS_SIZE = GRID_SIZE * TILE_SIZE + (GRID_SIZE + 1) * TILE_MARGIN;

  // Initialize board with 2 random tiles
  const initializeBoard = () => {
    const newBoard = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    return newBoard;
  };

  // Add random tile (2 or 4)
  const addRandomTile = (board) => {
    if (!board) return;
    const emptyCells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  // Khởi tạo audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Âm thanh cho game 2048
  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'move') {
      // Âm thanh khi di chuyển
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'merge') {
      // Âm thanh khi ghép ô
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'win') {
      // Âm thanh khi thắng
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'gameover') {
      // Âm thanh khi thua
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  }, []);

  // Game state
  const [board, setBoard] = useState(() => {
    const newBoard = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    return newBoard;
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [scoreEffect, setScoreEffect] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Lấy gameId từ URL và khởi tạo game
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const gameIdFromUrl = pathParts[pathParts.length - 1];
    setGameId(gameIdFromUrl);
    
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUsername(userData.username);
    }

    const savedGameState = localStorage.getItem(`game2048_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid && gameState.board) {
          setScore(gameState.score || 0);
          setBoard(gameState.board);
          setGameRunning(gameState.gameRunning || false);
          setGameOver(gameState.gameOver || false);
          setGameWon(gameState.gameWon || false);
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
    setBoard(initializeBoard());
    setGameRunning(false);
    setGameOver(false);
    setGameWon(false);
    setGameStarted(false);
    setScoreEffect(false);
    setLastMove(null);
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        board,
        gameRunning,
        gameOver,
        gameWon,
        gameStarted,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`game2048_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, board, gameRunning, gameOver, gameWon, gameStarted, gameId, isInitialized]);

  // Load high score từ database
  useEffect(() => {
    if (gameId && username && isInitialized) {
      loadHighScore();
    }
  }, [gameId, username, isInitialized]);

  const loadHighScore = async () => {
    if (!gameId || !username) return;
    try {
      const response = await axios.get(`http://localhost:8080/api/user/games/${gameId}/score?username=${username}`);
      setHighScore(response.data.highScore || 0);
    } catch (error) {
      console.log('No previous high score found');
      setHighScore(0);
    }
  };

  const saveHighScore = async (finalScore) => {
    if (!gameId || !username) {
      console.error('Missing gameId or username');
      return;
    }
    if (isSavingScore) {
      console.log('Already saving score, skipping...');
      return;
    }
    
    try {
      setIsSavingScore(true);
      console.log('Saving score:', finalScore);
      
      const response = await axios.post(`http://localhost:8080/api/user/games/${gameId}/score`, {
        score: finalScore,
        username: username
      });
      
      if (response.data.newHighScore) {
        setHighScore(response.data.newHighScore);
      } else if (response.data.highScore) {
        setHighScore(response.data.highScore);
      }
      return response.data;
    } catch (error) {
      console.error('Error saving high score:', error);
      return { newHighScore: false };
    } finally {
      setIsSavingScore(false);
    }
  };

  // Move tiles in a direction
  const moveTiles = useCallback((direction) => {
    if (!board || board.length === 0) return;
    
    let moved = false;
    let scoreIncrease = 0;
    const newBoard = board.map(row => [...row]);

    // Helper function to merge tiles
    const mergeTiles = (line) => {
      const filtered = line.filter(tile => tile !== 0);
      const merged = [];
      
      for (let i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          merged.push(filtered[i] * 2);
          scoreIncrease += filtered[i] * 2;
          i++; // Skip next tile
        } else {
          merged.push(filtered[i]);
        }
      }
      
      // Pad with zeros
      while (merged.length < GRID_SIZE) {
        merged.push(0);
      }
      
      return merged;
    };

    if (direction === 'left' || direction === 'right') {
      for (let i = 0; i < GRID_SIZE; i++) {
        let line = newBoard[i];
        if (direction === 'right') {
          line = line.reverse();
        }
        
        const originalLine = [...line];
        line = mergeTiles(line);
        
        if (direction === 'right') {
          line = line.reverse();
        }
        
        newBoard[i] = line;
        
        if (JSON.stringify(originalLine) !== JSON.stringify(line)) {
          moved = true;
        }
      }
    } else if (direction === 'up' || direction === 'down') {
      for (let j = 0; j < GRID_SIZE; j++) {
        let line = [];
        for (let i = 0; i < GRID_SIZE; i++) {
          line.push(newBoard[i][j]);
        }
        
        if (direction === 'down') {
          line = line.reverse();
        }
        
        const originalLine = [...line];
        line = mergeTiles(line);
        
        if (direction === 'down') {
          line = line.reverse();
        }
        
        for (let i = 0; i < GRID_SIZE; i++) {
          newBoard[i][j] = line[i];
        }
        
        if (JSON.stringify(originalLine) !== JSON.stringify(line)) {
          moved = true;
        }
      }
    }

    if (moved) {
      addRandomTile(newBoard);
      setBoard(newBoard);
      setScore(prev => {
        const newScore = prev + scoreIncrease;
        finalScoreRef.current = newScore;
        return newScore;
      });
      setLastMove(direction);
      
      // Play sound based on action
      if (scoreIncrease > 0) {
        playSound('merge');
      } else {
        playSound('move');
      }
      
      // Check for win condition (2048 tile)
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          if (newBoard[i][j] === 2048 && !gameWon) {
            setGameWon(true);
            playSound('win');
          }
        }
      }
      
      // Check for game over
      if (isGameOver(newBoard)) {
        setGameOver(true);
        setGameRunning(false);
        playSound('gameover');
        
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
      }
      
      setScoreEffect(true);
      setTimeout(() => setScoreEffect(false), 300);
    }
  }, [board, gameWon, hasSavedScore, isSavingScore, onGameEnd, playSound]);

  // Check if game is over
  const isGameOver = (board) => {
    if (!board || board.length === 0) return true;
    
    // Check if there are empty cells
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (board[i][j] === 0) {
          return false;
        }
      }
    }
    
    // Check if any merges are possible
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const current = board[i][j];
        if (
          (i < GRID_SIZE - 1 && board[i + 1][j] === current) ||
          (j < GRID_SIZE - 1 && board[i][j + 1] === current)
        ) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      if (!gameStarted) {
        setGameStarted(true);
        setGameRunning(true);
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          moveTiles('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          moveTiles('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveTiles('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveTiles('right');
          break;
        case 'r':
        case 'R':
          restartGame();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameRunning, gameOver, gameStarted, moveTiles]);

  // Handle touch/swipe events
  const handleTouchStart = useCallback((e) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  }, []);

  const handleTouchMove = useCallback((e) => {
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (Math.abs(distanceX) > minSwipeDistance) {
        if (distanceX > 0) {
          moveTiles('left');
        } else {
          moveTiles('right');
        }
      }
    } else {
      if (Math.abs(distanceY) > minSwipeDistance) {
        if (distanceY > 0) {
          moveTiles('up');
        } else {
          moveTiles('down');
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, moveTiles]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !board || board.length === 0) return;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw tiles
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = j * (TILE_SIZE + TILE_MARGIN) + TILE_MARGIN;
        const y = i * (TILE_SIZE + TILE_MARGIN) + TILE_MARGIN;
        const value = board[i] && board[i][j] ? board[i][j] : 0;

        // Draw tile background
        if (value === 0) {
          ctx.fillStyle = '#cdc1b4';
        } else {
          const colors = {
            2: '#eee4da',
            4: '#ede0c8',
            8: '#f2b179',
            16: '#f59563',
            32: '#f67c5f',
            64: '#f65e3b',
            128: '#edcf72',
            256: '#edcc61',
            512: '#edc850',
            1024: '#edc53f',
            2048: '#edc22e'
          };
          ctx.fillStyle = colors[value] || '#3c3a32';
        }

        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Draw tile value
        if (value !== 0) {
          ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
          ctx.font = `bold ${value >= 1000 ? 32 : value >= 100 ? 36 : 42}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(value.toString(), x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        }
      }
    }
  }, [board]);

  const restartGame = () => {
    setScore(0);
    finalScoreRef.current = 0;
    setBoard(initializeBoard());
    setGameOver(false);
    setGameWon(false);
    setGameRunning(false);
    setGameStarted(false);
    setHasSavedScore(false);
    setIsSavingScore(false);
    setScoreEffect(false);
    setLastMove(null);
    
    if (gameId) {
      localStorage.removeItem(`game2048_${gameId}`);
    }
  };

  const handleCanvasClick = () => {
    setIsFocused(true);
    canvasRef.current?.focus();
  };

  const handleCanvasBlur = () => {
    setIsFocused(false);
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#776e65', mb: 2 }}>
        🎯 2048 Puzzle
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography 
          variant="h6" 
          component="span"
          sx={{
            color: scoreEffect ? '#f65e3b' : 'inherit',
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
        {gameWon && (
          <Typography variant="h6" component="span" sx={{ color: '#edc22e', fontWeight: 'bold' }}>
            🏆 WINNER!
          </Typography>
        )}
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{
            border: isFocused ? '3px solid #776e65' : '3px solid #666',
            borderRadius: '10px',
            background: '#bbada0',
            cursor: 'pointer',
            outline: 'none'
          }}
          tabIndex={0}
          onClick={handleCanvasClick}
          onBlur={handleCanvasBlur}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
              {isFocused ? 'Nhấn phím mũi tên hoặc WASD để bắt đầu' : 'Click vào game để bắt đầu'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              ↑ ↓ ← → hoặc W A S D để di chuyển
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Vuốt màn hình để di chuyển (mobile)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Ghép các ô giống nhau để tạo ra 2048!
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
              <Typography variant="body2" sx={{ color: '#edc22e', mb: 2 }}>
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

        {gameWon && !gameOver && (
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
            <Typography variant="h5" gutterBottom sx={{ color: '#edc22e' }}>
              🏆 Chúc mừng! Bạn đã tạo ra 2048!
            </Typography>
            <Typography variant="body1" gutterBottom>
              Điểm của bạn: {score}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Bạn có thể tiếp tục chơi để đạt điểm cao hơn!
            </Typography>
            <Button 
              variant="contained" 
              onClick={restartGame}
              sx={{ mt: 1 }}
            >
              Chơi lại
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={restartGame}
          sx={{ 
            background: 'linear-gradient(45deg, #f65e3b 30%, #f67c5f 90%)',
            boxShadow: '0 3px 5px 2px rgba(246, 94, 59, .3)'
          }}
        >
          🔄 Reset Game
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {isFocused ? '✅ Sẵn sàng chơi! Dùng: ↑ ↓ ← → | W A S D | Vuốt màn hình | R' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
      </Box>
    </Box>
  );
};

export default Game2048; 