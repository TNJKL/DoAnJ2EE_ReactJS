import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

// Danh sách asset PNG đá quý (có thể thay đổi link nếu cần)
const GEM_IMAGES = [
  'https://static.vecteezy.com/system/resources/thumbnails/026/799/087/small_2x/blue-diamond-gemstone-game-asset-bright-and-beautiful-png.png', // Blue gem (mới)
  'https://static.vecteezy.com/system/resources/thumbnails/026/799/088/small/green-diamond-gemstone-game-asset-bright-and-beautiful-png.png', // Green gem (mới)
  'https://static.vecteezy.com/system/resources/thumbnails/026/791/011/small_2x/red-diamond-gemstone-game-asset-bright-and-beautiful-png.png', // Red gem
  'https://static.vecteezy.com/system/resources/thumbnails/026/790/989/small/gradient-pink-yellow-diamond-gemstone-game-asset-bright-and-beautiful-png.png', // Yellow gem (mới)
  'https://static.vecteezy.com/system/resources/thumbnails/026/799/095/small/purple-diamond-gemstone-game-asset-bright-and-beautiful-png.png', // Purple gem (mới)
  'https://static.vecteezy.com/system/resources/previews/026/799/089/non_2x/pink-diamond-gemstone-game-asset-bright-and-beautiful-png.png', // Pink gem (mới)
];
const BOARD_SIZE = 8;
const CELL_SIZE = 56;
const MOVES_LIMIT = 30;

const GemJewelGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MOVES_LIMIT);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupText, setPopupText] = useState('');
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const gemImgs = useRef([]);
  const audioContextRef = useRef(null);

  // Load images
  useEffect(() => {
    GEM_IMAGES.forEach((src, idx) => {
      const img = new window.Image();
      img.src = src;
      gemImgs.current[idx] = img;
    });
  }, []);

  // Audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => { audioContextRef.current && audioContextRef.current.close(); };
  }, []);

  // Lấy gameId và username
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    setGameId(pathParts[pathParts.length - 1]);
    const user = localStorage.getItem('user');
    if (user) {
      try { setUsername(JSON.parse(user).username); } catch {}
    }
  }, []);

  // Load high score
  useEffect(() => {
    if (gameId && username) loadHighScore();
  }, [gameId, username]);
  const loadHighScore = async () => {
    try {
      const res = await axios.get(`http://localhost:8080/api/user/games/${gameId}/score?username=${username}`);
      setHighScore(res.data.highScore || 0);
    } catch { setHighScore(0); }
  };
  const saveHighScore = async (finalScore) => {
    if (!gameId || !username) return;
    if (isSavingScore) return;
    try {
      setIsSavingScore(true);
      await axios.post(`http://localhost:8080/api/user/games/${gameId}/score`, { score: finalScore, username });
    } catch {} finally { setIsSavingScore(false); }
  };

  // Khởi tạo board không có match ban đầu
  const generateBoard = useCallback(() => {
    let newBoard;
    do {
      newBoard = Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => Math.floor(Math.random() * GEM_IMAGES.length))
      );
    } while (findMatches(newBoard).length > 0);
    return newBoard;
  }, []);

  // Khởi tạo game
  useEffect(() => {
    setBoard(generateBoard());
    setScore(0);
    setMoves(MOVES_LIMIT);
    setCombo(0);
    setGameOver(false);
    setShowPopup(false);
    setHasSavedScore(false);
  }, []);

  // Vẽ board
  useEffect(() => {
    drawBoard();
  }, [board, selected, isAnimating]);

  const drawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Guard: chỉ vẽ khi board đủ dữ liệu
    if (!Array.isArray(board) || board.length !== BOARD_SIZE) return;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!Array.isArray(board[i]) || board[i].length !== BOARD_SIZE) return;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Nền
    ctx.fillStyle = '#2d1e4a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Viền
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    // Vẽ gem
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const gem = board[i][j];
        const img = gemImgs.current[gem];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, j * CELL_SIZE + 4, i * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        } else {
          ctx.fillStyle = '#888';
          ctx.fillRect(j * CELL_SIZE + 4, i * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        }
        // Highlight selected
        if (selected && selected.i === i && selected.j === j) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 4;
          ctx.strokeRect(j * CELL_SIZE + 2, i * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
    }
  };

  // Tìm các match (trả về mảng các toạ độ)
  function findMatches(bd) {
    const matches = [];
    // Ngang
    for (let i = 0; i < BOARD_SIZE; i++) {
      let streak = 1;
      for (let j = 1; j < BOARD_SIZE; j++) {
        if (bd[i][j] === bd[i][j - 1]) streak++;
        else {
          if (streak >= 3) matches.push({ type: 'row', i, j: j - streak, len: streak });
          streak = 1;
        }
      }
      if (streak >= 3) matches.push({ type: 'row', i, j: BOARD_SIZE - streak, len: streak });
    }
    // Dọc
    for (let j = 0; j < BOARD_SIZE; j++) {
      let streak = 1;
      for (let i = 1; i < BOARD_SIZE; i++) {
        if (bd[i][j] === bd[i - 1][j]) streak++;
        else {
          if (streak >= 3) matches.push({ type: 'col', i: i - streak, j, len: streak });
          streak = 1;
        }
      }
      if (streak >= 3) matches.push({ type: 'col', i: BOARD_SIZE - streak, j, len: streak });
    }
    return matches;
  }

  // Xử lý click
  const handleCanvasClick = (e) => {
    if (isAnimating || gameOver) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const j = Math.floor(x / CELL_SIZE);
    const i = Math.floor(y / CELL_SIZE);
    if (i < 0 || i >= BOARD_SIZE || j < 0 || j >= BOARD_SIZE) return;
    if (!selected) {
      setSelected({ i, j });
    } else {
      const { i: si, j: sj } = selected;
      if ((Math.abs(si - i) === 1 && sj === j) || (Math.abs(sj - j) === 1 && si === i)) {
        swapAndCheck(si, sj, i, j);
      } else {
        setSelected({ i, j });
      }
    }
  };

  // Swap 2 viên, chỉ swap nếu tạo được match
  const swapAndCheck = (i1, j1, i2, j2) => {
    const newBoard = board.map(row => [...row]);
    [newBoard[i1][j1], newBoard[i2][j2]] = [newBoard[i2][j2], newBoard[i1][j1]];
    if (findMatches(newBoard).length > 0) {
      setBoard(newBoard);
      setSelected(null);
      setMoves(m => m - 1);
      playSound('swap');
      setTimeout(() => handleMatches(newBoard), 200);
    } else {
      setSelected(null);
      playSound('invalid');
    }
  };

  // Xử lý match, hiệu ứng nổ, rơi, combo
  const handleMatches = (bd) => {
    let matches = findMatches(bd);
    if (matches.length === 0) {
      setCombo(0);
      setIsAnimating(false);
      return;
    }
    setIsAnimating(true);
    setCombo(c => c + 1);
    setScore(s => {
      const add = matches.reduce((acc, m) => acc + m.len * 100 * (combo + 1), 0);
      showPopupEffect('+' + add);
      return s + add;
    });
    playSound('match');
    // Xoá gem matched
    let tempBoard = bd.map(row => [...row]);
    matches.forEach(m => {
      if (m.type === 'row') for (let k = 0; k < m.len; k++) tempBoard[m.i][m.j + k] = null;
      else for (let k = 0; k < m.len; k++) tempBoard[m.i + k][m.j] = null;
    });
    // Rơi xuống
    for (let j = 0; j < BOARD_SIZE; j++) {
      let empty = 0;
      for (let i = BOARD_SIZE - 1; i >= 0; i--) {
        if (tempBoard[i][j] === null) empty++;
        else if (empty > 0) {
          tempBoard[i + empty][j] = tempBoard[i][j];
          tempBoard[i][j] = null;
        }
      }
      for (let i = 0; i < empty; i++) {
        tempBoard[i][j] = Math.floor(Math.random() * GEM_IMAGES.length);
      }
    }
    setTimeout(() => {
      setBoard(tempBoard);
      setTimeout(() => handleMatches(tempBoard), 200);
    }, 200);
  };

  // Hiệu ứng popup điểm
  const showPopupEffect = (text) => {
    setPopupText(text);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 700);
  };

  // Âm thanh
  const playSound = (type) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'match') {
      osc.type = 'triangle'; osc.frequency.value = 900;
      gain.gain.value = 0.08;
      osc.start(); osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'swap') {
      osc.type = 'sine'; osc.frequency.value = 600;
      gain.gain.value = 0.06;
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'invalid') {
      osc.type = 'sawtooth'; osc.frequency.value = 200;
      gain.gain.value = 0.09;
      osc.start(); osc.stop(ctx.currentTime + 0.09);
    }
  };

  // Game over
  useEffect(() => {
    if (moves <= 0 && !gameOver) {
      setGameOver(true);
      setTimeout(() => {
        if (!hasSavedScore && !isSavingScore) {
          setHasSavedScore(true);
          saveHighScore(score);
        }
      }, 300);
    }
  }, [moves, gameOver, hasSavedScore, isSavingScore, score]);

  // UI
  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" sx={{ color: '#FFD700', mb: 2 }}>💎 Gem Jewel Match</Typography>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span" sx={{ color: '#FFD700' }}>Điểm: {score}</Typography>
        <Typography variant="h6" component="span">Điểm cao nhất: {highScore}</Typography>
        <Typography variant="h6" component="span" sx={{ color: '#E74C3C' }}>Lượt: {moves}</Typography>
        <Typography variant="h6" component="span" sx={{ color: '#F39C12' }}>Combo: {combo}</Typography>
      </Box>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE * CELL_SIZE}
          height={BOARD_SIZE * CELL_SIZE}
          style={{
            border: '3px solid #FFD700',
            borderRadius: '10px',
            background: '#2d1e4a',
            cursor: isAnimating || gameOver ? 'not-allowed' : 'pointer',
            outline: 'none',
            boxShadow: '0 0 24px #6c3cff99'
          }}
          tabIndex={0}
          onClick={handleCanvasClick}
        />
        {showPopup && (
          <Box sx={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#FFD700',
            fontWeight: 'bold',
            fontSize: 32,
            px: 4, py: 2,
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 10
          }}>{popupText}</Box>
        )}
        {gameOver && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.92)',
            color: 'white',
            px: 4, py: 3,
            borderRadius: 2,
            textAlign: 'center',
            minWidth: 260
          }}>
            <Typography variant="h5" gutterBottom>Game Over!</Typography>
            <Typography variant="body1" gutterBottom>Điểm của bạn: {score}</Typography>
            <Typography variant="body2" gutterBottom>Combo cao nhất: {combo}</Typography>
            {score > highScore && (
              <Typography variant="body2" sx={{ color: '#FFD700', mb: 2 }}>🎉 Điểm cao mới!</Typography>
            )}
            <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 1 }}>Chơi lại</Button>
          </Box>
        )}
      </Box>
      {/* Nút Kết thúc dưới map, căn giữa */}
      {!gameOver && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (!gameOver) {
                setGameOver(true);
                if (!hasSavedScore && !isSavingScore) {
                  setHasSavedScore(true);
                  saveHighScore(score);
                  if (onGameEnd) onGameEnd();
                }
              }
            }}
          >
            Kết thúc
          </Button>
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Swap 2 viên kề nhau để tạo match 3+. Combo liên tiếp để ghi nhiều điểm!
        </Typography>
      </Box>
    </Box>
  );
};

export default GemJewelGame; 