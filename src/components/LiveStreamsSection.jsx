import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Avatar
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Videocam as StreamIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import axios from 'axios';

const LiveStreamsSection = ({ onStreamSelect }) => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveStreams();
    const interval = setInterval(fetchLiveStreams, 15000); // Cập nhật mỗi 15 giây
    return () => clearInterval(interval);
  }, []);

  const fetchLiveStreams = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/streams/live');
      setLiveStreams(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching live streams:', error);
      setLoading(false);
    }
  };

  const handleStreamClick = (stream) => {
    console.log('LiveStreamsSection: Stream clicked:', stream);
    if (onStreamSelect) {
      onStreamSelect(stream);
    }
  };

  const formatViewerCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Đang tải live streams...
        </Typography>
      </Box>
    );
  }

  if (liveStreams.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Hiện tại không có stream nào đang live
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <StreamIcon sx={{ mr: 1, fontSize: 28 }} />
        <Typography variant="h5" fontWeight="bold">
          Live Streams ({liveStreams.length})
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {liveStreams.map((stream) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={stream.streamId}>
            <Card
              sx={{
                height: 320,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardActionArea
                onClick={() => handleStreamClick(stream)}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  p: 0,
                }}
              >
                {/* Thumbnail */}
                <Box
                  sx={{
                    position: 'relative',
                    height: 160,
                    width: '100%',
                    background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px 4px 0 0',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {/* Play Icon */}
                  <PlayIcon sx={{ fontSize: 36, color: 'white' }} />

                  {/* Viewer Count + LIVE Badge */}
                  <Box sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}>
                    {/* Viewer Count */}
                    <Box sx={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      px: 1,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}>
                      <ViewIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                      <span>{formatViewerCount(stream.viewerCount || 0)}</span>
                    </Box>

                    {/* LIVE Badge */}
                    <Box sx={{
                      backgroundColor: 'red',
                      color: 'white',
                      px: 1,
                      py: 0.2,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      minWidth: 'fit-content'
                    }}>
                      <StreamIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                      <span>LIVE</span>
                    </Box>
                  </Box>
                </Box>

                {/* Content */}
                <CardContent
                  sx={{
                    flex: '1 1 0',
                    minHeight: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 2,
                    pt: 1,
                  }}
                >
                  {/* Title */}
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.2,
                      minHeight: '2.4em',
                      maxHeight: '2.4em',
                    }}
                  >
                    {stream.title}
                  </Typography>

                  {/* Streamer Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.75rem',
                        mr: 1,
                        flexShrink: 0,
                      }}
                    >
                      {stream.streamerUsername ? stream.streamerUsername[0].toUpperCase() : 'U'}
                    </Avatar>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {stream.streamerUsername || 'Unknown'}
                    </Typography>
                  </Box>

                  {/* Game Info */}
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {stream.gameTitle || 'Unknown Game'}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.75rem',
                      }}
                    >
                      {stream.description || 'No description'}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default LiveStreamsSection; 