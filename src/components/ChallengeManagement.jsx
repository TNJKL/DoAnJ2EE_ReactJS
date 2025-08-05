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
  Tabs,
  Tab,
  Alert,
  Snackbar,
  IconButton,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add,
  SportsEsports,
  Timer,
  CheckCircle,
  Cancel,
  PlayArrow,
  EmojiEvents,
  Notifications
} from '@mui/icons-material';
import axios from 'axios';
import ChallengeArena from './ChallengeArena';
import ChallengeNotification from './ChallengeNotification';

const ChallengeManagement = () => {
  const [challenges, setChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [pendingChallengeCount, setPendingChallengeCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    opponentUsername: '',
    gameID: '',
    gameTitle: '',
    betAmount: ''
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    setCurrentUser(user);
    fetchChallenges();
    fetchUsers();
    fetchGames();
  }, []);

  useEffect(() => {
    if (currentUser?.username) {
      fetchPendingChallengeCount();
      // Tự động cập nhật thách đấu hết hạn
      updateExpiredChallenges();
    }
  }, [currentUser]);

  const updateExpiredChallenges = async () => {
    try {
      await axios.post('http://localhost:8080/api/challenges/update-expired');
      // Refresh danh sách sau khi cập nhật
      fetchChallenges();
    } catch (error) {
      console.error('Error updating expired challenges:', error);
    }
  };

  const fetchPendingChallengeCount = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/challenges/pending/${currentUser.username}`);
      setPendingChallengeCount(response.data.length);
    } catch (error) {
      console.error('Error fetching pending challenge count:', error);
    }
  };

  const fetchChallenges = async () => {
    try {
      if (!currentUser || !currentUser.username) return;
      
      // Lấy tất cả challenge theo trạng thái
      const [pendingResponse, activeResponse, finishedResponse] = await Promise.all([
        axios.get(`http://localhost:8080/api/challenges/pending/${currentUser.username}`),
        axios.get('http://localhost:8080/api/challenges/active'), // Lấy tất cả challenge active
        axios.get(`http://localhost:8080/api/challenges/user-username/${currentUser.username}`)
      ]);
      
      // Kết hợp tất cả challenge
      const allChallenges = [
        ...pendingResponse.data,
        ...activeResponse.data,
        ...finishedResponse.data.filter(c => c.status === 'finished')
      ];
      
      // Loại bỏ duplicate dựa trên challengeID
      const uniqueChallenges = allChallenges.filter((challenge, index, self) => 
        index === self.findIndex(c => c.challengeID === challenge.challengeID)
      );
      
      setChallenges(uniqueChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      showSnackbar('Lỗi khi tải danh sách thách đấu', 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/challenges/users-list');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/challenges/games-list');
      setGames(response.data);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const handleCreateChallenge = async () => {
    if (!formData.opponentUsername || !formData.gameID || !formData.betAmount) {
      showSnackbar('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    if (!currentUser) {
      showSnackbar('Vui lòng đăng nhập lại', 'error');
      return;
    }

    if (!currentUser.username) {
      console.error('Current user has no username:', currentUser);
      showSnackbar('Dữ liệu người dùng không hợp lệ, vui lòng đăng nhập lại', 'error');
      return;
    }

    try {
      // Debug logging
      console.log('Current user:', currentUser);
      console.log('Form data:', formData);
      
      const challengeData = {
        challengerUsername: currentUser.username,
        opponentUsername: formData.opponentUsername,
        gameID: parseInt(formData.gameID),
        betAmount: parseInt(formData.betAmount)
      };
      
      console.log('Challenge data being sent:', challengeData);

      const response = await axios.post('http://localhost:8080/api/challenges', challengeData);
      console.log('Challenge created successfully:', response.data);

      showSnackbar('Tạo thách đấu thành công!', 'success');
      setCreateDialogOpen(false);
      setFormData({ opponentUsername: '', gameID: '', gameTitle: '', betAmount: '' });
      fetchChallenges();
    } catch (error) {
      console.error('Error creating challenge:', error);
      const errorMessage = error.response?.data?.message || error.response?.data || 'Lỗi khi tạo thách đấu';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleAcceptChallenge = async (challengeID) => {
    try {
      await axios.post(`http://localhost:8080/api/challenges/${challengeID}/accept`, {
        opponentID: currentUser.userID
      });
      
      showSnackbar('Chấp nhận thách đấu thành công!', 'success');
      fetchChallenges();
    } catch (error) {
      console.error('Error accepting challenge:', error);
      showSnackbar(error.response?.data || 'Lỗi khi chấp nhận thách đấu', 'error');
    }
  };

  const handleDeclineChallenge = async (challengeID) => {
    try {
      await axios.post(`http://localhost:8080/api/challenges/${challengeID}/decline`, {
        opponentID: currentUser.userID
      });
      
      showSnackbar('Từ chối thách đấu thành công!', 'success');
      fetchChallenges();
    } catch (error) {
      console.error('Error declining challenge:', error);
      showSnackbar(error.response?.data || 'Lỗi khi từ chối thách đấu', 'error');
    }
  };

  const handleStartChallenge = async (challengeID) => {
    try {
      await axios.post(`http://localhost:8080/api/challenges/${challengeID}/start`);
      
      showSnackbar('Bắt đầu thách đấu thành công!', 'success');
      fetchChallenges();
    } catch (error) {
      console.error('Error starting challenge:', error);
      showSnackbar(error.response?.data || 'Lỗi khi bắt đầu thách đấu', 'error');
    }
  };

  const handleFinishChallenge = async (challengeID, challengerScore, opponentScore) => {
    try {
      await axios.post(`http://localhost:8080/api/challenges/${challengeID}/finish`, {
        challengerScore,
        opponentScore
      });
      
      showSnackbar('Kết thúc thách đấu thành công!', 'success');
      fetchChallenges();
    } catch (error) {
      console.error('Error finishing challenge:', error);
      showSnackbar(error.response?.data || 'Lỗi khi kết thúc thách đấu', 'error');
    }
  };

  const handleAcceptAndPlay = (challenge) => {
    // Accept và start challenge
    setNotificationOpen(false);
    showSnackbar('Đã chấp nhận thách đấu và bắt đầu chơi!', 'success');
    
    // Mở game thực sự thay vì ChallengeArena
    // Redirect đến game page với challenge info
    const gameUrl = `/game/${challenge.gameID}?challengeId=${challenge.challengeID}&mode=challenge`;
    window.location.href = gameUrl;
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'info';
      case 'active': return 'primary';
      case 'finished': return 'success';
      case 'declined': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Chờ phản hồi';
      case 'accepted': return 'Đã chấp nhận';
      case 'active': return 'Đang diễn ra';
      case 'finished': return 'Đã kết thúc';
      case 'declined': return 'Đã từ chối';
      default: return status;
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    switch (activeTab) {
      case 0: return challenge.status === 'pending';
      case 1: return challenge.status === 'active';
      case 2: return challenge.status === 'finished';
      default: return true;
    }
  });

  if (!currentUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Vui lòng đăng nhập để sử dụng tính năng này</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Quản lý Thách đấu
        </Typography>
        <Box display="flex" gap={2}>
          <IconButton
            color="primary"
            onClick={() => setNotificationOpen(true)}
            sx={{ position: 'relative' }}
          >
            <Badge badgeContent={pendingChallengeCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Tạo thách đấu
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Chờ phản hồi" />
          <Tab label="Đang diễn ra" />
          <Tab label="Đã kết thúc" />
        </Tabs>
      </Paper>

      {/* Challenge List */}
      <Grid container spacing={2}>
        {filteredChallenges.map((challenge) => (
          <Grid item xs={12} md={6} key={challenge.challengeID}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {challenge.challengerUsername} vs {challenge.opponentUsername}
                  </Typography>
                  <Chip 
                    label={getStatusLabel(challenge.status)}
                    color={getStatusColor(challenge.status)}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Game: {challenge.gameTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tiền cược: {challenge.betAmount.toLocaleString()} coin
                </Typography>
                
                {challenge.winnerUsername && (
                  <Typography variant="body2" color="success.main" gutterBottom>
                    🏆 Người thắng: {challenge.winnerUsername}
                  </Typography>
                )}

                {/* Action Buttons */}
                <Box display="flex" gap={1} mt={2}>
                  {challenge.status === 'pending' && challenge.opponentID === currentUser.userID && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => handleAcceptChallenge(challenge.challengeID)}
                      >
                        Chấp nhận
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleDeclineChallenge(challenge.challengeID)}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  
                  {challenge.status === 'accepted' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<PlayArrow />}
                      onClick={() => handleStartChallenge(challenge.challengeID)}
                    >
                      Bắt đầu
                    </Button>
                  )}
                  
                  {challenge.status === 'active' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      onClick={() => setSelectedChallenge(challenge)}
                    >
                      {challenge.challengerUsername === currentUser.username || 
                       challenge.opponentUsername === currentUser.username 
                        ? 'Tham gia sàn đấu' : 'Xem sàn đấu'}
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Challenge Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo thách đấu mới</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chọn đối thủ</InputLabel>
              <Select
                value={formData.opponentUsername}
                onChange={(e) => setFormData({ ...formData, opponentUsername: e.target.value })}
                label="Chọn đối thủ"
              >
                {users
                  .filter(user => user.username !== currentUser?.username)
                  .map((user) => (
                    <MenuItem key={user.userID} value={user.username}>
                      {user.username} ({user.email})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chọn game</InputLabel>
              <Select
                value={formData.gameID}
                onChange={(e) => {
                  const selectedGame = games.find(g => g.gameID === e.target.value);
                  setFormData({ 
                    ...formData, 
                    gameID: e.target.value,
                    gameTitle: selectedGame ? selectedGame.title : ''
                  });
                }}
                label="Chọn game"
              >
                {games.map((game) => (
                  <MenuItem key={game.gameID} value={game.gameID}>
                    {game.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Số coin đặt cược"
              type="number"
              value={formData.betAmount}
              onChange={(e) => setFormData({ ...formData, betAmount: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleCreateChallenge} variant="contained">
            Tạo thách đấu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Challenge Arena Dialog */}
      <Dialog 
        open={!!selectedChallenge} 
        onClose={() => setSelectedChallenge(null)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogContent>
          {selectedChallenge && (
            <ChallengeArena 
              challenge={selectedChallenge}
              onChallengeUpdate={fetchChallenges}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedChallenge(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Challenge Notification Dialog */}
      <ChallengeNotification
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        currentUser={currentUser}
        onAcceptAndPlay={handleAcceptAndPlay}
      />

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

export default ChallengeManagement; 