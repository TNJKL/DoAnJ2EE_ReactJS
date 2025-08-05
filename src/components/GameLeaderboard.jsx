import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  Chip,
  CircularProgress
} from "@mui/material";
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const GameLeaderboard = ({ gameId, refresh }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchGameLeaderboard();
    }
  }, [gameId]);

  // Lắng nghe refresh để cập nhật khi game kết thúc
  useEffect(() => {
    if (refresh > 0 && gameId) {
      console.log('GameLeaderboard: Refreshing due to game end, refresh count:', refresh);
      fetchGameLeaderboard();
    }
  }, [refresh, gameId]);

  const fetchGameLeaderboard = async () => {
    console.log('GameLeaderboard: Fetching leaderboard for gameId:', gameId);
    setLoading(true);
    try {
      const response = await fetch(`/api/user/games/${gameId}/leaderboard?limit=10`);
      const data = await response.json();
      console.log('GameLeaderboard: Received data:', data);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching game leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu xếp hạng cho game này
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List sx={{ p: 0 }}>
        {leaderboard.map((user, index) => (
          <ListItem
            key={`game-score-${user.userID}-${index}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              px: 0,
              borderBottom: index < leaderboard.length - 1 ? '1px solid #f0f0f0' : 'none'
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
    </Box>
  );
};

export default GameLeaderboard; 