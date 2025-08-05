import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  IconButton,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Videocam as StreamIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import VideoStream from './VideoStream';
import SimpleWebRTCService from './SimpleWebRTCService';

const StreamPlayer = ({ gameId, currentUser, onStreamEnd }) => {
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isViewer, setIsViewer] = useState(false);
  const [shouldStartCapture, setShouldStartCapture] = useState(false);
  
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const videoStreamRef = useRef(null);

  useEffect(() => {
    console.log('StreamPlayer: Component mounted');
    // Kiểm tra xem user có đang stream game này không
    checkExistingStream();
    
    // Polling để cập nhật viewer count - chỉ khi đang stream
    let interval;
    if (stream && stream.isLive) {
      interval = setInterval(() => {
        updateViewerCount();
      }, 10000); // Tăng lên 10 giây
    }

    return () => {
      console.log('StreamPlayer: Component unmounting');
      if (interval) {
        clearInterval(interval);
      }
      // Không tự động stop media stream khi unmount
    };
  }, [stream?.streamId, stream?.isLive]); // Chỉ chạy khi stream thay đổi

  const checkExistingStream = async () => {
    try {
      console.log('StreamPlayer: Checking existing stream for user:', currentUser?.username);
      if (!currentUser) return;
      
      const username = currentUser.username;
      if (!username) return;
      
      const response = await axios.get(`http://localhost:8080/api/streams/live/streamer/username/${username}`);
      if (response.data) {
        console.log('StreamPlayer: Found existing stream:', response.data);
        setStream(response.data);
        setIsStreaming(response.data.isLive);
        if (response.data.isLive) {
          joinAsViewer(response.data.streamId);
          // Nếu đang stream, bắt đầu capture
          console.log('StreamPlayer: Setting shouldStartCapture to true for existing live stream');
          setShouldStartCapture(true);
        }
      }
    } catch (error) {
      console.log('StreamPlayer: No existing stream found');
    }
  };

  const createStream = async () => {
    try {
      console.log('StreamPlayer: Creating stream with:', { currentUser, gameId, streamTitle });
      
      if (!currentUser) {
        setSnackbar({ open: true, message: 'Vui lòng đăng nhập để tạo stream', severity: 'error' });
        return;
      }
      
      // Sử dụng username thay vì ID
      const username = currentUser.username;
      if (!username) {
        console.error('User object:', currentUser);
        setSnackbar({ open: true, message: 'Không tìm thấy username, vui lòng đăng nhập lại', severity: 'error' });
        return;
      }
      
      if (!streamTitle.trim()) {
        setSnackbar({ open: true, message: 'Vui lòng nhập tiêu đề stream', severity: 'warning' });
        return;
      }

      const response = await axios.post('http://localhost:8080/api/streams/create', {
        streamerId: username,
        gameId: gameId,
        title: streamTitle,
        description: streamDescription
      });
      
      console.log('StreamPlayer: Stream created:', response.data);
      setStream(response.data);
      setShowCreateForm(false);
      setSnackbar({ open: true, message: 'Stream đã được tạo!', severity: 'success' });
    } catch (error) {
      console.error('Error creating stream:', error);
      console.error('Error response:', error.response?.data);
      setSnackbar({ open: true, message: `Lỗi khi tạo stream: ${error.response?.data?.message || error.message}`, severity: 'error' });
    }
  };

  const startStream = async () => {
    try {
      console.log('StreamPlayer: Starting stream for streamId:', stream.streamId);
      
      // Bắt đầu stream trên backend
      const response = await axios.post(`http://localhost:8080/api/streams/${stream.streamId}/start`);
      setStream(response.data);
      setIsStreaming(true);
      
      // Bắt đầu capture màn hình
      console.log('StreamPlayer: Setting shouldStartCapture to true');
      setShouldStartCapture(true);

      setSnackbar({ open: true, message: 'Stream đã bắt đầu!', severity: 'success' });
    } catch (error) {
      console.error('StreamPlayer: Error starting stream:', error);
      setSnackbar({ open: true, message: 'Lỗi khi bắt đầu stream', severity: 'error' });
    }
  };

  const stopStream = async () => {
    try {
      console.log('StreamPlayer: Stopping stream for streamId:', stream.streamId);
      
      // Dừng stream trên backend
      const response = await axios.post(`http://localhost:8080/api/streams/${stream.streamId}/stop`);
      setStream(response.data);
      setIsStreaming(false);
      
      console.log('StreamPlayer: Setting shouldStartCapture to false');
      setShouldStartCapture(false);

      // Dừng capture màn hình
      if (mediaStreamRef.current) {
        console.log('StreamPlayer: Stopping media stream tracks');
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Dừng WebRTC streaming
      SimpleWebRTCService.stopStreaming();

      setSnackbar({ open: true, message: 'Stream đã dừng!', severity: 'success' });
      if (onStreamEnd) onStreamEnd();
    } catch (error) {
      console.error('StreamPlayer: Error stopping stream:', error);
      setSnackbar({ open: true, message: 'Lỗi khi dừng stream', severity: 'error' });
    }
  };

  const startScreenCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      mediaStreamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Khởi tạo WebRTC streaming với SimpleWebRTCService
      if (stream && stream.streamId) {
        console.log('StreamPlayer: Starting WebRTC streaming for stream:', stream.streamId);
        await SimpleWebRTCService.startStreaming(stream.streamId, mediaStream);
      }

    } catch (error) {
      console.error('Error starting screen capture:', error);
      setSnackbar({ open: true, message: 'Không thể bắt đầu capture màn hình', severity: 'error' });
    }
  };

  const joinAsViewer = async (streamId) => {
    try {
      if (!currentUser) return;
      
      const userId = currentUser.userID || currentUser.id || currentUser.userId;
      if (!userId) return;
      
      await axios.post(`http://localhost:8080/api/streams/${streamId}/viewers`, {
        userId: userId
      });
      setIsViewer(true);
      loadChatMessages(streamId);
    } catch (error) {
      console.error('Error joining as viewer:', error);
    }
  };

  const leaveAsViewer = async () => {
    if (stream && isViewer && currentUser) {
      try {
        const userId = currentUser.userID || currentUser.id || currentUser.userId;
        if (!userId) return;
        
        await axios.delete(`http://localhost:8080/api/streams/${stream.streamId}/viewers/${userId}`);
        setIsViewer(false);
      } catch (error) {
        console.error('Error leaving as viewer:', error);
      }
    }
  };

  const updateViewerCount = async () => {
    if (stream) {
      try {
        const response = await axios.get(`http://localhost:8080/api/streams/${stream.streamId}/viewers/count`);
        setViewerCount(response.data.viewerCount);
      } catch (error) {
        console.error('Error updating viewer count:', error);
      }
    }
  };

  const loadChatMessages = async (streamId) => {
    try {
      const response = await axios.get(`http://localhost:8080/api/streams/${streamId}/chat?limit=50`);
      setChatMessages(response.data.reverse());
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !stream || !currentUser) return;

    try {
      const userId = currentUser.userID || currentUser.id || currentUser.userId;
      if (!userId) {
        setSnackbar({ open: true, message: 'Không tìm thấy ID người dùng', severity: 'error' });
        return;
      }
      
      const response = await axios.post(`http://localhost:8080/api/streams/${stream.streamId}/chat`, {
        userId: userId,
        message: newMessage
      });
      
      setChatMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      setSnackbar({ open: true, message: 'Lỗi khi gửi tin nhắn', severity: 'error' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  console.log('StreamPlayer render:', { 
    isStreaming, 
    shouldStartCapture, 
    stream: stream?.streamId,
    hasStream: !!stream 
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            {stream ? stream.title : 'Stream Game'}
          </Typography>
          {stream && stream.isLive && (
            <Chip 
              icon={<ViewIcon />} 
              label={`${viewerCount} người xem`} 
              color="error" 
              variant="outlined" 
            />
          )}
        </Box>

        {/* Stream Controls */}
        {!stream ? (
          <Box>
            <Button
              variant="contained"
              startIcon={<StreamIcon />}
              onClick={() => setShowCreateForm(true)}
              sx={{ mb: 2 }}
            >
              Tạo Stream
            </Button>
          </Box>
        ) : (
          <Box display="flex" gap={2} mb={2}>
            {!isStreaming ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayIcon />}
                onClick={startStream}
              >
                Bắt đầu Stream
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={stopStream}
              >
                Dừng Stream
              </Button>
            )}
          </Box>
        )}

        {/* Create Stream Form */}
        {showCreateForm && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Tạo Stream Mới</Typography>
            <TextField
              fullWidth
              label="Tiêu đề Stream"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Mô tả"
              value={streamDescription}
              onChange={(e) => setStreamDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box display="flex" gap={2}>
              <Button variant="contained" onClick={createStream}>
                Tạo Stream
              </Button>
              <Button variant="outlined" onClick={() => setShowCreateForm(false)}>
                Hủy
              </Button>
            </Box>
          </Paper>
        )}

        {/* Video Player */}
        {isStreaming && (
          <Box sx={{ mb: 2 }}>
            <VideoStream 
              ref={videoStreamRef}
              streamId={stream?.streamId}
              isStreamer={true}
              shouldStartCapture={shouldStartCapture}
              onStreamReady={(stream) => {
                console.log('StreamPlayer: Stream ready callback:', stream);
                mediaStreamRef.current = stream;
              }}
            />
          </Box>
        )}

        {/* Stream Info */}
        {stream && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Streamer: {stream.streamerUsername}
            </Typography>
            {stream.description && (
              <Typography variant="body2" color="text.secondary">
                {stream.description}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* Chat Section */}
      {stream && (isStreaming || isViewer) && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Chat</Typography>
          
          {/* Chat Messages */}
          <Box sx={{ height: 300, overflowY: 'auto', mb: 2, border: '1px solid #ddd', p: 1 }}>
            <List dense>
              {chatMessages.map((message, index) => (
                <ListItem key={message.chatId || index} sx={{ py: 0.5 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {message.username[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" component="span">
                          {message.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(message.sentAt).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                    secondary={message.message}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Send Message */}
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <IconButton onClick={sendChatMessage} disabled={!newMessage.trim()}>
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      )}

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

export default StreamPlayer; 