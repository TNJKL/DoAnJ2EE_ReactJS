import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const PikachuGame = ({ onGameEnd }) => {
  // Game constants
  const BOARD_SIZE = 10; // Tăng từ 8 lên 10
  const CELL_SIZE = 55; // Giảm từ 60 xuống 55 để vừa màn hình
  const MOVES_LIMIT = 1000; // Tăng từ 30 lên 1000 để bỏ giới hạn điểm
  const SHUFFLE_LIMIT = 10;
  const TIME_LIMIT = 300; // 5 phút

  // Pokemon images (classic gen 1 Pokemon) - MOVED HERE
  const POKEMON_IMAGES = [
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', // Pikachu
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',  // Squirtle
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',  // Charmander
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',  // Bulbasaur
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png', // Jigglypuff
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png', // Eevee
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png', // Meowth
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png', // Psyduck
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png', // Snorlax
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',  // Charizard
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png',  // Blastoise
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',  // Venusaur
  ];

  // Generate board with pairs for matching game
  function generateBoard() {
    const newBoard = [];
    const totalCells = BOARD_SIZE * BOARD_SIZE;
    const pokemonTypes = POKEMON_IMAGES.length;
    
    // Tạo mảng Pokemon với số lượng chẵn cho mỗi loại
    const pokemonArray = [];
    const pairsPerType = Math.floor(totalCells / pokemonTypes / 2) * 2; // Đảm bảo số chẵn
    
    for (let i = 0; i < pokemonTypes; i++) {
      for (let j = 0; j < pairsPerType; j++) {
        pokemonArray.push(i);
      }
    }
    
    // Thêm Pokemon còn lại để đủ 64 ô (đảm bảo số chẵn)
    const remainingCells = totalCells - pokemonArray.length;
    if (remainingCells > 0) {
      // Thêm từng cặp Pokemon để đảm bảo có thể ghép được
      for (let i = 0; i < remainingCells; i += 2) {
        const randomType = Math.floor(Math.random() * pokemonTypes);
        pokemonArray.push(randomType);
        if (i + 1 < remainingCells) {
          pokemonArray.push(randomType); // Thêm cặp
        }
      }
    }
    
    // Xáo trộn mảng
    for (let i = pokemonArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pokemonArray[i], pokemonArray[j]] = [pokemonArray[j], pokemonArray[i]];
    }
    
    // Đặt vào board
    let pokemonIndex = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      newBoard[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (pokemonIndex < pokemonArray.length) {
          newBoard[i][j] = pokemonArray[pokemonIndex++];
        } else {
          newBoard[i][j] = null; // Ô trống nếu không đủ Pokemon
        }
      }
    }
    
    return newBoard;
  }

  // Game state
  const [board, setBoard] = useState(() => generateBoard());
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [shuffles, setShuffles] = useState(SHUFFLE_LIMIT);
  const [round, setRound] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const [showPopup, setShowPopup] = useState(false);
  const [popupText, setPopupText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [highlightedPairs, setHighlightedPairs] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

  // Refs
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const finalScoreRef = useRef(0);

  // Sound effects
  const playSound = useCallback((type) => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    try {
      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      let frequency, duration;
      
      switch (type) {
        case 'match':
          frequency = 800;
          duration = 0.2;
          break;
        case 'swap':
          frequency = 400;
          duration = 0.1;
          break;
        case 'shuffle':
          frequency = 300;
          duration = 0.3;
          break;
        case 'win':
          frequency = 1200;
          duration = 0.5;
          break;
        case 'gameover':
          frequency = 200;
          duration = 0.8;
          break;
        default:
          frequency = 600;
          duration = 0.2;
      }
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.log('Audio error:', error);
    }
  }, [soundEnabled]);

  // Load high score
  const loadHighScore = useCallback(async () => {
  try {
    const pathParts = window.location.pathname.split('/');
    const gameIdFromPath = pathParts[pathParts.length - 1];
    const storedUsername = localStorage.getItem('username');
    
    if (!gameIdFromPath || !storedUsername) return;
    
    setGameId(gameIdFromPath);
    setUsername(storedUsername);
    
    const response = await axios.get(`http://localhost:8080/api/user/games/${gameIdFromPath}/highscore`, {
      params: { username: storedUsername }
    });
    
    if (response.data && response.data.score) {
      setHighScore(response.data.score);
    }
  } catch (error) {
    console.log('Error loading high score:', error);
    // Nếu không load được từ server, thử load từ localStorage
    const localHighScore = localStorage.getItem('pikachuGame_highScore');
    if (localHighScore) {
      setHighScore(parseInt(localHighScore));
    }
  }
}, []);

  // Save high score
  const saveHighScore = useCallback(async (finalScore) => {
    if (!gameId || !username || isSavingScore) return;
    
    try {
      setIsSavingScore(true);
      console.log('Attempting to save score:', finalScore, 'for game:', gameId);
      
      const response = await axios.post(`http://localhost:8080/api/user/games/${gameId}/score`, {
        score: finalScore,
        username: username
      });
      
      console.log('High score save response:', response.data);
      
      // Cập nhật high score từ response nếu có
      if (response.data.newHighScore) {
        setHighScore(response.data.newHighScore);
        console.log('New high score updated:', response.data.newHighScore);
      }
      setHasSavedScore(true);
      
      // Gọi callback để refresh leaderboard
      if (onGameEnd) {
        onGameEnd();
      }
    } catch (error) {
      console.error('Error saving score:', error);
      // Fallback: lưu vào localStorage
      localStorage.setItem('pikachuGame_highScore', finalScore.toString());
      if (finalScore > highScore) {
        setHighScore(finalScore);
      }
      setHasSavedScore(true);
      
      // Gọi callback để refresh leaderboard
      if (onGameEnd) {
        onGameEnd();
      }
    } finally {
      setIsSavingScore(false);
    }
  }, [gameId, username, isSavingScore, highScore]);

  // Draw board
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Check if board is properly initialized
    if (!Array.isArray(board) || board.length !== BOARD_SIZE) return;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!Array.isArray(board[i]) || board[i].length !== BOARD_SIZE) return;
    }
    
    // Draw background
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw geometric patterns
    ctx.strokeStyle = '#3949ab';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      for (let j = 0; j < canvas.height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(i, j);
        ctx.lineTo(i + 20, j + 20);
        ctx.lineTo(i, j + 40);
        ctx.stroke();
      }
    }
    
    // Draw Pokemon tiles
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const pokemon = board[i][j];
        if (pokemon === null) continue;
        
        const x = j * CELL_SIZE;
        const y = i * CELL_SIZE;
        
        // Draw tile background (không highlight gợi ý nữa)
        ctx.fillStyle = '#f5f5dc';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeStyle = '#d2691e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        
        // Draw Pokemon image
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x + 8, y + 8, CELL_SIZE - 16, CELL_SIZE - 16);
        };
        img.onerror = () => {
          // Fallback: draw colored circle with number
          ctx.fillStyle = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'][pokemon % 6];
          ctx.beginPath();
          ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, CELL_SIZE/3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(pokemon + 1, x + CELL_SIZE/2, y + CELL_SIZE/2 + 4);
        };
        img.src = POKEMON_IMAGES[pokemon];
        
        // Highlight selected tile
        if (selected && selected.row === i && selected.col === j) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }
  }, [board, selected, highlightedPairs]);



  // Handle canvas click
  const handleCanvasClick = useCallback((event) => {
    if (gameOver) return;
    
    // Start game on first click
    if (!gameStarted) {
      setGameStarted(true);
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      const clickedPokemon = board[row][col];
      
      // Nếu ô đã được chọn trước đó
      if (selected) {
        // Kiểm tra xem có phải cùng một ô không
        if (selected.row === row && selected.col === col) {
          // Bỏ chọn ô hiện tại
          setSelected(null);
          playSound('swap');
          return;
        }
        
        // Kiểm tra xem có phải cùng loại Pokemon không
        if (board[selected.row][selected.col] === clickedPokemon) {
          // Kiểm tra xem có thể nối được không (cùng hàng/cột và có đường đi)
          if (canConnect(selected.row, selected.col, row, col)) {
            // Ghép thành công - xóa cả 2 ô
            const newBoard = board.map(row => [...row]);
            newBoard[selected.row][selected.col] = null;
            newBoard[row][col] = null;
            
            setBoard(newBoard);
            setSelected(null);
            setMoves(prev => prev + 1);
            
            // Cộng điểm
            setScore(prev => {
              const newScore = prev + 100;
              finalScoreRef.current = newScore;
              if (newScore > highScore) {
                setHighScore(newScore);
              }
              return newScore;
            });
            
            // Hiệu ứng điểm
            setPopupText('+100');
            setPopupPosition({ x: event.clientX, y: event.clientY });
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 1000);
            
            playSound('match');
            
            // Kiểm tra game over
            setTimeout(() => {
              checkGameOver();
            }, 300);
          } else {
            // Không thể nối - chọn ô mới
            setSelected({ row, col });
            playSound('swap');
          }
        } else {
          // Không cùng loại - chọn ô mới
          setSelected({ row, col });
          playSound('swap');
        }
      } else {
        // Chọn ô đầu tiên
        setSelected({ row, col });
        playSound('swap');
      }
    }
  }, [selected, board, gameOver, gameStarted, playSound, highScore]);

  // Kiểm tra xem có thể nối 2 ô không (logic Pikachu classic)
  const canConnect = useCallback((row1, col1, row2, col2) => {
    // Không thể nối chính nó
    if (row1 === row2 && col1 === col2) {
      return false;
    }
    
    // Phải cùng loại Pokemon
    if (board[row1][col1] !== board[row2][col2]) {
      return false;
    }
    
    // Kiểm tra đường đi - có thể nối bằng 0, 1, hoặc 2 đường gấp khúc
    return canConnectWithTurns(row1, col1, row2, col2, 0) ||
           canConnectWithTurns(row1, col1, row2, col2, 1) ||
           canConnectWithTurns(row1, col1, row2, col2, 2);
  }, [board]);
  
  // Kiểm tra đường đi với số lần gấp khúc
  const canConnectWithTurns = useCallback((row1, col1, row2, col2, turns) => {
    if (turns === 0) {
      // Đường thẳng - cùng hàng hoặc cùng cột
      if (row1 === row2) {
        // Cùng hàng - kiểm tra cột
        const minCol = Math.min(col1, col2);
        const maxCol = Math.max(col1, col2);
        
        for (let col = minCol + 1; col < maxCol; col++) {
          if (board[row1][col] !== null) {
            return false;
          }
        }
        return true;
      } else if (col1 === col2) {
        // Cùng cột - kiểm tra hàng
        const minRow = Math.min(row1, row2);
        const maxRow = Math.max(row1, row2);
        
        for (let row = minRow + 1; row < maxRow; row++) {
          if (board[row][col1] !== null) {
            return false;
          }
        }
        return true;
      }
      return false;
    } else if (turns === 1) {
      // 1 lần gấp khúc - kiểm tra các điểm trung gian
      for (let i = 0; i < BOARD_SIZE; i++) {
        // Thử điểm trung gian (row1, i)
        if (canConnectWithTurns(row1, col1, row1, i, 0) && 
            canConnectWithTurns(row1, i, row2, col2, 0) &&
            board[row1][i] === null) {
          return true;
        }
        
        // Thử điểm trung gian (i, col1)
        if (canConnectWithTurns(row1, col1, i, col1, 0) && 
            canConnectWithTurns(i, col1, row2, col2, 0) &&
            board[i][col1] === null) {
          return true;
        }
      }
      return false;
    } else if (turns === 2) {
      // 2 lần gấp khúc - kiểm tra các điểm trung gian
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (board[i][j] === null) {
            // Thử điểm trung gian (i, j)
            if (canConnectWithTurns(row1, col1, i, j, 0) && 
                canConnectWithTurns(i, j, row2, col2, 1)) {
              return true;
            }
          }
        }
      }
      return false;
    }
    
    return false;
  }, [board]);

  // Check game over - kiểm tra xem còn cặp nào có thể ghép không
  const checkGameOver = useCallback(() => {
    // Kiểm tra xem còn Pokemon nào không
    let remainingPokemon = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] !== null) {
          remainingPokemon++;
        }
      }
    }
    
    // Nếu hết Pokemon - WINNER!
    if (remainingPokemon === 0) {
      setGameWon(true);
      setGameOver(true);
      playSound('win');
      
      // Lưu điểm khi thắng
      if (finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
        setHasSavedScore(true);
        setTimeout(() => {
          saveHighScore(finalScoreRef.current).then(() => {
            if (onGameEnd) onGameEnd();
          });
        }, 200);
      }
      return;
    }
    
    // Kiểm tra tất cả các cặp có thể ghép được
    let hasValidPairs = false;
    let totalPairs = 0;
    let validPairs = 0;
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] !== null) {
          // Tìm Pokemon giống nhau có thể nối được
          for (let k = 0; k < BOARD_SIZE; k++) {
            for (let l = 0; l < BOARD_SIZE; l++) {
              if ((i !== k || j !== l) && board[k][l] !== null && board[i][j] === board[k][l]) {
                totalPairs++;
                if (canConnect(i, j, k, l)) {
                  validPairs++;
                  hasValidPairs = true;
                  break;
                }
              }
            }
            if (hasValidPairs) break;
          }
        }
        if (hasValidPairs) break;
      }
    }
    
    console.log('Total pairs found:', totalPairs, 'Valid pairs:', validPairs);
    
    // Nếu không còn cặp nào có thể ghép - GAME OVER
    if (!hasValidPairs) {
      console.log('Game Over - No valid pairs found. Score:', finalScoreRef.current);
      setGameOver(true);
      setGameWon(false);
      playSound('gameover');
      
      // Lưu điểm khi thua
      if (finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
        setHasSavedScore(true);
        setTimeout(() => {
          saveHighScore(finalScoreRef.current).then(() => {
            if (onGameEnd) onGameEnd();
          });
        }, 200);
      }
    }
  }, [board, canConnect, playSound, hasSavedScore, isSavingScore, onGameEnd]);
  
  // Tìm và highlight các cặp có thể ghép được
  const findHighlightedPairs = useCallback(() => {
    const pairs = [];
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] !== null) {
          for (let k = 0; k < BOARD_SIZE; k++) {
            for (let l = 0; l < BOARD_SIZE; l++) {
              if ((i !== k || j !== l) && board[k][l] !== null && board[i][j] === board[k][l]) {
                if (canConnect(i, j, k, l)) {
                  pairs.push({ row1: i, col1: j, row2: k, col2: l });
                }
              }
            }
          }
        }
      }
    }
    
    console.log('Found', pairs.length, 'valid pairs');
    setHighlightedPairs(pairs);
  }, [board, canConnect]);



  // Shuffle board - chỉ xáo trộn các ô còn lại
  const shuffleBoard = useCallback(() => {
    if (shuffles <= 0) return;
    
    setShuffles(prev => prev - 1);
    
    // Lấy tất cả Pokemon còn lại
    const remainingPokemon = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] !== null) {
          remainingPokemon.push(board[i][j]);
        }
      }
    }
    
    // Xáo trộn mảng
    for (let i = remainingPokemon.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingPokemon[i], remainingPokemon[j]] = [remainingPokemon[j], remainingPokemon[i]];
    }
    
    // Tạo board mới với các Pokemon đã xáo trộn
    const newBoard = [];
    let pokemonIndex = 0;
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      newBoard[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (pokemonIndex < remainingPokemon.length) {
          newBoard[i][j] = remainingPokemon[pokemonIndex++];
        } else {
          newBoard[i][j] = null;
        }
      }
    }
    
    setBoard(newBoard);
    setSelected(null);
    playSound('shuffle');
  }, [shuffles, board, playSound]);

  // Reset game
  const resetGame = useCallback(() => {
    setBoard(generateBoard());
    setSelected(null);
    setScore(0);
    setMoves(0);
    setShuffles(SHUFFLE_LIMIT);
    setRound(1);
    setGameOver(false);
    setGameWon(false);
    setGameStarted(false);
    setHasSavedScore(false);
    setShowPopup(false);
    setTimeLeft(TIME_LIMIT);
    playSound('swap');
  }, [playSound]);

  // Initialize game
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const gameIdFromPath = pathParts[pathParts.length - 1];
    setGameId(gameIdFromPath);
    
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    
    loadHighScore();
    
    // Initialize audio context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [loadHighScore]);

  // Update final score ref
  useEffect(() => {
    finalScoreRef.current = score;
  }, [score]);

  // Game over effect
  useEffect(() => {
    if (gameOver && !hasSavedScore && !isSavingScore) {
      setHasSavedScore(true);
      saveHighScore(finalScoreRef.current);
      playSound('gameover');
      if (onGameEnd) onGameEnd();
    }
  }, [gameOver, hasSavedScore, isSavingScore, saveHighScore, playSound, onGameEnd]);

  // Check game over - bỏ giới hạn moves để không giới hạn điểm
  // useEffect(() => {
  //   if (moves >= MOVES_LIMIT) {
  //     setGameOver(true);
  //   }
  // }, [moves]);

  // Draw board effect
  useEffect(() => {
    drawBoard();
  }, [drawBoard]);
  
  // Auto-find highlightable pairs
  useEffect(() => {
    if (gameStarted && !gameOver) {
      findHighlightedPairs();
    }
  }, [board, gameStarted, gameOver, findHighlightedPairs]);
  
  // Timer effect
  useEffect(() => {
    let timer;
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            setGameWon(false);
            playSound('gameover');
            
            // Lưu điểm khi hết thời gian
            if (finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
              setHasSavedScore(true);
              setTimeout(() => {
                saveHighScore(finalScoreRef.current).then(() => {
                  if (onGameEnd) onGameEnd();
                });
              }, 200);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameStarted, gameOver, timeLeft, playSound, hasSavedScore, isSavingScore, saveHighScore, onGameEnd]);

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#ffd700', mb: 2 }}>
        🎮 Pikachu Game
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span">
          Điểm: {score}
        </Typography>
        <Typography variant="h6" component="span">
          Điểm cao nhất: {highScore}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#FF9800' }}>
          Bàn: {round}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#E91E63' }}>
          Lượt đổi: {shuffles}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: timeLeft <= 30 ? '#f44336' : '#4caf50' }}>
          Thời gian: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={BOARD_SIZE * CELL_SIZE}
              height={BOARD_SIZE * CELL_SIZE}
              style={{
                border: '3px solid #ffd700',
                borderRadius: '10px',
                background: '#1a237e',
                cursor: 'pointer',
                outline: 'none'
              }}
              onClick={handleCanvasClick}
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
                  Click để bắt đầu chơi
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Click vào 2 Pokemon giống nhau để ghép
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Có thể nối bằng đường thẳng hoặc gấp khúc (tối đa 2 lần)
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Ghép hết tất cả Pokemon để thắng
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Mỗi cặp ghép: +100 điểm
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Thời gian: 5 phút
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
                <Typography variant="h5" gutterBottom sx={{ color: gameWon ? '#ffd700' : '#f44336' }}>
                  {gameWon ? '🎉 WINNER!' : 'Game Over!'}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Điểm của bạn: {score}
                </Typography>
                {gameWon && (
                  <Typography variant="body2" sx={{ color: '#ffd700', mb: 2 }}>
                    🏆 Bạn đã ghép hết tất cả Pokemon!
                  </Typography>
                )}
                {!gameWon && timeLeft === 0 && (
                  <Typography variant="body2" sx={{ color: '#f44336', mb: 2 }}>
                    ⏰ Hết thời gian!
                  </Typography>
                )}
                {score > highScore && (
                  <Typography variant="body2" sx={{ color: '#ffd700', mb: 2 }}>
                    🎉 Điểm cao mới!
                  </Typography>
                )}
                <Button 
                  variant="contained" 
                  onClick={resetGame}
                  sx={{ mt: 1 }}
                >
                  Chơi lại
                </Button>
              </Box>
            )}
          </Box>
          
          {/* Thanh thời gian bên phải */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            minWidth: 60
          }}>
            <Box sx={{
              width: 20,
              height: BOARD_SIZE * CELL_SIZE,
              background: 'linear-gradient(to bottom, #4caf50, #ffeb3b, #ff9800, #f44336)',
              borderRadius: '10px',
              mb: 1,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Thanh thời gian động */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${(timeLeft / TIME_LIMIT) * 100}%`,
                background: timeLeft <= 30 ? '#f44336' : 
                           timeLeft <= 60 ? '#ff9800' : 
                           timeLeft <= 120 ? '#ffeb3b' : '#4caf50',
                transition: 'height 1s ease-in-out'
              }} />
            </Box>
            <Typography variant="body2" sx={{ 
              color: '#fff', 
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              fontSize: '12px'
            }}>
              Thời gian
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => setSoundEnabled(!soundEnabled)}
          sx={{ 
            backgroundColor: soundEnabled ? '#4caf50' : '#f44336',
            '&:hover': { backgroundColor: soundEnabled ? '#45a049' : '#da190b' }
          }}
        >
          🔊 {soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        </Button>
        
        <Button
          variant="contained"
          onClick={shuffleBoard}
          disabled={shuffles <= 0}
          sx={{ 
            backgroundColor: shuffles > 0 ? '#2196f3' : '#ccc',
            '&:hover': { backgroundColor: shuffles > 0 ? '#1976d2' : '#ccc' }
          }}
        >
          🔄 Đổi vị trí ({shuffles})
        </Button>
        
        <Button
          variant="contained"
          onClick={resetGame}
          sx={{ 
            backgroundColor: '#ff9800',
            '&:hover': { backgroundColor: '#f57c00' }
          }}
        >
          🐾 Chơi lại
        </Button>

        {!gameOver && (
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (!gameOver) {
                setGameOver(true);
                if (!hasSavedScore && !isSavingScore) {
                  setHasSavedScore(true);
                  saveHighScore(score).then(() => {
                    if (onGameEnd) onGameEnd();
                  });
                }
              }
            }}
          >
            Kết thúc
          </Button>
        )}

      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          💡 Click vào 2 Pokemon giống nhau (có thể nối bằng đường thẳng hoặc gấp khúc) để ghép
        </Typography>
      </Box>
    </Box>
  );
};

export default PikachuGame; 