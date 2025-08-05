import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
  IconButton,
  Avatar
} from '@mui/material';
import {
  SportsEsports,
  Timer,
  AttachMoney,
  Person,
  EmojiEvents,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import axios from 'axios';

const ChallengeArena = ({ challenge, onChallengeUpdate }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [betDialogOpen, setBetDialogOpen] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [canBet, setCanBet] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [challengeResult, setChallengeResult] = useState(null); // Thêm state cho kết quả
  const [playerStatus, setPlayerStatus] = useState({
    challengerPlayed: false,
    opponentPlayed: false,
    challengerScore: 0,
    opponentScore: 0
  });

  useEffect(() => {
    // Lấy thông tin user hiện tại
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    setCurrentUser(user);

    // Reset state khi challenge mới
    if (challenge && challenge.challengeID) {
      setChallengeCompleted(false);
      setTimeRemaining(0); // Reset timeRemaining để tính toán lại
      setPlayerStatus({
        challengerPlayed: false,
        opponentPlayed: false,
        challengerScore: 0,
        opponentScore: 0
      });
    }

    if (challenge && challenge.endTime) {
      // Tính toán thời gian còn lại dựa trên endTime thực tế
      const endTime = new Date(challenge.endTime).getTime();
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      
      // Chỉ set timeRemaining lần đầu hoặc khi thời gian thực sự thay đổi
      if (timeRemaining === 0 || Math.abs(timeRemaining - remaining) > 1000) {
        setTimeRemaining(remaining);
      }
      
      // Cập nhật countdown
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0) {
            clearInterval(interval);
            // Khi hết thời gian, kiểm tra và gọi finishChallenge nếu có điểm số
            handleChallengeTimeout();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [challenge]);

  // Thêm polling để kiểm tra completion tự động
  useEffect(() => {
    if (!challenge || challenge.status === 'finished' || challengeCompleted) {
      return;
    }

    // Kiểm tra completion mỗi 5 giây
    const checkCompletionInterval = setInterval(async () => {
      try {
        const response = await axios.post(`http://localhost:8080/api/challenges/${challenge.challengeID}/check-completion`);
        
        // Cập nhật trạng thái người chơi
        setPlayerStatus({
          challengerPlayed: response.data.challengerPlayed,
          opponentPlayed: response.data.opponentPlayed,
          challengerScore: response.data.challengerScore,
          opponentScore: response.data.opponentScore
        });
        
        if (response.data.completed && !challengeCompleted) {
          console.log('Challenge completed automatically:', response.data);
          setChallengeCompleted(true);
          
          // Lấy kết quả chi tiết từ challenge data để đảm bảo đồng nhất
          try {
            const challengeResponse = await axios.get(`http://localhost:8080/api/challenges/${challenge.challengeID}`);
            const challengeData = challengeResponse.data;
            
            // Lưu kết quả chi tiết từ challenge data
            const result = {
              winner: challengeData.winnerUsername,
              challengerScore: challengeData.challengerScore,
              opponentScore: challengeData.opponentScore,
              isTie: !challengeData.winnerUsername
            };
            setChallengeResult(result);
            
            showSnackbar(`Thách đấu đã kết thúc! ${challengeData.winnerUsername ? `Người thắng: ${challengeData.winnerUsername}` : 'Hòa!'}`, 'success');
          } catch (error) {
            console.error('Error fetching challenge data:', error);
            // Fallback to response data if challenge data fetch fails
            const result = {
              winner: response.data.winner,
              challengerScore: response.data.challengerScore,
              opponentScore: response.data.opponentScore,
              isTie: !response.data.winner
            };
            setChallengeResult(result);
            
            showSnackbar(`Thách đấu đã kết thúc! ${response.data.winner ? `Người thắng: ${response.data.winner}` : 'Hòa!'}`, 'success');
          }
          
          // Refresh challenge data
          if (onChallengeUpdate) {
            onChallengeUpdate();
          }
          
          clearInterval(checkCompletionInterval);
        }
      } catch (error) {
        console.error('Error checking challenge completion:', error);
        // Nếu có lỗi, kiểm tra xem challenge đã finished chưa
        try {
          const challengeResponse = await axios.get(`http://localhost:8080/api/challenges/${challenge.challengeID}`);
          if (challengeResponse.data.status === 'finished') {
            setChallengeCompleted(true);
            
            // Lấy kết quả chi tiết từ challenge data
            const challengeData = challengeResponse.data;
            const result = {
              winner: challengeData.winnerUsername,
              challengerScore: challengeData.challengerScore,
              opponentScore: challengeData.opponentScore,
              isTie: !challengeData.winnerUsername
            };
            setChallengeResult(result);
            
            showSnackbar('Thách đấu đã kết thúc! Coin đã được phân phối.', 'success');
          } else {
            showSnackbar('Lỗi khi kết thúc thách đấu', 'error');
          }
        } catch (checkError) {
          showSnackbar('Lỗi khi kết thúc thách đấu', 'error');
        }
      }
    }, 5000); // Kiểm tra mỗi 5 giây

    return () => clearInterval(checkCompletionInterval);
  }, [challenge, onChallengeUpdate, challengeCompleted]);

  useEffect(() => {
    // Kiểm tra user có thể đặt cược không
    if (currentUser && challenge) {
      checkCanBet();
    }
  }, [currentUser, challenge]);

  // Kiểm tra challenge status khi component mount
  useEffect(() => {
    if (challenge && challenge.status === 'finished' && !challengeCompleted) {
      const checkFinishedChallenge = async () => {
        try {
          const challengeResponse = await axios.get(`http://localhost:8080/api/challenges/${challenge.challengeID}`);
          const challengeData = challengeResponse.data;
          
          if (challengeData.status === 'finished') {
            setChallengeCompleted(true);
            
            // Lưu kết quả chi tiết từ challenge data
            const result = {
              winner: challengeData.winnerUsername,
              challengerScore: challengeData.challengerScore,
              opponentScore: challengeData.opponentScore,
              isTie: !challengeData.winnerUsername
            };
            setChallengeResult(result);
            
            // Cập nhật player status
            setPlayerStatus({
              challengerPlayed: true,
              opponentPlayed: true,
              challengerScore: challengeData.challengerScore,
              opponentScore: challengeData.opponentScore
            });
          }
        } catch (error) {
          console.error('Error checking finished challenge:', error);
        }
      };
      
      checkFinishedChallenge();
    }
  }, [challenge, challengeCompleted]);

  const checkCanBet = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/challenges/${challenge.challengeID}/can-bet/${currentUser.username}`
      );
      console.log('Can bet response:', response.data);
      setCanBet(response.data.canBet);
    } catch (error) {
      console.error('Error checking bet permission:', error);
      setCanBet(false);
    }
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBet = (player) => {
    setSelectedPlayer(player);
    setBetAmount('');
    setBetDialogOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!betAmount || betAmount <= 0) {
      showSnackbar('Vui lòng nhập số lượng hợp lệ', 'error');
      return;
    }

    try {
      const betData = {
        username: currentUser.username, // dùng username
        betOnUsername: selectedPlayer.username, // dùng username của người được cược
        betAmount: parseInt(betAmount)
      };
      
      console.log('Sending bet data:', betData);
      console.log('Current user:', currentUser);
      console.log('Selected player:', selectedPlayer);
      
      await axios.post(`http://localhost:8080/api/challenges/${challenge.challengeID}/bet`, betData);

      showSnackbar('Đặt cược thành công!', 'success');
      setBetDialogOpen(false);
      setCanBet(false);
      // Refresh challenge data
      if (onChallengeUpdate) {
        onChallengeUpdate();
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      console.error('Error response:', error.response?.data);
      // Xử lý error message
      let errorMessage = 'Lỗi khi đặt cược';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      showSnackbar(errorMessage, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChallengeTimeout = async () => {
    // Tránh gọi nhiều lần hoặc khi challenge đã completed
    if (isFinishing || challengeCompleted) {
      console.log('Already finishing challenge or challenge completed, skipping...');
      return;
    }
    
    setIsFinishing(true);
    
    try {
      // Lấy điểm số từ GameSessions
      const scoresResponse = await axios.get(`http://localhost:8080/api/challenges/${challenge.challengeID}/scores`);
      const challengerScore = scoresResponse.data.challengerScore;
      const opponentScore = scoresResponse.data.opponentScore;
      
      console.log('Retrieved scores from GameSessions:', { challengerScore, opponentScore });
      
      // Kiểm tra xem có điểm số thực sự không
      if (challengerScore > 0 || opponentScore > 0) {
        console.log('Challenge has real scores, calling finishChallenge...');
        console.log('Challenger score:', challengerScore);
        console.log('Opponent score:', opponentScore);
        
        // Gọi API finishChallengeByGameEnd khi game thực sự kết thúc
        await axios.post(`http://localhost:8080/api/challenges/${challenge.challengeID}/finish-game`, {
          challengerScore: challengerScore,
          opponentScore: opponentScore
        });
        
        console.log('finishChallenge called successfully');
        setChallengeCompleted(true);
        
        // Lấy kết quả chi tiết từ challenge data để đảm bảo đồng nhất
        try {
          const challengeResponse = await axios.get(`http://localhost:8080/api/challenges/${challenge.challengeID}`);
          const challengeData = challengeResponse.data;
          
          const result = {
            winner: challengeData.winnerUsername,
            challengerScore: challengeData.challengerScore,
            opponentScore: challengeData.opponentScore,
            isTie: !challengeData.winnerUsername
          };
          setChallengeResult(result);
        } catch (error) {
          console.error('Error fetching challenge data:', error);
          // Fallback to local calculation
          const result = {
            winner: challengerScore > opponentScore ? challenge.challengerUsername : 
                   opponentScore > challengerScore ? challenge.opponentUsername : null,
            challengerScore: challengerScore,
            opponentScore: opponentScore,
            isTie: challengerScore === opponentScore
          };
          setChallengeResult(result);
        }
        
        showSnackbar('Thách đấu đã kết thúc! Coin đã được phân phối.', 'success');
      } else {
        console.log('No real scores found, setting scores to 0');
        // Nếu không có điểm số thực sự, set điểm 0 cho cả 2 người
        await axios.post(`http://localhost:8080/api/challenges/${challenge.challengeID}/finish-game`, {
          challengerScore: 0,
          opponentScore: 0
        });
        
        console.log('finishChallenge called with scores 0-0');
        setChallengeCompleted(true);
        
        // Lưu kết quả chi tiết cho trường hợp hòa (0-0)
        const result = {
          winner: null,
          challengerScore: 0,
          opponentScore: 0,
          isTie: true
        };
        setChallengeResult(result);
        
        showSnackbar('Thách đấu đã kết thúc! Không ai chơi nên hoàn trả coin.', 'info');
      }
      
      // Refresh challenge data
      if (onChallengeUpdate) {
        onChallengeUpdate();
      }
    } catch (error) {
      console.error('Error finishing challenge:', error);
      // Kiểm tra xem challenge đã được finish chưa
      if (error.response?.status === 500) {
        try {
          const challengeResponse = await axios.get(`http://localhost:8080/api/challenges/${challenge.challengeID}`);
          if (challengeResponse.data.status === 'finished') {
            setChallengeCompleted(true);
            showSnackbar('Thách đấu đã kết thúc! Coin đã được phân phối.', 'success');
          } else {
            showSnackbar('Lỗi khi kết thúc thách đấu', 'error');
          }
        } catch (checkError) {
          showSnackbar('Lỗi khi kết thúc thách đấu', 'error');
        }
      } else {
        showSnackbar('Lỗi khi kết thúc thách đấu', 'error');
      }
    } finally {
      setIsFinishing(false);
    }
  };

  if (!challenge) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Không có thách đấu nào đang diễn ra</Typography>
      </Box>
    );
  }

  const progress = challenge.timeRemaining ? 
    ((challenge.timeRemaining / (2 * 60 * 1000)) * 100) : 0; // 2 phút = 120000ms

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          🏆 SÀN ĐẤU THÁCH ĐẤU 🏆
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {challenge.challengerUsername} vs {challenge.opponentUsername}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Game: {challenge.gameTitle}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tiền cược: {challenge.betAmount.toLocaleString()} coin
          </Typography>
        </Box>

        {/* Countdown Timer */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
            <Timer color="warning" />
            <Typography variant="h5" fontWeight="bold">
              {formatTime(timeRemaining)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Challenge Status */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          {playerStatus.challengerPlayed && playerStatus.opponentPlayed ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold">
                🎉 Cả 2 người chơi đã hoàn thành! Đang xử lý kết quả...
              </Typography>
            </Alert>
          ) : playerStatus.challengerPlayed || playerStatus.opponentPlayed ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body1">
                {playerStatus.challengerPlayed ? 
                  `${challenge.challengerUsername} đã chơi xong (${playerStatus.challengerScore} điểm)` :
                  `${challenge.opponentUsername} đã chơi xong (${playerStatus.opponentScore} điểm)`
                }
                <br />
                Đang chờ người còn lại...
              </Typography>
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body1">
                ⏳ Đang chờ cả 2 người chơi hoàn thành game...
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Players */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Card sx={{ 
              border: '2px solid', 
              borderColor: playerStatus.challengerPlayed ? 'success.main' : 'primary.main',
              textAlign: 'center',
              position: 'relative'
            }}>
              {playerStatus.challengerPlayed && (
                <Box sx={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  bgcolor: 'success.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </Box>
              )}
              <CardContent>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  <Person fontSize="large" />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {challenge.challengerUsername}
                </Typography>
                <Chip 
                  icon={<TrendingUp />}
                  label={`${challenge.challengerBets?.toLocaleString() || 0} coin`}
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
                {playerStatus.challengerPlayed && (
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    Đã chơi: {playerStatus.challengerScore} điểm
                  </Typography>
                )}
                {!playerStatus.challengerPlayed && (
                  <Typography variant="body2" color="text.secondary">
                    Chưa chơi
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6}>
            <Card sx={{ 
              border: '2px solid', 
              borderColor: playerStatus.opponentPlayed ? 'success.main' : 'secondary.main',
              textAlign: 'center',
              position: 'relative'
            }}>
              {playerStatus.opponentPlayed && (
                <Box sx={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  bgcolor: 'success.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </Box>
              )}
              <CardContent>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  <Person fontSize="large" />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {challenge.opponentUsername}
                </Typography>
                <Chip 
                  icon={<TrendingUp />}
                  label={`${challenge.opponentBets?.toLocaleString() || 0} coin`}
                  color="secondary"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
                {playerStatus.opponentPlayed && (
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    Đã chơi: {playerStatus.opponentScore} điểm
                  </Typography>
                )}
                {!playerStatus.opponentPlayed && (
                  <Typography variant="body2" color="text.secondary">
                    Chưa chơi
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Betting Section */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            🎲 Đặt cược ngay! 🎲
          </Typography>
          
          {/* Debug info */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Can bet: {canBet ? 'Yes' : 'No'} | Time remaining: {timeRemaining > 0 ? 'Yes' : 'No'} | 
            Status: {challenge.status} | Current user: {currentUser?.username} | 
            User role: {(challenge.challengerUsername === currentUser?.username || challenge.opponentUsername === currentUser?.username) ? 'Player' : 'Spectator'}
          </Typography>
          
          {canBet && timeRemaining > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Chọn người bạn nghĩ sẽ thắng và đặt cược
              </Typography>
              
              <Box display="flex" gap={2} justifyContent="center" mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AttachMoney />}
                  onClick={() => handleBet({
                    userID: challenge.challengerID,
                    username: challenge.challengerUsername
                  })}
                  disabled={timeRemaining <= 0}
                >
                  Đặt cược {challenge.challengerUsername}
                </Button>
                
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AttachMoney />}
                  onClick={() => handleBet({
                    userID: challenge.opponentID,
                    username: challenge.opponentUsername
                  })}
                  disabled={timeRemaining <= 0}
                >
                  Đặt cược {challenge.opponentUsername}
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {!canBet && (challenge.challengerUsername === currentUser?.username || challenge.opponentUsername === currentUser?.username) 
                  ? 'Bạn không thể đặt cược vì bạn là người tham gia thách đấu' : ''}
                {!canBet && challenge.challengerUsername !== currentUser?.username && challenge.opponentUsername !== currentUser?.username
                  ? 'Bạn không thể đặt cược (có thể đã đặt cược trước đó)' : ''}
                {timeRemaining <= 0 ? 'Thời gian đặt cược đã kết thúc' : ''}
                {canBet && timeRemaining > 0 ? 'Có thể đặt cược' : ''}
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Total Bets */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Tổng tiền cược: {challenge.totalBets?.toLocaleString() || 0} coin
          </Typography>
        </Box>

        {/* Challenge Result Display */}
        {challengeCompleted && challengeResult && (
          <Box sx={{ mt: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '2px solid', borderColor: 'primary.main' }}>
            <Typography variant="h5" gutterBottom align="center" color="primary.main">
              🏆 KẾT QUẢ THÁCH ĐẤU 🏆
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: challengeResult.winner === challenge.challengerUsername ? 'success.light' : 'grey.100', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {challenge.challengerUsername}
                  </Typography>
                  <Typography variant="h4" color={challengeResult.winner === challenge.challengerUsername ? 'success.main' : 'text.primary'} fontWeight="bold">
                    {challengeResult.challengerScore}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    điểm
                  </Typography>
                  {challengeResult.winner === challenge.challengerUsername && (
                    <Box sx={{ mt: 1 }}>
                      <Chip label="🏆 NGƯỜI THẮNG" color="success" size="small" />
                    </Box>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: challengeResult.winner === challenge.opponentUsername ? 'success.light' : 'grey.100', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {challenge.opponentUsername}
                  </Typography>
                  <Typography variant="h4" color={challengeResult.winner === challenge.opponentUsername ? 'success.main' : 'text.primary'} fontWeight="bold">
                    {challengeResult.opponentScore}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    điểm
                  </Typography>
                  {challengeResult.winner === challenge.opponentUsername && (
                    <Box sx={{ mt: 1 }}>
                      <Chip label="🏆 NGƯỜI THẮNG" color="success" size="small" />
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              {challengeResult.isTie ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    🤝 HÒA! Cả hai người chơi có điểm số bằng nhau
                  </Typography>
                  <Typography variant="body2">
                    Coin đã được hoàn trả cho cả hai người chơi
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    🎉 Chúc mừng <strong>{challengeResult.winner}</strong> đã chiến thắng!
                  </Typography>
                  <Typography variant="body2">
                    Người thắng nhận được {challenge.betAmount * 2} coin
                  </Typography>
                </Alert>
              )}
              
              <Typography variant="body2" color="text.secondary">
                Coin đặt cược đã được phân phối cho người thắng cược
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Bet Dialog */}
      <Dialog open={betDialogOpen} onClose={() => setBetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Đặt cược cho {selectedPlayer?.username}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Bạn đang đặt cược cho: <strong>{selectedPlayer?.username}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Nếu thắng, bạn sẽ nhận gấp đôi số coin đặt cược!
            </Typography>
            <TextField
              fullWidth
              label="Số coin đặt cược"
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBetDialogOpen(false)}>Hủy</Button>
          <Button onClick={handlePlaceBet} variant="contained">
            Đặt cược
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChallengeArena; 