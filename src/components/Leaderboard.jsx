import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Avatar, 
  Chip,
  Tabs,
  Tab,
  CircularProgress
} from "@mui/material";
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [scoreLeaderboard, setScoreLeaderboard] = useState([]);
  const [coinLeaderboard, setCoinLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      // Fetch score leaderboard
      const scoreResponse = await fetch("/api/user/leaderboard?limit=10");
      const scoreData = await scoreResponse.json();
      setScoreLeaderboard(scoreData);

      // Fetch coin leaderboard
      const coinResponse = await fetch("/api/user/coin-leaderboard?limit=10");
      const coinData = await coinResponse.json();
      setCoinLeaderboard(coinData);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getRankColor = (index) => {
    switch (index) {
      case 0: return '#FFD700'; // Gold
      case 1: return '#C0C0C0'; // Silver
      case 2: return '#CD7F32'; // Bronze
      default: return '#1976d2'; // Blue
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  };

  const renderScoreLeaderboard = () => {
    if (!scoreLeaderboard || scoreLeaderboard.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Chưa có dữ liệu xếp hạng điểm
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ p: 0 }}>
        {scoreLeaderboard.map((user, index) => (
          <ListItem
            key={`score-${user.userID}-${index}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              px: 0,
              borderBottom: index < scoreLeaderboard.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: getRankColor(index),
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  mr: 2
                }}
              >
                {getRankIcon(index)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Chip
              icon={<EmojiEventsIcon />}
              label={user.highScore}
              color="primary"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderCoinLeaderboard = () => {
    if (!coinLeaderboard || coinLeaderboard.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Chưa có dữ liệu xếp hạng coin
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ p: 0 }}>
        {coinLeaderboard.map((user, index) => (
          <ListItem
            key={`coin-${user.userID}-${index}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              px: 0,
              borderBottom: index < coinLeaderboard.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: getRankColor(index),
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  mr: 2
                }}
              >
                {getRankIcon(index)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Chip
              icon={<AttachMoneyIcon />}
              label={`${user.coinAmount?.toLocaleString() || 0} coin`}
              color="secondary"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Bảng xếp hạng</Typography>
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab 
          label="Điểm cao" 
          icon={<EmojiEventsIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="Coin cao" 
          icon={<AttachMoneyIcon />} 
          iconPosition="start"
        />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {activeTab === 0 && renderScoreLeaderboard()}
          {activeTab === 1 && renderCoinLeaderboard()}
        </Box>
      )}
    </Box>
  );
};

export default Leaderboard;