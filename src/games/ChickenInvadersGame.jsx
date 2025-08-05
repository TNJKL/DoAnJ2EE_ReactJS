import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const canvasWidth = 800;
const canvasHeight = 600;

// Game constants
const SPACESHIP_WIDTH = 60;
const SPACESHIP_HEIGHT = 40;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 12;
const CHICKEN_WIDTH = 50;
const CHICKEN_HEIGHT = 40;
const EGG_WIDTH = 8;
const EGG_HEIGHT = 12;

// Level configurations
const LEVELS = [
  { // Level 1
    chickenRows: 4,
    chickenCols: 6,
    chickenSpeed: 1,
    eggSpeed: 2,
    chickenHealth: 1,
    chickenType: 'normal'
  },
  { // Level 2 - Boss
    chickenRows: 1,
    chickenCols: 1,
    chickenSpeed: 0.5,
    eggSpeed: 3,
    chickenHealth: 25,
    chickenType: 'boss',
    bossEggRate: 400
  }
];

// Sound effects
const playSound = (type) => {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  
  let freq = 220, dur = 0.1, wave = 'sine';
  switch(type) {
    case 'shoot': freq = 800; dur = 0.08; wave = 'square'; break;
    case 'hit': freq = 400; dur = 0.1; wave = 'triangle'; break;
    case 'explosion': freq = 150; dur = 0.3; wave = 'sawtooth'; break;
    case 'powerup': freq = 600; dur = 0.15; wave = 'triangle'; break;
    case 'levelup': freq = 800; dur = 0.2; wave = 'sine'; break;
    case 'gameover': freq = 200; dur = 0.5; wave = 'sawtooth'; break;
    case 'win': freq = 1000; dur = 0.3; wave = 'sine'; break;
    default: break;
  }
  
  o.type = wave;
  o.frequency.value = freq;
  g.gain.value = 0.1;
  o.start();
  o.stop(ctx.currentTime + dur);
  o.onended = () => ctx.close();
};

const ChickenInvadersGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const audioContextRef = useRef(null);
  
  // Game state
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  
  // Spaceship state
  const [spaceship, setSpaceship] = useState({
    x: canvasWidth / 2 - SPACESHIP_WIDTH / 2,
    y: canvasHeight - SPACESHIP_HEIGHT - 20,
    width: SPACESHIP_WIDTH,
    height: SPACESHIP_HEIGHT
  });
  
  // Game objects
  const [bullets, setBullets] = useState([]);
  const [chickens, setChickens] = useState([]);
  const [eggs, setEggs] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [powerups, setPowerups] = useState([]);
  
  // Mouse tracking
  const [mouseX, setMouseX] = useState(canvasWidth / 2);
  
  // Game settings
  const [bulletSpeed, setBulletSpeed] = useState(8);
  const [fireRate, setFireRate] = useState(300);
  const [lastFireTime, setLastFireTime] = useState(0);
  const [chickenDirection, setChickenDirection] = useState(1);
  const [chickenDropDistance, setChickenDropDistance] = useState(0);
  
  // API integration
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Thêm các ref cho object động
  const spaceshipRef = useRef();
  const bulletsRef = useRef([]);
  const chickensRef = useRef([]);
  const eggsRef = useRef([]);
  const explosionsRef = useRef([]);
  const chickenDirectionRef = useRef(1);
  const lastEggShootTimeRef = useRef(Date.now());
  const justBouncedRef = useRef(false);

  // Thêm các ref cho ảnh
  const chickenImgRef = useRef(null);
  const eggImgRef = useRef(null);
  const spaceshipImgRef = useRef(null);
  const bossImgRef = useRef(null);
  const backgroundImgRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState({ chicken: false, egg: false, spaceship: false, boss: false, background: false });

  // Load ảnh khi mount
  useEffect(() => {
    // Background
    const bgImg = new window.Image();
    bgImg.onload = () => setImagesLoaded(imgs => ({ ...imgs, background: true }));
    bgImg.onerror = () => setImagesLoaded(imgs => ({ ...imgs, background: false }));
    bgImg.src = 'https://images4.alphacoders.com/620/thumb-1920-620478.jpg';
    backgroundImgRef.current = bgImg;
    // Chicken thường
    const chickenImg = new window.Image();
    chickenImg.onload = () => setImagesLoaded(imgs => ({ ...imgs, chicken: true }));
    chickenImg.onerror = () => setImagesLoaded(imgs => ({ ...imgs, chicken: false }));
    chickenImg.src = 'https://cdn2.steamgriddb.com/icon/07cb5b5337dc005c70dc51527a70162a/32/256x256.png';
    chickenImgRef.current = chickenImg;
    // Boss
    const bossImg = new window.Image();
    bossImg.onload = () => setImagesLoaded(imgs => ({ ...imgs, boss: true }));
    bossImg.onerror = () => setImagesLoaded(imgs => ({ ...imgs, boss: false }));
    bossImg.src = 'https://tiermaker.com/images/chart/chart/chicken-invaders-bosses-220422/mastersquawkerpng.png';
    bossImgRef.current = bossImg;
    // Egg (Fresh Egg)
    const eggImg = new window.Image();
    eggImg.onload = () => setImagesLoaded(imgs => ({ ...imgs, egg: true }));
    eggImg.onerror = () => setImagesLoaded(imgs => ({ ...imgs, egg: false }));
    eggImg.src = 'https://png.pngtree.com/png-vector/20240521/ourmid/pngtree-fresh-single-egg-png-image_12504967.png';
    eggImgRef.current = eggImg;
    // Spaceship giữ nguyên
    const spaceshipImg = new window.Image();
    spaceshipImg.onload = () => setImagesLoaded(imgs => ({ ...imgs, spaceship: true }));
    spaceshipImg.onerror = () => setImagesLoaded(imgs => ({ ...imgs, spaceship: false }));
    spaceshipImg.src = 'https://forum.chickeninvaders.com/uploads/db1091/original/1X/3548e43d7a6680cf7bb2a62cdd376f20baf76484.png';
    spaceshipImgRef.current = spaceshipImg;
  }, []);

  // Lấy gameId từ URL và username từ localStorage khi mount
  useEffect(() => {
    // Lấy gameId từ URL
    const pathParts = window.location.pathname.split('/');
    const gameIdFromUrl = pathParts[pathParts.length - 1];
    setGameId(gameIdFromUrl);
    // Lấy username từ localStorage
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUsername(userData.username);
      } catch {}
    }
  }, []);

  // Load high score
  useEffect(() => {
    if (gameId && username) {
      loadHighScore();
    }
  }, [gameId, username]);

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

  // Generate chickens for current level
  const generateChickens = useCallback(() => {
    const levelConfig = LEVELS[level - 1];
    if (!levelConfig) return; // Không có level này thì không làm gì
    const newChickens = [];
    const startX = 50;
    const startY = (levelConfig && typeof levelConfig.startY === 'number') ? levelConfig.startY : 50;
    const spacingX = (canvasWidth - 100) / (levelConfig.chickenCols || 1);
    const spacingY = (levelConfig && typeof levelConfig.spacingY === 'number') ? levelConfig.spacingY : 60;
    
    for (let row = 0; row < (levelConfig.chickenRows || 1); row++) {
      for (let col = 0; col < (levelConfig.chickenCols || 1); col++) {
        const chicken = {
          id: `chicken-${row}-${col}`,
          x: startX + col * spacingX,
          y: startY + row * spacingY,
          width: levelConfig.chickenType === 'boss' ? 120 : CHICKEN_WIDTH,
          height: levelConfig.chickenType === 'boss' ? 100 : CHICKEN_HEIGHT,
          health: levelConfig.chickenHealth,
          maxHealth: levelConfig.chickenHealth,
          type: levelConfig.chickenType,
          speed: levelConfig.chickenSpeed,
          lastEggTime: 0,
          eggRate: levelConfig.chickenType === 'boss' ? 1000 : 2000 + Math.random() * 3000
        };
        newChickens.push(chicken);
      }
    }
    
    setChickens(newChickens);
    chickensRef.current = newChickens; // ĐỒNG BỘ REF
  }, [level]);

  // Initialize level
  useEffect(() => {
    if (!showGuide && !gameOver && !gameWon) {
      generateChickens();
      setBullets([]); setEggs([]); setExplosions([]); setPowerups([]);
      setChickenDirection(1); setChickenDropDistance(0); setGameRunning(true);
      // Đồng bộ ref
      bulletsRef.current = [];
      eggsRef.current = [];
      explosionsRef.current = [];
      chickenDirectionRef.current = 1;
      lastEggShootTimeRef.current = Date.now();
      justBouncedRef.current = false;
      spaceshipRef.current = {
        x: canvasWidth / 2 - SPACESHIP_WIDTH / 2,
        y: canvasHeight - SPACESHIP_HEIGHT - 20,
        width: SPACESHIP_WIDTH,
        height: SPACESHIP_HEIGHT
      };
    }
  }, [level, showGuide, gameOver, gameWon, generateChickens]);

  // Game loop dùng requestAnimationFrame
  useEffect(() => {
    if (!gameRunning || gameOver || gameWon || showGuide) return;
    let animationId;
    let lastFrame = Date.now();

    function loop() {
      const now = Date.now();
      const dt = (now - lastFrame) / 16; // ~1 cho 60fps
      lastFrame = now;

      // Update spaceship theo mouseX
      spaceshipRef.current = {
        ...spaceshipRef.current,
        x: Math.max(0, Math.min(canvasWidth - SPACESHIP_WIDTH, mouseX - SPACESHIP_WIDTH / 2))
      };

      // Update bullets
      bulletsRef.current = bulletsRef.current
        .map(b => ({ ...b, y: b.y - bulletSpeed * dt }))
        .filter(b => b.y > -BULLET_HEIGHT);

      // Update eggs
      eggsRef.current = eggsRef.current
        .map(e => {
          if (typeof e.angle === 'number') {
            // Nếu có angle, bay chéo
            return {
              ...e,
              y: e.y + e.speed * dt,
              x: e.x + Math.sin(e.angle) * e.speed * dt
            };
          } else {
            return {
              ...e,
              y: e.y + e.speed * dt
            };
          }
        })
        .filter(e => e.y < canvasHeight && e.x > -EGG_WIDTH && e.x < canvasWidth + EGG_WIDTH);

      // Update explosions
      explosionsRef.current = explosionsRef.current
        .map(ex => ({ ...ex, life: ex.life - dt }))
        .filter(ex => ex.life > 0);

      // Update chickens
      let chickens = chickensRef.current;
      let hitEdge = false;
      chickens.forEach(chicken => {
        chicken.x += chicken.speed * chickenDirectionRef.current * dt;
        if (chicken.x <= 0 || chicken.x + chicken.width >= canvasWidth) hitEdge = true;
      });
      if (hitEdge && !justBouncedRef.current) {
        chickenDirectionRef.current *= -1;
        chickens.forEach(chicken => { chicken.y += 20; });
        justBouncedRef.current = true;
      }
      if (!hitEdge) {
        justBouncedRef.current = false;
      }
      chickensRef.current = chickens;

      // Random egg shooting (mỗi 1-2s)
      const levelConfig = LEVELS[level - 1];
      if (levelConfig.chickenType === 'boss') {
        // Boss bắn nhanh hơn, mỗi lần bắn 2 viên theo hình tam giác
        if (now - lastEggShootTimeRef.current > (levelConfig.bossEggRate || 1000)) {
          const boss = chickensRef.current[0];
          if (boss) {
            // 2 viên trứng, lệch góc -0.25 và +0.25 rad
            eggsRef.current.push({
              id: `egg-${Date.now()}-L`,
              x: boss.x + boss.width / 2 - EGG_WIDTH / 2,
              y: boss.y + boss.height,
              width: EGG_WIDTH,
              height: EGG_HEIGHT,
              speed: levelConfig.eggSpeed,
              angle: -0.25
            });
            eggsRef.current.push({
              id: `egg-${Date.now()}-R`,
              x: boss.x + boss.width / 2 - EGG_WIDTH / 2,
              y: boss.y + boss.height,
              width: EGG_WIDTH,
              height: EGG_HEIGHT,
              speed: levelConfig.eggSpeed,
              angle: 0.25
            });
          }
          lastEggShootTimeRef.current = now;
        }
      } else {
        if (now - lastEggShootTimeRef.current > 1000 + Math.random()*1000) {
          const shooters = chickensRef.current.filter(c => c.y > 0);
          const numShoot = Math.min(4, Math.max(1, Math.floor(Math.random()*4)+1, Math.floor(shooters.length/5)));
          for (let i = 0; i < numShoot; i++) {
            if (shooters.length === 0) break;
            const idx = Math.floor(Math.random()*shooters.length);
            const c = shooters[idx];
            eggsRef.current.push({
              id: `egg-${Date.now()}-${Math.random()}`,
              x: c.x + c.width/2 - EGG_WIDTH/2,
              y: c.y + c.height,
              width: EGG_WIDTH,
              height: EGG_HEIGHT,
              speed: LEVELS[level-1].eggSpeed
            });
          }
          lastEggShootTimeRef.current = now;
        }
      }

      // Collision detection (giữ nguyên logic, nhưng dùng ref)
      // Bullet vs Chicken collisions
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        const bulletToRemove = [];
        bulletsRef.current.forEach(bullet => {
          chickensRef.current.forEach(chicken => {
            if (bullet.x < chicken.x + chicken.width &&
                bullet.x + bullet.width > chicken.x &&
                bullet.y < chicken.y + chicken.height &&
                bullet.y + bullet.height > chicken.y) {
              
              bulletToRemove.push(bullet.id);
              chicken.health--;
              
              if (chicken.health <= 0) {
                // Chicken destroyed
                setScore(prev => prev + (chicken.type === 'boss' ? 500 : 100));
                explosionsRef.current.push({
                  x: chicken.x + chicken.width / 2,
                  y: chicken.y + chicken.height / 2,
                  life: 10
                });
                playSound('explosion');
                
                // Remove chicken
                chickensRef.current = chickensRef.current.filter(c => c.id !== chicken.id);
                setChickens([...chickensRef.current]); // ĐỒNG BỘ STATE
              } else {
                playSound('hit');
              }
            }
          });
        });
        return !bulletToRemove.includes(bullet.id);
      });

      // Egg vs Spaceship collisions
      const eggsToRemove = [];
      let hitThisFrame = false;
      eggsRef.current.forEach(egg => {
        if (
          egg.x < spaceshipRef.current.x + spaceshipRef.current.width &&
          egg.x + egg.width > spaceshipRef.current.x &&
          egg.y < spaceshipRef.current.y + spaceshipRef.current.height &&
          egg.y + egg.height > spaceshipRef.current.y
        ) {
          eggsToRemove.push(egg.id);
          hitThisFrame = true;
        }
      });
      if (hitThisFrame) {
        setLives(prev => {
          const newLives = Math.max(0, prev - 1);
          if (newLives === 0) {
            setGameOver(true);
            setGameRunning(false);
            if (!hasSavedScore && !isSavingScore) {
              setHasSavedScore(true);
              setTimeout(() => {
                saveHighScore(score).then(() => {
                  if (onGameEnd) onGameEnd();
                });
              }, 200);
            }
          }
          return newLives;
        });
        playSound('gameover');
      }
      eggsRef.current = eggsRef.current.filter(egg => !eggsToRemove.includes(egg.id));

      // Check level completion
      if (chickensRef.current.length === 0 && gameRunning && !gameOver) {
        if (level >= LEVELS.length) {
          // Game won
          setGameWon(true);
          setGameRunning(false);
          playSound('win');
          if (!hasSavedScore && !isSavingScore) {
            setHasSavedScore(true);
            setTimeout(() => {
              saveHighScore(score).then(() => {
                if (onGameEnd) onGameEnd();
              });
            }, 200);
          }
        } else {
          // Level completed
          setShowLevelComplete(true);
          setGameRunning(false);
          playSound('levelup');
          setTimeout(() => {
            setLevel(prev => Math.min(prev + 1, LEVELS.length));
            setShowLevelComplete(false);
            setGameRunning(true);
          }, 2000);
        }
      }

      // Vẽ lại canvas
      drawGame();
      animationId = requestAnimationFrame(loop);
    }
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [gameRunning, gameOver, gameWon, showGuide, mouseX, bulletSpeed, level]);

  // Hàm drawGame() sẽ lấy object từ ref và vẽ lại canvas
  function drawGame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const levelConfig = LEVELS[level - 1];
    
    // Clear canvas
    if (backgroundImgRef.current && imagesLoaded.background) {
      ctx.drawImage(backgroundImgRef.current, 0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.fillStyle = levelConfig.bgColor || '#000033';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // Draw stars background
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 100; i++) {
      const x = (i * 37) % canvasWidth;
      const y = (i * 73) % canvasHeight;
      ctx.fillRect(x, y, 1, 1);
    }
    
    // Draw spaceship
    if (spaceshipImgRef.current && imagesLoaded.spaceship) {
      ctx.drawImage(
        spaceshipImgRef.current,
        spaceshipRef.current.x,
        spaceshipRef.current.y,
        spaceshipRef.current.width,
        spaceshipRef.current.height
      );
    } else {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(spaceshipRef.current.x, spaceshipRef.current.y, spaceshipRef.current.width, spaceshipRef.current.height);
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(spaceshipRef.current.x, spaceshipRef.current.y, spaceshipRef.current.width, spaceshipRef.current.height);
    }
    
    // Draw bullets
    ctx.fillStyle = '#FFFF00';
    bulletsRef.current.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw chickens
    chickensRef.current.forEach(chicken => {
      if (chicken.type === 'boss') {
        if (bossImgRef.current && imagesLoaded.boss) {
          ctx.drawImage(
            bossImgRef.current,
            chicken.x,
            chicken.y,
            chicken.width,
            chicken.height
          );
        } else {
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(chicken.x, chicken.y, chicken.width, chicken.height);
          ctx.strokeStyle = '#FFFFFF';
          ctx.strokeRect(chicken.x, chicken.y, chicken.width, chicken.height);
        }
      } else {
        if (chickenImgRef.current && imagesLoaded.chicken) {
          ctx.drawImage(
            chickenImgRef.current,
            chicken.x,
            chicken.y,
            chicken.width,
            chicken.height
          );
        } else {
          ctx.fillStyle = '#FFCC00';
          ctx.fillRect(chicken.x, chicken.y, chicken.width, chicken.height);
          ctx.strokeStyle = '#FFFFFF';
          ctx.strokeRect(chicken.x, chicken.y, chicken.width, chicken.height);
        }
      }
      
      // Draw health bar for boss
      if (chicken.type === 'boss') {
        const barWidth = chicken.width;
        const barHeight = 8;
        const healthPercent = chicken.health / chicken.maxHealth;
        
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(chicken.x, chicken.y - 15, barWidth, barHeight);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(chicken.x, chicken.y - 15, barWidth * healthPercent, barHeight);
      }
    });
    
    // Draw eggs
    ctx.fillStyle = '#FFFFFF';
    eggsRef.current.forEach(egg => {
      if (eggImgRef.current && imagesLoaded.egg) {
        ctx.drawImage(
          eggImgRef.current,
          egg.x,
          egg.y,
          egg.width,
          egg.height
        );
      } else {
        ctx.fillRect(egg.x, egg.y, egg.width, egg.height);
      }
    });
    
    // Draw explosions
    explosionsRef.current.forEach(explosion => {
      const alpha = explosion.life / 10;
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, 20, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw HUD
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${level}`, 10, 25);
    ctx.fillText(`Score: ${score}`, 10, 45);
    ctx.fillText(`Lives: ${lives}`, 10, 65);
    ctx.fillText(`High Score: ${highScore}`, 10, 85);
    
    // Draw remaining chickens count
    ctx.textAlign = 'right';
    ctx.fillText(`Chickens: ${chickensRef.current.length}`, canvasWidth - 10, 25);
    
  }

  // Handle mouse movement
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setMouseX(x);
  }, []);

  // Handle shooting
  const handleMouseClick = useCallback(() => {
    if (!gameRunning || gameOver || gameWon || showGuide) return;
    
    const currentTime = Date.now();
    if (currentTime - lastFireTime >= fireRate) {
      const bullet = {
        id: `bullet-${currentTime}-${Math.random()}`,
        x: spaceshipRef.current.x + spaceshipRef.current.width / 2 - BULLET_WIDTH / 2,
        y: spaceshipRef.current.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT
      };
      
      bulletsRef.current.push(bullet);
      setLastFireTime(currentTime);
      playSound('shoot');
    }
  }, [gameRunning, gameOver, gameWon, showGuide, lastFireTime, fireRate, spaceship]);

  // Restart game
  const restartGame = () => {
    setScore(0);
    setLevel(1);
    setLives(3);
    setGameOver(false);
    setGameWon(false);
    setShowGuide(false);
    setShowLevelComplete(false);
    setGameRunning(true);
    setBullets([]);
    setEggs([]);
    setExplosions([]);
    setPowerups([]);
    setHasSavedScore(false);
    setIsSavingScore(false);
    chickensRef.current = [];
    bulletsRef.current = [];
    eggsRef.current = [];
    explosionsRef.current = [];
    spaceshipRef.current = {
      x: canvasWidth / 2 - SPACESHIP_WIDTH / 2,
      y: canvasHeight - SPACESHIP_HEIGHT - 20,
      width: SPACESHIP_WIDTH,
      height: SPACESHIP_HEIGHT
    };
  };

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#00FF00', mb: 2 }}>
        🐔 Chicken Invaders
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span" sx={{ color: '#00FF00' }}>
          Level: {level}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#FFFF00' }}>
          Score: {score}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#FF0000' }}>
          Lives: {lives}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#00FFFF' }}>
          High Score: {highScore}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: '3px solid #00FF00',
            borderRadius: '10px',
            background: '#000033',
            cursor: 'crosshair',
            outline: 'none'
          }}
          onMouseMove={handleMouseMove}
          onClick={handleMouseClick}
        />
        
        {showGuide && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: 4,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '400px',
              zIndex: 2
            }}
          >
            <Typography variant="h5" gutterBottom>🐔 Chicken Invaders</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Di chuyển chuột để điều khiển phi thuyền<br/>
              Click để bắn gà xâm lược!<br/>
              Tránh trứng rơi và tiêu diệt tất cả gà để qua màn!
            </Typography>
            <Button variant="contained" color="success" onClick={() => setShowGuide(false)}>
              Bắt đầu chơi
            </Button>
          </Box>
        )}
        
        {showLevelComplete && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: 4,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '400px',
              zIndex: 2
            }}
          >
            <Typography variant="h5" gutterBottom>🎉 Level {level} Complete!</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Chuẩn bị cho level tiếp theo...
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
              padding: 4,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '400px',
              zIndex: 2
            }}
          >
            <Typography variant="h5" gutterBottom>💀 Game Over!</Typography>
            <Typography variant="body1" gutterBottom>
              Điểm của bạn: {score}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Level đạt được: {level}
            </Typography>
            {score > highScore && (
              <Typography variant="body2" sx={{ color: '#00FF00', mb: 2 }}>
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
        
        {gameWon && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: 4,
              borderRadius: 2,
              textAlign: 'center',
              minWidth: '400px',
              zIndex: 2
            }}
          >
            <Typography variant="h5" gutterBottom>🏆 Victory!</Typography>
            <Typography variant="body1" gutterBottom>
              Bạn đã tiêu diệt tất cả gà xâm lược!
            </Typography>
            <Typography variant="body2" gutterBottom>
              Điểm cuối cùng: {score}
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

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {showGuide ? '💡 Click vào game để bắt đầu chơi' : '✅ Game đã sẵn sàng! Di chuyển chuột và click để bắn'}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChickenInvadersGame; 