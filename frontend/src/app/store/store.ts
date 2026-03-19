import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../../features/auth/model/authSlice';

// Здесь будут импортироваться редюсеры из features
// import authReducer from '../../features/auth/store/authSlice';
// import gamesReducer from '../../features/games/store/gamesSlice';
// import sessionsReducer from '../../features/sessions/store/sessionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // games: gamesReducer,
    // sessions: sessionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;