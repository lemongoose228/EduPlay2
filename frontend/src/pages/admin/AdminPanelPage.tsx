// AdminPanelPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import {
  approveReportApi,
  blockGameApi,
  blockUserApi,
  getReportsApi,
  rejectReportApi,
  setAdminRoleApi,
  type AdminReport,
} from '../../features/admin/api/adminApi';
import {
  FaBan,
  FaCheckCircle,
  FaClock,
  FaCrown,
  FaExclamationTriangle,
  FaGamepad,
  FaTimes,
  FaUser,
} from 'react-icons/fa';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Input/Input';
import './AdminPanelPage.css';

type AdminTab = 'admins' | 'blocking' | 'reports';

export const AdminPanelPage: React.FC = () => {
  const user = useAppSelector(selectAuthUser);
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('blocking');
  const [adminUserId, setAdminUserId] = useState('');
  const [blockUserId, setBlockUserId] = useState('');
  const [blockGameId, setBlockGameId] = useState('');
  const [reason, setReason] = useState('');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const tabs = useMemo(
    () => (isSuperAdmin ? ['admins', 'blocking', 'reports'] : ['blocking', 'reports']),
    [isSuperAdmin],
  );

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      navigate('/create-game', { replace: true });
    }
  }, [navigate, user]);

  const refreshReports = async () => {
    setLoadingReports(true);
    try {
      const data = await getReportsApi();
      setReports(data);
    } catch (e) {
      console.error(e);
      alert('Не удалось загрузить жалобы');
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (tab === 'reports') {
      refreshReports();
    }
  }, [tab]);

  const handleSetAdmin = async (isAdmin: boolean) => {
    try {
      await setAdminRoleApi({ userId: adminUserId.trim(), isAdmin });
      alert(isAdmin ? 'Пользователь назначен админом' : 'Права админа сняты');
      setAdminUserId('');
    } catch (e) {
      console.error(e);
      alert('Не удалось изменить роль пользователя');
    }
  };

  const handleBlockUser = async (isBlocked: boolean) => {
    try {
      await blockUserApi({
        userId: blockUserId.trim(),
        isBlocked,
        reason: reason.trim() || undefined,
      });
      alert(isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
      setBlockUserId('');
      setReason('');
    } catch (e) {
      console.error(e);
      alert('Не удалось изменить блокировку пользователя');
    }
  };

  const handleBlockGame = async (isBlocked: boolean) => {
    try {
      await blockGameApi({
        gameId: blockGameId.trim(),
        isBlocked,
        reason: reason.trim() || undefined,
      });
      alert(isBlocked ? 'Игра заблокирована' : 'Игра разблокирована');
      setBlockGameId('');
      setReason('');
    } catch (e) {
      console.error(e);
      alert('Не удалось изменить блокировку игры');
    }
  };

  const handleApproveReport = async (reportId: string) => {
    try {
      await approveReportApi(reportId);
      await refreshReports();
    } catch (e) {
      console.error(e);
      alert('Не удалось принять жалобу');
    }
  };

  const handleRejectReport = async (reportId: string) => {
    try {
      await rejectReportApi(reportId);
      await refreshReports();
    } catch (e) {
      console.error(e);
      alert('Не удалось отклонить жалобу');
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">Панель администратора</h1>
        <p className="page-description">Управление ролями, блокировками и жалобами</p>
      </div>

      <div className="admin-tabs">
        {tabs.includes('admins') && (
          <button className={`admin-tab ${tab === 'admins' ? 'active' : ''}`} onClick={() => setTab('admins')}>
            <FaCrown className="admin-tab-icon" aria-hidden />
            Назначение админов
          </button>
        )}
        <button className={`admin-tab ${tab === 'blocking' ? 'active' : ''}`} onClick={() => setTab('blocking')}>
          <FaBan className="admin-tab-icon" aria-hidden />
          Блокировки
        </button>
        <button className={`admin-tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          <FaExclamationTriangle className="admin-tab-icon" aria-hidden />
          Жалобы
        </button>
      </div>

      {tab === 'admins' && isSuperAdmin && (
        <div className="admin-card">
          <div className="card-header">
            <span className="card-icon" aria-hidden>
              <FaCrown />
            </span>
            <h3>Назначение админов</h3>
          </div>
          <div className="card-content">
            <Input
              label="ID пользователя"
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              placeholder="Числовой ID или UUID"
            />
            <div className="admin-actions">
              <Button onClick={() => handleSetAdmin(true)}>Сделать админом</Button>
              <Button variant="outline" onClick={() => handleSetAdmin(false)}>
                Снять права админа
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'blocking' && (
        <div className="admin-blocks">
          <div className="admin-card">
            <div className="card-header">
              <span className="card-icon" aria-hidden>
                <FaUser />
              </span>
              <h3>Блокировка пользователя</h3>
            </div>
            <div className="card-content">
              <Input
                label="ID пользователя"
                value={blockUserId}
                onChange={(e) => setBlockUserId(e.target.value)}
                placeholder="Числовой ID или UUID"
              />
              <Input
                label="Причина (опционально)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Причина блокировки"
              />
              <div className="admin-actions">
                <Button variant="danger" onClick={() => handleBlockUser(true)}>
                  Заблокировать
                </Button>
                <Button variant="outline" onClick={() => handleBlockUser(false)}>
                  Разблокировать
                </Button>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div className="card-header">
              <span className="card-icon" aria-hidden>
                <FaGamepad />
              </span>
              <h3>Блокировка игры</h3>
            </div>
            <div className="card-content">
              <Input
                label="ID игры"
                value={blockGameId}
                onChange={(e) => setBlockGameId(e.target.value)}
                placeholder="Числовой ID или UUID"
              />
              <Input
                label="Причина (опционально)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Причина блокировки"
              />
              <div className="admin-actions">
                <Button variant="danger" onClick={() => handleBlockGame(true)}>
                  Заблокировать
                </Button>
                <Button variant="outline" onClick={() => handleBlockGame(false)}>
                  Разблокировать
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="admin-card reports-card">
          <div className="card-header">
            <span className="card-icon" aria-hidden>
              <FaExclamationTriangle />
            </span>
            <h3>Жалобы пользователей</h3>
            {!loadingReports && reports.length > 0 && (
              <span className="reports-count">{reports.length}</span>
            )}
          </div>
          <div className="card-content">
            {loadingReports ? (
              <div className="loading-container">Загрузка жалоб...</div>
            ) : reports.length === 0 ? (
              <div className="empty-state-report">
                <span className="empty-icon" aria-hidden>
                  <FaCheckCircle />
                </span>
                <p>Нет активных жалоб</p>
              </div>
            ) : (
              <div className="reports-list">
                {reports.map((report) => (
                  <div key={report.id} className="report-item">
                    <div className="report-header">
                      <div className="report-title">
                        <strong>{report.game?.title ?? report.gameId}</strong>
                        <span className={`report-status ${report.status}`}>
                          {report.status === 'pending' && (
                            <>
                              <FaClock className="report-status-icon" aria-hidden />
                              На рассмотрении
                            </>
                          )}
                          {report.status === 'approved' && (
                            <>
                              <FaCheckCircle className="report-status-icon" aria-hidden />
                              Принята
                            </>
                          )}
                          {report.status === 'rejected' && (
                            <>
                              <FaTimes className="report-status-icon" aria-hidden />
                              Отклонена
                            </>
                          )}
                        </span>
                      </div>
                      <div className="report-meta">
                        <span className="report-meta-item">
                          <span className="meta-label">Game ID:</span> {report.gameId}
                        </span>
                        <span className="report-meta-item">
                          <span className="meta-label">Reporter ID:</span> {report.reporter?.id ?? 'unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="report-reason">
                      <span className="reason-label">Причина жалобы:</span>
                      <p>{report.reason}</p>
                    </div>
                    {report.status === 'pending' && (
                      <div className="report-actions">
                        <Button variant="danger" onClick={() => handleApproveReport(report.id)}>
                          Принять и заблокировать игру
                        </Button>
                        <Button variant="outline" onClick={() => handleRejectReport(report.id)}>
                          Отклонить
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};