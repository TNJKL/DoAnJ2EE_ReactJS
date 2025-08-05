import { useEffect, useRef, useState, useCallback } from 'react';

const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    shouldReconnect = true
  } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (event) => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        if (onOpen) onOpen(event);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (onClose) onClose(event);
        
        if (shouldReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        setError(event);
        if (onError) onError(event);
      };

    } catch (err) {
      setError(err);
    }
  }, [url, onOpen, onClose, onMessage, onError, reconnectInterval, maxReconnectAttempts, shouldReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((topic) => {
    sendMessage({
      type: 'SUBSCRIBE',
      destination: topic
    });
  }, [sendMessage]);

  const unsubscribe = useCallback((topic) => {
    sendMessage({
      type: 'UNSUBSCRIBE',
      destination: topic
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };
};

export default useWebSocket; 