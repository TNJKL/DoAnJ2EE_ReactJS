import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip,
  Avatar,
  Grid,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Videocam as StreamIcon,
  Person as PersonIcon,
  SportsEsports as GameIcon
} from '@mui/icons-material';
import axios from 'axios';

const LiveStreams = ({ onStreamSelect, currentUser }) => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState(null);

  useEffect(() => {
    fetchLiveStreams();
    
    // Polling để cập nhật danh sách stream
    const interval = setInterval(fetchLiveStreams, 10000);
    
    return () => clearInterval(interval);
  }, [selectedGameId]);

  const fetchLiveStreams = async () => {
    try {
      setLoading(true);
      let response;
      
      if (selectedGameId) {
        response = await axios.get(`http://localhost:8080/api/streams/live/game/${selectedGameId}`);
      } else {
        response = await axios.get('http://localhost:8080/api/streams/live');
      }
      
      setLiveStreams(response.data);
    } catch (error) {
      console.error('Error fetching live streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamClick = (stream) => {
    console.log('Stream clicked:', stream);
    if (onStreamSelect) {
      console.log('Calling onStreamSelect with stream:', stream);
      onStreamSelect(stream);
    } else {
      console.log('onStreamSelect is not provided');
    }
  };

  const formatDuration = (startedAt) => {
    if (!startedAt) return '0 phút';
    
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} phút`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  if (liveStreams.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <StreamIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Không có stream nào đang live
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedGameId ? 'Không có stream nào cho game này' : 'Hãy quay lại sau hoặc bắt đầu stream của riêng bạn!'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">
          Stream Đang Live
        </Typography>
        <Chip 
          icon={<ViewIcon />} 
          label={`${liveStreams.length} stream`} 
          color="error" 
          variant="outlined" 
        />
      </Box>

      <Grid container spacing={2}>
        {liveStreams.map((stream) => (
          <Grid item xs={12} sm={6} md={4} key={stream.streamId}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardActionArea 
                onClick={() => handleStreamClick(stream)}
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                {/* Stream Thumbnail */}
                <Box sx={{ position: 'relative', height: 200, backgroundColor: '#000' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      backgroundColor: 'error.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    LIVE
                  </Box>
                  
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <ViewIcon sx={{ fontSize: 16 }} />
                    {stream.viewerCount}
                  </Box>

                  {/* Placeholder cho video thumbnail */}
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}
                  >
                    <StreamIcon sx={{ fontSize: 48 }} />
                  </Box>
                </Box>

                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Stream Title */}
                  <Typography variant="h6" component="h3" gutterBottom sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {stream.title}
                  </Typography>

                  {/* Streamer Info */}
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {stream.streamerUsername ? stream.streamerUsername[0] : 'U'}
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      {stream.streamerUsername || 'Unknown'}
                    </Typography>
                  </Box>

                  {/* Game Info */}
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <GameIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {stream.gameTitle}
                    </Typography>
                  </Box>

                  {/* Stream Duration */}
                  <Typography variant="caption" color="text.secondary">
                    Đã stream {formatDuration(stream.startedAt)}
                  </Typography>

                  {/* Description */}
                  {stream.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mt: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {stream.description}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default LiveStreams; 