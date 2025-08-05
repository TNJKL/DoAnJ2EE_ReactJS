import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import axios from 'axios';

const EggCatcherGame = ({ onGameEnd }) => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const finalScoreRef = useRef(0);
  const audioContextRef = useRef(null);
  const basketImg = useRef(null);
  const cloudImg = useRef(null);
  const grassImg = useRef(null);
  const skyImg = useRef(null);
  const normalEggImg = useRef(null);
  const redEggImg = useRef(null);
  const goldEggImg = useRef(null);
  const silverEggImg = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(2000);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [particles, setParticles] = useState([]);
  const [combo, setCombo] = useState(0);
  const [lastCatchTime, setLastCatchTime] = useState(0);

  // Game dimensions
  const canvasWidth = 800;
  const canvasHeight = 600;
  const basketWidth = 120;
  const basketHeight = 80;
  const eggRadius = 25;
  const baseSpeed = 2000; // Thời gian giữa các quả trứng (ms)
  const minSpeed = 800; // Tốc độ tối đa

  // Game state
  const [basket, setBasket] = useState({ x: canvasWidth / 2 - basketWidth / 2, y: canvasHeight - 100 });
  const [eggs, setEggs] = useState([]);
  const [lives, setLives] = useState(3);

  // Load images
  useEffect(() => {
    basketImg.current = new window.Image();
    basketImg.current.src = "https://static.vecteezy.com/system/resources/thumbnails/039/630/618/small_2x/ai-generated-empty-wicker-basket-isolated-transparent-background-free-png.png";
    
    cloudImg.current = new window.Image();
    cloudImg.current.src = "https://png.pngtree.com/png-vector/20240929/ourmid/pngtree-soft-2d-cloud-png-image_13980627.png";
    
    grassImg.current = new window.Image();
    grassImg.current.src = "https://plus.unsplash.com/premium_photo-1725408037993-f891474828c9?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Z3Jhc3MlMjBwbmd8ZW58MHx8MHx8fDA%3D";
    
    skyImg.current = new window.Image();
    skyImg.current.src = "https://t3.ftcdn.net/jpg/01/02/64/28/360_F_102642850_Mca9lTRDH60DQin39YwCF5Jzd15lcdoo.jpg";
    
    normalEggImg.current = new window.Image();
    normalEggImg.current.src = "https://gallery.yopriceville.com/downloadfullsize/send/27254";
    
    redEggImg.current = new window.Image();
    redEggImg.current.src = "https://www.onlygfx.com/wp-content/uploads/2022/03/colorful-painted-easter-eggs-5.png";
    
    goldEggImg.current = new window.Image();
    goldEggImg.current.src = "https://rosepng.com/wp-content/uploads/2024/03/s11728_easter_egg_clipart_isolated_on_white_background_-styl_d300f647-8306-49f7-ac6d-5ce0b7e81942_1-photoroom-png-photoroom_11zon.png";

    silverEggImg.current = new window.Image();
    silverEggImg.current.src = "https://www.onlygfx.com/wp-content/uploads/2022/03/colorful-painted-easter-eggs-5.png";
  }, []);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sound effects - Thân thiện hơn
  const playSound = useCallback((frequency, duration, type = 'sine') => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    oscillator.type = type;
    
    // Giảm volume xuống để thân thiện hơn
    gainNode.gain.setValueAtTime(0.03, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, []);

  const playCatchSound = useCallback(() => {
    playSound(400, 0.1, 'sine'); // Âm thanh nhẹ nhàng hơn
  }, [playSound]);

  const playMissSound = useCallback(() => {
    playSound(200, 0.2, 'sine'); // Âm thanh nhẹ nhàng hơn
  }, [playSound]);

  const playGameOverSound = useCallback(() => {
    playSound(150, 0.3, 'sine');
    setTimeout(() => playSound(120, 0.3, 'sine'), 200);
  }, [playSound]);

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
    const savedGameState = localStorage.getItem(`eggCatcherGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setScore(gameState.score || 0);
          setBasket(gameState.basket || { x: canvasWidth / 2 - basketWidth / 2, y: canvasHeight - 100 });
          setEggs(gameState.eggs || []);
          setLives(gameState.lives || 3);
          setGameRunning(gameState.gameRunning || false);
          setGamePaused(gameState.gamePaused || false);
          setGameOver(gameState.gameOver || false);
          setCurrentSpeed(gameState.currentSpeed || baseSpeed);
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
    setBasket({ x: canvasWidth / 2 - basketWidth / 2, y: canvasHeight - 100 });
    setEggs([]);
    setLives(3);
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setCurrentSpeed(baseSpeed);
    setCombo(0);
    setParticles([]);
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        basket,
        eggs,
        lives,
        gameRunning,
        gamePaused,
        gameOver,
        currentSpeed,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`eggCatcherGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, basket, eggs, lives, gameRunning, gamePaused, gameOver, currentSpeed, gameId, isInitialized]);

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

  // Tính toán tốc độ dựa trên điểm
  const calculateSpeed = useCallback((currentScore) => {
    const speedReduction = Math.floor(currentScore / 20) * 100; // Giảm 100ms mỗi 20 điểm
    const newSpeed = Math.max(baseSpeed - speedReduction, minSpeed);
    return newSpeed;
  }, []);

  // Tạo quả trứng mới với chuyển động mượt mà
  const generateEgg = useCallback(() => {
    const eggTypes = [
      { type: 'normal', value: 10, name: 'Trứng thường' },
      { type: 'red', value: 15, name: 'Trứng đỏ' },
      { type: 'gold', value: 20, name: 'Trứng vàng' },
      { type: 'silver', value: 25, name: 'Trứng bạc' }
    ];
    
    const selectedEgg = eggTypes[Math.floor(Math.random() * eggTypes.length)];
    
    const newEgg = {
      x: Math.random() * (canvasWidth - 2 * eggRadius) + eggRadius,
      y: -eggRadius,
      vy: 4 + Math.random() * 4, // Tăng tốc độ rơi: 4-8
      vx: (Math.random() - 0.5) * 0.8, // Giảm vận tốc ngang
      type: selectedEgg.type,
      value: selectedEgg.value,
      name: selectedEgg.name,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.05, // Giảm tốc độ xoay
      size: eggRadius + Math.random() * 5, // Giảm kích thước variation
      wobble: 0,
      wobbleSpeed: Math.random() * 0.05 + 0.02, // Giảm tốc độ wobble
      lifeLost: false // Thêm thuộc tính để theo dõi trứng đã bị trừ máu chưa
    };
    setEggs(prev => [...prev, newEgg]);
  }, []);

  // Tạo hiệu ứng particle khi bắt được trứng
  const createCatchParticles = useCallback((x, y, eggType) => {
    const colors = {
      normal: '#4ECDC4',
      red: '#FF6B6B', 
      gold: '#FFD700',
      silver: '#45B7D1'
    };
    
    const color = colors[eggType] || '#4ECDC4';
    
    const newParticles = [];
    for (let i = 0; i < 8; i++) { // Giảm số lượng particles
      newParticles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6, // Giảm tốc độ particles
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        decay: 0.02, // Tăng decay để particles biến mất nhanh hơn
        color: color,
        size: Math.random() * 4 + 2 // Giảm kích thước particles
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Kiểm tra va chạm
  const checkCollision = useCallback((egg) => {
    const basketLeft = basket.x + 20; // Bỏ qua viền rổ
    const basketRight = basket.x + basketWidth - 20;
    const basketTop = basket.y + 10;
    const basketBottom = basket.y + basketHeight - 10;

    const eggLeft = egg.x - egg.size;
    const eggRight = egg.x + egg.size;
    const eggTop = egg.y - egg.size;
    const eggBottom = egg.y + egg.size;

    return eggLeft < basketRight && 
           eggRight > basketLeft && 
           eggTop < basketBottom && 
           eggBottom > basketTop;
  }, [basket]);

  // Game loop với chuyển động mượt mà
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setEggs(prevEggs => {
      const newEggs = prevEggs.map(egg => ({
        ...egg,
        x: egg.x + egg.vx,
        y: egg.y + egg.vy,
        rotation: egg.rotation + egg.rotationSpeed,
        wobble: egg.wobble + egg.wobbleSpeed
      })).filter(egg => {
        // Kiểm tra va chạm với rổ
        if (checkCollision(egg)) {
          const now = Date.now();
          const timeSinceLastCatch = now - lastCatchTime;
          
          // Tính combo
          if (timeSinceLastCatch < 1000) {
            setCombo(prev => prev + 1);
          } else {
            setCombo(1);
          }
          setLastCatchTime(now);
          
          // Tính điểm với combo và giá trị trứng
          const comboMultiplier = Math.min(combo + 1, 5);
          const points = egg.value * comboMultiplier;
          
          setScore(prev => {
            const newScore = prev + points;
            finalScoreRef.current = newScore;
            if (newScore > highScore) {
              setHighScore(newScore);
            }
            return newScore;
          });
          
          // Tạo hiệu ứng particle và âm thanh
          createCatchParticles(egg.x, egg.y, egg.type);
          playCatchSound();
          
          return false; // Xóa quả trứng đã bắt được
        }
        
        // Giữ trứng trong màn hình theo chiều ngang - CẢI THIỆN
        if (egg.x < egg.size) {
          return {
            ...egg,
            x: egg.size,
            vx: Math.abs(egg.vx) * 0.8 // Giảm tốc độ khi chạm biên
          };
        }
        if (egg.x > canvasWidth - egg.size) {
          return {
            ...egg,
            x: canvasWidth - egg.size,
            vx: -Math.abs(egg.vx) * 0.8 // Giảm tốc độ khi chạm biên
          };
        }
        
        // Xóa trứng rơi ra ngoài màn hình - CHỈ KHI RƠI XUỐNG DƯỚI
        if (egg.y > canvasHeight + egg.size) {
          // Kiểm tra xem trứng này đã bị trừ máu chưa
          if (!egg.lifeLost) {
            setLives(prev => {
              if (prev > 0) {
                const newLives = prev - 1;
                if (newLives <= 0) {
                  setGameOver(true);
                  setGameRunning(false);
                  if (gameLoopRef.current) {
                    clearInterval(gameLoopRef.current);
                  }
                  
                  playGameOverSound();
                  
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
                } else {
                  playMissSound();
                }
                setCombo(0); // Reset combo khi miss
                return newLives;
              }
              return prev;
            });
            // Đánh dấu trứng này đã bị trừ máu và xóa nó
            return false; // Xóa quả trứng đã rơi
          }
          return false; // Xóa quả trứng đã rơi
        }
        
        return egg; // Giữ lại quả trứng
      });

      return newEggs;
    });

    // Cập nhật particles
    setParticles(prevParticles => 
      prevParticles.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        life: particle.life - particle.decay,
        vy: particle.vy + 0.2 // Giảm gravity cho particles
      })).filter(particle => particle.life > 0)
    );
  }, [gameRunning, gamePaused, checkCollision, highScore, onGameEnd, hasSavedScore, saveHighScore, isSavingScore, createCatchParticles, playCatchSound, playMissSound, playGameOverSound, lastCatchTime, combo]);

  // Tạo trứng định kỳ
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      const eggInterval = setInterval(generateEgg, currentSpeed);
      return () => clearInterval(eggInterval);
    }
  }, [gameRunning, gamePaused, generateEgg, currentSpeed]);

  // Game loop chính - Tăng FPS để mượt hơn
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(gameLoop, 8); // 120 FPS để mượt hơn
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, gamePaused, gameLoop]);

  // Cập nhật tốc độ khi điểm thay đổi
  useEffect(() => {
    const newSpeed = calculateSpeed(score);
    setCurrentSpeed(newSpeed);
  }, [score, calculateSpeed]);

  // Handle mouse input only
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!gameRunning || gamePaused || gameOver) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      setBasket(prev => ({
        ...prev,
        x: Math.max(0, Math.min(canvasWidth - basketWidth, mouseX - basketWidth / 2))
      }));
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      
      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [gameRunning, gamePaused, gameOver]);

  // Draw game với giao diện đẹp hơn
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    // Clear canvas với background thực tế
    if (skyImg.current && skyImg.current.complete) {
      ctx.drawImage(skyImg.current, 0, 0, canvasWidth, canvasHeight);
    } else {
      // Fallback gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(1, '#98FB98'); // Pale green
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw clouds với ảnh thực tế
    if (cloudImg.current && cloudImg.current.complete) {
      for (let i = 0; i < 5; i++) {
        const x = (i * 200) % canvasWidth;
        const y = 50 + Math.sin(Date.now() * 0.001 + i) * 20;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(cloudImg.current, x, y, 80, 50);
      }
      ctx.globalAlpha = 1;
    } else {
      // Fallback clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 5; i++) {
        const x = (i * 200) % canvasWidth;
        const y = 50 + Math.sin(Date.now() * 0.001 + i) * 20;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, 2 * Math.PI);
        ctx.arc(x + 25, y, 25, 0, 2 * Math.PI);
        ctx.arc(x + 50, y, 30, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw grass với ảnh thực tế
    if (grassImg.current && grassImg.current.complete) {
      ctx.drawImage(grassImg.current, 0, canvasHeight - 50, canvasWidth, 50);
    } else {
      // Fallback grass
      ctx.fillStyle = '#228B22';
      ctx.fillRect(0, canvasHeight - 50, canvasWidth, 50);
    }

    // Draw particles
    particles.forEach(particle => {
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw eggs với ảnh thực tế
    eggs.forEach(egg => {
      ctx.save();
      ctx.translate(egg.x, egg.y);
      ctx.rotate(egg.rotation);
      
      // Wobble effect
      const wobbleX = Math.sin(egg.wobble) * 3;
      ctx.translate(wobbleX, 0);
      
      // Vẽ trứng bằng ảnh thực tế
      let eggImage = null;
      if (egg.type === 'normal' && normalEggImg.current && normalEggImg.current.complete) {
        eggImage = normalEggImg.current;
      } else if (egg.type === 'red' && redEggImg.current && redEggImg.current.complete) {
        eggImage = redEggImg.current;
      } else if (egg.type === 'gold' && goldEggImg.current && goldEggImg.current.complete) {
        eggImage = goldEggImg.current;
      } else if (egg.type === 'silver' && silverEggImg.current && silverEggImg.current.complete) {
        eggImage = silverEggImg.current;
      }
      
      if (eggImage) {
        // Vẽ ảnh trứng thực tế
        const imgSize = egg.size * 2;
        ctx.drawImage(eggImage, -imgSize/2, -imgSize/2, imgSize, imgSize);
      } else {
        // Fallback: vẽ trứng bằng hình ellipse
        const colors = {
          normal: '#4ECDC4',
          red: '#FF6B6B',
          gold: '#FFD700',
          silver: '#45B7D1'
        };
        
        const color = colors[egg.type] || '#4ECDC4';
        
        // Egg shape
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, egg.size, egg.size * 0.7, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Egg highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-egg.size * 0.3, -egg.size * 0.2, egg.size * 0.3, egg.size * 0.2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Egg shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(egg.size * 0.2, egg.size * 0.1, egg.size * 0.3, egg.size * 0.2, 0, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      ctx.restore();
    });

    // Draw basket với ảnh thực tế
    if (basketImg.current && basketImg.current.complete) {
      ctx.drawImage(basketImg.current, basket.x, basket.y, basketWidth, basketHeight);
    } else {
      // Fallback basket với gradient và shadow
      const basketGradient = ctx.createLinearGradient(basket.x, basket.y, basket.x, basket.y + basketHeight);
      basketGradient.addColorStop(0, '#8B4513'); // Saddle brown
      basketGradient.addColorStop(1, '#654321'); // Dark brown
      
      // Basket shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(basket.x + 5, basket.y + 5, basketWidth, basketHeight);
      
      // Basket body
      ctx.fillStyle = basketGradient;
      ctx.fillRect(basket.x, basket.y, basketWidth, basketHeight);
      
      // Basket border
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 3;
      ctx.strokeRect(basket.x, basket.y, basketWidth, basketHeight);
      
      // Basket weave pattern
      ctx.strokeStyle = '#A0522D';
      ctx.lineWidth = 1;
      for (let i = 0; i < basketWidth; i += 15) {
        ctx.beginPath();
        ctx.moveTo(basket.x + i, basket.y);
        ctx.lineTo(basket.x + i, basket.y + basketHeight);
        ctx.stroke();
      }
      for (let i = 0; i < basketHeight; i += 15) {
        ctx.beginPath();
        ctx.moveTo(basket.x, basket.y + i);
        ctx.lineTo(basket.x + basketWidth, basket.y + i);
        ctx.stroke();
      }
      
      // Basket handle
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(basket.x + basketWidth / 2, basket.y - 10, 40, 0, Math.PI, true);
      ctx.stroke();
    }

    // Draw lives với hiệu ứng pulse
    for (let i = 0; i < lives; i++) {
      const pulse = Math.sin(Date.now() * 0.01 + i) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(255, 20, 147, ${pulse})`;
      ctx.beginPath();
      ctx.arc(30 + i * 40, 30, 15, 0, 2 * Math.PI);
      ctx.fill();
      
      // Heart shape
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('♥', 30 + i * 40, 38);
    }

    // Draw combo indicator
    if (combo > 1) {
      ctx.fillStyle = `rgba(255, 215, 0, ${Math.sin(Date.now() * 0.01) * 0.3 + 0.7})`;
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO x${combo}`, canvasWidth / 2, 60);
    }
  }, [basket, eggs, lives, particles, combo]);

  const restartGame = () => {
    setBasket({ x: canvasWidth / 2 - basketWidth / 2, y: canvasHeight - 100 });
    setEggs([]);
    setScore(0);
    setLives(3);
    finalScoreRef.current = 0;
    setCurrentSpeed(baseSpeed);
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setHasSavedScore(false);
    setIsSavingScore(false);
    setCombo(0);
    setParticles([]);
    
    if (gameId) {
      localStorage.removeItem(`eggCatcherGame_${gameId}`);
    }
  };

  const handleCanvasClick = () => {
    setIsFocused(true);
    if (!gameRunning && !gameOver) {
      setGameRunning(true);
    }
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
      <Typography variant="h4" gutterBottom sx={{ color: '#FF6B35', mb: 2 }}>
        🥚 Rổ Hứng Trứng
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span">
          Điểm: {score}
        </Typography>
        <Typography variant="h6" component="span">
          Điểm cao nhất: {highScore}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#E91E63' }}>
          Level: {getLevel()}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#F44336' }}>
          Mạng: {lives}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: isFocused ? '3px solid #FF6B35' : '3px solid #666',
            borderRadius: '10px',
            background: '#87CEEB',
            cursor: 'crosshair',
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
              {isFocused ? 'Click để bắt đầu!' : 'Click vào game để bắt đầu'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Di chuyển chuột để điều khiển rổ
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Bắt càng nhiều trứng càng tốt
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Combo sẽ tăng điểm nhân lên
            </Typography>
            <Typography variant="body2">
              Trứng vàng = 10 điểm, Trứng đỏ = 15 điểm
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
          {isFocused ? '✅ Game đã sẵn sàng! Dùng chuột để điều khiển rổ' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
      </Box>
    </Box>
  );
};

export default EggCatcherGame; 