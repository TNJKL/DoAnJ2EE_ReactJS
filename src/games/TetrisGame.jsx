import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const TetrisGame = ({ onGameEnd }) => {
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
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);

  // Game constants - Kích thước phù hợp hơn
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 18; // Giảm chiều cao để dễ chơi hơn
  const BLOCK_SIZE = 28; // Tăng kích thước khối để dễ nhìn
  const canvasWidth = BOARD_WIDTH * BLOCK_SIZE;
  const canvasHeight = BOARD_HEIGHT * BLOCK_SIZE;

  // Tetromino shapes - Cải thiện để dễ xếp hơn
  const TETROMINOS = {
    I: [
      [1, 1, 1, 1]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1]
    ]
  };

  // Tỷ lệ xuất hiện các khối - Ưu tiên khối dễ xếp
  const PIECE_WEIGHTS = {
    I: 0.15,  // Ít xuất hiện hơn vì khó xếp
    O: 0.25,  // Nhiều xuất hiện vì dễ xếp
    T: 0.20,  // Trung bình
    S: 0.15,  // Ít xuất hiện
    Z: 0.15,  // Ít xuất hiện
    J: 0.20,  // Trung bình
    L: 0.20   // Trung bình
  };

  const COLORS = {
    I: '#00f5ff', // Cyan
    O: '#ffff00', // Yellow
    T: '#a000f0', // Purple
    S: '#00f000', // Green
    Z: '#f00000', // Red
    J: '#0000f0', // Blue
    L: '#ffa500'  // Orange
  };

  // Game state
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

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
    const savedGameState = localStorage.getItem(`tetrisGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setScore(gameState.score || 0);
          setBoard(gameState.board || createEmptyBoard());
          setLevel(gameState.level || 1);
          setLines(gameState.lines || 0);
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

  function createEmptyBoard() {
    return Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
  }

  const resetToDefault = () => {
    setScore(0);
    setBoard(createEmptyBoard());
    setLevel(1);
    setLines(0);
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setGameStarted(false);
    setCurrentPiece(null);
    setNextPiece(null);
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        board,
        level,
        lines,
        gameRunning,
        gamePaused,
        gameOver,
        gameStarted,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`tetrisGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, board, level, lines, gameRunning, gamePaused, gameOver, gameStarted, gameId, isInitialized]);

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

  // Create new piece với tỷ lệ xuất hiện cân bằng
  const createPiece = useCallback(() => {
    const pieces = Object.keys(TETROMINOS);
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedPiece = pieces[0]; // Default

    for (const piece of pieces) {
      cumulativeWeight += PIECE_WEIGHTS[piece];
      if (random <= cumulativeWeight) {
        selectedPiece = piece;
        break;
      }
    }

    return {
      shape: TETROMINOS[selectedPiece],
      color: COLORS[selectedPiece],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETROMINOS[selectedPiece][0].length / 2),
      y: 0
    };
  }, []);

  // Check collision
  const checkCollision = useCallback((piece, board, xOffset = 0, yOffset = 0) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + xOffset;
          const newY = piece.y + y + yOffset;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          
          if (newY >= 0 && board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Place piece on board
  const placePiece = useCallback((piece, board) => {
    const newBoard = board.map(row => [...row]);
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = piece.x + x;
          const boardY = piece.y + y;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    
    return newBoard;
  }, []);

  // Clear completed lines
  const clearLines = useCallback((board) => {
    let linesCleared = 0;
    const newBoard = board.filter(row => {
      const isComplete = row.every(cell => cell !== 0);
      if (isComplete) {
        linesCleared++;
      }
      return !isComplete;
    });
    
    // Add empty rows at top
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    return { board: newBoard, linesCleared };
  }, []);

  // Rotate piece
  const rotatePiece = useCallback((piece) => {
    const rotated = piece.shape[0].map((_, i) => 
      piece.shape.map(row => row[i]).reverse()
    );
    
    return {
      ...piece,
      shape: rotated
    };
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setCurrentPiece(prevPiece => {
      if (!prevPiece) {
        const newPiece = nextPiece || createPiece();
        setNextPiece(createPiece());
        
        // Check if new piece can be placed
        if (checkCollision(newPiece, board)) {
          console.log('Game over - no space for new piece');
          setGameOver(true);
          setGameRunning(false);
          if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
          }
          
          // Lưu điểm khi game kết thúc
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
          
          return prevPiece;
        }
        
        return newPiece;
      }

      // Move piece down
      if (!checkCollision(prevPiece, board, 0, 1)) {
        return { ...prevPiece, y: prevPiece.y + 1 };
      } else {
        // Place piece on board
        const newBoard = placePiece(prevPiece, board);
        const { board: clearedBoard, linesCleared } = clearLines(newBoard);
        setBoard(clearedBoard);
        
        // Update score and level - Điểm cao hơn và level tăng chậm hơn
        if (linesCleared > 0) {
          const points = [0, 150, 450, 750, 1200][linesCleared] * level; // Điểm cao hơn
          setScore(prev => {
            const newScore = prev + points;
            finalScoreRef.current = newScore;
            if (newScore > highScore) {
              setHighScore(newScore);
            }
            return newScore;
          });
          
          setLines(prev => {
            const newLines = prev + linesCleared;
            const newLevel = Math.floor(newLines / 15) + 1; // Level tăng chậm hơn (15 lines thay vì 10)
            setLevel(newLevel);
            return newLines;
          });
        }
        
        return null; // Will be set to new piece in next iteration
      }
    });
  }, [gameRunning, gamePaused, board, nextPiece, createPiece, checkCollision, placePiece, clearLines, highScore, hasSavedScore, isSavingScore, onGameEnd, level]);

  // Start game loop
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      // Tốc độ nhanh hơn và mượt hơn
      const speed = Math.max(50, 800 - (level - 1) * 80); // Tốc độ cơ bản nhanh hơn
      gameLoopRef.current = setInterval(gameLoop, speed);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, gamePaused, gameLoop, level]);

  // Handle keyboard input - Thêm controls mới
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Space', 'p', 'P', 'r', 'R'].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      if (e.key === ' ' || e.key === 'Space') {
        if (!gameStarted) {
          setGameStarted(true);
          setGameRunning(true);
        }
      }

      // Pause/Resume
      if (e.key === 'p' || e.key === 'P') {
        if (gameRunning) {
          setGamePaused(!gamePaused);
        }
        return;
      }

      // Restart
      if (e.key === 'r' || e.key === 'R') {
        restartGame();
        return;
      }

      if (!gameRunning || gamePaused) return;

      setCurrentPiece(prevPiece => {
        if (!prevPiece) return prevPiece;

        switch (e.key) {
          case 'ArrowLeft':
            if (!checkCollision(prevPiece, board, -1, 0)) {
              return { ...prevPiece, x: prevPiece.x - 1 };
            }
            break;
          case 'ArrowRight':
            if (!checkCollision(prevPiece, board, 1, 0)) {
              return { ...prevPiece, x: prevPiece.x + 1 };
            }
            break;
          case 'ArrowDown':
            if (!checkCollision(prevPiece, board, 0, 1)) {
              return { ...prevPiece, y: prevPiece.y + 1 };
            }
            break;
          case 'ArrowUp':
            const rotated = rotatePiece(prevPiece);
            if (!checkCollision(rotated, board)) {
              return rotated;
            }
            break;
        }
        return prevPiece;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameRunning, gamePaused, gameOver, gameStarted, board, checkCollision, rotatePiece]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillStyle = cell;
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        }
      });
    });

    // Draw current piece
    if (currentPiece) {
      ctx.fillStyle = currentPiece.color;
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell) {
            ctx.fillRect(
              (currentPiece.x + x) * BLOCK_SIZE,
              (currentPiece.y + y) * BLOCK_SIZE,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1
            );
          }
        });
      });
    }

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_WIDTH; i++) {
      ctx.beginPath();
      ctx.moveTo(i * BLOCK_SIZE, 0);
      ctx.lineTo(i * BLOCK_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= BOARD_HEIGHT; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * BLOCK_SIZE);
      ctx.lineTo(canvas.width, i * BLOCK_SIZE);
      ctx.stroke();
    }
  }, [board, currentPiece]);

  const restartGame = () => {
    setBoard(createEmptyBoard());
    setScore(0);
    finalScoreRef.current = 0;
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setGameStarted(false);
    setCurrentPiece(null);
    setNextPiece(null);
    setHasSavedScore(false);
    setIsSavingScore(false);
    
    if (gameId) {
      localStorage.removeItem(`tetrisGame_${gameId}`);
    }
  };

  const handleCanvasClick = () => {
    setIsFocused(true);
    canvasRef.current?.focus();
  };

  const handleCanvasBlur = () => {
    setIsFocused(false);
  };

  const handleStartGame = () => {
    if (!gameStarted) {
      setGameStarted(true);
      setGameRunning(true);
    }
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#00f5ff', mb: 2 }}>
        🧩 Tetris
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span">
          Điểm: {score}
        </Typography>
        <Typography variant="h6" component="span">
          Điểm cao nhất: {highScore}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#ffa500' }}>
          Level: {level}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#00f000' }}>
          Lines: {lines}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'flex-start' }}>
        {/* Main game area */}
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              border: isFocused ? '3px solid #00f5ff' : '3px solid #666',
              borderRadius: '10px',
              background: '#000',
              cursor: 'pointer',
              outline: 'none'
            }}
            tabIndex={0}
            onClick={handleCanvasClick}
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
                {isFocused ? 'Nhấn Space để bắt đầu' : 'Click vào game để bắt đầu'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                ← → để di chuyển
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                ↓ để rơi nhanh
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                ↑ để xoay
              </Typography>
                             <Typography variant="body2" sx={{ mb: 2 }}>
                 P để tạm dừng
               </Typography>
               <Typography variant="body2" sx={{ mb: 2 }}>
                 R để chơi lại
               </Typography>
               <Typography variant="body2" sx={{ color: '#00f5ff' }}>
                 💡 Tip: Ưu tiên xóa nhiều hàng cùng lúc để được điểm cao!
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
                Level đạt được: {level}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Lines xóa được: {lines}
              </Typography>
              {score > highScore && (
                <Typography variant="body2" sx={{ color: '#00f5ff', mb: 2 }}>
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

        {/* Next piece preview */}
        <Box sx={{ 
          background: '#333', 
          padding: 2, 
          borderRadius: 2,
          minWidth: 120,
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Tiếp theo
          </Typography>
          {nextPiece && (
            <Box sx={{ 
              width: 100, 
              height: 100, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#000',
              borderRadius: 1
            }}>
              <canvas
                width={100}
                height={100}
                style={{ background: '#000' }}
                ref={(canvas) => {
                  if (canvas && nextPiece) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, 100, 100);
                    
                    const blockSize = 20;
                    const offsetX = (100 - nextPiece.shape[0].length * blockSize) / 2;
                    const offsetY = (100 - nextPiece.shape.length * blockSize) / 2;
                    
                    ctx.fillStyle = nextPiece.color;
                    nextPiece.shape.forEach((row, y) => {
                      row.forEach((cell, x) => {
                        if (cell) {
                          ctx.fillRect(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize - 1,
                            blockSize - 1
                          );
                        }
                      });
                    });
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

             <Box sx={{ mt: 2 }}>
         <Typography variant="body2" color="text.secondary">
           {isFocused ? '✅ Game đã sẵn sàng! Dùng: ← → ↓ ↑ | Space | P | R' : '💡 Click vào game để bắt đầu chơi'}
         </Typography>
         <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
           🎯 Mục tiêu: Xóa nhiều hàng cùng lúc để được điểm cao nhất!
         </Typography>
       </Box>
    </Box>
  );
};

export default TetrisGame; 