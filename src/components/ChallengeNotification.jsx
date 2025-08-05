import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material';

const ChallengeNotification = ({ open, onClose, currentUser, onAcceptAndPlay }) => {
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentUser) {
      fetchPendingChallenges();
    }
  }, [open, currentUser]);

  const fetchPendingChallenges = async () => {
    if (!currentUser?.username) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/api/challenges/pending/${currentUser.username}`);
      setPendingChallenges(response.data);
    } catch (error) {
      console.error('Error fetching pending challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChallenge = async (challengeId) => {
    if (!currentUser?.username) {
      alert('Vui lòng đăng nhập lại!');
      return;
    }

    try {
      await axios.post(`http://localhost:8080/api/challenges/${challengeId}/accept`, {
        opponentUsername: currentUser.username
      });
      // Refresh danh sách
      fetchPendingChallenges();
      onClose();
    } catch (error) {
      console.error('Error accepting challenge:', error);
      alert('Lỗi khi chấp nhận thách đấu!');
    }
  };

  const handleAcceptAndPlay = async (challenge) => {
    if (!currentUser?.username) {
      alert('Vui lòng đăng nhập lại!');
      return;
    }

    try {
      await axios.post(`http://localhost:8080/api/challenges/${challenge.challengeID}/accept`, {
        opponentUsername: currentUser.username
      });
      
      // Start challenge
      await axios.post(`http://localhost:8080/api/challenges/${challenge.challengeID}/start`);
      
      // Close notification and navigate to game
      onClose();
      if (onAcceptAndPlay) {
        onAcceptAndPlay(challenge);
      }
    } catch (error) {
      console.error('Error accepting and starting challenge:', error);
      alert('Lỗi khi chấp nhận và bắt đầu thách đấu!');
    }
  };

  const handleDeclineChallenge = async (challengeId) => {
    if (!currentUser?.username) {
      alert('Vui lòng đăng nhập lại!');
      return;
    }

    try {
      await axios.post(`http://localhost:8080/api/challenges/${challengeId}/decline`, {
        opponentUsername: currentUser.username
      });
      // Refresh danh sách
      fetchPendingChallenges();
      onClose();
    } catch (error) {
      console.error('Error declining challenge:', error);
      alert('Lỗi khi từ chối thách đấu!');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          Lời mời thách đấu
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography>Đang tải...</Typography>
        ) : pendingChallenges.length === 0 ? (
          <Alert severity="info">
            Không có lời mời thách đấu nào đang chờ.
          </Alert>
        ) : (
          <Box>
            {pendingChallenges.map((challenge) => (
              <Box
                key={challenge.challengeID}
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                  backgroundColor: '#f9f9f9'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Thách đấu từ {challenge.challengerUsername}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    <strong>Game:</strong> {challenge.gameTitle}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Số coin đặt cược:</strong> {challenge.betAmount}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Thời gian tạo:</strong> {new Date(challenge.createdAt).toLocaleString()}
                  </Typography>
                  {challenge.status === 'finished' && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="body2" color="primary" gutterBottom>
                        <strong>Kết quả:</strong>
                      </Typography>
                      <Typography variant="body2">
                        {challenge.challengerUsername}: {challenge.challengerScore || 0} điểm
                      </Typography>
                      <Typography variant="body2">
                        {challenge.opponentUsername}: {challenge.opponentScore || 0} điểm
                      </Typography>
                      {challenge.winnerUsername && (
                        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                          🏆 <strong>Người thắng:</strong> {challenge.winnerUsername}
                        </Typography>
                      )}
                      {!challenge.winnerUsername && challenge.challengerScore === challenge.opponentScore && (
                        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                          🤝 <strong>Hòa!</strong> Coin được hoàn trả cho cả 2 người chơi
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label="Chấp nhận" 
                    color="success" 
                    onClick={() => handleAcceptChallenge(challenge.challengeID)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip 
                    label="Đồng ý và chơi ngay" 
                    color="primary" 
                    onClick={() => handleAcceptAndPlay(challenge)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip 
                    label="Từ chối" 
                    color="error" 
                    onClick={() => handleDeclineChallenge(challenge.challengeID)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChallengeNotification; 