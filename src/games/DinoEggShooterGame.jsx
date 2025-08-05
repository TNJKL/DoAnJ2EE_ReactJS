import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

// Danh sách hình ảnh trứng
const EGG_IMAGES = [
  'https://cdn-icons-png.flaticon.com/128/7518/7518467.png', // Đỏ
  'https://cdn-icons-png.flaticon.com/128/7518/7518463.png', // Xanh lá
  'https://cdn-icons-png.flaticon.com/128/2049/2049684.png', // Xanh dương
  'https://cdn-icons-png.flaticon.com/128/1296/1296499.png', // Vàng
  'https://cdn-icons-png.flaticon.com/128/2049/2049742.png'  // Tím
];
const ROWS = 10;
const COLS = 12;
const RADIUS = 18;
const SHOOTER_Y = 420;
const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 480;
const SHOOT_SPEED = 7;
const EGG_MARGIN = 2;

const getRandomEggImage = () => EGG_IMAGES[Math.floor(Math.random() * EGG_IMAGES.length)];

function createInitialGrid() {
  // Tạo lưới trứng ban đầu (cho phép có nhóm ≥3 trứng, chỉ nổ khi bắn)
  const grid = [];
  
  for (let row = 0; row < ROWS; row++) {
    const arr = [];
    for (let col = 0; col < COLS; col++) {
      if (row < 6) {
        // Tạo trứng ngẫu nhiên, không cần tránh nhóm ≥3
        arr.push({ image: getRandomEggImage(), popping: false });
      } else {
        arr.push(null);
      }
    }
    grid.push(arr);
  }
  return grid;
}

const DinoEggShooterGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const [grid, setGrid] = useState(createInitialGrid());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [shootingEgg, setShootingEgg] = useState(null); // {x, y, dx, dy, image}
  const [nextEggImage, setNextEggImage] = useState(getRandomEggImage());
  const [angle, setAngle] = useState(0);
  const [isShooting, setIsShooting] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [scoreEffect, setScoreEffect] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // Thêm offset cho lưới trứng
  const [gridOffsetY, setGridOffsetY] = useState(0);
  // Hiệu ứng bàn chân khủng long
  const [showDinoFoot, setShowDinoFoot] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const finalScoreRef = useRef(0);

  // Âm thanh đơn giản bằng Web Audio API
  const audioCtx = useRef(null);
  useEffect(() => {
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioCtx.current && audioCtx.current.state !== 'closed') {
        audioCtx.current.close();
      }
    };
  }, []);
  
  const playSound = useCallback((type) => {
    if (!audioCtx.current || audioCtx.current.state === 'closed') return;
    
    try {
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'shoot') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'pop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (error) {
      console.warn('Audio error:', error);
    }
  }, []);

  // Bắn trứng
  const shootEgg = (angleRad) => {
    if (isShooting || gameOver || gamePaused) return;
    setIsShooting(true);
    const dx = Math.cos(angleRad) * SHOOT_SPEED;
    const dy = Math.sin(angleRad) * SHOOT_SPEED;
    setShootingEgg({
      x: CANVAS_WIDTH / 2,
      y: SHOOTER_Y,
      dx,
      dy,
      image: nextEggImage
    });
    setNextEggImage(getRandomEggImage());
    playSound('shoot');
  };

  // Xử lý va chạm và gắn trứng vào lưới
  const handleEggCollision = (egg) => {
    // Tìm vị trí gắn trứng vào lưới
    let minDistance = Infinity;
    let bestRow = -1;
    let bestCol = -1;
    
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!grid[row][col]) {
          const cx = col * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN;
          const cy = row * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN + gridOffsetY;
          const distance = Math.hypot(egg.x - cx, egg.y - cy);
          if (distance < minDistance) {
            minDistance = distance;
            bestRow = row;
            bestCol = col;
          }
        }
      }
    }
    
    if (bestRow !== -1 && bestCol !== -1) {
      setGrid(prev => {
        const newGrid = prev.map(row => row.slice());
        newGrid[bestRow][bestCol] = { image: egg.image, popping: false };
        
        // Kiểm tra xem trứng mới có tạo thành nhóm ≥3 cùng màu không
        const connectedGroup = findConnectedGroupAt(newGrid, bestRow, bestCol, egg.image);
        if (connectedGroup.length >= 3) {
          console.log(`New egg created group of ${connectedGroup.length} eggs at positions:`, connectedGroup);
          
          // Xóa trứng trong nhóm
          connectedGroup.forEach(([r, c]) => {
            newGrid[r][c] = null;
          });
          
          // Cộng điểm
          setScore(prev => {
            const newScore = prev + connectedGroup.length * 10;
            finalScoreRef.current = newScore;
            setScoreEffect(true);
            setTimeout(() => setScoreEffect(false), 300);
            playSound('pop');
            return newScore;
          });
        }
        
        return newGrid;
      });
    } else {
      // Nếu không tìm được vị trí trống, thử gắn vào vị trí gần nhất có trứng
      setGrid(prev => {
        const newGrid = prev.map(row => row.slice());
        let attached = false;
        let attachedRow = -1;
        let attachedCol = -1;
        
        for (let row = 0; row < ROWS && !attached; row++) {
          for (let col = 0; col < COLS && !attached; col++) {
            if (newGrid[row][col]) {
              const cx = col * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN;
              const cy = row * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN + gridOffsetY;
              const distance = Math.hypot(egg.x - cx, egg.y - cy);
              if (distance < RADIUS * 2) {
                // Tìm vị trí trống gần nhất
                for (let dr = -1; dr <= 1 && !attached; dr++) {
                  for (let dc = -1; dc <= 1 && !attached; dc++) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !newGrid[nr][nc]) {
                      newGrid[nr][nc] = { image: egg.image, popping: false };
                      attached = true;
                      attachedRow = nr;
                      attachedCol = nc;
                      break;
                    }
                  }
                }
              }
            }
          }
        }
        
        // Kiểm tra xem trứng mới có tạo thành nhóm ≥3 cùng màu không
        if (attached) {
          const connectedGroup = findConnectedGroupAt(newGrid, attachedRow, attachedCol, egg.image);
          if (connectedGroup.length >= 3) {
            console.log(`New egg created group of ${connectedGroup.length} eggs at positions:`, connectedGroup);
            
            // Xóa trứng trong nhóm
            connectedGroup.forEach(([r, c]) => {
              newGrid[r][c] = null;
            });
            
            // Cộng điểm
            setScore(prev => {
              const newScore = prev + connectedGroup.length * 10;
              finalScoreRef.current = newScore;
              setScoreEffect(true);
              setTimeout(() => setScoreEffect(false), 300);
              playSound('pop');
              return newScore;
            });
          }
        }
        
        return newGrid;
      });
    }
    setShootingEgg(null);
    setIsShooting(false);
    setGridOffsetY(y => y); // giữ nguyên offset
  };

  // Hàm tìm nhóm trứng liền kề tại vị trí cụ thể
  const findConnectedGroupAt = (grid, startRow, startCol, targetImage) => {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const group = [];
    const stack = [[startRow, startCol]];
    
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      
      // Kiểm tra biên
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (visited[r][c]) continue;
      if (!grid[r][c] || grid[r][c].image !== targetImage) continue;
      
      visited[r][c] = true;
      group.push([r, c]);
      
      // Thêm 8 hướng lân cận (bao gồm đường chéo)
      stack.push([r-1, c]);   // Trên
      stack.push([r+1, c]);   // Dưới
      stack.push([r, c-1]);   // Trái
      stack.push([r, c+1]);   // Phải
      stack.push([r-1, c-1]); // Trên-trái (đường chéo)
      stack.push([r-1, c+1]); // Trên-phải (đường chéo)
      stack.push([r+1, c-1]); // Dưới-trái (đường chéo)
      stack.push([r+1, c+1]); // Dưới-phải (đường chéo)
    }
    
    return group;
  };

  // Tìm các nhóm trứng cùng màu >= 3 để nổ (cải thiện logic)
  const findAndPopGroups = useCallback(() => {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let foundGroup = false;
    let newGrid = grid.map(row => row.slice());
    
    // Hàm DFS để tìm nhóm trứng liền kề (bao gồm đường chéo)
    const findConnectedGroup = (startRow, startCol, targetImage) => {
      const group = [];
      const stack = [[startRow, startCol]];
      
      while (stack.length > 0) {
        const [r, c] = stack.pop();
        
        // Kiểm tra biên
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        if (visited[r][c]) continue;
        if (!newGrid[r][c] || newGrid[r][c].image !== targetImage) continue;
        
        visited[r][c] = true;
        group.push([r, c]);
        
        // Thêm 8 hướng lân cận (bao gồm đường chéo)
        stack.push([r-1, c]);   // Trên
        stack.push([r+1, c]);   // Dưới
        stack.push([r, c-1]);   // Trái
        stack.push([r, c+1]);   // Phải
        stack.push([r-1, c-1]); // Trên-trái (đường chéo)
        stack.push([r-1, c+1]); // Trên-phải (đường chéo)
        stack.push([r+1, c-1]); // Dưới-trái (đường chéo)
        stack.push([r+1, c+1]); // Dưới-phải (đường chéo)
      }
      
      return group;
    };
    
    // Tìm tất cả nhóm trứng
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (newGrid[row][col] && !visited[row][col]) {
          const targetImage = newGrid[row][col].image;
          const group = findConnectedGroup(row, col, targetImage);
          
          // Nếu nhóm >= 3 trứng, nổ chúng
          if (group.length >= 3) {
            console.log(`Found group of ${group.length} eggs at positions:`, group);
            foundGroup = true;
            
            // Xóa trứng trong nhóm
            group.forEach(([r, c]) => {
              newGrid[r][c] = null;
            });
            
            // Cộng điểm
            setScore(prev => {
              const newScore = prev + group.length * 10;
              finalScoreRef.current = newScore;
              setScoreEffect(true);
              setTimeout(() => setScoreEffect(false), 300);
              playSound('pop');
              return newScore;
            });
          }
        }
      }
    }
    
    // Cập nhật grid nếu có nhóm bị nổ
    if (foundGroup) {
      console.log('Updating grid after popping groups');
      setGrid(newGrid);
    }
  }, [grid, playSound]);

  // Game loop
  useEffect(() => {
    if (gameOver || gamePaused) return;
    const interval = setInterval(() => {
      // Di chuyển trứng đang bắn
      if (shootingEgg) {
        let { x, y, dx, dy, image } = shootingEgg;
        x += dx;
        y += dy;
        // Va chạm tường
        if (x < RADIUS || x > CANVAS_WIDTH - RADIUS) {
          dx = -dx;
          x += dx;
        }
        // Va chạm trứng trên lưới hoặc chạm trần
        let collided = false;
        if (y < RADIUS + EGG_MARGIN) collided = true;
        else {
          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
              const cell = grid[row][col];
              if (cell) {
                const cx = col * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN;
                const cy = row * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN + gridOffsetY;
                if (Math.hypot(x - cx, y - cy) < RADIUS * 2 - 2) {
                  collided = true;
                  break;
                }
              }
            }
            if (collided) break;
          }
        }
        if (collided) {
          handleEggCollision({ x, y, image });
        } else {
          setShootingEgg({ x, y, dx, dy, image });
        }
      }
    }, 16);
    return () => clearInterval(interval);
  }, [shootingEgg, grid, gameOver, gamePaused]);

  // Kiểm tra game over và win riêng biệt
  useEffect(() => {
    // Kiểm tra game over: nếu trứng chạm đáy (dùng offset)
    for (let col = 0; col < COLS; col++) {
      for (let row = ROWS - 1; row >= 0; row--) {
        if (grid[row][col]) {
          const cy = row * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN + gridOffsetY;
          if (cy + RADIUS > SHOOTER_Y - 10) {
            setShowDinoFoot(true);
            setTimeout(() => {
              setGameOver(true);
              playSound('fail');
            }, 700); // delay để hiện hiệu ứng bàn chân
            return;
          }
          break;
        }
      }
    }
    // Kiểm tra thắng: nếu không còn trứng
    if (grid.flat().every(cell => !cell)) {
      setGameOver(true);
      playSound('pop');
    }
  }, [grid, gridOffsetY, playSound]);

  // Tham số cho spawn hàng mới
  const SPAWN_ROW_HEIGHT = (RADIUS * 2 + EGG_MARGIN);
  const WARNING_LINE_Y = SHOOTER_Y - 40;

  // Spawn thêm hàng trứng mới khi offset vượt ngưỡng
  useEffect(() => {
    if (gameOver || gamePaused) return;
    if (gridOffsetY >= SPAWN_ROW_HEIGHT) {
      setGrid(prev => {
        const newRow = Array(COLS).fill(null).map(() => ({ image: getRandomEggImage(), popping: false }));
        const newGrid = [newRow, ...prev.slice(0, ROWS - 1)];
        return newGrid;
      });
      setGridOffsetY(y => y - SPAWN_ROW_HEIGHT);
    }
  }, [gridOffsetY, gameOver, gamePaused]);

  // Lưới trứng dịch chuyển xuống từ từ
  useEffect(() => {
    if (gameOver || gamePaused) return;
    const fallSpeed = 0.09; // px mỗi frame (giảm một nửa)
    const interval = setInterval(() => {
      setGridOffsetY(y => y + fallSpeed);
    }, 16);
    return () => clearInterval(interval);
  }, [gameOver, gamePaused]);

  // Thêm refs cho ảnh
  const dinoFootImg = useRef(null);
  const slingshotImg = useRef(null);
  const eggImages = useRef({});
  const backgroundImg = useRef(null);

  // Load ảnh
  useEffect(() => {
    // Load bàn chân khủng long với error handling
    dinoFootImg.current = new window.Image();
    dinoFootImg.current.onload = () => console.log('Dino foot loaded successfully');
    dinoFootImg.current.onerror = () => {
      console.warn('Failed to load dino foot image, using fallback');
      dinoFootImg.current = null;
    };
    dinoFootImg.current.src = 'https://cdn.creazilla.com/cliparts/1395105/dinosaur-leg-clipart-xl.png';
    
    // Load súng cao su với error handling
    slingshotImg.current = new window.Image();
    slingshotImg.current.onload = () => console.log('Slingshot loaded successfully');
    slingshotImg.current.onerror = () => {
      console.warn('Failed to load slingshot image, using fallback');
      slingshotImg.current = null;
    };
    slingshotImg.current.src = 'https://png.pngtree.com/png-clipart/20210912/original/pngtree-slingshot-tool-childhood-game-png-image_6770131.jpg';

    // Load background image với error handling
    backgroundImg.current = new window.Image();
    backgroundImg.current.onload = () => console.log('Background loaded successfully');
    backgroundImg.current.onerror = () => {
      console.warn('Failed to load background image, using fallback');
      backgroundImg.current = null;
    };
    backgroundImg.current.src = 'https://www.shutterstock.com/image-vector/prehistoric-landscape-ancient-plants-volcano-600nw-2496312495.jpg';

    // Load ảnh trứng với error handling
    EGG_IMAGES.forEach((url, index) => {
      const img = new window.Image();
      img.onload = () => console.log(`Egg image ${index + 1} loaded successfully`);
      img.onerror = () => {
        console.warn(`Failed to load egg image ${index + 1}, using fallback`);
        eggImages.current[url] = null;
      };
      img.src = url;
      eggImages.current[url] = img;
    });
  }, []);

  // Vẽ game (cập nhật offset, hiệu ứng bàn chân, vạch cảnh báo, xoay súng)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Vẽ background
    if (backgroundImg.current && backgroundImg.current.complete) {
      // Vẽ background với tỷ lệ phù hợp
      const img = backgroundImg.current;
      const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (CANVAS_WIDTH - scaledWidth) / 2;
      const y = (CANVAS_HEIGHT - scaledHeight) / 2;
      
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    } else {
      // Fallback: vẽ gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(0.6, '#90EE90'); // Light green
      gradient.addColorStop(1, '#8B4513'); // Brown
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Vẽ vạch cảnh báo
    ctx.save();
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, WARNING_LINE_Y);
    ctx.lineTo(CANVAS_WIDTH, WARNING_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    
    // Vẽ lưới trứng (cộng offset)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = grid[row][col];
        if (cell) {
          const cx = col * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN;
          const cy = row * (RADIUS * 2 + EGG_MARGIN) + RADIUS + EGG_MARGIN + gridOffsetY;
          
          // Vẽ trứng bằng hình ảnh
          const img = eggImages.current[cell.image];
          if (img && img.complete && img.naturalWidth > 0) {
            try {
              ctx.save();
              ctx.beginPath();
              ctx.arc(cx, cy, RADIUS, 0, 2 * Math.PI);
              ctx.clip();
              ctx.drawImage(img, cx - RADIUS, cy - RADIUS, RADIUS * 2, RADIUS * 2);
              ctx.restore();
            } catch (error) {
              console.warn('Error drawing egg image:', error);
              // Fallback: vẽ trứng bằng màu sắc
              ctx.beginPath();
              ctx.arc(cx, cy, RADIUS, 0, 2 * Math.PI);
              ctx.fillStyle = '#f0f0f0';
              ctx.shadowColor = '#333';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          } else {
            // Fallback: vẽ trứng bằng màu sắc
            ctx.beginPath();
            ctx.arc(cx, cy, RADIUS, 0, 2 * Math.PI);
            ctx.fillStyle = '#f0f0f0';
            ctx.shadowColor = '#333';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }
    
    // Vẽ trứng đang bắn
    if (shootingEgg) {
      const img = eggImages.current[shootingEgg.image];
      if (img && img.complete && img.naturalWidth > 0) {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(shootingEgg.x, shootingEgg.y, RADIUS, 0, 2 * Math.PI);
          ctx.clip();
          ctx.drawImage(img, shootingEgg.x - RADIUS, shootingEgg.y - RADIUS, RADIUS * 2, RADIUS * 2);
          ctx.restore();
        } catch (error) {
          console.warn('Error drawing shooting egg image:', error);
          // Fallback
          ctx.beginPath();
          ctx.arc(shootingEgg.x, shootingEgg.y, RADIUS, 0, 2 * Math.PI);
          ctx.fillStyle = '#f0f0f0';
          ctx.shadowColor = '#333';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // Fallback
        ctx.beginPath();
        ctx.arc(shootingEgg.x, shootingEgg.y, RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = '#f0f0f0';
        ctx.shadowColor = '#333';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    // Vẽ trứng tiếp theo
    const nextImg = eggImages.current[nextEggImage];
    if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
      try {
        ctx.save();
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH - 40, SHOOTER_Y + 30, RADIUS, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(nextImg, CANVAS_WIDTH - 40 - RADIUS, SHOOTER_Y + 30 - RADIUS, RADIUS * 2, RADIUS * 2);
        ctx.restore();
      } catch (error) {
        console.warn('Error drawing next egg image:', error);
        // Fallback
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH - 40, SHOOTER_Y + 30, RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.stroke();
      }
    } else {
      // Fallback
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH - 40, SHOOTER_Y + 30, RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#f0f0f0';
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.stroke();
    }

    // Vẽ súng cao su bằng ảnh
    if (slingshotImg.current && slingshotImg.current.complete && slingshotImg.current.naturalWidth > 0) {
      try {
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, SHOOTER_Y);
        ctx.rotate(angle);
        ctx.drawImage(slingshotImg.current, -30, -15, 60, 30);
        ctx.restore();
      } catch (error) {
        console.warn('Error drawing slingshot image:', error);
        // Fallback: vẽ súng bằng canvas
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, SHOOTER_Y);
        ctx.rotate(angle);
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        // Vẽ dây thun
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(-15, 5);
        ctx.moveTo(15, -5);
        ctx.lineTo(15, 5);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Fallback: vẽ súng bằng canvas
      ctx.save();
      ctx.translate(CANVAS_WIDTH / 2, SHOOTER_Y);
      ctx.rotate(angle);
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      // Vẽ dây thun
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-15, -5);
      ctx.lineTo(-15, 5);
      ctx.moveTo(15, -5);
      ctx.lineTo(15, 5);
      ctx.stroke();
      ctx.restore();
    }
    // Vẽ hướng bắn (theo chuột)
    ctx.save();
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, SHOOTER_Y);
    ctx.lineTo(CANVAS_WIDTH / 2 + 60 * Math.cos(angle), SHOOTER_Y + 60 * Math.sin(angle));
    ctx.stroke();
    ctx.restore();
    // Vẽ hiệu ứng bàn chân khủng long bằng ảnh
    if (showDinoFoot) {
      if (dinoFootImg.current && dinoFootImg.current.complete && dinoFootImg.current.naturalWidth > 0) {
        try {
          ctx.save();
          // Vẽ bàn chân khủng long với kích thước và vị trí phù hợp
          ctx.drawImage(dinoFootImg.current, CANVAS_WIDTH / 2 - 50, SHOOTER_Y - 100, 100, 100);
          ctx.restore();
        } catch (error) {
          console.warn('Error drawing dino foot image:', error);
          // Fallback: vẽ bàn chân bằng canvas
          ctx.save();
          ctx.beginPath();
          ctx.arc(CANVAS_WIDTH / 2, SHOOTER_Y - 30, 60, Math.PI, 2 * Math.PI);
          ctx.fillStyle = '#a1887f';
          ctx.fill();
          ctx.strokeStyle = '#5d4037';
          ctx.lineWidth = 6;
          ctx.stroke();
          // Vẽ móng
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.arc(CANVAS_WIDTH / 2 + i * 30, SHOOTER_Y + 20, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#fffde7';
            ctx.fill();
            ctx.strokeStyle = '#bdbdbd';
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        // Fallback: vẽ bàn chân bằng canvas
        ctx.save();
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, SHOOTER_Y - 30, 60, Math.PI, 2 * Math.PI);
        ctx.fillStyle = '#a1887f';
        ctx.fill();
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 6;
        ctx.stroke();
        // Vẽ móng
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(CANVAS_WIDTH / 2 + i * 30, SHOOTER_Y + 20, 16, 0, Math.PI * 2);
          ctx.fillStyle = '#fffde7';
          ctx.fill();
          ctx.strokeStyle = '#bdbdbd';
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }, [grid, shootingEgg, nextEggImage, angle, gridOffsetY, showDinoFoot]);

  // Khẩu pháo luôn hướng theo chuột
  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - CANVAS_WIDTH / 2;
      const dy = my - SHOOTER_Y;
      let angleRad = Math.atan2(dy, dx);
      // Không giới hạn, cho phép xoay từ -π đến +π
      setAngle(angleRad);
    };
    const canvas = canvasRef.current;
    if (canvas) canvas.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (canvas) canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Xử lý chuột để bắn
  const handleCanvasClick = (e) => {
    if (gameOver) return;
    setIsFocused(true);
    if (!gameStarted) setGameStarted(true); // Nhấn vào canvas là bắt đầu chơi
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - CANVAS_WIDTH / 2;
    const dy = my - SHOOTER_Y;
    let angleRad = Math.atan2(dy, dx);
    // Không giới hạn, cho phép xoay từ -π đến +π
    setAngle(angleRad);
    shootEgg(angleRad);
  };

  // Xử lý phím R để chơi lại
  const restartGame = () => {
    setGrid(createInitialGrid());
    setScore(0);
    setGameOver(false);
    setShootingEgg(null);
    setIsShooting(false);
    setGameStarted(false);
    setGamePaused(false);
    setScoreEffect(false);
    setNextEggImage(getRandomEggImage());
    setGridOffsetY(0); // Reset offset
    setShowDinoFoot(false); // Reset hiệu ứng bàn chân
    setHasSavedScore(false); // Reset trạng thái lưu điểm
  };

  // Xử lý keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') restartGame();
      // Bỏ Space để bắt đầu chơi, chỉ còn Space để bắn nếu muốn
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (!isShooting && !gameOver && !gamePaused) shootEgg(angle);
      }
      if (e.key === 'p' || e.key === 'P') setGamePaused(prev => !prev);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [angle, isShooting, gameOver, gamePaused]);

  // Lấy gameId từ URL và username từ localStorage
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const gameIdFromUrl = pathParts[pathParts.length - 1];
    setGameId(gameIdFromUrl);
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
      if (response.data.newHighScore) {
        setHighScore(response.data.newHighScore);
      }
      return response.data;
    } catch (error) {
      return { newHighScore: false };
    } finally {
      setIsSavingScore(false);
    }
  };

  // Khi điểm thay đổi, cập nhật finalScoreRef
  useEffect(() => {
    finalScoreRef.current = score;
  }, [score]);

  // Khi game over, lưu điểm nếu chưa lưu
  useEffect(() => {
    if (gameOver && finalScoreRef.current > 0 && !hasSavedScore && !isSavingScore) {
      setHasSavedScore(true);
      setTimeout(() => {
        saveHighScore(finalScoreRef.current).then(() => {
          if (onGameEnd) onGameEnd();
        });
      }, 200);
    }
  }, [gameOver, hasSavedScore, isSavingScore, onGameEnd]);

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#e53935', mb: 2 }}>
        🦖 Bắn Trứng Khủng Long
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography 
          variant="h6" 
          component="span"
          sx={{
            color: scoreEffect ? '#e53935' : 'inherit',
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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            border: isFocused ? '3px solid #e53935' : '3px solid #666',
            borderRadius: '10px',
            background: '#222',
            cursor: 'pointer',
            outline: 'none'
          }}
          tabIndex={0}
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
              Click vào game hoặc nhấn Space để bắt đầu
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Click chuột để bắn trứng
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              R để chơi lại | P để tạm dừng
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
          {isFocused ? '✅ Game đã sẵn sàng! Dùng: Click | Space | R | P' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
      </Box>
    </Box>
  );
};

export default DinoEggShooterGame; 