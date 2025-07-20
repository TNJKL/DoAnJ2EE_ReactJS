import api from './api';

export const gameService = {
  // Lấy danh sách game có thể chơi
  getPlayableGames: async () => {
    const response = await api.get('/game/playable');
    return response.data;
  },

  // Lấy danh sách game visible
  getVisibleGames: async () => {
    const response = await api.get('/game/visible');
    return response.data;
  },

  // Lấy thông tin game theo ID
  getGameInfo: async (gameId) => {
    const response = await api.get(`/game/${gameId}`);
    return response.data;
  },

  // Bắt đầu chơi game
  startGame: async (gameId) => {
    const response = await api.post(`/game/start/${gameId}`);
    return response.data;
  },

  // Kết thúc game và lưu score
  endGame: async (sessionId, score, gameState = null) => {
    const params = new URLSearchParams();
    params.append('score', score);
    if (gameState) {
      params.append('gameState', gameState);
    }
    
    const response = await api.post(`/game/end/${sessionId}?${params.toString()}`);
    return response.data;
  },

  // Lấy leaderboard của game
  getGameLeaderboard: async (gameId) => {
    const response = await api.get(`/game/${gameId}/leaderboard`);
    return response.data;
  },

  // Lấy lịch sử chơi game của user
  getUserGameHistory: async () => {
    const response = await api.get('/game/user/history');
    return response.data;
  },

  // Game Engine API cho Snake Game
  snakeGame: {
    // Khởi tạo game Snake
    init: async (width = 20, height = 20, sessionId) => {
      const params = new URLSearchParams();
      params.append('width', width);
      params.append('height', height);
      params.append('sessionId', sessionId);
      
      const response = await api.post(`/game-engine/snake/init?${params.toString()}`);
      return response.data;
    },

    // Di chuyển rắn
    move: async (sessionId, direction) => {
      const params = new URLSearchParams();
      params.append('sessionId', sessionId);
      params.append('direction', direction);
      
      const response = await api.post(`/game-engine/snake/move?${params.toString()}`);
      return response.data;
    },

    // Lấy trạng thái game
    getState: async (sessionId) => {
      const response = await api.get(`/game-engine/snake/state/${sessionId}`);
      return response.data;
    },

    // Restart game
    restart: async (sessionId) => {
      const response = await api.post(`/game-engine/snake/restart/${sessionId}`);
      return response.data;
    },

    // Lưu trạng thái game
    saveState: async (sessionId) => {
      const response = await api.post(`/game-engine/snake/save-state/${sessionId}`);
      return response.data;
    },

    // Load trạng thái game
    loadState: async (sessionId, gameState) => {
      const params = new URLSearchParams();
      params.append('gameState', gameState);
      
      const response = await api.post(`/game-engine/snake/load-state/${sessionId}?${params.toString()}`);
      return response.data;
    },

    // Kết thúc game
    end: async (sessionId) => {
      const response = await api.delete(`/game-engine/snake/end/${sessionId}`);
      return response.data;
    }
  }
};