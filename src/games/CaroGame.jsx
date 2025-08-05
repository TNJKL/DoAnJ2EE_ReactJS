import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import axios from 'axios';

const CaroGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const finalScoreRef = useRef(0); // Track điểm cuối cùng
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false); // Track đã lưu điểm chưa
  const [isSavingScore, setIsSavingScore] = useState(false); // Track đang lưu điểm

  // Audio context
  const audioContextRef = useRef(null);

  // Game constants
  const BOARD_SIZE = 3;
  const CELL_SIZE = 80;
  const CELL_MARGIN = 5;
  const CANVAS_SIZE = BOARD_SIZE * CELL_SIZE + (BOARD_SIZE + 1) * CELL_MARGIN;

  // Game state
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState('X'); // X = người chơi, O = máy/người chơi 2
  const [gameMode, setGameMode] = useState('vsPlayer'); // 'vsPlayer' hoặc 'vsAI'
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [scoreEffect, setScoreEffect] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  // Khởi tạo audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Âm thanh cho game cờ caro
  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'move') {
      // Âm thanh khi đánh cờ
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'win') {
      // Âm thanh khi thắng
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'draw') {
      // Âm thanh khi hòa
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  }, []);

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

    const savedGameState = localStorage.getItem(`caroGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid && gameState.board) {
          setScore(gameState.score || 0);
          setBoard(gameState.board);
          setCurrentPlayer(gameState.currentPlayer || 'X');
          setGameMode(gameState.gameMode || 'vsPlayer');
          setGameRunning(gameState.gameRunning || false);
          setGameOver(gameState.gameOver || false);
          setGameWon(gameState.gameWon || false);
          setGameStarted(gameState.gameStarted || false);
          setWinner(gameState.winner || null);
          setWinningLine(gameState.winningLine || null);
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
    setBoard(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
    setCurrentPlayer('X');
    setGameMode('vsPlayer');
    setGameRunning(false);
    setGameOver(false);
    setGameWon(false);
    setGameStarted(false);
    setWinner(null);
    setWinningLine(null);
    setScoreEffect(false);
    setLastMove(null);
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        board,
        currentPlayer,
        gameMode,
        gameRunning,
        gameOver,
        gameWon,
        gameStarted,
        winner,
        winningLine,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`caroGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, board, currentPlayer, gameMode, gameRunning, gameOver, gameWon, gameStarted, winner, winningLine, gameId, isInitialized]);

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
    // Tránh gửi nhiều request cùng lúc
    if (isSavingScore) {
      console.log('Already saving score, skipping...');
      return { newHighScore: false };
    }
    
    try {
      setIsSavingScore(true);
      console.log('Attempting to save score:', finalScore);
      
      const response = await axios.post(`http://localhost:8080/api/user/games/${gameId}/score`, {
        score: finalScore,
        username: username
      });
      console.log('High score save response:', response.data);
      
      // Cập nhật high score từ response nếu có
      if (response.data.newHighScore) {
        setHighScore(response.data.newHighScore);
        console.log('New high score updated:', response.data.newHighScore);
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

  // Kiểm tra thắng
  const checkWinner = useCallback((board, row, col) => {
    const player = board[row][col];
    if (!player) return null;

    // Kiểm tra hàng ngang
    if (col <= 0 && board[row][col + 1] === player && board[row][col + 2] === player) {
      return { type: 'horizontal', row, startCol: col, endCol: col + 2 };
    }
    if (col >= 1 && col <= 1 && board[row][col - 1] === player && board[row][col + 1] === player) {
      return { type: 'horizontal', row, startCol: col - 1, endCol: col + 1 };
    }
    if (col >= 2 && board[row][col - 1] === player && board[row][col - 2] === player) {
      return { type: 'horizontal', row, startCol: col - 2, endCol: col };
    }

    // Kiểm tra hàng dọc
    if (row <= 0 && board[row + 1][col] === player && board[row + 2][col] === player) {
      return { type: 'vertical', col, startRow: row, endRow: row + 2 };
    }
    if (row >= 1 && row <= 1 && board[row - 1][col] === player && board[row + 1][col] === player) {
      return { type: 'vertical', col, startRow: row - 1, endRow: row + 1 };
    }
    if (row >= 2 && board[row - 1][col] === player && board[row - 2][col] === player) {
      return { type: 'vertical', col, startRow: row - 2, endRow: row };
    }

    // Kiểm tra đường chéo chính
    if (row === col) {
      if (row === 0 && board[1][1] === player && board[2][2] === player) {
        return { type: 'diagonal', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
      }
      if (row === 1 && board[0][0] === player && board[2][2] === player) {
        return { type: 'diagonal', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
      }
      if (row === 2 && board[0][0] === player && board[1][1] === player) {
        return { type: 'diagonal', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
      }
    }

    // Kiểm tra đường chéo phụ
    if (row + col === 2) {
      if (row === 0 && col === 2 && board[1][1] === player && board[2][0] === player) {
        return { type: 'diagonal', startRow: 0, startCol: 2, endRow: 2, endCol: 0 };
      }
      if (row === 1 && col === 1 && board[0][2] === player && board[2][0] === player) {
        return { type: 'diagonal', startRow: 0, startCol: 2, endRow: 2, endCol: 0 };
      }
      if (row === 2 && col === 0 && board[0][2] === player && board[1][1] === player) {
        return { type: 'diagonal', startRow: 0, startCol: 2, endRow: 2, endCol: 0 };
      }
    }

    return null;
  }, []);

  // Kiểm tra hòa
  const checkDraw = useCallback((board) => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] === null) {
          return false;
        }
      }
    }
    return true;
  }, []);

  // Bot đơn giản và hiệu quả
  const makeAIMove = useCallback((board) => {
    // Thu thập tất cả nước đi có thể
    const availableMoves = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] === null) {
          availableMoves.push({ row: i, col: j });
        }
      }
    }

    if (availableMoves.length === 0) return null;

    // Chiến thuật 1: Thắng ngay nếu có thể
    for (const move of availableMoves) {
      const newBoard = board.map(row => [...row]);
      newBoard[move.row][move.col] = 'O';
      const winCheck = checkWinner(newBoard, move.row, move.col);
      if (winCheck) {
        return move;
      }
    }

    // Chiến thuật 2: Chặn đối thủ thắng
    for (const move of availableMoves) {
      const newBoard = board.map(row => [...row]);
      newBoard[move.row][move.col] = 'X';
      const blockCheck = checkWinner(newBoard, move.row, move.col);
      if (blockCheck) {
        return move;
      }
    }

    // Chiến thuật 3: Đánh trung tâm nếu còn trống
    const centerMove = { row: 1, col: 1 };
    if (board[1][1] === null) {
      return centerMove;
    }

    // Chiến thuật 4: Đánh góc nếu còn trống
    const corners = [
      { row: 0, col: 0 }, { row: 0, col: 2 },
      { row: 2, col: 0 }, { row: 2, col: 2 }
    ];
    for (const corner of corners) {
      if (board[corner.row][corner.col] === null) {
        return corner;
      }
    }

    // Chiến thuật 5: Đánh cạnh nếu còn trống
    const edges = [
      { row: 0, col: 1 }, { row: 1, col: 0 },
      { row: 1, col: 2 }, { row: 2, col: 1 }
    ];
    for (const edge of edges) {
      if (board[edge.row][edge.col] === null) {
        return edge;
      }
    }

    // Fallback: Chọn nước đi đầu tiên có thể
    return availableMoves[0];
  }, [checkWinner]);

  // Xử lý lượt đánh
  const handleMove = useCallback((row, col) => {
    if (board[row][col] !== null || gameOver || winner) return;

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);
    setLastMove({ row, col, player: currentPlayer });
    playSound('move');

    // Kiểm tra thắng
    const winCheck = checkWinner(newBoard, row, col);
    if (winCheck) {
      setWinner(currentPlayer);
      setWinningLine(winCheck);
      setGameOver(true);
      setGameWon(true);
      playSound('win');
      
      // Tính điểm - chỉ cộng khi thắng
      if (currentPlayer === 'X') {
        // X thắng = +10 điểm
        setScore(prev => {
          const newScore = prev + 10;
          finalScoreRef.current = newScore; // Cập nhật điểm cuối cùng
          if (newScore > highScore) {
            setHighScore(newScore);
          }
          return newScore;
        });
      } else {
        // O thắng = +10 điểm (cho người chơi)
        setScore(prev => {
          const newScore = prev + 10;
          finalScoreRef.current = newScore; // Cập nhật điểm cuối cùng
          if (newScore > highScore) {
            setHighScore(newScore);
          }
          return newScore;
        });
      }
      
      // Lưu điểm khi game kết thúc
      if (!hasSavedScore && !isSavingScore) {
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
      
      setScoreEffect(true);
      setTimeout(() => setScoreEffect(false), 300);
      return;
    }

    // Kiểm tra hòa
    if (checkDraw(newBoard)) {
      setGameOver(true);
      playSound('draw');
      
      // Hòa không cộng điểm, nhưng vẫn lưu điểm hiện tại
      if (!hasSavedScore && !isSavingScore) {
        setHasSavedScore(true);
        setTimeout(() => {
          saveHighScore(finalScoreRef.current).then(() => {
            if (onGameEnd) {
              onGameEnd();
            }
          });
        }, 200);
      }
      return;
    }

    // Chuyển lượt
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextPlayer);

    // AI sẽ được gọi tự động qua useEffect khi currentPlayer = 'O'
  }, [board, currentPlayer, gameOver, winner, gameMode, checkWinner, checkDraw, hasSavedScore, isSavingScore, onGameEnd, playSound]);

  // Xử lý lượt đánh của AI (tách riêng để tránh vòng lặp)
  const handleAIMove = useCallback((currentBoard) => {
    if (gameOver || winner || currentPlayer !== 'O') return;

    const aiMove = makeAIMove(currentBoard);
    if (aiMove && currentBoard[aiMove.row][aiMove.col] === null) {
      // Tạo board mới cho AI
      const newBoard = currentBoard.map(row => [...row]);
      newBoard[aiMove.row][aiMove.col] = 'O';
      setBoard(newBoard);
      setLastMove({ row: aiMove.row, col: aiMove.col, player: 'O' });
      playSound('move');

      // Kiểm tra thắng cho AI
      const winCheck = checkWinner(newBoard, aiMove.row, aiMove.col);
      if (winCheck) {
        setWinner('O');
        setWinningLine(winCheck);
        setGameOver(true);
        setGameWon(true);
        playSound('win');
        
        // Tính điểm cho AI - chỉ cộng khi thắng
        if (currentPlayer === 'O') {
          // O thắng = +10 điểm (cho người chơi)
          setScore(prev => {
            const newScore = prev + 10;
            finalScoreRef.current = newScore; // Cập nhật điểm cuối cùng
            if (newScore > highScore) {
              setHighScore(newScore);
            }
            return newScore;
          });
        }
        
        // Lưu điểm khi game kết thúc
        if (!hasSavedScore && !isSavingScore) {
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
        
        setScoreEffect(true);
        setTimeout(() => setScoreEffect(false), 300);
        return;
      }

      // Kiểm tra hòa
      if (checkDraw(newBoard)) {
        setGameOver(true);
        playSound('draw');
        
        // Hòa không cộng điểm, nhưng vẫn lưu điểm hiện tại
        if (!hasSavedScore && !isSavingScore) {
          setHasSavedScore(true);
          setTimeout(() => {
            saveHighScore(finalScoreRef.current).then(() => {
              if (onGameEnd) {
                onGameEnd();
              }
            });
          }, 200);
        }
        return;
      }

      // Chuyển lượt về người chơi
      setCurrentPlayer('X');
    }
  }, [gameOver, winner, currentPlayer, makeAIMove, checkWinner, checkDraw, hasSavedScore, isSavingScore, onGameEnd, playSound]);

  // Cập nhật finalScoreRef mỗi khi score thay đổi
  useEffect(() => {
    finalScoreRef.current = score;
  }, [score]);

  // Theo dõi lượt AI
  useEffect(() => {
    if (gameMode === 'vsAI' && currentPlayer === 'O' && !gameOver && !winner && gameStarted) {
      const timer = setTimeout(() => {
        handleAIMove(board);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, gameOver, winner, gameStarted, board, handleAIMove]);

  // Handle mouse click
  const handleCanvasClick = useCallback((e) => {
    if (!gameStarted || gameOver || winner) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / (CELL_SIZE + CELL_MARGIN));
    const row = Math.floor(y / (CELL_SIZE + CELL_MARGIN));
    
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      handleMove(row, col);
    }
  }, [gameStarted, gameOver, winner, handleMove]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;

      if (!gameStarted) {
        setGameStarted(true);
        setGameRunning(true);
      }

      if (e.key === 'r' || e.key === 'R') {
        restartGame();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameRunning, gameOver, gameStarted]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const pos = i * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN;
      
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, CELL_MARGIN);
      ctx.lineTo(pos, CANVAS_SIZE - CELL_MARGIN);
      ctx.stroke();
      
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(CELL_MARGIN, pos);
      ctx.lineTo(CANVAS_SIZE - CELL_MARGIN, pos);
      ctx.stroke();
    }

    // Draw pieces
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const x = j * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const y = i * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const value = board[i][j];

        if (value === 'X') {
          // Draw X
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x - 20, y - 20);
          ctx.lineTo(x + 20, y + 20);
          ctx.moveTo(x + 20, y - 20);
          ctx.lineTo(x - 20, y + 20);
          ctx.stroke();
        } else if (value === 'O') {
          // Draw O
          ctx.strokeStyle = '#3498db';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, 20, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    }

    // Draw winning line
    if (winningLine) {
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 6;
      ctx.beginPath();
      
      if (winningLine.type === 'horizontal') {
        const y = winningLine.row * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const startX = winningLine.startCol * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const endX = winningLine.endCol * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      } else if (winningLine.type === 'vertical') {
        const x = winningLine.col * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const startY = winningLine.startRow * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const endY = winningLine.endRow * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      } else if (winningLine.type === 'diagonal') {
        const startX = winningLine.startCol * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const startY = winningLine.startRow * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const endX = winningLine.endCol * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        const endY = winningLine.endRow * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN + CELL_SIZE / 2;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
      }
      
      ctx.stroke();
    }

    // Highlight current player
    if (!gameOver && !winner) {
      // Đã chuyển hiển thị lượt đánh ra ngoài UI chính
    }
  }, [board, currentPlayer, winningLine, gameOver, winner]);

  const restartGame = () => {
    setScore(0);
    finalScoreRef.current = 0; // Reset điểm cuối cùng
    setBoard(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
    setCurrentPlayer('X');
    setGameOver(false);
    setGameWon(false);
    setGameRunning(false);
    setGameStarted(false);
    setWinner(null);
    setWinningLine(null);
    setHasSavedScore(false); // Reset trạng thái lưu điểm
    setIsSavingScore(false); // Reset trạng thái đang lưu
    setScoreEffect(false);
    setLastMove(null);
    
    if (gameId) {
      localStorage.removeItem(`caroGame_${gameId}`);
    }
  };

  const handleCanvasClickWrapper = () => {
    setIsFocused(true);
    canvasRef.current?.focus();
  };

  const handleCanvasBlur = () => {
    setIsFocused(false);
  };

  const handleGameModeChange = (event, newMode) => {
    if (newMode !== null) {
      setGameMode(newMode);
      restartGame();
    }
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#2c3e50', mb: 2 }}>
        ⚫ Cờ Caro 3x3
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography 
          variant="h6" 
          component="span"
          sx={{
            color: scoreEffect ? '#e74c3c' : 'inherit',
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
        {winner && (
          <Typography variant="h6" component="span" sx={{ color: '#f39c12', fontWeight: 'bold' }}>
            🏆 {winner === 'X' ? 'X Thắng!' : 'O Thắng!'}
          </Typography>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={gameMode}
          exclusive
          onChange={handleGameModeChange}
          aria-label="game mode"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="vsPlayer" aria-label="2 người chơi">
            2 Người Chơi
          </ToggleButton>
          <ToggleButton value="vsAI" aria-label="chơi với máy">
            Chơi Với Máy
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Hiển thị lượt đánh đẹp mắt */}
      {!gameOver && !winner && gameStarted && (
        <Box sx={{ 
          mb: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 2,
          alignItems: 'center'
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            borderRadius: 2,
            background: currentPlayer === 'X' ? 'linear-gradient(45deg, #e74c3c 30%, #c0392b 90%)' : 'rgba(231, 76, 60, 0.1)',
            color: currentPlayer === 'X' ? 'white' : '#e74c3c',
            transform: currentPlayer === 'X' ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s ease',
            boxShadow: currentPlayer === 'X' ? '0 4px 8px rgba(231, 76, 60, 0.3)' : 'none',
            minWidth: '80px',
            justifyContent: 'center'
          }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              X
            </Typography>
            {currentPlayer === 'X' && (
              <Typography variant="body2" sx={{ ml: 1 }}>
                Lượt của bạn
              </Typography>
            )}
          </Box>

          <Typography variant="h6" sx={{ color: '#666' }}>
            VS
          </Typography>

          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            borderRadius: 2,
            background: currentPlayer === 'O' ? 'linear-gradient(45deg, #3498db 30%, #2980b9 90%)' : 'rgba(52, 152, 219, 0.1)',
            color: currentPlayer === 'O' ? 'white' : '#3498db',
            transform: currentPlayer === 'O' ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s ease',
            boxShadow: currentPlayer === 'O' ? '0 4px 8px rgba(52, 152, 219, 0.3)' : 'none',
            minWidth: '80px',
            justifyContent: 'center'
          }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              O
            </Typography>
            {currentPlayer === 'O' && (
              <Typography variant="body2" sx={{ ml: 1 }}>
                {gameMode === 'vsAI' ? 'Lượt máy' : 'Lượt của bạn'}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE + 30}
          style={{
            border: isFocused ? '3px solid #2c3e50' : '3px solid #666',
            borderRadius: '10px',
            background: '#f0f0f0',
            cursor: 'pointer',
            outline: 'none'
          }}
          tabIndex={0}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasClickWrapper}
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
              {isFocused ? 'Click vào ô để bắt đầu chơi!' : 'Click vào game để bắt đầu'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              X: Đánh dấu X (đỏ)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              O: Đánh dấu O (xanh)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Ghép 3 ô liên tiếp để thắng!
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
            <Typography variant="h5" gutterBottom>
              {winner ? `${winner === 'X' ? 'X' : 'O'} Thắng!` : 'Hòa!'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Điểm của bạn: {score}
            </Typography>
            {score > highScore && (
              <Typography variant="body2" sx={{ color: '#f39c12', mb: 2 }}>
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
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={restartGame}
          sx={{ 
            background: 'linear-gradient(45deg, #e74c3c 30%, #c0392b 90%)',
            boxShadow: '0 3px 5px 2px rgba(231, 76, 60, .3)'
          }}
        >
          🔄 Reset Game
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {isFocused ? '✅ Sẵn sàng chơi! Dùng: Click | R' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
      </Box>
    </Box>
  );
};

export default CaroGame; 