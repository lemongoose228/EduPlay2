const apiUrl = 'http://localhost:3001/api';

export const config = {
  apiUrl,
  
  apiOrigin: apiUrl.replace(/\/api\/?$/, ''),
  wsUrl: 'ws://localhost:3001',
  appName: 'Quiz Game Platform',
  version: '1.0.0',
};