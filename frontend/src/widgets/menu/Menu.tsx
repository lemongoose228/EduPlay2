import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Menu.css';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

export const Menu: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems: MenuItem[] = [
    { path: '/create-game', label: 'Создать игру', icon: '🎮' },
    { path: '/my-games', label: 'Мои игры', icon: '📚' },
    { path: '/library', label: 'Библиотека игр', icon: '🏛️' },
    { path: '/game-sessions', label: 'Игровые сессии', icon: '🎯' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/library?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <aside className="menu">
      <div className="menu-header">
        <div className="user-info">
          <div className="user-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="user-details">
            <span className="user-name">Имя Фамилия</span>
            <span className="user-email">user@example.com</span>
          </div>
        </div>
      </div>
      
      <nav className="menu-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `menu-item ${isActive ? 'menu-item-active' : ''}`
            }
          >
            <span className="menu-item-icon">{item.icon}</span>
            <span className="menu-item-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <form className="menu-search" onSubmit={handleSearch}>
        <input 
          type="text" 
          placeholder="Поиск игр..." 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="search-button">🔍</button>
      </form>

      <div className="menu-footer">
        <NavLink to="/settings" className="menu-item">
          <span className="menu-item-icon">⚙️</span>
          <span className="menu-item-label">Настройки</span>
        </NavLink>
        <NavLink to="/logout" className="menu-item">
          <span className="menu-item-icon">🚪</span>
          <span className="menu-item-label">Выйти</span>
        </NavLink>
      </div>
    </aside>
  );
};