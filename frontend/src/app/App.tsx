import React from 'react';
import { Providers } from './providers';
import { AppRouter } from './router/AppRouter';
import { Menu } from '../widgets/menu/Menu';
import './App.css';

function App() {
  return (
    <Providers>
      <div className="app">
        <Menu />
        <main className="main-content">
          <AppRouter />
        </main>
      </div>
    </Providers>
  );
}

export default App;