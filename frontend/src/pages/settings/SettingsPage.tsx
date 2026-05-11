import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import { updateProfile } from '../../features/auth/model/authSlice';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Input/Input';
import { Modal } from '../../shared/ui/Modal/Modal';
import { resolveAvatarSrc } from '../../shared/lib/resolveAvatarSrc';
import { useDialogs } from '../../shared/ui/DialogProvider';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const { showAlert } = useDialogs();
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobPreviewRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar ?? null,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar || null,
  );
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  const revokeBlobPreview = useCallback(() => {
    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
      blobPreviewRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokeBlobPreview();
  }, [revokeBlobPreview]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar ?? null,
      });
      revokeBlobPreview();
      setSelectedAvatarFile(null);
      setAvatarPreview(user.avatar || null);
    }
  }, [user, revokeBlobPreview]);

  const predefinedAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=18',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=39',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=545',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=55',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=585',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=873',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=9',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=108',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=125',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=124',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=933',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1089',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1244',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1204',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=13556562',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=9336644',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=108946',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=124464',
  ];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleAvatarSelect = (avatarUrl: string) => {
    revokeBlobPreview();
    setSelectedAvatarFile(null);
    setFormData((prev) => ({ ...prev, avatar: avatarUrl }));
    setAvatarPreview(avatarUrl);
    setShowAvatarModal(false);
  };

  const handleRemoveAvatar = () => {
    revokeBlobPreview();
    setSelectedAvatarFile(null);
    setAvatarPreview(null);
    setFormData((prev) => ({ ...prev, avatar: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        void showAlert('Размер файла не должен превышать 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        void showAlert('Пожалуйста, выберите изображение');
        return;
      }
      revokeBlobPreview();
      const objectUrl = URL.createObjectURL(file);
      blobPreviewRef.current = objectUrl;
      setSelectedAvatarFile(file);
      setAvatarPreview(objectUrl);
      setShowAvatarModal(false);
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      await showAlert('Имя не может быть пустым');
      return;
    }

    setIsLoading(true);
    try {
      await dispatch(
        updateProfile({
          name: formData.name,
          selectedFile: selectedAvatarFile,
          avatarFromForm: formData.avatar || null,
        }),
      ).unwrap();

      revokeBlobPreview();
      setSelectedAvatarFile(null);
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const message =
        typeof error === 'string' ? error : 'Не удалось обновить профиль';
      await showAlert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const previewSrc = resolveAvatarSrc(avatarPreview || undefined);
  const hasAvatarSelection = Boolean(avatarPreview || formData.avatar || selectedAvatarFile);
  const hasAvatarImage = Boolean(previewSrc);

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Настройки профиля</h1>
          <p className="settings-description">
            Управляйте своими персональными данными
          </p>
        </div>

        <div className="settings-content">
          <div className="avatar-section">
            <div className="avatar-container">
              {hasAvatarImage ? (
                <img
                  src={previewSrc}
                  alt="Avatar"
                  className="avatar-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    setAvatarPreview(null);
                    setFormData((prev) => ({ ...prev, avatar: null }));
                  }}
                />
              ) : (
                <div className="avatar-placeholder">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>
            <div className="avatar-actions">
              <Button
                variant="outline"
                size="small"
                onClick={() => setShowAvatarModal(true)}
              >
                Выбрать аватар
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="small"
                onClick={triggerFileInput}
              >
                Загрузить фото
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={handleRemoveAvatar}
                disabled={!hasAvatarSelection}
              >
                Удалить фото
              </Button>
            </div>
          </div>

          <div className="form-section">
            <Input
              label="Имя пользователя"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Введите ваше имя"
              helperText="Имя будет отображаться в меню и в созданных вами играх"
            />

            <Input
              label="Email"
              value={formData.email}
              disabled
              helperText="Email нельзя изменить"
            />

            <Input
              label="Ваш ID"
              value={user?.publicId ?? user?.id ?? ''}
              disabled
              helperText="Числовой ID виден только вам; по нему можно искать ваши игры в библиотеке и использовать в админ-панели"
            />
          </div>

          <div className="settings-actions">
            <Button
              variant="primary"
              onClick={handleSave}
              loading={isLoading}
            >
              Сохранить изменения
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Выберите аватар"
        size="large"
      >
        <div className="avatar-modal-content">
          <div className="avatar-grid">
            {predefinedAvatars.map((avatar, index) => (
              <div
                key={index}
                className={`avatar-option ${formData.avatar === avatar ? 'selected' : ''}`}
                onClick={() => handleAvatarSelect(avatar)}
              >
                <img src={avatar} alt={`Avatar ${index + 1}`} />
              </div>
            ))}
          </div>
          <div className="avatar-modal-footer">
            <p>Или загрузите своё изображение</p>
            <div className="avatar-modal-actions">
              <Button variant="outline" onClick={triggerFileInput}>
                Загрузить фото
              </Button>
              <Button
                variant="danger"
                onClick={handleRemoveAvatar}
                disabled={!hasAvatarSelection}
              >
                Удалить фото
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
