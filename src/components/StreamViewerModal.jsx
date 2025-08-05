import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Paper,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Videocam as StreamIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import axios from 'axios';
import VideoStream from './VideoStream';

const StreamViewerModal = ({ open, stream, currentUser, onClose }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(stream?.viewerCount || 0);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (open && stream && currentUser) {
      joinAsViewer();
      fetchChatMessages();
      
      // Polling để cập nhật chat và viewer count
      const interval = setInterval(() => {
        fetchChatMessages();
        updateViewerCount();
      }, 10000);
      
      return () => {
        clearInterval(interval);
        leaveAsViewer();
      };
    }
  }, [open, stream?.streamId, currentUser?.username]);

  const joinAsViewer = async () => {
    try {
      if (!currentUser || !stream) return;
      
      const username = currentUser.username;
      if (!username) return;
      
      console.log('StreamViewerModal: Joining as viewer for stream:', stream.streamId);
      await axios.post(`http://localhost:8080/api/streams/${stream.streamId}/viewers`, {
        userId: username
      });
      setIsJoined(true);
      console.log('StreamViewerModal: Joined as viewer successfully');
    } catch (error) {
      console.error('StreamViewerModal: Error joining as viewer:', error);
    }
  };

  const leaveAsViewer = async () => {
    try {
      if (!currentUser || !stream || !isJoined) return;
      
      const username = currentUser.username;
      if (!username) return;
      
      console.log('StreamViewerModal: Leaving as viewer for stream:', stream.streamId);
      await axios.delete(`http://localhost:8080/api/streams/${stream.streamId}/viewers/username/${username}`);
      setIsJoined(false);
      console.log('StreamViewerModal: Left as viewer successfully');
    } catch (error) {
      console.error('StreamViewerModal: Error leaving as viewer:', error);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/streams/${stream.streamId}/chat`);
      setChatMessages(response.data);
    } catch (error) {
      console.error('StreamViewerModal: Error fetching chat messages:', error);
    }
  };

  const updateViewerCount = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/streams/${stream.streamId}`);
      setViewerCount(response.data.viewerCount || 0);
    } catch (error) {
      console.error('StreamViewerModal: Error updating viewer count:', error);
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
      fetchChatMessages();
    } catch (error) {
      console.error('StreamViewerModal: Error sending chat message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!stream) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">
              {stream.title}
            </Typography>
            <Chip 
              icon={<ViewIcon />} 
              label={`${viewerCount} người xem`} 
              color="error" 
              size="small"
            />
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box display="flex" height="100%">
          {/* Video Area */}
          <Box flex={1} p={2}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Stream ID: {stream?.streamId} - Đang kết nối WebRTC...
              </Typography>
              <VideoStream 
                key={`modal-viewer-${stream?.streamId}`}
                streamId={stream?.streamId}
                isStreamer={false}
                onStreamReady={(stream) => {
                  console.log('StreamViewerModal: Stream ready callback:', stream);
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
          <Box sx={{ width: 300, borderLeft: 1, borderColor: 'divider' }}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                    onKeyPress={handleKeyPress}
                  />
                  <IconButton onClick={sendChatMessage} color="primary">
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StreamViewerModal; 