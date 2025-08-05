import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import axios from 'axios';

const MyTalkingTomGame = ({ onGameEnd }) => {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [showEndGame, setShowEndGame] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Voice detection state
  const [isListening, setIsListening] = useState(false);
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [tomReaction, setTomReaction] = useState('normal'); // normal, listening, talking
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);

  // Game constants
  const canvasWidth = 800;
  const canvasHeight = 600;
  const scorePerMinute = 100;

  // Get game ID from URL or props
  const [gameId, setGameId] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Get gameId from URL path
    const pathParts = window.location.pathname.split('/');
    const gameIdFromUrl = pathParts[pathParts.length - 1];
    setGameId(gameIdFromUrl);
    
    // Get username from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUsername(userData.username);
    }
  }, []);

  // Load high score
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

  // Initialize audio context and voice detection
  useEffect(() => {
    // Create audio context only when user interacts
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        if (gameStarted) {
          startVoiceDetection();
        }
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    };
    
    // Initialize audio on first user interaction
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [gameStarted]);

  // Voice detection functions
  const startVoiceDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      setIsListening(true);
      console.log('Started voice detection');
      
      analyzeAudio();
      
    } catch (error) {
      console.error('Error starting voice detection:', error);
      alert('Không thể truy cập microphone. Vui lòng cho phép quyền truy cập.');
    }
  };

  const analyzeAudio = () => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      if (average > 20) {
        if (!voiceDetected && !isPlaying && !isRecording) {
          setVoiceDetected(true);
          setTomReaction('listening');
          console.log('Voice detected!');
          
          // Only start recording if not already recording
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
            startRecording();
            
            setTimeout(() => {
              setTomReaction('talking');
              stopRecordingAndPlay();
            }, 1500);
          }
        }
      } else {
        if (voiceDetected) {
          setVoiceDetected(false);
          if (tomReaction === 'listening') {
            setTomReaction('normal');
          }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(checkAudio);
    };
    
    checkAudio();
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      if (!mediaStreamRef.current) {
        console.error('No media stream available for recording');
        return;
      }
      
      if (isRecording) {
        console.log('Already recording, skipping...');
        return;
      }
      
      setIsRecording(true);
      
      // Create MediaRecorder with proper MIME type
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      // Fallback if webm is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/wav';
      }
      
      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, options);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          // Create blob with proper type
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          audioBlobRef.current = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Create object URL
          const audioUrl = URL.createObjectURL(audioBlobRef.current);
          console.log('Audio blob created:', audioUrl, 'Size:', audioBlobRef.current.size);
          
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.volume = 1.0;
            console.log('Audio source set successfully');
          }
        } else {
          console.error('No audio data recorded');
        }
        setIsRecording(false);
      };
      
      mediaRecorderRef.current.start();
      console.log('Recording started with MIME type:', mediaRecorderRef.current.mimeType);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecordingAndPlay = () => {
    console.log('stopRecordingAndPlay called, MediaRecorder state:', mediaRecorderRef.current?.state);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      
      // Set Tom to talking state
      setTomReaction('talking');
      
      // Play back the recorded voice with longer delay
      setTimeout(() => {
        if (audioRef.current && audioRef.current.src && audioBlobRef.current) {
          console.log('Attempting to play audio:', audioRef.current.src);
          console.log('Audio blob size:', audioBlobRef.current.size);
          
          // Make audio element visible for debugging
          audioRef.current.style.display = 'none';
          audioRef.current.controls = false;
          
          // Ensure audio is loaded and volume is set
          audioRef.current.load();
          audioRef.current.volume = 1.0;
          audioRef.current.muted = false;
          
          // Transform voice to clown-like sound
          transformAndPlayAudio(audioRef.current.src);
          
        } else {
          console.error('No audio source available for playback');
          setTomReaction('normal');
        }
      }, 1000); // Increased delay to ensure blob is ready
    } else {
      console.error('No media recorder available or not recording. State:', mediaRecorderRef.current?.state);
      setTomReaction('normal');
    }
  };

  // Voice transformation function
  const transformAndPlayAudio = async (audioSrc) => {
    try {
      // Play funny clown laugh first
      playClownLaugh();
      
      // Create audio context for transformation
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Fetch the audio data
      const response = await fetch(audioSrc);
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode the audio
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create source node
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create pitch shifter (higher pitch for clown voice)
      const pitchShift = audioContext.createBiquadFilter();
      pitchShift.type = 'highpass';
      pitchShift.frequency.value = 800; // Higher frequency
      pitchShift.Q.value = 2;
      
      // Create distortion for funny effect
      const distortion = audioContext.createWaveShaper();
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = (Math.PI + x) * Math.tan(Math.PI * x) / (Math.PI + x * x);
      }
      distortion.curve = curve;
      distortion.oversample = '4x';
      
      // Create compressor for consistent volume
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;
      
      // Create gain for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.2; // Slightly louder
      
      // Connect the audio processing chain
      source.connect(pitchShift);
      pitchShift.connect(distortion);
      distortion.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Start playing after a short delay
      setTimeout(() => {
        source.start(0);
        setIsPlaying(true);
        console.log('Clown voice transformation applied!');
      }, 300); // Wait for laugh to finish
      
      // Clean up when finished
      source.onended = () => {
        console.log('Transformed audio playback ended');
        setIsPlaying(false);
        setTomReaction('normal');
        audioContext.close();
      };
      
    } catch (error) {
      console.error('Error transforming audio:', error);
      
      // Fallback to original audio if transformation fails
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          console.log('Fallback audio playback started');
          setIsPlaying(true);
        }).catch(err => {
          console.error('Fallback playback also failed:', err);
        });
        
        audioRef.current.onended = () => {
          console.log('Fallback audio playback ended');
          setIsPlaying(false);
          setTomReaction('normal');
        };
      }
    }
  };

  // Clown laugh sound effect
  const playClownLaugh = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Create multiple oscillators for funny laugh
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    // Connect oscillators
    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);
    filter.connect(ctx.destination);
    
    // Set up filter for funny effect
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 5;
    
    // Configure oscillators for laugh sound
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(300, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    osc1.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(450, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.2);
    
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(600, ctx.currentTime);
    osc3.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    osc3.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    
    // Set gains
    gain1.gain.setValueAtTime(0.1, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    gain2.gain.setValueAtTime(0.08, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    gain3.gain.setValueAtTime(0.06, ctx.currentTime);
    gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    // Start and stop oscillators
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);
    
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.3);
    
    osc3.start(ctx.currentTime);
    osc3.stop(ctx.currentTime + 0.3);
    
    console.log('Clown laugh played!');
  };

  // Game loop
  useEffect(() => {
    if (!gameRunning || gameOver) return;
    
    const gameLoop = setInterval(() => {
      setGameTime(prev => prev + 1);
      setScore(prev => prev + scorePerMinute / 60);
    }, 1000);
    
    return () => clearInterval(gameLoop);
  }, [gameRunning, gameOver]);

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

      if (e.key === 'e' || e.key === 'E') {
        endGame();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameRunning, gameOver, gameStarted, isListening]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw background image
    const backgroundImg = new Image();
    backgroundImg.onload = () => {
      // Draw background image to fill entire canvas
      ctx.drawImage(backgroundImg, 0, 0, canvasWidth, canvasHeight);
      
      // Draw Tom image
      const tomImg = new Image();
      tomImg.onload = () => {
        // Calculate position to center Tom
        const tomWidth = 200;
        const tomHeight = 280;
        const tomX = (canvasWidth - tomWidth) / 2;
        const tomY = (canvasHeight - tomHeight) / 2;
        
        // Draw Tom
        ctx.drawImage(tomImg, tomX, tomY, tomWidth, tomHeight);
        
        // Draw listening indicator (ear icon)
        if (isListening) {
          const earIcon = new Image();
          earIcon.onload = () => {
            // Draw ear icon in top right corner
            ctx.drawImage(earIcon, canvasWidth - 60, 20, 40, 40);
            
            // Draw "LISTENING" text
            ctx.fillStyle = 'red';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LISTENING', canvasWidth - 40, 70);
          };
          earIcon.onerror = () => {
            // Fallback: draw simple red circle
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(canvasWidth - 40, 40, 20, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw "LISTENING" text
            ctx.fillStyle = 'red';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LISTENING', canvasWidth - 40, 70);
          };
          earIcon.src = 'https://www.freeiconspng.com/thumbs/ear-icon-png/ear-listen-icon-16.png';
        }
        
        // Draw talking animation with answer icon
        if (tomReaction === 'talking') {
          // Draw speech bubble
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          
          const bubbleX = tomX + tomWidth + 20;
          const bubbleY = tomY + 50;
          const bubbleWidth = 120;
          const bubbleHeight = 60;
          
          // Draw bubble
          ctx.beginPath();
          ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
          ctx.fill();
          ctx.stroke();
          
          // Draw tail pointing to Tom
          ctx.beginPath();
          ctx.moveTo(bubbleX, bubbleY + bubbleHeight / 2);
          ctx.lineTo(bubbleX - 10, bubbleY + bubbleHeight / 2);
          ctx.lineTo(bubbleX - 5, bubbleY + bubbleHeight / 2 - 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Draw answer icon in bubble
          const answerIcon = new Image();
          answerIcon.onload = () => {
            // Draw answer icon in the center of bubble
            const iconSize = 30;
            const iconX = bubbleX + (bubbleWidth - iconSize) / 2;
            const iconY = bubbleY + (bubbleHeight - iconSize) / 2;
            ctx.drawImage(answerIcon, iconX, iconY, iconSize, iconSize);
          };
          answerIcon.onerror = () => {
            // Fallback: draw "..." text
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('...', bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2 + 8);
          };
          answerIcon.src = 'https://icons.veryicon.com/png/o/business/official-icon-of-the-insurer/answer-4.png';
        }
      };
      
      tomImg.onerror = () => {
        // Fallback: draw simple orange rectangle if image fails to load
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(canvasWidth / 2 - 100, canvasHeight / 2 - 140, 200, 280);
        
        // Draw simple face
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(canvasWidth / 2 - 30, canvasHeight / 2 - 80, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(canvasWidth / 2 + 30, canvasHeight / 2 - 80, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw mouth
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canvasHeight / 2 - 40, 15, 0, Math.PI);
        ctx.stroke();
      };
      
      // Set the image source
      tomImg.src = 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/da81fbee-3ebb-408e-88cc-06d59fb03d1e/djabo83-b73b5ed4-f812-497c-ba3e-fb5452d97459.png/v1/fill/w_443,h_630/talking_tom__2010__png_by_elyadencrack_djabo83-fullview.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NjMwIiwicGF0aCI6IlwvZlwvZGE4MWZiZWUtM2ViYi00MDhlLTg4Y2MtMDZkNTlmYjAzZDFlXC9kamFibzgzLWI3M2I1ZWQ0LWY4MTItNDk3Yy1iYTNlLWZiNTQ1MmQ5NzQ1OS5wbmciLCJ3aWR0aCI6Ijw9NDQzIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmltYWdlLm9wZXJhdGlvbnMiXX0.058qg60ZfBXWGf_AYnRNJGkF_ro95so7soOFyUodPiw';
    };
    
    backgroundImg.onerror = () => {
      // Fallback: draw solid color background if image fails to load
      ctx.fillStyle = '#87CEEB'; // Sky blue background
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Continue with Tom drawing even if background fails
      const tomImg = new Image();
      tomImg.onload = () => {
        // Calculate position to center Tom
        const tomWidth = 200;
        const tomHeight = 280;
        const tomX = (canvasWidth - tomWidth) / 2;
        const tomY = (canvasHeight - tomHeight) / 2;
        
        // Draw Tom
        ctx.drawImage(tomImg, tomX, tomY, tomWidth, tomHeight);
        
        // Draw listening indicator (ear icon)
        if (isListening) {
          const earIcon = new Image();
          earIcon.onload = () => {
            // Draw ear icon in top right corner
            ctx.drawImage(earIcon, canvasWidth - 60, 20, 40, 40);
            
            // Draw "LISTENING" text
            ctx.fillStyle = 'red';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LISTENING', canvasWidth - 40, 70);
          };
          earIcon.onerror = () => {
            // Fallback: draw simple red circle
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(canvasWidth - 40, 40, 20, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw "LISTENING" text
            ctx.fillStyle = 'red';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LISTENING', canvasWidth - 40, 70);
          };
          earIcon.src = 'https://www.freeiconspng.com/thumbs/ear-icon-png/ear-listen-icon-16.png';
        }
        
        // Draw talking animation with answer icon
        if (tomReaction === 'talking') {
          // Draw speech bubble
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          
          const bubbleX = tomX + tomWidth + 20;
          const bubbleY = tomY + 50;
          const bubbleWidth = 120;
          const bubbleHeight = 60;
          
          // Draw bubble
          ctx.beginPath();
          ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
          ctx.fill();
          ctx.stroke();
          
          // Draw tail pointing to Tom
          ctx.beginPath();
          ctx.moveTo(bubbleX, bubbleY + bubbleHeight / 2);
          ctx.lineTo(bubbleX - 10, bubbleY + bubbleHeight / 2);
          ctx.lineTo(bubbleX - 5, bubbleY + bubbleHeight / 2 - 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Draw answer icon in bubble
          const answerIcon = new Image();
          answerIcon.onload = () => {
            // Draw answer icon in the center of bubble
            const iconSize = 30;
            const iconX = bubbleX + (bubbleWidth - iconSize) / 2;
            const iconY = bubbleY + (bubbleHeight - iconSize) / 2;
            ctx.drawImage(answerIcon, iconX, iconY, iconSize, iconSize);
          };
          answerIcon.onerror = () => {
            // Fallback: draw "..." text
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('...', bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2 + 8);
          };
          answerIcon.src = 'https://icons.veryicon.com/png/o/business/official-icon-of-the-insurer/answer-4.png';
        }
      };
      
      tomImg.onerror = () => {
        // Fallback: draw simple orange rectangle if image fails to load
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(canvasWidth / 2 - 100, canvasHeight / 2 - 140, 200, 280);
        
        // Draw simple face
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(canvasWidth / 2 - 30, canvasHeight / 2 - 80, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(canvasWidth / 2 + 30, canvasHeight / 2 - 80, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw mouth
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canvasHeight / 2 - 40, 15, 0, Math.PI);
        ctx.stroke();
      };
      
      // Set the image source
      tomImg.src = 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/da81fbee-3ebb-408e-88cc-06d59fb03d1e/djabo83-b73b5ed4-f812-497c-ba3e-fb5452d97459.png/v1/fill/w_443,h_630/talking_tom__2010__png_by_elyadencrack_djabo83-fullview.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NjMwIiwicGF0aCI6IlwvZlwvZGE4MWZiZWUtM2ViYi00MDhlLTg4Y2MtMDZkNTlmYjAzZDFlXC9kamFibzgzLWI3M2I1ZWQ0LWY4MTItNDk3Yy1iYTNlLWZiNTQ1MmQ5NzQ1OS5wbmciLCJ3aWR0aCI6Ijw9NDQzIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmltYWdlLm9wZXJhdGlvbnMiXX0.058qg60ZfBXWGf_AYnRNJGkF_ro95so7soOFyUodPiw';
    };
    
    // Set the background image source
    backgroundImg.src = 'https://i.pinimg.com/736x/8d/ed/ce/8dedcec0b90aede0e6dfe58f4ee223a8.jpg';
    
  }, [isListening, tomReaction]);

  // Game functions
  const endGame = () => {
    const currentScore = Math.floor(score);
    setFinalScore(currentScore);
    setShowEndGame(true);
    setGameRunning(false);
    setGamePaused(false);
    
    if (currentScore > 0 && !hasSavedScore && !isSavingScore) {
      setHasSavedScore(true);
      setTimeout(() => {
        saveHighScore(currentScore).then(() => {
          if (onGameEnd) {
            onGameEnd();
          }
        });
      }, 200);
    }
  };

  const continueGame = () => {
    setShowEndGame(false);
    setGameRunning(true);
    setGamePaused(false);
  };

  const restartGame = () => {
    setScore(0);
    setGameOver(false);
    setGameRunning(false);
    setGamePaused(false);
    setGameStarted(false);
    setGameTime(0);
    setHasSavedScore(false);
    setIsSavingScore(false);
    setShowEndGame(false);
    setFinalScore(0);
    setVoiceDetected(false);
    setTomReaction('normal');
    setIsPlaying(false);
    setIsRecording(false);
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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Load high score on mount
  useEffect(() => {
    if (gameId && username) {
      loadHighScore();
    }
  }, [gameId, username]);

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      {/* Hidden audio element for voice playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      <Typography variant="h4" gutterBottom sx={{ color: '#FF6B6B', mb: 2 }}>
        🐱 My Talking Tom
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="span">
          Điểm: {Math.floor(score)}
        </Typography>
        <Typography variant="h6" component="span">
          Thời gian: {formatTime(gameTime)}
        </Typography>
        <Typography variant="h6" component="span">
          Điểm cao nhất: {highScore}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: '2px solid #333',
            cursor: 'pointer',
            backgroundColor: '#87CEEB'
          }}
          onClick={handleCanvasClick}
          onBlur={handleCanvasBlur}
          tabIndex={0}
        />
        
        {!gameStarted && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: 3,
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <Typography variant="h5" gutterBottom>My Talking Tom</Typography>
            <Typography variant="body1" gutterBottom>
              Nói chuyện với Tom! Tom sẽ lắng nghe và nhái lại giọng nói của bạn.
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleStartGame}
              sx={{ mt: 2 }}
            >
              Bắt đầu chơi
            </Button>
          </Box>
        )}

        {showEndGame && (
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
            <Typography variant="h5" gutterBottom>🎉 Kết thúc game!</Typography>
            <Typography variant="body1" gutterBottom>
              Điểm của bạn: {finalScore}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Thời gian chơi: {formatTime(gameTime)}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Điểm tính theo thời gian: 100 điểm/phút
            </Typography>
            {finalScore > highScore && (
              <Typography variant="body2" sx={{ color: '#FFD700', mb: 2 }}>
                🎉 Điểm cao mới!
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                onClick={restartGame}
                color="primary"
              >
                Chơi lại
              </Button>
              <Button 
                variant="outlined" 
                onClick={continueGame}
                color="secondary"
              >
                Tiếp tục
              </Button>
            </Box>
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

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: isListening ? '#00FF00' : '#666' }}>
          🎤 Microphone: {isListening ? 'Đang lắng nghe' : 'Chưa kết nối'}
        </Typography>
        <Button
          variant="contained"
          color="warning"
          onClick={endGame}
          disabled={!gameStarted || !gameRunning}
          size="small"
          sx={{ mr: 1 }}
        >
          Kết thúc game
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={restartGame}
          disabled={!gameStarted}
          size="small"
        >
          Reset
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {isFocused ? '✅ Game đã sẵn sàng! Dùng: Space/Click | P | R | E (kết thúc)' : '💡 Click vào game để bắt đầu chơi'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          🎤 Nói chuyện với Tom - Tom sẽ lắng nghe và nhái lại giọng nói thật!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          ⏰ Điểm tính theo thời gian: 100 điểm/phút | 🎯 Nhấn "Kết thúc game" để lưu điểm
        </Typography>
      </Box>
    </Box>
  );
};

export default MyTalkingTomGame; 