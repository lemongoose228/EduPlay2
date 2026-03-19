import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/ui/Card/Card';
import { Input } from '../../../shared/ui/Input/Input';
import { Button } from '../../../shared/ui/Button/Button';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { clearAuthError, fetchProfile, login, register } from '../model/authSlice';
import { selectAuthError, selectAuthStatus, selectIsAuthenticated } from '../model/selectors';
import './AuthPage.css';

type Mode = 'login' | 'register';

function getModeFromPath(pathname: string): Mode {
  if (pathname.startsWith('/register')) return 'register';
  return 'login';
}

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const isAuthed = useAppSelector(selectIsAuthenticated);
  const status = useAppSelector(selectAuthStatus);
  const error = useAppSelector(selectAuthError);

  const mode = useMemo(() => getModeFromPath(location.pathname), [location.pathname]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; name?: boolean }>({});

  const isLoading = status === 'loading';

  const emailError =
    touched.email && !email.trim()
      ? 'Введите email'
      : touched.email && !/^\S+@\S+\.\S+$/.test(email)
        ? 'Некорректный email'
        : undefined;

  const passwordError =
    touched.password && !password
      ? 'Введите пароль'
      : touched.password && password.length < 6
        ? 'Минимум 6 символов'
        : undefined;

  const nameError =
    mode === 'register' && touched.name && !name.trim() ? 'Введите имя' : undefined;

  const canSubmit =
    !isLoading &&
    !emailError &&
    !passwordError &&
    (mode === 'login' || !nameError) &&
    email.trim() &&
    password &&
    (mode === 'login' || name.trim());

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch, mode]);

  useEffect(() => {
    if (isAuthed) {
      dispatch(fetchProfile());
      navigate('/create-game', { replace: true });
    }
  }, [dispatch, isAuthed, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, name: true });
    if (!canSubmit) return;

    if (mode === 'login') {
      await dispatch(login({ email: email.trim(), password })).unwrap().catch(() => undefined);
    } else {
      await dispatch(register({ email: email.trim(), password, name: name.trim() }))
        .unwrap()
        .catch(() => undefined);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-container slide-in">
        <Card
          title={
            <div className="auth-title">
              <div className="auth-title-main">
                {mode === 'login' ? 'Вход' : 'Регистрация'}
              </div>
              <div className="auth-title-sub">Quiz Game Platform</div>
            </div>
          }
          className="auth-card"
        >
          <div className="auth-switch">
            <button
              type="button"
              className={`auth-switch-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => navigate('/login')}
              disabled={isLoading}
            >
              Вход
            </button>
            <button
              type="button"
              className={`auth-switch-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => navigate('/register')}
              disabled={isLoading}
            >
              Регистрация
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && (
              <Input
                label="Имя"
                placeholder="Например: Даня"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                error={nameError}
                autoComplete="name"
              />
            )}

            <Input
              label="Email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={emailError}
              autoComplete={mode === 'login' ? 'username' : 'email'}
            />

            <Input
              label="Пароль"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={passwordError}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              rightIcon={
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              }
            />

            {error && <div className="auth-error">{error}</div>}

            <Button type="submit" variant="primary" size="large" fullWidth loading={isLoading}>
              {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </Button>

            <div className="auth-hint">
              {mode === 'login' ? (
                <>
                  Нет аккаунта?{' '}
                  <button type="button" className="auth-link" onClick={() => navigate('/register')}>
                    Зарегистрироваться
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{' '}
                  <button type="button" className="auth-link" onClick={() => navigate('/login')}>
                    Войти
                  </button>
                </>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

