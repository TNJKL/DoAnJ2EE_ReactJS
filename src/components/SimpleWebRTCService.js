class SimpleWebRTCService {
    constructor() {
      this.peerConnections = new Map();
      this.localStream = null;
      this.onStreamCallback = null;
      this.streamId = null;
      this.role = null;
      this.ws = null;
    }
  
    // Streamer: Bắt đầu stream
    async startStreaming(streamId, localStream) {
      console.log('SimpleWebRTCService: startStreaming called with streamId:', streamId);
      this.localStream = localStream;
      this.streamId = streamId;
      this.role = 'streamer';
      
      // Kết nối WebSocket
      await this.connectWebSocket(streamId, 'streamer');
      
      // Thông báo streamer sẵn sàng
      this.sendMessage({
        type: 'streamer-ready',
        streamId: streamId,
        streamerId: 'streamer'
      });
      
      console.log('SimpleWebRTCService: Streamer started and ready for viewers');
    }
  
    // Viewer: Tham gia xem stream
    async joinStream(streamId, onStreamReceived) {
      console.log('SimpleWebRTCService: joinStream called with streamId:', streamId);
      this.onStreamCallback = onStreamReceived;
      this.streamId = streamId;
      this.role = 'viewer';
      
      // Kết nối WebSocket
      await this.connectWebSocket(streamId, 'viewer');
      
      // Gửi join request
      this.sendMessage({
        type: 'join',
        streamId: streamId,
        viewerId: 'viewer'
      });
    }
  
    // Kết nối WebSocket
    async connectWebSocket(streamId, role) {
      return new Promise((resolve, reject) => {
        const wsUrl = `ws://localhost:8080/ws/signaling/${streamId}/${role}`;
        console.log(`SimpleWebRTCService: Connecting to WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log(`SimpleWebRTCService: WebSocket connected as ${role} for stream ${streamId}`);
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log(`SimpleWebRTCService: Received message as ${role}:`, message);
            this.handleMessage(message);
          } catch (error) {
            console.error('SimpleWebRTCService: Error parsing message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error(`SimpleWebRTCService: WebSocket error for ${role}:`, error);
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log(`SimpleWebRTCService: WebSocket closed for ${role}:`, event.code, event.reason);
        };
      });
    }
  
    // Gửi message qua WebSocket
    sendMessage(message) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('SimpleWebRTCService: Sending message:', message);
        this.ws.send(JSON.stringify(message));
      } else {
        console.error('SimpleWebRTCService: Cannot send message, WebSocket not ready. State:', this.ws?.readyState);
      }
    }
  
    // Xử lý message nhận được
    handleMessage(message) {
      console.log('SimpleWebRTCService: Handling message type:', message.type);
      switch (message.type) {
        case 'join':
          console.log('SimpleWebRTCService: Processing join message');
          this.handleViewerJoin(message.streamId, message.viewerId);
          break;
        case 'offer':
          console.log('SimpleWebRTCService: Processing offer message');
          this.handleOffer(message.streamId, message);
          break;
        case 'answer':
          console.log('SimpleWebRTCService: Processing answer message');
          this.handleAnswer(message.streamId, message);
          break;
        case 'ice-candidate':
          console.log('SimpleWebRTCService: Processing ice-candidate message');
          this.handleIceCandidate(message.streamId, message);
          break;
        case 'streamer-ready':
          console.log('SimpleWebRTCService: Streamer ready, sending join request');
          this.sendMessage({
            type: 'join',
            streamId: message.streamId,
            viewerId: 'viewer'
          });
          break;
        default:
          console.log('SimpleWebRTCService: Unknown message type:', message.type, message);
      }
    }
  
    // Streamer: Xử lý khi có viewer join
    async handleViewerJoin(streamId, viewerId) {
      console.log('SimpleWebRTCService: handleViewerJoin called with streamId:', streamId, 'viewerId:', viewerId);
      
      if (!this.localStream) {
        console.error('SimpleWebRTCService: No local stream available');
        return;
      }
  
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
  
      this.peerConnections.set(viewerId, peerConnection);
      console.log('SimpleWebRTCService: Created peer connection for viewer:', viewerId);
  
      // Thêm local stream tracks
      this.localStream.getTracks().forEach(track => {
        console.log('SimpleWebRTCService: Adding track to peer connection:', track.kind);
        peerConnection.addTrack(track, this.localStream);
      });
  
      // Tạo offer
      console.log('SimpleWebRTCService: Creating offer...');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log('SimpleWebRTCService: Offer created and set as local description');
  
      // Gửi offer đến viewer
      this.sendMessage({
        type: 'offer',
        streamId: streamId,
        viewerId: viewerId,
        offer: offer
      });
  
      // Xử lý ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('SimpleWebRTCService: ICE candidate generated');
          this.sendMessage({
            type: 'ice-candidate',
            streamId: streamId,
            viewerId: viewerId,
            target: 'viewer',
            candidate: event.candidate
          });
        }
      };
  
      peerConnection.onconnectionstatechange = () => {
        console.log('SimpleWebRTCService: Connection state changed:', peerConnection.connectionState);
      };
    }
  
    // Viewer: Xử lý offer từ streamer
    async handleOffer(streamId, message) {
      console.log('SimpleWebRTCService: handleOffer called with streamId:', streamId, 'message:', message);
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
  
      this.peerConnections.set(streamId, peerConnection);
      console.log('SimpleWebRTCService: Created peer connection for streamer');
  
      // Xử lý remote stream
      peerConnection.ontrack = (event) => {
        console.log('SimpleWebRTCService: Received remote stream:', event.streams[0]);
        console.log('SimpleWebRTCService: Stream tracks:', event.streams[0].getTracks());
        if (this.onStreamCallback) {
          console.log('SimpleWebRTCService: Calling onStreamCallback with remote stream');
          this.onStreamCallback(event.streams[0]);
        } else {
          console.error('SimpleWebRTCService: No onStreamCallback set');
        }
      };
  
      // Set remote description
      console.log('SimpleWebRTCService: Setting remote description...');
      await peerConnection.setRemoteDescription(message.offer);
      console.log('SimpleWebRTCService: Remote description set successfully');
  
      // Tạo answer
      console.log('SimpleWebRTCService: Creating answer...');
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log('SimpleWebRTCService: Answer created and set as local description');
  
      // Gửi answer đến streamer
      this.sendMessage({
        type: 'answer',
        streamId: streamId,
        viewerId: 'viewer',
        answer: answer
      });
  
      // Xử lý ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('SimpleWebRTCService: ICE candidate generated by viewer');
          this.sendMessage({
            type: 'ice-candidate',
            streamId: streamId,
            viewerId: 'viewer',
            target: 'streamer',
            candidate: event.candidate
          });
        }
      };
  
      peerConnection.onconnectionstatechange = () => {
        console.log('SimpleWebRTCService: Viewer connection state changed:', peerConnection.connectionState);
      };
    }
  
    // Streamer: Xử lý answer từ viewer
    async handleAnswer(streamId, message) {
      const peerConnection = this.peerConnections.get(message.viewerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(message.answer);
      }
    }
  
    // Xử lý ICE candidates
    async handleIceCandidate(streamId, message) {
      const peerConnection = this.peerConnections.get(message.viewerId || streamId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(message.candidate);
      }
    }
  
    // Dừng stream
    stopStreaming() {
      console.log('SimpleWebRTCService: stopStreaming called');
      
      // Đóng WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      // Dừng local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Đóng peer connections
      this.peerConnections.forEach((pc, key) => {
        pc.close();
      });
      this.peerConnections.clear();
      
      // Reset state
      this.streamId = null;
      this.role = null;
      this.onStreamCallback = null;
      
      console.log('SimpleWebRTCService: Streaming stopped');
    }
  
    // Rời khỏi stream
    leaveStream() {
      console.log('SimpleWebRTCService: leaveStream called');
      
      // Đóng WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      // Đóng peer connections
      this.peerConnections.forEach((pc, key) => {
        pc.close();
      });
      this.peerConnections.clear();
      
      // Reset state
      this.streamId = null;
      this.role = null;
      this.onStreamCallback = null;
      
      console.log('SimpleWebRTCService: Left stream');
    }
  }
  
  export default new SimpleWebRTCService(); 