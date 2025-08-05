import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

// Error Boundary Component
class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="h6" color="error" gutterBottom>
            Có lỗi xảy ra trong game
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Vui lòng thử tải lại trang
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Tải lại trang
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

const StreetFighterGame = ({ onGameEnd }) => {
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
  const [gameMode, setGameMode] = useState('vsAI');
  const [round, setRound] = useState(1);
  const [player1Wins, setPlayer1Wins] = useState(0);
  const [player2Wins, setPlayer2Wins] = useState(0);
  const [winner, setWinner] = useState(null);
  const [roundWinner, setRoundWinner] = useState(null);
  const [scoreEffect, setScoreEffect] = useState(false);
  const [roundTime, setRoundTime] = useState(99);

  // Game constants
  const canvasWidth = 800;
  const canvasHeight = 400;
  const groundY = 350;
  const gravity = 0.6;
  const jumpForce = -15;
  const moveSpeed = 4;
  const attackRange = 80;
  const healthBarWidth = 200;
  const healthBarHeight = 25;

  // Game state
  const [player1, setPlayer1] = useState({
    x: 150,
    y: groundY - 100,
    velocity: 0,
    health: 100,
    isJumping: false,
    isDucking: false,
    isAttacking: false,
    isBlocking: false,
    isWalking: false,
    direction: 1,
    attackCooldown: 0,
    blockCooldown: 0,
    combo: 0,
    lastHit: 0,
    animationFrame: 0,
    spriteX: 0,
    spriteY: 0,
    // Smooth movement properties
    isMovingLeft: false,
    isMovingRight: false,
    dashCooldown: 0,
    lastKeyPress: 0
  });

  const [player2, setPlayer2] = useState({
    x: 650,
    y: groundY - 100,
    velocity: 0,
    health: 100,
    isJumping: false,
    isDucking: false,
    isAttacking: false,
    isBlocking: false,
    isWalking: false,
    direction: -1,
    attackCooldown: 0,
    blockCooldown: 0,
    combo: 0,
    lastHit: 0,
    animationFrame: 0,
    spriteX: 0,
    spriteY: 0,
    // Smooth movement properties
    isMovingLeft: false,
    isMovingRight: false,
    dashCooldown: 0,
    lastKeyPress: 0
  });

  // AI Timer for super easy mode
  const [aiActionTimer, setAiActionTimer] = useState(0);
  const [lastAiAction, setLastAiAction] = useState(0);

  const [gameStarted, setGameStarted] = useState(false);
  const [specialEffects, setSpecialEffects] = useState([]);

  // Image refs
  const player1Img = useRef(null);
  const player2Img = useRef(null);
  const backgroundImg = useRef(null);
  const fireballImg = useRef(null);
  const audioContextRef = useRef(null);

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

    const savedGameState = localStorage.getItem(`streetFighterGame_${gameIdFromUrl}`);
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        console.log('Loading saved game state:', gameState);
        
        const isStateValid = !gameState.gameOver && 
          (Date.now() - gameState.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isStateValid) {
          setScore(gameState.score || 0);
          setPlayer1(gameState.player1 || player1);
          setPlayer2(gameState.player2 || player2);
          setRound(gameState.round || 1);
          setPlayer1Wins(gameState.player1Wins || 0);
          setPlayer2Wins(gameState.player2Wins || 0);
          setGameRunning(gameState.gameRunning || false);
          setGamePaused(gameState.gamePaused || false);
          setGameOver(gameState.gameOver || false);
          setGameStarted(gameState.gameStarted || false);
          setGameMode(gameState.gameMode || 'vsAI');
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
    setPlayer1({
      x: 150,
      y: groundY - 100,
      velocity: 0,
      health: 100,
      isJumping: false,
      isDucking: false,
      isAttacking: false,
      isBlocking: false,
      isWalking: false,
      direction: 1,
      attackCooldown: 0,
      blockCooldown: 0,
      combo: 0,
      lastHit: 0,
      animationFrame: 0,
      spriteX: 0,
      spriteY: 0
    });
    setPlayer2({
      x: 650,
      y: groundY - 100,
      velocity: 0,
      health: 100,
      isJumping: false,
      isDucking: false,
      isAttacking: false,
      isBlocking: false,
      isWalking: false,
      direction: -1,
      attackCooldown: 0,
      blockCooldown: 0,
      combo: 0,
      lastHit: 0,
      animationFrame: 0,
      spriteX: 0,
      spriteY: 0
    });
    setRound(1);
    setPlayer1Wins(0);
    setPlayer2Wins(0);
    setWinner(null);
    setRoundWinner(null);
    setRoundTime(99);
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setGameStarted(false);
    setScoreEffect(false);
    setSpecialEffects([]);
    setAiActionTimer(0);
    setLastAiAction(0);
  };

  // Save game state to localStorage
  useEffect(() => {
    if (gameId && isInitialized) {
      const gameState = {
        score,
        player1,
        player2,
        round,
        player1Wins,
        player2Wins,
        gameRunning,
        gamePaused,
        gameOver,
        gameStarted,
        gameMode,
        timestamp: Date.now()
      };
      console.log('Saving game state:', gameState);
      localStorage.setItem(`streetFighterGame_${gameId}`, JSON.stringify(gameState));
    }
  }, [score, player1, player2, round, player1Wins, player2Wins, gameRunning, gamePaused, gameOver, gameStarted, gameMode, gameId, isInitialized]);

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

  // Check collision between players
  const checkCollision = useCallback((p1, p2) => {
    const distance = Math.abs(p1.x - p2.x);
    const isColliding = distance < attackRange;
    console.log(`Collision check: P1(${p1.x}) P2(${p2.x}) Distance(${distance}) AttackRange(${attackRange}) Colliding(${isColliding})`);
    return isColliding;
  }, [attackRange]);

  // AI logic for player 2 - SUPER EASY MODE (10-20 seconds per action)
  const aiMove = useCallback((p1, p2) => {
    if (!gameRunning || gamePaused) return p2;

    let newP2 = { ...p2 };
    const distance = Math.abs(p1.x - p2.x);
    const currentTime = Date.now();
    
    // Only allow AI action every 10-20 seconds
    const timeSinceLastAction = currentTime - lastAiAction;
    const minActionDelay = 10000; // 10 seconds
    const maxActionDelay = 20000; // 20 seconds
    const actionDelay = Math.random() * (maxActionDelay - minActionDelay) + minActionDelay;
    
    if (timeSinceLastAction < actionDelay) {
      // Just move slowly towards player if too far, or stay still
      if (distance > attackRange * 1.5) {
        const moveDirection = p1.x > p2.x ? 1 : -1;
        newP2.x += (moveDirection * (moveSpeed * 0.5)); // Slower movement
        newP2.direction = moveDirection;
        newP2.isWalking = true;
        if (newP2.x < 50) newP2.x = 50;
        if (newP2.x > canvasWidth - 50) newP2.x = canvasWidth - 50;
      }
      return newP2;
    }
    
    // AI can perform an action now
    setLastAiAction(currentTime);
    
    // Simple AI logic - just basic movement and occasional attack/block
    if (distance < attackRange) {
      // Close to player - 50% chance to attack, 30% chance to block, 20% chance to do nothing
      const action = Math.random();
      if (action < 0.5 && p2.attackCooldown <= 0) {
        newP2.isAttacking = true;
        newP2.attackCooldown = 120;
      } else if (action < 0.8 && p2.blockCooldown <= 0) {
        newP2.isBlocking = true;
        newP2.blockCooldown = 60;
      }
    } else {
      // Far from player - move towards player
      const moveDirection = p1.x > p2.x ? 1 : -1;
      newP2.x += (moveDirection * moveSpeed);
      newP2.direction = moveDirection;
      newP2.isWalking = true;
      if (newP2.x < 50) newP2.x = 50;
      if (newP2.x > canvasWidth - 50) newP2.x = canvasWidth - 50;
    }

    return newP2;
  }, [gameRunning, gamePaused, attackRange, moveSpeed, canvasWidth, jumpForce, lastAiAction]);

  // Sound effects
  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'punch') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'block') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'dash') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    }
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameRunning || gamePaused) return;

    setPlayer1(prevP1 => {
      let newP1 = { ...prevP1 };

      // Apply gravity
      if (newP1.isJumping) {
        newP1.velocity += gravity;
        newP1.y += newP1.velocity;
        
        if (newP1.y >= groundY - 100) {
          newP1.y = groundY - 100;
          newP1.velocity = 0;
          newP1.isJumping = false;
        }
      }

      // Reset attack and block states
      if (newP1.attackCooldown > 0) {
        newP1.attackCooldown--;
        if (newP1.attackCooldown === 0) {
          newP1.isAttacking = false;
        }
      }

      if (newP1.blockCooldown > 0) {
        newP1.blockCooldown--;
        if (newP1.blockCooldown === 0) {
          newP1.isBlocking = false;
        }
      }

      // Handle dash cooldown
      if (newP1.dashCooldown > 0) {
        newP1.dashCooldown--;
      }

      // Smooth movement
      if (newP1.isMovingLeft && !newP1.isAttacking && !newP1.isBlocking) {
        newP1.x = Math.max(50, newP1.x - moveSpeed);
        newP1.direction = -1;
        newP1.isWalking = true;
      }

      if (newP1.isMovingRight && !newP1.isAttacking && !newP1.isBlocking) {
        newP1.x = Math.min(canvasWidth - 50, newP1.x + moveSpeed);
        newP1.direction = 1;
        newP1.isWalking = true;
      }

      // Animation frame
      newP1.animationFrame = (newP1.animationFrame + 1) % 8;

      return newP1;
    });

    setPlayer2(prevP2 => {
      let newP2 = { ...prevP2 };

      // Apply gravity
      if (newP2.isJumping) {
        newP2.velocity += gravity;
        newP2.y += newP2.velocity;
        
        if (newP2.y >= groundY - 100) {
          newP2.y = groundY - 100;
          newP2.velocity = 0;
          newP2.isJumping = false;
        }
      }

      // Reset attack and block states
      if (newP2.attackCooldown > 0) {
        newP2.attackCooldown--;
        if (newP2.attackCooldown === 0) {
          newP2.isAttacking = false;
        }
      }

      if (newP2.blockCooldown > 0) {
        newP2.blockCooldown--;
        if (newP2.blockCooldown === 0) {
          newP2.isBlocking = false;
        }
      }

      // Handle dash cooldown
      if (newP2.dashCooldown > 0) {
        newP2.dashCooldown--;
      }

      // AI move for player 2
      if (gameMode === 'vsAI') {
        const oldP2 = { ...newP2 };
        newP2 = aiMove(player1, newP2);
        
        // Play sounds for AI actions
        if (newP2.isAttacking && !oldP2.isAttacking) {
          playSound('punch');
        }
        if (newP2.isBlocking && !oldP2.isBlocking) {
          playSound('block');
        }
        if (newP2.isJumping && !oldP2.isJumping) {
          playSound('jump');
        }
      }

      // Smooth movement for Player 2 (in vsPlayer mode)
      if (gameMode === 'vsPlayer') {
        if (newP2.isMovingLeft && !newP2.isAttacking && !newP2.isBlocking) {
          newP2.x = Math.max(50, newP2.x - moveSpeed);
          newP2.direction = -1;
          newP2.isWalking = true;
        }

        if (newP2.isMovingRight && !newP2.isAttacking && !newP2.isBlocking) {
          newP2.x = Math.min(canvasWidth - 50, newP2.x + moveSpeed);
          newP2.direction = 1;
          newP2.isWalking = true;
        }
      }

      // Animation frame
      newP2.animationFrame = (newP2.animationFrame + 1) % 8;

      return newP2;
    });

    // Check attacks and damage
    if (checkCollision(player1, player2)) {
      console.log(`Collision detected! P1 Attack: ${player1.isAttacking}, Block: ${player1.isBlocking}, Cooldown: ${player1.attackCooldown}`);
      console.log(`P2 Attack: ${player2.isAttacking}, Block: ${player2.isBlocking}, Cooldown: ${player2.attackCooldown}`);
      
      // Player 1 attacks Player 2
      if (player1.isAttacking && !player2.isBlocking && player1.attackCooldown > 55) {
        const damage = 15 + player1.combo * 3;
        console.log(`P1 hits P2! Damage: ${damage}`);
        setPlayer2(prev => ({
          ...prev,
          health: Math.max(0, prev.health - damage),
          combo: 0
        }));
        setPlayer1(prev => ({
          ...prev,
          combo: prev.combo + 1,
          lastHit: Date.now()
        }));
        playSound('hit');
        setScoreEffect(true);
        setTimeout(() => setScoreEffect(false), 300);
        
        // Add hit effect
        setSpecialEffects(prev => [...prev, {
          x: player2.x,
          y: player2.y,
          type: 'hit',
          frame: 0
        }]);
      }

      // Player 2 attacks Player 1 (AI - reduced damage)
      if (player2.isAttacking && !player1.isBlocking && player2.attackCooldown > 55) {
        const damage = gameMode === 'vsAI' ? 3 + player2.combo * 1 : 15 + player2.combo * 3; // Much reduced damage for AI
        console.log(`P2 hits P1! Damage: ${damage}`);
        setPlayer1(prev => ({
          ...prev,
          health: Math.max(0, prev.health - damage),
          combo: 0
        }));
        setPlayer2(prev => ({
          ...prev,
          combo: prev.combo + 1,
          lastHit: Date.now()
        }));
        playSound('hit');
        setScoreEffect(true);
        setTimeout(() => setScoreEffect(false), 300);
        
        // Add hit effect
        setSpecialEffects(prev => [...prev, {
          x: player1.x,
          y: player1.y,
          type: 'hit',
          frame: 0
        }]);
      }
    }

    // Update special effects
    setSpecialEffects(prev => 
      prev.map(effect => ({ ...effect, frame: effect.frame + 1 }))
        .filter(effect => effect.frame < 10)
    );

    // Check round end
    if (player1.health <= 0 || player2.health <= 0 || roundTime <= 0) {
      endRound();
    }

    // Update round time
    setRoundTime(prev => Math.max(0, prev - 0.016));
  }, [gameRunning, gamePaused, player1, player2, checkCollision, aiMove, gameMode, roundTime, playSound]);

  const endRound = () => {
    let roundWinner = null;
    if (player1.health <= 0) {
      roundWinner = 'player2';
      setPlayer2Wins(prev => prev + 1);
    } else if (player2.health <= 0) {
      roundWinner = 'player1';
      setPlayer1Wins(prev => prev + 1);
    } else if (roundTime <= 0) {
      if (player1.health > player2.health) {
        roundWinner = 'player1';
        setPlayer1Wins(prev => prev + 1);
      } else if (player2.health > player1.health) {
        roundWinner = 'player2';
        setPlayer2Wins(prev => prev + 1);
      } else {
        roundWinner = 'tie';
      }
    }

    setRoundWinner(roundWinner);
    setGameRunning(false);

    if (player1Wins >= 2 || player2Wins >= 2) {
      endMatch();
    } else {
      setTimeout(() => {
        startNextRound();
      }, 3000);
    }
  };

  const endMatch = () => {
    const matchWinner = player1Wins > player2Wins ? 'player1' : 'player2';
    setWinner(matchWinner);
    setGameOver(true);
    setGameRunning(false);

    const finalScore = matchWinner === 'player1' ? 
      (player1Wins * 200) + Math.floor(player1.health) : 
      (player2Wins * 200) + Math.floor(player2.health);

    setScore(finalScore);
    finalScoreRef.current = finalScore;

    if (finalScore > 0 && !hasSavedScore && !isSavingScore) {
      setHasSavedScore(true);
      setTimeout(() => {
        saveHighScore(finalScore).then(() => {
          if (onGameEnd) onGameEnd();
        });
      }, 200);
    }
  };

  const startNextRound = () => {
    setRound(prev => prev + 1);
    setRoundTime(99);
    setRoundWinner(null);
    setPlayer1(prev => ({
      ...prev,
      health: 100,
      x: 150,
      y: groundY - 100,
      velocity: 0,
      isJumping: false,
      isDucking: false,
      isAttacking: false,
      isBlocking: false,
      isWalking: false,
      combo: 0
    }));
    setPlayer2(prev => ({
      ...prev,
      health: 100,
      x: 650,
      y: groundY - 100,
      velocity: 0,
      isJumping: false,
      isDucking: false,
      isAttacking: false,
      isBlocking: false,
      isWalking: false,
      combo: 0
    }));
    setAiActionTimer(0);
    setLastAiAction(0);
    setGameRunning(true);
  };

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

      // Load images
    useEffect(() => {
      const loadImage = (imgRef, src, fallbackSrc = null) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          imgRef.current = img;
        };
        
        img.onerror = () => {
          console.warn(`Failed to load image: ${src}`);
          if (fallbackSrc) {
            const fallbackImg = new window.Image();
            fallbackImg.crossOrigin = 'anonymous';
            fallbackImg.onload = () => {
              imgRef.current = fallbackImg;
            };
            fallbackImg.onerror = () => {
              console.warn(`Failed to load fallback image: ${fallbackSrc}`);
              imgRef.current = null;
            };
            fallbackImg.src = fallbackSrc;
          } else {
            imgRef.current = null;
          }
        };
        
        img.src = src;
      };

      // Load fighter images
      loadImage(player1Img, 
        'https://www.pngmart.com/files/7/Fighter-PNG-Pic.png',
        'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=80&h=80&fit=crop'
      );
      
      loadImage(player2Img, 
        'https://www.pngmart.com/files/7/Fighter-PNG-Pic.png',
        'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=80&h=80&fit=crop'
      );
      
      loadImage(backgroundImg, 
        'https://static1.srcdn.com/wordpress/wp-content/uploads/2023/06/suval-hal-arena.jpg',
        null
      );
    }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ([' ', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)) {
        e.preventDefault();
      }

      if (gameOver) return;

      // Player 1 controls (WASD)
      if (e.key === 'w' || e.key === 'W') {
        if (!player1.isJumping && gameRunning && !gamePaused) {
          setPlayer1(prev => ({
            ...prev,
            velocity: jumpForce,
            isJumping: true
          }));
          playSound('jump');
        }
      }

      if (e.key === 's' || e.key === 'S') {
        if (gameRunning && !gamePaused) {
          setPlayer1(prev => ({
            ...prev,
            isDucking: true
          }));
        }
      }

      if (e.key === 'a' || e.key === 'A') {
        if (gameRunning && !gamePaused) {
          const now = Date.now();
          const timeSinceLastPress = now - player1.lastKeyPress;
          
          // Check for dash (double tap within 300ms)
          if (timeSinceLastPress < 300 && player1.dashCooldown <= 0) {
            setPlayer1(prev => ({
              ...prev,
              x: Math.max(50, prev.x - moveSpeed * 3),
              direction: -1,
              isWalking: true,
              isMovingLeft: true,
              isMovingRight: false,
              dashCooldown: 30,
              lastKeyPress: now
            }));
            playSound('dash');
          } else {
            setPlayer1(prev => ({
              ...prev,
              direction: -1,
              isMovingLeft: true,
              isMovingRight: false,
              isWalking: true,
              lastKeyPress: now
            }));
          }
        }
      }

      if (e.key === 'd' || e.key === 'D') {
        if (gameRunning && !gamePaused) {
          const now = Date.now();
          const timeSinceLastPress = now - player1.lastKeyPress;
          
          // Check for dash (double tap within 300ms)
          if (timeSinceLastPress < 300 && player1.dashCooldown <= 0) {
            setPlayer1(prev => ({
              ...prev,
              x: Math.min(canvasWidth - 50, prev.x + moveSpeed * 3),
              direction: 1,
              isWalking: true,
              isMovingLeft: false,
              isMovingRight: true,
              dashCooldown: 30,
              lastKeyPress: now
            }));
            playSound('dash');
          } else {
            setPlayer1(prev => ({
              ...prev,
              direction: 1,
              isMovingLeft: false,
              isMovingRight: true,
              isWalking: true,
              lastKeyPress: now
            }));
          }
        }
      }

      if (e.key === 'f' || e.key === 'F') {
        if (gameRunning && !gamePaused && player1.attackCooldown <= 0) {
          setPlayer1(prev => ({
            ...prev,
            isAttacking: true,
            attackCooldown: 120
          }));
          playSound('punch');
        }
      }

             if (e.key === 'g' || e.key === 'G') {
         if (gameRunning && !gamePaused && player1.blockCooldown <= 0) {
           setPlayer1(prev => ({
             ...prev,
             isBlocking: true,
             blockCooldown: 60
           }));
           playSound('block');
         }
       }

      // Player 2 controls (Arrow keys) - only in vsPlayer mode
      if (gameMode === 'vsPlayer') {
        if (e.key === 'ArrowUp') {
          if (!player2.isJumping && gameRunning && !gamePaused) {
            setPlayer2(prev => ({
              ...prev,
              velocity: jumpForce,
              isJumping: true
            }));
            playSound('jump');
          }
        }

        if (e.key === 'ArrowDown') {
          if (gameRunning && !gamePaused) {
            setPlayer2(prev => ({
              ...prev,
              isDucking: true
            }));
          }
        }

        if (e.key === 'ArrowLeft') {
          if (gameRunning && !gamePaused) {
            const now = Date.now();
            const timeSinceLastPress = now - player2.lastKeyPress;
            
            // Check for dash (double tap within 300ms)
            if (timeSinceLastPress < 300 && player2.dashCooldown <= 0) {
              setPlayer2(prev => ({
                ...prev,
                x: Math.max(50, prev.x - moveSpeed * 3),
                direction: -1,
                isWalking: true,
                isMovingLeft: true,
                isMovingRight: false,
                dashCooldown: 30,
                lastKeyPress: now
              }));
              playSound('dash');
            } else {
              setPlayer2(prev => ({
                ...prev,
                direction: -1,
                isMovingLeft: true,
                isMovingRight: false,
                isWalking: true,
                lastKeyPress: now
              }));
            }
          }
        }

        if (e.key === 'ArrowRight') {
          if (gameRunning && !gamePaused) {
            const now = Date.now();
            const timeSinceLastPress = now - player2.lastKeyPress;
            
            // Check for dash (double tap within 300ms)
            if (timeSinceLastPress < 300 && player2.dashCooldown <= 0) {
              setPlayer2(prev => ({
                ...prev,
                x: Math.min(canvasWidth - 50, prev.x + moveSpeed * 3),
                direction: 1,
                isWalking: true,
                isMovingLeft: false,
                isMovingRight: true,
                dashCooldown: 30,
                lastKeyPress: now
              }));
              playSound('dash');
            } else {
              setPlayer2(prev => ({
                ...prev,
                direction: 1,
                isMovingLeft: false,
                isMovingRight: true,
                isWalking: true,
                lastKeyPress: now
              }));
            }
          }
        }

        if (e.key === 'l' || e.key === 'L') {
          if (gameRunning && !gamePaused && player2.attackCooldown <= 0) {
            setPlayer2(prev => ({
              ...prev,
              isAttacking: true,
              attackCooldown: 120
            }));
            playSound('punch');
          }
        }

                 if (e.key === 'k' || e.key === 'K') {
           if (gameRunning && !gamePaused && player2.blockCooldown <= 0) {
             setPlayer2(prev => ({
               ...prev,
               isBlocking: true,
               blockCooldown: 60
             }));
             playSound('block');
           }
         }
      }

      // Game controls
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

    const handleKeyUp = (e) => {
      if (e.key === 's' || e.key === 'S') {
        setPlayer1(prev => ({
          ...prev,
          isDucking: false
        }));
      }

      if (gameMode === 'vsPlayer' && (e.key === 'ArrowDown')) {
        setPlayer2(prev => ({
          ...prev,
          isDucking: false
        }));
      }

      if (e.key === 'a' || e.key === 'A') {
        setPlayer1(prev => ({
          ...prev,
          isMovingLeft: false,
          isWalking: false
        }));
      }

      if (e.key === 'd' || e.key === 'D') {
        setPlayer1(prev => ({
          ...prev,
          isMovingRight: false,
          isWalking: false
        }));
      }

      if (gameMode === 'vsPlayer' && e.key === 'ArrowLeft') {
        setPlayer2(prev => ({
          ...prev,
          isMovingLeft: false,
          isWalking: false
        }));
      }

      if (gameMode === 'vsPlayer' && e.key === 'ArrowRight') {
        setPlayer2(prev => ({
          ...prev,
          isMovingRight: false,
          isWalking: false
        }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameRunning, gameOver, gameStarted, gameMode, player1, player2, playSound]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (backgroundImg.current && backgroundImg.current.complete) {
      try {
        ctx.drawImage(backgroundImg.current, 0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.warn('Error drawing background image:', error);
      }
    }
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    
    // Draw health bars
    const barY = 20;
    const barSpacing = 20;
    
    // Player 1 health bar
    ctx.fillStyle = '#333';
    ctx.fillRect(50, barY, healthBarWidth, healthBarHeight);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(50, barY, (player1.health / 100) * healthBarWidth, healthBarHeight);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`P1: ${Math.floor(player1.health)}`, 50, barY - 5);
    
    // Player 2 health bar
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width - 250, barY, healthBarWidth, healthBarHeight);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(canvas.width - 250, barY, (player2.health / 100) * healthBarWidth, healthBarHeight);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`P2: ${Math.floor(player2.health)}`, canvas.width - 250, barY - 5);
    
    // Draw round info
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`ROUND ${round}`, canvas.width / 2 - 60, 30);
    ctx.fillText(`${Math.floor(roundTime)}`, canvas.width / 2 - 20, 60);
    
    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${player1Wins} - ${player2Wins}`, canvas.width / 2 - 30, 90);
    
    // Draw players
    const drawPlayer = (player, imgRef, isPlayer1) => {
      const x = player.x;
      const y = player.y;
      const width = 80;
      const height = 100;
      
      // Draw player shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x - 10, groundY, width + 20, 15);
      
      // Draw player
      if (imgRef.current && imgRef.current.complete) {
        try {
          ctx.save();
          if (player.direction === -1) {
            ctx.scale(-1, 1);
            ctx.drawImage(imgRef.current, -x - width, y, width, height);
          } else {
            ctx.drawImage(imgRef.current, x, y, width, height);
          }
          ctx.restore();
        } catch (error) {
          console.warn('Error drawing player image:', error);
          // Fallback: draw colored rectangle
          ctx.fillStyle = isPlayer1 ? '#4CAF50' : '#f44336';
          ctx.fillRect(x, y, width, height);
        }
      } else {
        // Fallback: draw colored rectangle
        ctx.fillStyle = isPlayer1 ? '#4CAF50' : '#f44336';
        ctx.fillRect(x, y, width, height);
      }
      
      // Draw attack effect
      if (player.isAttacking) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.fillRect(x + (player.direction === 1 ? width : -20), y, 20, height);
      }
      
      // Draw block effect
      if (player.isBlocking) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.fillRect(x, y, width, height);
      }
      
      // Draw combo counter
      if (player.combo > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`${player.combo}x`, x, y - 10);
      }
    };
    
    drawPlayer(player1, player1Img, true);
    drawPlayer(player2, player2Img, false);

    // Draw special effects
    specialEffects.forEach(effect => {
      if (effect.type === 'hit') {
        ctx.fillStyle = `rgba(255, 255, 0, ${1 - effect.frame / 10})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 20 + effect.frame * 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [player1, player2, round, roundTime, player1Wins, player2Wins, specialEffects]);

  const restartGame = () => {
    resetToDefault();
    setGameStarted(false);
    setGameRunning(false);
    setGamePaused(false);
    setGameOver(false);
    setWinner(null);
    setRoundWinner(null);
    setHasSavedScore(false);
    setIsSavingScore(false);
    setScoreEffect(false);
    
    if (gameId) {
      localStorage.removeItem(`streetFighterGame_${gameId}`);
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
    <GameErrorBoundary>
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#e91e63', mb: 2 }}>
          ⚔️ Street Fighter
        </Typography>
        
                 <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
           <Typography 
             variant="h6" 
             component="span"
             sx={{
               color: scoreEffect ? '#e91e63' : 'inherit',
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
           <Button 
             variant="outlined" 
             onClick={restartGame}
             sx={{ 
               borderColor: '#e91e63', 
               color: '#e91e63',
               '&:hover': {
                 borderColor: '#c2185b',
                 backgroundColor: 'rgba(233, 30, 99, 0.1)'
               }
             }}
           >
             🔄 Reset Game
           </Button>
         </Box>

        {!gameStarted && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Chế độ: {gameMode === 'vsAI' ? 'Đánh với máy' : 'Đánh với bạn'}
            </Typography>
          </Box>
        )}

        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              border: isFocused ? '3px solid #e91e63' : '3px solid #666',
              borderRadius: '10px',
              background: '#87CEEB',
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
                minWidth: '400px'
              }}
            >
              <Typography variant="h6" gutterBottom>
                {isFocused ? 'Nhấn Space để bắt đầu' : 'Click vào game để bắt đầu'}
              </Typography>
                             <Typography variant="body2" sx={{ mb: 2 }}>
                 <strong>Player 1 (WASD):</strong> W=nhảy, S=cúi, A/D=di chuyển, F=đánh (2s cooldown), G=chặn (1s cooldown), Double-tap A/D=dash
               </Typography>
               {gameMode === 'vsPlayer' && (
                 <Typography variant="body2" sx={{ mb: 2 }}>
                   <strong>Player 2 (Arrow):</strong> ↑=nhảy, ↓=cúi, ←/→=di chuyển, L=đánh (2s cooldown), K=chặn (1s cooldown), Double-tap ←/→=dash
                 </Typography>
               )}
               {gameMode === 'vsAI' && (
                 <Typography variant="body2" sx={{ mb: 2, color: '#4caf50' }}>
                   <strong>AI Mode:</strong> Bot siêu dễ - chỉ ra chiêu mỗi 10-20 giây
                 </Typography>
               )}
               <Typography variant="body2" sx={{ mb: 2 }}>
                 P để tạm dừng | R để chơi lại | Reset để bắt đầu mới
               </Typography>
            </Box>
          )}
          
          {roundWinner && (
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
                {roundWinner === 'player1' ? 'Player 1 thắng!' : 
                 roundWinner === 'player2' ? 'Player 2 thắng!' : 'Hòa!'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Round tiếp theo sẽ bắt đầu sau 3 giây...
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
                {winner === 'player1' ? 'Player 1 thắng trận!' : 'Player 2 thắng trận!'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Điểm của bạn: {score}
              </Typography>
              {score > highScore && (
                <Typography variant="body2" sx={{ color: '#e91e63', mb: 2 }}>
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
            {isFocused ? '✅ Game đã sẵn sàng! Dùng: WASD/F/G | Arrow/L/K | Space | P | R' : '💡 Click vào game để bắt đầu chơi'}
          </Typography>
                     {gameRunning && (
             <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
               Debug: P1 Attack={player1.isAttacking ? 'Yes' : 'No'} Block={player1.isBlocking ? 'Yes' : 'No'} A.Cooldown={player1.attackCooldown} B.Cooldown={player1.blockCooldown} MoveL={player1.isMovingLeft ? 'Yes' : 'No'} MoveR={player1.isMovingRight ? 'Yes' : 'No'} Dash={player1.dashCooldown} | 
               P2 Attack={player2.isAttacking ? 'Yes' : 'No'} Block={player2.isBlocking ? 'Yes' : 'No'} A.Cooldown={player2.attackCooldown} B.Cooldown={player2.blockCooldown} MoveL={player2.isMovingLeft ? 'Yes' : 'No'} MoveR={player2.isMovingRight ? 'Yes' : 'No'} Dash={player2.dashCooldown} |
               Collision={checkCollision(player1, player2) ? 'Yes' : 'No'} Distance={Math.abs(player1.x - player2.x)} | 
               AI Timer={Math.max(0, Math.floor((Date.now() - lastAiAction) / 1000))}s
             </Typography>
           )}
        </Box>
      </Box>
    </GameErrorBoundary>
  );
};

export default StreetFighterGame; 