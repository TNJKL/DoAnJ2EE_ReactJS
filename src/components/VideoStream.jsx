import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Button, Typography } from '@mui/material';
import SimpleWebRTCService from './SimpleWebRTCService';

const VideoStream = forwardRef(({ streamId, isStreamer = false, onStreamReady, shouldStartCapture = false }, ref) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const hasStartedCapture = useRef(false); // Track if we've already started capture
  const pendingRemoteStream = useRef(null); // Store remote stream if video element not ready

  useEffect(() => {
    console.log('VideoStream useEffect:', { isStreamer, shouldStartCapture, hasStartedCapture: hasStartedCapture.current });
    
    if (isStreamer && shouldStartCapture && !hasStartedCapture.current) {
      console.log('VideoStream: Starting screen capture for streamer');
      hasStartedCapture.current = true;
      startScreenCapture();
    } else if (!isStreamer && streamId) {
      console.log('VideoStream: Joining stream as viewer');
      joinStream();
    }

    return () => {
      console.log('VideoStream cleanup');
      // Chỉ cleanup khi component unmount, không stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          // Chỉ stop track nếu nó đã ended
          if (track.readyState === 'ended') {
            track.stop();
          }
        });
      }
    };
  }, [isStreamer, streamId]); // Bỏ shouldStartCapture khỏi dependencies

  // Separate effect for shouldStartCapture
  useEffect(() => {
    console.log('VideoStream shouldStartCapture effect:', { shouldStartCapture, hasStartedCapture: hasStartedCapture.current });
    
    if (isStreamer && shouldStartCapture && !hasStartedCapture.current) {
      console.log('VideoStream: Starting screen capture due to shouldStartCapture change');
      hasStartedCapture.current = true;
      startScreenCapture();
    }
  }, [shouldStartCapture, isStreamer]);

  // Effect to handle pending remote stream when video element becomes available
  useEffect(() => {
    if (pendingRemoteStream.current && videoRef.current) {
      console.log('VideoStream: Setting pending remote stream to video element');
      videoRef.current.srcObject = pendingRemoteStream.current;
      videoRef.current.play().then(() => {
        console.log('VideoStream: Pending remote stream started playing');
        setIsStreaming(true);
      }).catch(err => {
        console.error('VideoStream: Error playing pending remote stream:', err);
      });
      pendingRemoteStream.current = null;
    }
  }, [videoRef.current]);

  const showDemoVideo = () => {
    // For demo purposes, show a sample video
    if (videoRef.current) {
      // Create a canvas with some demo content
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      // Draw demo content
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 640, 480);
      
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Demo Stream Content', 320, 200);
      ctx.fillText('Stream ID: ' + streamId, 320, 240);
      ctx.fillText('Live Demo', 320, 280);
      
      // Convert canvas to video stream
      const stream = canvas.captureStream(30); // 30 FPS
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  };

  const startScreenCapture = async () => {
    try {
      console.log('VideoStream: startScreenCapture called');
      setError(null);
      
      // Kiểm tra xem đã có stream chưa
      if (streamRef.current) {
        console.log('VideoStream: Already has media stream, reusing');
        return;
      }
      
      console.log('VideoStream: Starting screen capture...');
      
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: false
      });

      console.log('VideoStream: Screen capture successful');
      streamRef.current = stream;
      
      // Display the stream in video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsStreaming(true);
      
      // Start WebRTC streaming
      if (streamId) {
        console.log('VideoStream: Starting WebRTC streaming for stream:', streamId);
        await SimpleWebRTCService.startStreaming(streamId, stream);
      }
      
      if (onStreamReady) {
        onStreamReady(stream);
      }

      // Handle stream end
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log('VideoStream: Track ended, stopping stream');
          hasStartedCapture.current = false;
          stopStream();
        };
      });

    } catch (err) {
      console.error('Error starting screen capture:', err);
      hasStartedCapture.current = false;
      setError('Không thể bắt đầu stream màn hình. Vui lòng cho phép quyền truy cập màn hình.');
    }
  };

  const joinStream = async () => {
    try {
      if (!streamId) {
        console.log('VideoStream: No streamId provided, showing demo video');
        showDemoVideo();
        return;
      }
      
      console.log('VideoStream: Joining WebRTC stream with ID:', streamId);
      
      // Join WebRTC stream
      await SimpleWebRTCService.joinStream(streamId, (remoteStream) => {
        console.log('VideoStream: Received remote stream callback:', remoteStream);
        
        // Thêm delay nhỏ để đảm bảo video element đã được tạo
        setTimeout(() => {
          // Kiểm tra xem video element đã sẵn sàng chưa
          if (videoRef.current) {
            console.log('VideoStream: Setting srcObject to video element');
            videoRef.current.srcObject = remoteStream;
            videoRef.current.play().then(() => {
              console.log('VideoStream: Video started playing successfully');
              setIsStreaming(true);
            }).catch(err => {
              console.error('VideoStream: Error playing video:', err);
            });
          } else {
            console.log('VideoStream: videoRef.current is null, storing pending stream');
            // Lưu stream để set sau khi video element sẵn sàng
            pendingRemoteStream.current = remoteStream;
          }
        }, 100); // Delay 100ms
      });
    } catch (err) {
      console.error('VideoStream: Error joining stream:', err);
      console.log('VideoStream: Falling back to demo video');
      // Fallback to demo video
      showDemoVideo();
    }
  };

  const stopStream = () => {
    console.log('VideoStream: Stopping stream');
    hasStartedCapture.current = false;
    pendingRemoteStream.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    
    // Stop WebRTC
    if (isStreamer) {
      SimpleWebRTCService.stopStreaming();
    } else {
      SimpleWebRTCService.leaveStream();
    }
  };

  // Expose methods for parent component
  useImperativeHandle(ref, () => ({
    startScreenCapture,
    stopStream
  }));

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={startScreenCapture}>
          Thử lại
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '400px',
          backgroundColor: '#000',
          objectFit: 'contain'
        }}
        autoPlay
        muted={isStreamer} // Mute for streamer to avoid feedback
        playsInline
      />
      
      {isStreaming && (
        <Box sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          backgroundColor: 'red',
          color: 'white',
          px: 2,
          py: 1,
          borderRadius: 2,
          fontSize: '0.875rem',
          fontWeight: 'bold'
        }}>
          LIVE
        </Box>
      )}
    </Box>
  );
});

VideoStream.displayName = 'VideoStream';

export default VideoStream; 