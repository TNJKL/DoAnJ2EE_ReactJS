import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const canvasWidth = 700;
const canvasHeight = 480;
const playTime = 120;
const baseLevel = 1;
const baseGold = [
  { type: 'gold', value: 100, size: 38, weight: 2.5 },
  { type: 'gold', value: 50, size: 28, weight: 1.5 },
  { type: 'gold', value: 20, size: 18, weight: 0.8 },
];
const baseDiamond = { type: 'diamond', value: 200, size: 18, weight: 0.7 };
const baseRock = { type: 'rock', value: 10, size: 22, weight: 3.2 };
const baseTnt = { type: 'tnt', value: -100, size: 22, weight: 1.2 };
const baseBag = { type: 'bag', value: 0, size: 22, weight: 1.2 };

function randomItems(level) {
  const items = [];
  const goldCount = 4 + level;
  const rockCount = 3 + Math.floor(level/2);
  const diamondCount = 1 + Math.floor(level/3);
  const tntCount = 1 + Math.floor(level/4);
  const bagCount = 2;
  function isOverlap(x, y, size) {
    return items.some(it => {
      const dist = Math.sqrt((x-it.x)**2 + (y-it.y)**2);
      return dist < (size + it.size + 10);
    });
  }
  for (let i = 0; i < goldCount; i++) {
    let goldType = baseGold[Math.floor(Math.random()*3)];
    let x, y, tries=0;
    do {
      x = Math.random() * (canvasWidth-60) + 30;
      y = Math.random() * (canvasHeight-180) + 180;
      tries++;
    } while (isOverlap(x, y, goldType.size) && tries < 30);
    items.push({ ...goldType, x, y, caught: false, id: 'gold'+i+Date.now()+Math.random() });
  }
  for (let i = 0; i < diamondCount; i++) {
    let x, y, tries=0;
    do {
      x = Math.random() * (canvasWidth-60) + 30;
      y = Math.random() * (canvasHeight-180) + 180;
      tries++;
    } while (isOverlap(x, y, baseDiamond.size) && tries < 30);
    items.push({ ...baseDiamond, x, y, caught: false, id: 'diamond'+i+Date.now()+Math.random() });
  }
  for (let i = 0; i < rockCount; i++) {
    let x, y, tries=0;
    do {
      x = Math.random() * (canvasWidth-60) + 30;
      y = Math.random() * (canvasHeight-180) + 180;
      tries++;
    } while (isOverlap(x, y, baseRock.size) && tries < 30);
    items.push({ ...baseRock, x, y, caught: false, id: 'rock'+i+Date.now()+Math.random() });
  }
  for (let i = 0; i < tntCount; i++) {
    let x, y, tries=0;
    do {
      x = Math.random() * (canvasWidth-60) + 30;
      y = Math.random() * (canvasHeight-180) + 180;
      tries++;
    } while (isOverlap(x, y, baseTnt.size) && tries < 30);
    items.push({ ...baseTnt, x, y, caught: false, id: 'tnt'+i+Date.now()+Math.random() });
  }
  for (let i = 0; i < bagCount; i++) {
    let x, y, tries=0;
    do {
      x = Math.random() * (canvasWidth-60) + 30;
      y = Math.random() * (canvasHeight-180) + 180;
      tries++;
    } while (isOverlap(x, y, baseBag.size) && tries < 30);
    items.push({ ...baseBag, x, y, caught: false, id: 'bag'+i+Date.now()+Math.random() });
  }
  return items;
}

function playSound(type) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  let freq = 220, dur = 0.12, wave = 'sine';
  switch(type) {
    case 'gold': freq=350; dur=0.13; wave='triangle'; break;
    case 'diamond': freq=400; dur=0.13; wave='triangle'; break;
    case 'rock': freq=180; dur=0.18; wave='sine'; break;
    case 'tnt': freq=120; dur=0.2; wave='sine'; break;
    case 'bag': freq=300; dur=0.12; wave='sine'; break;
    case 'win': freq=500; dur=0.2; wave='triangle'; break;
    case 'lose': freq=100; dur=0.2; wave='sine'; break;
    default: break;
  }
  o.type = wave;
  o.frequency.value = freq;
  g.gain.value = 0.02;
  o.start();
  o.stop(ctx.currentTime + dur);
  o.onended = () => ctx.close();
}

const GoldMinerGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const oldManImg = useRef(null);
  const goldImg = useRef(null);
  const rockImg = useRef(null);
  const diamondImg = useRef(null);
  const tntImg = useRef(null);
  const bagImg = useRef(null);
  const dirtBgImg = useRef(null);
  const skyBgImg = useRef(null);
  const pulverizedDirtImg = useRef(null);
  const [score, setScore] = useState(0);
  const [level] = useState(baseLevel);
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 800) + 400);
  const [timeLeft, setTimeLeft] = useState(playTime);
  const [items, setItems] = useState(() => randomItems(baseLevel));
  const [showGuide, setShowGuide] = useState(true);
  // Tăng maxAngle để dây quét gần hết map
  const maxAngle = Math.PI/2 - 0.1;
  const [hookAngle, setHookAngle] = useState(Math.PI/2 - maxAngle);
  const [rotateDir, setRotateDir] = useState(1);
  const [hookState, setHookState] = useState('rotate');
  const [hookLength, setHookLength] = useState(60);
  const [hookSpeed, setHookSpeed] = useState(8);
  const [hookItem, setHookItem] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [resultText, setResultText] = useState('');
  const [currentRetractSpeed, setCurrentRetractSpeed] = useState(8);
  // Lưu điểm
  const [username, setUsername] = useState('');
  const [gameId, setGameId] = useState(null);

  useEffect(() => {
    oldManImg.current = new window.Image();
    oldManImg.current.src = "https://png.pngtree.com/png-vector/20230815/ourmid/pngtree-miners-character-vector-png-image_6948107.png";
    
    goldImg.current = new window.Image();
    goldImg.current.src = "https://png.pngtree.com/png-vector/20240203/ourmid/pngtree-pure-gold-ore-isolated-png-image_11536656.png";
    
    rockImg.current = new window.Image();
    rockImg.current.src = "https://png.pngtree.com/png-clipart/20231019/original/pngtree-close-up-of-big-stone-isolated-big-rock-png-image_13370758.png";
    
    diamondImg.current = new window.Image();
    diamondImg.current.src = "https://png.pngtree.com/png-clipart/20220314/original/pngtree-3d-rendering-diamond-decoration-png-image_7437732.png";
    
    tntImg.current = new window.Image();
    tntImg.current.src = "https://static.vecteezy.com/system/resources/thumbnails/045/592/650/small_2x/red-dynamite-sticks-with-fuse-isolated-on-transparent-background-in-daylight-png.png";
    
    bagImg.current = new window.Image();
    bagImg.current.src = "https://pngimg.com/d/gift_PNG100325.png";
    
    dirtBgImg.current = new window.Image();
    dirtBgImg.current.src = "https://andersonseedsmn.com/wp-content/uploads/2015/11/Dirt-Background.jpg";
    
    skyBgImg.current = new window.Image();
    skyBgImg.current.src = "https://img.freepik.com/free-vector/mining-miner-cartoon-composition-with-underground-scenery-vintage-mine-facilities-with-tools-hard-hat-vector-illustration_1284-70867.jpg?semt=ais_hybrid&w=740";
    
    pulverizedDirtImg.current = new window.Image();
    pulverizedDirtImg.current.src = "https://landscape.wendlingquarries.com/images/products/_mast_1x/pulverized-dirt%402x.webp";
    
    // Lấy username và gameId
    const pathParts = window.location.pathname.split('/');
    const gameIdFromUrl = pathParts[pathParts.length - 1];
    setGameId(gameIdFromUrl);
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUsername(userData.username);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (!showGuide && !showResult) {
      if (hookState === 'rotate') {
        interval = setInterval(() => {
          setHookAngle(prev => {
            let next = prev + 0.018 * rotateDir;
            if (next > Math.PI/2 + maxAngle) {
              setRotateDir(-1);
              next = Math.PI/2 + maxAngle;
            }
            if (next < Math.PI/2 - maxAngle) {
              setRotateDir(1);
              next = Math.PI/2 - maxAngle;
            }
            return next;
          });
        }, 16);
      } else if (hookState === 'extend') {
        interval = setInterval(() => {
          setHookLength(prev => {
            const newLen = prev + hookSpeed;
            const hx = canvasWidth/2 + Math.cos(hookAngle)*newLen;
            const hy = 120 + Math.sin(hookAngle)*newLen;
            if (!hookItem) {
              for (let it of items) {
                if (it.caught) continue;
                const dist = Math.sqrt((hx-it.x)**2 + (hy-it.y)**2);
                if (dist < it.size+10) {
                  setHookItem(it);
                  setCurrentRetractSpeed(Math.max(2, 12 - (it.weight || 1)*3));
                  setHookState('retract');
                  playSound(it.type);
                  return newLen;
                }
              }
            }
            if (hx < 0 || hx > canvasWidth || hy > canvasHeight) {
              setCurrentRetractSpeed(8);
              setHookState('retract');
              playSound('gold');
              return newLen;
            }
            if (newLen > 520) {
              setCurrentRetractSpeed(8);
              setHookState('retract');
              playSound('gold');
              return newLen;
            }
            return newLen;
          });
        }, 16);
      } else if (hookState === 'retract') {
        interval = setInterval(() => {
          setHookLength(prev => {
            if (prev <= 60) {
              if (hookItem) {
                setScore(s => Math.max(0, s + (hookItem.type === 'bag' ? (50 + Math.floor(Math.random()*100)) : hookItem.value)));
                setItems(arr => arr.map(it => it.id === hookItem.id ? { ...it, caught: true } : it));
                playSound(hookItem.type === 'tnt' ? 'tnt' : hookItem.type);
                setHookItem(null);
              } else {
                playSound('gold');
              }
              setHookState('rotate');
              return 60;
            }
            return prev - currentRetractSpeed;
          });
        }, 16);
      }
    }
    return () => clearInterval(interval);
  }, [showGuide, showResult, hookState, rotateDir, hookSpeed, hookAngle, items, hookItem, currentRetractSpeed]);

  useEffect(() => {
    if (showGuide || showResult) return;
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [showGuide, showResult, timeLeft]);

  // Lưu điểm khi kết thúc game
  const saveHighScore = async (finalScore) => {
    if (!gameId || !username) return;
    try {
      await axios.post(`http://localhost:8080/api/user/games/${gameId}/score`, {
        score: finalScore,
        username: username
      });
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (showGuide || showResult) return;
    const allCaught = items.every(it => it.caught);
    if (allCaught || timeLeft <= 0) {
      setShowResult(true);
      setResultText(score >= target ? '🎉 Hoàn thành mục tiêu!' : '💀 Không đạt mục tiêu!');
      playSound(score >= target ? 'win' : 'lose');
      saveHighScore(score);
    }
  }, [items, timeLeft, showGuide, showResult, score, target, gameId, username]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Vẽ background trên cùng (sky) cho toàn bộ canvas
    if (skyBgImg.current && skyBgImg.current.complete) {
      ctx.drawImage(skyBgImg.current, 0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.fillStyle = '#87CEEB'; // Màu trời
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // Vẽ background đất cho phần dưới
    if (dirtBgImg.current && dirtBgImg.current.complete) {
      ctx.drawImage(dirtBgImg.current, 0, 100, canvasWidth, canvasHeight-100);
    } else {
      ctx.fillStyle = '#fbc02d';
      ctx.fillRect(0, 100, canvasWidth, canvasHeight-100);
    }
    
    // Vẽ đường cong đất
    ctx.fillStyle = '#e0b96a';
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.bezierCurveTo(100, 140, 300, 100, canvasWidth, 140);
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.lineTo(0, canvasHeight);
    ctx.closePath();
    ctx.fill();
    
    // Vẽ đất nghiền nát ở dưới mặt đất
    if (pulverizedDirtImg.current && pulverizedDirtImg.current.complete) {
      ctx.drawImage(pulverizedDirtImg.current, 0, 140, canvasWidth, canvasHeight-140);
    }
    
    items.forEach(item => {
      if (item.caught) return;
      if (item.type === 'gold') {
        if (goldImg.current && goldImg.current.complete) {
          const imgSize = item.size * 2;
          ctx.drawImage(goldImg.current, item.x - imgSize/2, item.y - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback nếu ảnh chưa load
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.ellipse(item.x, item.y, item.size, item.size*0.8, 0, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#bfa100';
          ctx.stroke();
        }
      } else if (item.type === 'diamond') {
        if (diamondImg.current && diamondImg.current.complete) {
          const imgSize = item.size * 2;
          ctx.drawImage(diamondImg.current, item.x - imgSize/2, item.y - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback nếu ảnh chưa load
          ctx.fillStyle = '#b9f2ff';
          ctx.beginPath();
          ctx.moveTo(item.x, item.y-item.size);
          ctx.lineTo(item.x+item.size, item.y);
          ctx.lineTo(item.x, item.y+item.size);
          ctx.lineTo(item.x-item.size, item.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#5bc0de';
          ctx.stroke();
        }
      } else if (item.type === 'rock') {
        if (rockImg.current && rockImg.current.complete) {
          const imgSize = item.size * 2;
          ctx.drawImage(rockImg.current, item.x - imgSize/2, item.y - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback nếu ảnh chưa load
          ctx.fillStyle = '#888';
          ctx.beginPath();
          ctx.ellipse(item.x, item.y, item.size, item.size*0.7, 0, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#555';
          ctx.stroke();
        }
      } else if (item.type === 'tnt') {
        if (tntImg.current && tntImg.current.complete) {
          const imgSize = item.size * 2;
          ctx.drawImage(tntImg.current, item.x - imgSize/2, item.y - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback nếu ảnh chưa load
          ctx.fillStyle = '#d32f2f';
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#b71c1c';
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('TNT', item.x, item.y+5);
        }
      } else if (item.type === 'bag') {
        if (bagImg.current && bagImg.current.complete) {
          const imgSize = item.size * 2;
          ctx.drawImage(bagImg.current, item.x - imgSize/2, item.y - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback nếu ảnh chưa load
          ctx.fillStyle = '#f5e6b3';
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#bfa100';
          ctx.stroke();
          ctx.fillStyle = '#d2691e';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('?', item.x, item.y+6);
        }
      }
    });
    
    // Vẽ ông già bằng ảnh mới
    if (oldManImg.current && oldManImg.current.complete) {
      ctx.drawImage(oldManImg.current, canvasWidth/2-40, 40, 80, 80);
    }
    
    // Dây móc
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvasWidth/2, 120);
    ctx.lineTo(canvasWidth/2 + Math.cos(hookAngle)*hookLength, 120 + Math.sin(hookAngle)*hookLength);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvasWidth/2 + Math.cos(hookAngle)*hookLength, 120 + Math.sin(hookAngle)*hookLength, 10, 0, 2*Math.PI);
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.restore();
    
    // Nếu đang kéo vật phẩm, vẽ vật phẩm theo đầu dây
    if (hookItem && hookState === 'retract') {
      ctx.save();
      const hx = canvasWidth/2 + Math.cos(hookAngle)*hookLength;
      const hy = 120 + Math.sin(hookAngle)*hookLength;
      
      if (hookItem.type === 'gold') {
        if (goldImg.current && goldImg.current.complete) {
          const imgSize = hookItem.size * 2;
          ctx.drawImage(goldImg.current, hx - imgSize/2, hy - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.ellipse(hx, hy, hookItem.size, hookItem.size*0.8, 0, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#bfa100';
          ctx.stroke();
        }
      } else if (hookItem.type === 'diamond') {
        if (diamondImg.current && diamondImg.current.complete) {
          const imgSize = hookItem.size * 2;
          ctx.drawImage(diamondImg.current, hx - imgSize/2, hy - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback
          ctx.fillStyle = '#b9f2ff';
          ctx.beginPath();
          ctx.moveTo(hx, hy-hookItem.size);
          ctx.lineTo(hx+hookItem.size, hy);
          ctx.lineTo(hx, hy+hookItem.size);
          ctx.lineTo(hx-hookItem.size, hy);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#5bc0de';
          ctx.stroke();
        }
      } else if (hookItem.type === 'rock') {
        if (rockImg.current && rockImg.current.complete) {
          const imgSize = hookItem.size * 2;
          ctx.drawImage(rockImg.current, hx - imgSize/2, hy - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback
          ctx.fillStyle = '#888';
          ctx.beginPath();
          ctx.ellipse(hx, hy, hookItem.size, hookItem.size*0.7, 0, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#555';
          ctx.stroke();
        }
      } else if (hookItem.type === 'tnt') {
        if (tntImg.current && tntImg.current.complete) {
          const imgSize = hookItem.size * 2;
          ctx.drawImage(tntImg.current, hx - imgSize/2, hy - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback
          ctx.fillStyle = '#d32f2f';
          ctx.beginPath();
          ctx.arc(hx, hy, hookItem.size, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#b71c1c';
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('TNT', hx, hy+5);
        }
      } else if (hookItem.type === 'bag') {
        if (bagImg.current && bagImg.current.complete) {
          const imgSize = hookItem.size * 2;
          ctx.drawImage(bagImg.current, hx - imgSize/2, hy - imgSize/2, imgSize, imgSize);
        } else {
          // Fallback
          ctx.fillStyle = '#f5e6b3';
          ctx.beginPath();
          ctx.arc(hx, hy, hookItem.size, 0, 2*Math.PI);
          ctx.fill();
          ctx.strokeStyle = '#bfa100';
          ctx.stroke();
          ctx.fillStyle = '#d2691e';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('?', hx, hy+6);
        }
      }
      ctx.restore();
    }
  }, [items, hookAngle, hookLength, hookItem, hookState]);

  const handleCanvasClick = () => {
    if (showGuide || showResult) return;
    if (hookState === 'rotate') {
      setHookState('extend');
      playSound('gold');
    }
  };

  const handleRestart = async () => {
    await saveHighScore(score);
    if (onGameEnd) onGameEnd();
    setTarget(Math.floor(Math.random() * 800) + 400);
    setTimeLeft(playTime);
    setItems(randomItems(baseLevel));
    setScore(0);
    setShowResult(false);
    setResultText('');
    setHookAngle(Math.PI/2 - maxAngle);
    setHookState('rotate');
    setHookLength(60);
    setHookItem(null);
  };

  const handleExit = async () => {
    setShowResult(true);
    setResultText(score >= target ? '🎉 Hoàn thành mục tiêu!' : '💀 Không đạt mục tiêu!');
    playSound(score >= target ? 'win' : 'lose');
    await saveHighScore(score);
    if (onGameEnd) onGameEnd();
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, background: '#ffe082', borderRadius: 2, p: 1 }}>
        <Typography variant="h6" component="span" sx={{ color: '#388e3c', fontWeight: 'bold' }}>Tiền: ${score}</Typography>
        <Typography variant="h6" component="span" sx={{ color: '#fbc02d', fontWeight: 'bold' }}>Mục tiêu: ${target}</Typography>
        <Typography variant="h6" component="span" sx={{ color: '#e65100', fontWeight: 'bold' }}>TG: {timeLeft}s</Typography>
        <Typography variant="h6" component="span" sx={{ color: '#1976d2', fontWeight: 'bold' }}>Cấp: 1</Typography>
        <Button variant="contained" color="warning" size="small" onClick={handleExit}>Thoát</Button>
      </Box>
      <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: 2, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: '3px solid #fbc02d',
            borderRadius: '10px',
            background: '#ffe082',
            cursor: 'pointer',
            outline: 'none'
          }}
          tabIndex={0}
          onClick={handleCanvasClick}
        />
        {showGuide && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.92)',
              color: 'white',
              padding: 4,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '340px',
              zIndex: 2
            }}
          >
            <Typography variant="h5" gutterBottom>🪙 Đào Vàng</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Click vào đây để bắt đầu chơi!<br/>
              Cần gạt sẽ quay đều, click để thả dây móc.<br/>
              Kéo vàng, kim cương, túi tiền về để đạt mục tiêu!
            </Typography>
            <Button variant="contained" color="success" onClick={() => setShowGuide(false)}>
              Bắt đầu chơi
            </Button>
          </Box>
        )}
        {showResult && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.92)',
              color: 'white',
              padding: 4,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '340px',
              zIndex: 2
            }}
          >
            <Typography variant="h5" gutterBottom>{resultText}</Typography>
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleRestart}>
              Chơi lại
            </Button>
          </Box>
        )}
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {showGuide ? '💡 Click vào game để bắt đầu chơi' : '✅ Game đã sẵn sàng! Click để thả móc'}
        </Typography>
      </Box>
    </Box>
  );
};

export default GoldMinerGame; 