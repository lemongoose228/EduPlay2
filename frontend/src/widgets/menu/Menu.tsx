import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { logout } from '../../features/auth/model/authSlice';
import { selectAuthUser } from '../../features/auth/model/selectors';
import './Menu.css';
import ConstructorImg from '../../assets/menu/constructor.svg'
import LibImg from '../../assets/menu/lib.svg'
import MyGamesImg from '../../assets/menu/mygames.svg'
import SessionsImg from '../../assets/menu/sessions.svg'
import { FaCog, FaSignOutAlt } from 'react-icons/fa';
import { resolveAvatarSrc } from '../../shared/lib/resolveAvatarSrc';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

export const Menu: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const displayName = useMemo(() => user?.name || 'Гость', [user?.name]);
  const displayEmail = useMemo(() => user?.email || '', [user?.email]);
  const menuAvatarSrc = useMemo(
    () => resolveAvatarSrc(user?.avatar ?? undefined),
    [user?.avatar],
  );
  const userInitial = useMemo(
    () => (displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : '?'),
    [displayName],
  );
  const showAvatarImage = Boolean(menuAvatarSrc) && !avatarLoadFailed;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [menuAvatarSrc]);

  const menuItems: MenuItem[] = [
    { path: '/create-game', label: 'Создать игру', icon: ConstructorImg },
    { path: '/my-games', label: 'Мои игры', icon: MyGamesImg },
    { path: '/library', label: 'Библиотека игр', icon: LibImg },
    { path: '/game-sessions', label: 'Игровые сессии', icon: SessionsImg },
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
            {showAvatarImage ? (
              <img
                src={menuAvatarSrc}
                alt=""
                onError={() => {
                  setAvatarLoadFailed(true);
                }}
              />
            ) : (
              <span className="user-avatar-placeholder">{userInitial}</span>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            {displayEmail && <span className="user-email">{displayEmail}</span>}
          </div>
        </div>
      </div>

      <nav className="menu-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `menu-item ${isActive ? 'menu-item-active' : ''}`}
          >
            
            <img src={item.icon}/>
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
        <button type="submit" className="search-button">
          🔍
        </button>
      </form>

      <div className="menu-footer">
        <NavLink to="/settings" className="menu-item">
          <span className="menu-item-icon" aria-hidden>
            <FaCog size={20} />
          </span>
          <span className="menu-item-label">Настройки</span>
        </NavLink>
        <button
          type="button"
          className="menu-item menu-item-button"
          onClick={() => {
            dispatch(logout());
            navigate('/login');
          }}
        >
          <span className="menu-item-icon" aria-hidden>
            <FaSignOutAlt size={20} />
          </span>
          <span className="menu-item-label">Выйти</span>
        </button>
      </div>
    </aside>
  );
};

