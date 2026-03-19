import React from 'react';
import { useLocation } from 'react-router-dom';
import { Providers } from './providers';
import { AppRouter } from './router/AppRouter';
import { Menu } from '../widgets/menu/Menu';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchProfile } from '../features/auth/model/authSlice';
import { selectAuthToken } from '../features/auth/model/selectors';
import './App.css';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAuthRoute = location.pathname.startsWith('/login') || location.pathname.startsWith('/register');
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);

  React.useEffect(() => {
    if (token) dispatch(fetchProfile());
  }, [dispatch, token]);

  return (
    <div className="app">
      {!isAuthRoute && <Menu />}
      <main className={`main-content ${isAuthRoute ? 'main-content-full' : ''}`}>
        <AppRouter />
      </main>
    </div>
  );
};

function App() {
  return (
    <Providers>
      <AppLayout />
    </Providers>
  );
}

export default App;