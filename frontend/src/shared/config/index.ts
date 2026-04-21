const apiUrl = 'http://localhost:3001/api';

export const config = {
  apiUrl,
  /** Origin без суффикса `/api` — для статики загруженных аватаров */
  apiOrigin: apiUrl.replace(/\/api\/?$/, ''),
  wsUrl: 'ws://localhost:3001',
  appName: 'Quiz Game Platform',
  version: '1.0.0',
};