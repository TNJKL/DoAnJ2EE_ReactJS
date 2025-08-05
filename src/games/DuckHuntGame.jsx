import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const DuckHuntGame = ({ onGameEnd }) => {
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
  const [round, setRound] = useState(1);
  const [shots, setShots] = useState(3);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  // Game constants
  const canvasWidth = 800;
  const canvasHeight = 600;
  const duckTypes = [
    { type: 'normal', color: '#000000', points: 10, speed: 2 },
    { type: 'golden', color: '#FFD700', points: 50, speed: 3 },
    { type: 'diamond', color: '#00FFFF', points: 100, speed: 4 },
    { type: 'bomb', color: '#FF0000', points: -50, speed: 1.5 } // Sửa thành -50 điểm
  ];

  // Game state
  const [ducks, setDucks] = useState([]);
  const [dogs, setDogs] = useState([]);
  const [crosshair, setCrosshair] = useState({ x: canvasWidth / 2, y: canvasHeight / 2 });
  const [gameStarted, setGameStarted] = useState(false);
  const [scoreEffect, setScoreEffect] = useState(false);
  const [showDog, setShowDog] = useState(false);
  const [dogState, setDogState] = useState('waiting'); // waiting, laughing, retrieving
  const [totalShots, setTotalShots] = useState(10); // Tổng số đạn
  const [shotsUsed, setShotsUsed] = useState(0); // Số đạn đã bắn
  const [showEndGame, setShowEndGame] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [roundMilestone, setRoundMilestone] = useState(0); // Điểm milestone cho vòng hiện tại
  const [isWinner, setIsWinner] = useState(false); // Kiểm tra có đạt milestone không

  // Audio context
  const audioContextRef = useRef(null);
  const backgroundImgRef = useRef(null);
  const treeImgRef = useRef(null);
  const grassImgRef = useRef(null);
  const groundImgRef = useRef(null);
  const redBirdImgRef = useRef(null);
  const goldenBirdImgRef = useRef(null);
  const diamondBirdImgRef = useRef(null);
  const bombBirdImgRef = useRef(null);
  const imagesLoadedRef = useRef({ 
    background: false, 
    tree: false, 
    grass: false, 
    ground: false,
    redBird: false,
    goldenBird: false,
    diamondBird: false,
    bombBird: false
  });

  // Generate realistic milestone for each round
  const generateMilestone = useCallback((roundNumber) => {
    // Milestone theo yêu cầu cụ thể cho từng vòng
    let minMilestone, maxMilestone;
    
    switch(roundNumber) {
      case 1:
        minMilestone = 80;
        maxMilestone = 120;
        break;
      case 2:
        minMilestone = 120;
        maxMilestone = 180;
        break;
      case 3:
        minMilestone = 160;
        maxMilestone = 240;
        break;
      case 4:
        minMilestone = 200;
        maxMilestone = 400;
        break;
      case 5:
        minMilestone = 400;
        maxMilestone = 600;
        break;
      case 6:
        minMilestone = 600;
        maxMilestone = 800;
        break;
      case 7:
        minMilestone = 800;
        maxMilestone = 1000;
        break;
      case 8: // Final round
        minMilestone = 1000;
        maxMilestone = 1200;
        break;
      default:
        minMilestone = 1200;
        maxMilestone = 1500;
        break;
    }
    
    // Random milestone trong khoảng cho phép
    const milestone = Math.floor(minMilestone + Math.random() * (maxMilestone - minMilestone));
    
    return milestone;
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

    const savedGameState = localStorage.getItem(`duckHuntGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setScore(gameState.score || 0);
          setRound(gameState.round || 1);
          setShots(gameState.shots || 3);
          setHits(gameState.hits || 0);
          setMisses(gameState.misses || 0);
          setDucks(gameState.ducks || []);
          setDogs(gameState.dogs || []);
          setGameRunning(gameState.gameRunning || false);
          setGamePaused(gameState.gamePaused || false);
          setGameOver(gameState.gameOver || false);
          setGameStarted(gameState.gameStarted || false);
          setTotalShots(gameState.totalShots || 10);
          setShotsUsed(gameState.shotsUsed || 0);
          setShowEndGame(gameState.showEndGame || false);
          setFinalScore(gameState.finalScore || 0);
          setRoundMilestone(gameState.roundMilestone || generateMilestone(1));
          setIsWinner(gameState.isWinner || false);
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
    setRound(1);
    setShots(3);
    setHits(0);
    setMisses(0);
    setDucks([]);
    setDogs([]);
    setCrosshair({ x: canvasWidth / 2, y: canvasHeight / 2 });
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setGameStarted(false);
    setScoreEffect(false);
    setShowDog(false);
    setDogState('waiting');
    setTotalShots(10);
    setShotsUsed(0);
    setShowEndGame(false);
    setFinalScore(0);
    setRoundMilestone(generateMilestone(1));
    setIsWinner(false);
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        round,
        shots,
        hits,
        misses,
        ducks,
        dogs,
        gameRunning,
        gamePaused,
        gameOver,
        gameStarted,
        totalShots,
        shotsUsed,
        showEndGame,
        finalScore,
        roundMilestone,
        isWinner,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`duckHuntGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, round, shots, hits, misses, ducks, dogs, gameRunning, gamePaused, gameOver, gameStarted, totalShots, shotsUsed, showEndGame, finalScore, roundMilestone, isWinner, gameId, isInitialized]);

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

  // Generate new duck
  const generateDuck = useCallback(() => {
    const duckType = duckTypes[Math.floor(Math.random() * duckTypes.length)];
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const y = Math.random() * (canvasHeight * 0.4) + canvasHeight * 0.1;
    
    return {
      id: Date.now() + Math.random(),
      x: side === 'left' ? -50 : canvasWidth + 50,
      y: y,
      vx: side === 'left' ? duckType.speed : -duckType.speed,
      vy: (Math.random() - 0.5) * 2,
      type: duckType.type,
      color: duckType.color,
      points: duckType.points,
      speed: duckType.speed,
      hit: false,
      fallSpeed: 0
    };
  }, []);

  // Generate dog
  const generateDog = useCallback(() => {
    return {
      id: Date.now() + Math.random(),
      x: canvasWidth / 2,
      y: canvasHeight - 60,
      state: 'waiting',
      animationFrame: 0
    };
  }, []);

  // Check collision between crosshair and duck
  const checkCollision = useCallback((crosshair, duck) => {
    const distance = Math.sqrt(
      Math.pow(crosshair.x - duck.x, 2) + Math.pow(crosshair.y - duck.y, 2)
    );
    return distance < 30; // Hit radius
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setDucks(prevDucks => {
      let newDucks = prevDucks.map(duck => {
        if (duck.hit) {
          // Duck is falling
          return {
            ...duck,
            y: duck.y + duck.fallSpeed,
            fallSpeed: duck.fallSpeed + 0.5,
            vy: 0
          };
        } else {
          // Duck is flying
          return {
            ...duck,
            x: duck.x + duck.vx,
            y: duck.y + duck.vy,
            vy: duck.vy + (Math.random() - 0.5) * 0.1
          };
        }
      }).filter(duck => duck.y < canvasHeight + 50 && duck.x > -100 && duck.x < canvasWidth + 100);

      // Generate new ducks
      if (newDucks.length < 3 && Math.random() < 0.02) {
        newDucks.push(generateDuck());
      }

      return newDucks;
    });

    setDogs(prevDogs => {
      return prevDogs.map(dog => ({
        ...dog,
        animationFrame: (dog.animationFrame + 1) % 60
      }));
    });

    // Show dog laughing if player misses too much
    if (misses >= 3 && !showDog) {
      setShowDog(true);
      setDogState('laughing');
      setTimeout(() => {
        setShowDog(false);
        setDogState('waiting');
      }, 3000);
    }
  }, [gameRunning, gamePaused, misses, showDog, generateDuck]);

  // Start game loop
  useEffect(() => {
    if (gameRunning && !gamePaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(gameLoop, 16);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameRunning, gamePaused, gameLoop]);

  // Khởi tạo audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Sound effects
  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'shot') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'miss') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'dog') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback((e) => {
    if (!gameRunning) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCrosshair({ x, y });
  }, [gameRunning]);

  // Handle mouse click
  const handleMouseClick = useCallback((e) => {
    if (!gameRunning || shotsUsed >= totalShots) return;
    
    setShotsUsed(prev => prev + 1);
    playSound('shot');
    
    // Check for hits
    let hit = false;
    setDucks(prevDucks => {
      return prevDucks.map(duck => {
        if (!duck.hit && checkCollision(crosshair, duck)) {
          hit = true;
          setScore(prev => {
            const newScore = prev + duck.points;
            finalScoreRef.current = newScore;
            
            // Kiểm tra milestone
            if (newScore >= roundMilestone && !isWinner) {
              setIsWinner(true);
              console.log('Milestone achieved!', newScore, '>=', roundMilestone);
              
              // Nếu đạt milestone, chuyển sang vòng tiếp theo
              if (round < 8) { // Chưa phải vòng cuối
                setTimeout(() => {
                  setRound(prev => prev + 1);
                  setScore(0); // Reset điểm cho vòng mới
                  setShotsUsed(0); // Reset đạn
                  setHits(0);
                  setMisses(0);
                  setDucks([]); // Xóa vịt cũ
                  setRoundMilestone(generateMilestone(round + 1)); // Tạo milestone mới
                  setIsWinner(false); // Reset winner status
                  setGameRunning(true); // Tiếp tục game
                  console.log('Moving to next round:', round + 1);
                }, 2000); // Đợi 2 giây để hiển thị thông báo
              } else {
                // Vòng cuối - game hoàn thành
                setTimeout(() => {
                  setGameOver(true);
                  setGameRunning(false);
                  setFinalScore(newScore);
                  setShowEndGame(true);
                  
                  if (gameLoopRef.current) {
                    clearInterval(gameLoopRef.current);
                  }
                  
                  // Save score to database
                  if (newScore > 0 && !hasSavedScore && !isSavingScore) {
                    console.log('Saving final score:', newScore);
                    setHasSavedScore(true);
                    setTimeout(() => {
                      saveHighScore(newScore).then(() => {
                        if (onGameEnd) {
                          onGameEnd();
                        }
                      });
                    }, 200);
                  }
                }, 2000);
              }
            }
            
            if (newScore > highScore) {
              setHighScore(newScore);
            }
            setScoreEffect(true);
            setTimeout(() => setScoreEffect(false), 300);
            return newScore;
          });
          setHits(prev => prev + 1);
          playSound('hit');
          return { ...duck, hit: true };
        }
        return duck;
      });
    });
    
    if (!hit) {
      setMisses(prev => prev + 1);
      playSound('miss');
    }
    
    // Check if all shots are used up (chỉ khi không phải winner)
    if (shotsUsed + 1 >= totalShots && !isWinner) {
      // Game over - all shots used
      setGameOver(true);
      setGameRunning(false);
      setFinalScore(score);
      setShowEndGame(true);
      
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      
      // Save score to database
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
  }, [gameRunning, shotsUsed, totalShots, crosshair, checkCollision, hits, highScore, hasSavedScore, isSavingScore, onGameEnd, playSound, score, roundMilestone, isWinner, round, generateMilestone]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ([' ', 'Space'].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      if (e.key === ' ' || e.key === 'Space') {
        if (!gameStarted) {
          setGameStarted(true);
          setGameRunning(true);
        }
      }

      if (e.key === 'p' || e.key === 'P') {
        if (gameRunning) {
          setGamePaused(prev => !prev);
        }
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
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Load background image if not loaded yet
    if (!backgroundImgRef.current) {
      const backgroundImg = new Image();
      backgroundImg.onload = () => {
        backgroundImgRef.current = backgroundImg;
        imagesLoadedRef.current.background = true;
      };
      backgroundImg.onerror = () => {
        imagesLoadedRef.current.background = true;
      };
      backgroundImg.src = 'https://static.vecteezy.com/system/resources/thumbnails/042/818/355/small_2x/8bit-pixel-graphic-blue-sky-background-with-clouds-vector.jpg';
    }
    
    // Load tree image if not loaded yet
    if (!treeImgRef.current) {
      const treeImg = new Image();
      treeImg.onload = () => {
        treeImgRef.current = treeImg;
        imagesLoadedRef.current.tree = true;
      };
      treeImg.onerror = () => {
        imagesLoadedRef.current.tree = true;
      };
      treeImg.src = 'https://img.itch.zone/aW1hZ2UvMjQ2MjkyOS8xNDYwOTU0MS5wbmc=/347x500/7DdW6m.png';
    }
    
    // Load grass image if not loaded yet
    if (!grassImgRef.current) {
      const grassImg = new Image();
      grassImg.onload = () => {
        grassImgRef.current = grassImg;
        imagesLoadedRef.current.grass = true;
      };
      grassImg.onerror = () => {
        imagesLoadedRef.current.grass = true;
      };
      grassImg.src = 'https://64.media.tumblr.com/b61c208cc57f3657b02313a5656d1660/795bab8c5363fda8-b7/s540x810/60d8438149f0449156d1881e472a6b7e7fde07cc.png';
    }

    // Load ground image if not loaded yet
    if (!groundImgRef.current) {
      const groundImg = new Image();
      groundImg.onload = () => {
        groundImgRef.current = groundImg;
        imagesLoadedRef.current.ground = true;
      };
      groundImg.onerror = () => {
        imagesLoadedRef.current.ground = true;
      };
      groundImg.src = 'https://us.123rf.com/450wm/mastakas/mastakas1602/mastakas160200018/52460873-ground-seamless-with-pattern-in-swatches-panel-illustration-in-pixel-art-classical-technique.jpg';
    }
    
    // Load red bird image if not loaded yet
    if (!redBirdImgRef.current) {
      const redBirdImg = new Image();
      redBirdImg.onload = () => {
        redBirdImgRef.current = redBirdImg;
        imagesLoadedRef.current.redBird = true;
      };
      redBirdImg.onerror = () => {
        imagesLoadedRef.current.redBird = true;
      };
      redBirdImg.src = 'https://pngimg.com/d/angry_birds_PNG45.png';
    }
    
    // Load golden bird image if not loaded yet
    if (!goldenBirdImgRef.current) {
      const goldenBirdImg = new Image();
      goldenBirdImg.onload = () => {
        goldenBirdImgRef.current = goldenBirdImg;
        imagesLoadedRef.current.goldenBird = true;
      };
      goldenBirdImg.onerror = () => {
        imagesLoadedRef.current.goldenBird = true;
      };
      goldenBirdImg.src = 'https://pngimg.com/d/angry_birds_PNG28.png';
    }
    
    // Load diamond bird image if not loaded yet
    if (!diamondBirdImgRef.current) {
      const diamondBirdImg = new Image();
      diamondBirdImg.onload = () => {
        diamondBirdImgRef.current = diamondBirdImg;
        imagesLoadedRef.current.diamondBird = true;
      };
      diamondBirdImg.onerror = () => {
        imagesLoadedRef.current.diamondBird = true;
      };
      diamondBirdImg.src = 'https://www.freeiconspng.com/thumbs/angry-birds-png/free-download-angry-birds-png-images-4.png';
    }
    
    // Load bomb bird image if not loaded yet
    if (!bombBirdImgRef.current) {
      const bombBirdImg = new Image();
      bombBirdImg.onload = () => {
        bombBirdImgRef.current = bombBirdImg;
        imagesLoadedRef.current.bombBird = true;
      };
      bombBirdImg.onerror = () => {
        imagesLoadedRef.current.bombBird = true;
      };
      bombBirdImg.src = 'https://www.freeiconspng.com/thumbs/angry-birds-png/angry-birds-in-png-21.png';
    }
    
    // Draw background
    if (backgroundImgRef.current && imagesLoadedRef.current.background) {
      ctx.drawImage(backgroundImgRef.current, 0, 0, canvasWidth, canvasHeight);
    } else {
      // Fallback: draw sky gradient if background image fails to load
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.7);
      skyGradient.addColorStop(0, '#87CEEB');
      skyGradient.addColorStop(1, '#98FB98');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight * 0.7);
    }
    
    // Draw grass
    if (grassImgRef.current && imagesLoadedRef.current.grass) {
      ctx.drawImage(grassImgRef.current, 0, canvasHeight * 0.7, canvasWidth, canvasHeight * 0.1);
    } else {
      // Fallback: draw grass texture
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, canvasHeight * 0.7, canvasWidth, canvasHeight * 0.1);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvasWidth; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, canvasHeight * 0.7);
        ctx.lineTo(i, canvasHeight * 0.8);
        ctx.stroke();
      }
    }
    
    // Draw ground
    if (groundImgRef.current && imagesLoadedRef.current.ground) {
      ctx.drawImage(groundImgRef.current, 0, canvasHeight * 0.8, canvasWidth, canvasHeight * 0.2);
    } else {
      // Fallback: draw ground texture
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, canvasHeight * 0.8, canvasWidth, canvasHeight * 0.2);
    }
    
    // Draw trees
    if (treeImgRef.current && imagesLoadedRef.current.tree) {
      // Draw multiple trees at different positions on the grass
      const treePositions = [
        { x: 50, y: canvasHeight * 0.6, width: 60, height: 120 }, // Short tree
        { x: 150, y: canvasHeight * 0.55, width: 80, height: 160 }, // Medium tree
        { x: 700, y: canvasHeight * 0.5, width: 100, height: 200 }, // Tall tree
        { x: 300, y: canvasHeight * 0.58, width: 70, height: 140 }, // Medium-short tree
        { x: 600, y: canvasHeight * 0.52, width: 90, height: 180 }, // Tall-medium tree
        { x: 450, y: canvasHeight * 0.62, width: 50, height: 100 }, // Very short tree
        { x: 800, y: canvasHeight * 0.54, width: 85, height: 170 }  // Medium-tall tree
      ];
      
      treePositions.forEach(tree => {
        ctx.drawImage(treeImgRef.current, tree.x, tree.y, tree.width, tree.height);
      });
    } else {
      // Fallback: draw simple trees if image fails to load
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(50, canvasHeight * 0.6, 20, canvasHeight * 0.2);
      ctx.fillRect(150, canvasHeight * 0.55, 25, canvasHeight * 0.25);
      ctx.fillRect(700, canvasHeight * 0.5, 30, canvasHeight * 0.3);
      ctx.fillRect(300, canvasHeight * 0.58, 22, canvasHeight * 0.22);
      ctx.fillRect(600, canvasHeight * 0.52, 28, canvasHeight * 0.28);
      
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(60, canvasHeight * 0.6, 40, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(162, canvasHeight * 0.55, 50, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(715, canvasHeight * 0.5, 60, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(311, canvasHeight * 0.58, 45, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(614, canvasHeight * 0.52, 55, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw ducks
    ducks.forEach(duck => {
      let imgRef;
      switch (duck.type) {
        case 'normal':
          imgRef = redBirdImgRef.current;
          break;
        case 'golden':
          imgRef = goldenBirdImgRef.current;
          break;
        case 'diamond':
          imgRef = diamondBirdImgRef.current;
          break;
        case 'bomb':
          imgRef = bombBirdImgRef.current;
          break;
        default:
          imgRef = redBirdImgRef.current; // Fallback
      }

      if (imgRef && imagesLoadedRef.current[`${duck.type}Bird`]) {
        ctx.drawImage(imgRef, duck.x - 15, duck.y - 15, 30, 30);
      } else {
        // Fallback to simple circle if image fails to load
        ctx.fillStyle = duck.color;
        ctx.beginPath();
        ctx.arc(duck.x, duck.y, 15, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Draw crosshair
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(crosshair.x - 15, crosshair.y);
    ctx.lineTo(crosshair.x + 15, crosshair.y);
    ctx.moveTo(crosshair.x, crosshair.y - 15);
    ctx.lineTo(crosshair.x, crosshair.y + 15);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(crosshair.x, crosshair.y, 20, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw dogs
    dogs.forEach(dog => {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(dog.x - 15, dog.y, 30, 40);
      
      // Draw dog face
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(dog.x - 10, dog.y + 5, 20, 15);
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(dog.x - 5, dog.y + 10, 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dog.x + 5, dog.y + 10, 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw dog mouth
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dog.x, dog.y + 15, 3, 0, Math.PI);
      ctx.stroke();
    });
    
    // Draw HUD
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvasHeight - 60, canvasWidth, 60);
    
    // Draw round info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`VÒNG ${round}`, 20, canvasHeight - 40);
    
    // Draw shots
    ctx.fillText('ĐẠN', 20, canvasHeight - 20);
    ctx.fillStyle = '#000000';
    ctx.fillRect(70, canvasHeight - 35, 30, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText((totalShots - shotsUsed).toString().padStart(2, '0'), 85, canvasHeight - 22);
    
    // Draw hits
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText('TRÚNG', canvasWidth / 2 - 50, canvasHeight - 40);
    
    // Draw hit indicators
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i < hits ? '#FF0000' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(canvasWidth / 2 - 30 + i * 15, canvasHeight - 20, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw score
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(score.toString().padStart(6, '0'), canvasWidth - 20, canvasHeight - 40);
    ctx.fillText('ĐIỂM', canvasWidth - 20, canvasHeight - 20);
    
  }, [ducks, dogs, crosshair, round, shots, hits, score, totalShots, shotsUsed]);

  const restartGame = () => {
    setScore(0);
    setRound(1);
    setShots(3);
    setHits(0);
    setMisses(0);
    setDucks([]);
    setDogs([]);
    setCrosshair({ x: canvasWidth / 2, y: canvasHeight / 2 });
    finalScoreRef.current = 0;
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setGameStarted(false);
    setHasSavedScore(false);
    setIsSavingScore(false);
    setScoreEffect(false);
    setShowDog(false);
    setDogState('waiting');
    setTotalShots(10);
    setShotsUsed(0);
    setShowEndGame(false);
    setFinalScore(0);
    setRoundMilestone(generateMilestone(1));
    setIsWinner(false);
    
    if (gameId) {
      localStorage.removeItem(`duckHuntGame_${gameId}`);
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
      <Typography variant="h4" gutterBottom sx={{ color: '#8B4513', mb: 2 }}>
        🦆 Săn Vịt Cổ Điển
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography 
          variant="h6" 
          component="span"
          sx={{
            color: scoreEffect ? '#FFD700' : 'inherit',
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
        <Typography variant="h6" component="span" sx={{ color: '#FF9800' }}>
          Vòng: {round}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#E91E63' }}>
          Đạn: {totalShots - shotsUsed}
        </Typography>
        <Typography variant="h6" component="span" sx={{ color: '#9C27B0' }}>
          Mục tiêu: {roundMilestone}
        </Typography>
        {isWinner && (
          <Typography variant="h6" component="span" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
            🏆 WINNER!
          </Typography>
        )}
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: isFocused ? '3px solid #8B4513' : '3px solid #666',
            borderRadius: '10px',
            cursor: 'crosshair',
            outline: 'none'
          }}
          tabIndex={0}
          onClick={handleMouseClick}
          onMouseMove={handleMouseMove}
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
              {isFocused ? 'Nhấn Click để bắt đầu săn vịt!' : 'Click vào game để bắt đầu'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              🦆 Vịt thường: 10 điểm
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              🦆 Vịt vàng: 50 điểm
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              💎 Vịt kim cương: 100 điểm
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              💣 Vịt bom: -50 điểm
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Bạn có 10 viên đạn - hãy bắn thật chính xác!
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Vòng {round}: Đạt {roundMilestone} điểm để chiến thắng!
            </Typography>
            <Typography variant="body2">
              Space để bắt đầu | P để tạm dừng | R để chơi lại
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
              {isWinner ? '🏆 WINNER!' : 'Game Over!'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Điểm của bạn: {finalScore}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Vòng: {round} | Mục tiêu: {roundMilestone}
            </Typography>
            {isWinner ? (
              <Typography variant="body2" sx={{ color: '#FFD700', mb: 2 }}>
                {round >= 8 ? '🎉 Chúc mừng! Bạn đã hoàn thành tất cả vòng!' : '🎉 Chúc mừng! Bạn đã đạt mục tiêu!'}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: '#FF6B6B', mb: 2 }}>
                😔 Chưa đạt mục tiêu. Hãy thử lại!
              </Typography>
            )}
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

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={restartGame}
          sx={{ 
            background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
            boxShadow: '0 3px 5px 2px rgba(255, 107, 107, .3)'
          }}
        >
          🔄 Reset Game
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {isFocused ? '✅ Sẵn sàng săn vịt! Dùng: Mouse | Space | P | R' : '💡 Click vào game để bắt đầu săn vịt'}
        </Typography>
      </Box>
    </Box>
  );
};

export default DuckHuntGame; 