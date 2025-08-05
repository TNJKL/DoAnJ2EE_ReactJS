class WebRTCService {
    constructor() {
      this.peerConnections = new Map();
      this.localStream = null;
      this.onStreamCallback = null;
      this.ws = null;
    }
  
    // Streamer: Bắt đầu stream
    async startStreaming(streamId, localStream) {
      console.log('WebRTCService: startStreaming called with streamId:', streamId);
      this.localStream = localStream;
      
      // Kết nối WebSocket
      await this.connectWebSocket(streamId, 'streamer');
      
      // Thông báo streamer sẵn sàng
      this.sendMessage({
        type: 'streamer-ready',
        streamId: streamId,
        streamerId: 'streamer'
      });
    }
  
    // Viewer: Tham gia xem stream
    async joinStream(streamId, onStreamReceived) {
      console.log('WebRTCService: joinStream called with streamId:', streamId);
      this.onStreamCallback = onStreamReceived;
      
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
        console.log(`WebRTCService: Connecting to WebSocket: ${wsUrl}`);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log(`WebRTCService: WebSocket connected as ${role} for stream ${streamId}`);
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log(`WebRTCService: Received message as ${role}:`, message);
            this.handleMessage(message);
          } catch (error) {
            console.error('WebRTCService: Error parsing message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error(`WebRTCService: WebSocket error for ${role}:`, error);
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log(`WebRTCService: WebSocket closed for ${role}:`, event.code, event.reason);
        };
      });
    }
  
    // Gửi message
    sendMessage(message) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('WebRTCService: Sending message:', message);
        this.ws.send(JSON.stringify(message));
      } else {
        console.error('WebRTCService: Cannot send message, WebSocket not ready. State:', this.ws?.readyState);
      }
    }
  
    // Xử lý message
    handleMessage(message) {
      console.log('WebRTCService: Handling message type:', message.type);
      switch (message.type) {
        case 'viewer-join':
          console.log('WebRTCService: Processing viewer-join message');
          this.handleViewerJoin(message.streamId, message.viewerId);
          break;
        case 'offer':
          console.log('WebRTCService: Processing offer message');
          this.handleOffer(message.streamId, message);
          break;
        case 'answer':
          console.log('WebRTCService: Processing answer message');
          this.handleAnswer(message.streamId, message);
          break;
        case 'ice-candidate':
          console.log('WebRTCService: Processing ice-candidate message');
          this.handleIceCandidate(message.streamId, message);
          break;
        case 'streamer-ready':
          console.log('WebRTCService: Streamer ready notification received');
          break;
        default:
          console.log('WebRTCService: Unknown message type:', message.type, message);
      }
    }
  
    // Streamer: Xử lý khi có viewer join
    async handleViewerJoin(streamId, viewerId) {
      console.log('WebRTCService: handleViewerJoin called with streamId:', streamId, 'viewerId:', viewerId);
      
      if (!this.localStream) {
        console.error('WebRTCService: No local stream available');
        return;
      }
  
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
  
      this.peerConnections.set(viewerId, peerConnection);
      console.log('WebRTCService: Created peer connection for viewer:', viewerId);
  
      // Thêm local stream tracks
      this.localStream.getTracks().forEach(track => {
        console.log('WebRTCService: Adding track to peer connection:', track.kind);
        peerConnection.addTrack(track, this.localStream);
      });
  
      // Tạo offer
      console.log('WebRTCService: Creating offer...');
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log('WebRTCService: Offer created and set as local description');
  
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
          console.log('WebRTCService: ICE candidate generated');
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
        console.log('WebRTCService: Connection state changed:', peerConnection.connectionState);
      };
    }
  
    // Viewer: Xử lý offer từ streamer
    async handleOffer(streamId, message) {
      console.log('WebRTCService: handleOffer called with streamId:', streamId, 'message:', message);
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
  
      this.peerConnections.set(streamId, peerConnection);
      console.log('WebRTCService: Created peer connection for streamer');
  
      // Xử lý remote stream
      peerConnection.ontrack = (event) => {
        console.log('WebRTCService: Received remote stream:', event.streams[0]);
        console.log('WebRTCService: Stream tracks:', event.streams[0].getTracks());
        if (this.onStreamCallback) {
          console.log('WebRTCService: Calling onStreamCallback with remote stream');
          this.onStreamCallback(event.streams[0]);
        } else {
          console.error('WebRTCService: No onStreamCallback set');
        }
      };
  
      // Set remote description
      console.log('WebRTCService: Setting remote description...');
      await peerConnection.setRemoteDescription(message.offer);
      console.log('WebRTCService: Remote description set successfully');
  
      // Tạo answer
      console.log('WebRTCService: Creating answer...');
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log('WebRTCService: Answer created and set as local description');
  
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
          console.log('WebRTCService: ICE candidate generated by viewer');
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
        console.log('WebRTCService: Viewer connection state changed:', peerConnection.connectionState);
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
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
  
      this.peerConnections.forEach(connection => {
        connection.close();
      });
      this.peerConnections.clear();
  
      if (this.ws) {
        this.ws.close();
      }
    }
  
    // Rời khỏi stream
    leaveStream() {
      this.peerConnections.forEach(connection => {
        connection.close();
      });
      this.peerConnections.clear();
  
      if (this.ws) {
        this.ws.close();
      }
    }
  }
  
  export default new WebRTCService(); 