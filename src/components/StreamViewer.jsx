import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Videocam as StreamIcon
} from '@mui/icons-material';
import axios from 'axios';
import VideoStream from './VideoStream';

const StreamViewer = ({ stream, currentUser, onBack }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(stream?.viewerCount || 0);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    console.log('StreamViewer: Component mounted with stream:', stream?.streamId);
    
    if (stream && currentUser) {
      // Chỉ join một lần khi component mount
      joinAsViewer();
      fetchChatMessages();
      
      // Polling để cập nhật chat và viewer count
      const interval = setInterval(() => {
        fetchChatMessages();
        updateViewerCount();
      }, 10000); // Tăng interval lên 10 giây
      
      return () => {
        console.log('StreamViewer: Component unmounting');
        clearInterval(interval);
        leaveAsViewer();
      };
    }
  }, [stream?.streamId, currentUser?.username]); // Chỉ chạy khi stream hoặc user thay đổi

  const joinAsViewer = async () => {
    try {
      if (!currentUser || !stream) return;
      
      const username = currentUser.username;
      if (!username) return;
      
      console.log('StreamViewer: Joining as viewer for stream:', stream.streamId);
      await axios.post(`http://localhost:8080/api/streams/${stream.streamId}/viewers`, {
        userId: username
      });
      setIsJoined(true);
      console.log('StreamViewer: Joined as viewer successfully');
    } catch (error) {
      console.error('StreamViewer: Error joining as viewer:', error);
    }
  };

  const leaveAsViewer = async () => {
    try {
      if (!currentUser || !stream || !isJoined) return;
      
      const username = currentUser.username;
      if (!username) return;
      
      console.log('StreamViewer: Leaving as viewer for stream:', stream.streamId);
      await axios.delete(`http://localhost:8080/api/streams/${stream.streamId}/viewers/username/${username}`);
      setIsJoined(false);
      console.log('StreamViewer: Left as viewer successfully');
    } catch (error) {
      console.error('StreamViewer: Error leaving as viewer:', error);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/streams/${stream.streamId}/chat`);
      setChatMessages(response.data);
    } catch (error) {
      console.error('StreamViewer: Error fetching chat messages:', error);
    }
  };

  const updateViewerCount = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/streams/${stream.streamId}`);
      setViewerCount(response.data.viewerCount || 0);
    } catch (error) {
      console.error('StreamViewer: Error updating viewer count:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !stream || !currentUser) return;

    try {
      const username = currentUser.username;
      if (!username) return;
      
      await axios.post(`http://localhost:8080/api/streams/${stream.streamId}/chat`, {
        userId: username,
        message: newMessage
      });
      
      setNewMessage('');
      // Refresh chat messages
      fetchChatMessages();
    } catch (error) {
      console.error('StreamViewer: Error sending chat message:', error);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!stream) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Không tìm thấy stream</Typography>
      </Box>
    );
  }

  console.log('StreamViewer render:', { streamId: stream?.streamId, isJoined });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          {stream.title}
        </Typography>
        <Chip 
          icon={<ViewIcon />} 
          label={`${viewerCount} người xem`} 
          color="error" 
          sx={{ ml: 2 }}
        />
      </Box>

      <Box display="flex" gap={3}>
        {/* Video Area */}
        <Box flex={1}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Stream ID: {stream?.streamId} - Đang kết nối WebRTC...
            </Typography>
            <VideoStream 
              key={`viewer-${stream?.streamId}`} // Thêm key để tránh mount/unmount
              streamId={stream?.streamId}
              isStreamer={false}
              onStreamReady={(stream) => {
                console.log('StreamViewer: Stream ready callback:', stream);
              }}
            />
          </Paper>

          {/* Stream Info */}
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar sx={{ mr: 2 }}>
                {stream.streamerUsername ? stream.streamerUsername[0] : 'U'}
              </Avatar>
              <Box>
                <Typography variant="h6">{stream.streamerUsername}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Đang stream {stream.gameTitle}
                </Typography>
              </Box>
            </Box>
            
            {stream.description && (
              <Typography variant="body1" color="text.secondary">
                {stream.description}
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Chat Area */}
        <Box sx={{ width: 300 }}>
          <Paper sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Chat</Typography>
            </Box>
            
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {chatMessages.map((message, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {message.username ? message.username[0] : 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {message.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(message.sentAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={message.message}
                    sx={{ '& .MuiListItemText-secondary': { color: 'text.primary' } }}
                  />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                />
                <IconButton onClick={sendChatMessage} color="primary">
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default StreamViewer; 