import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
import { updateProfile } from '../../features/auth/model/authSlice';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Input/Input';
import { Modal } from '../../shared/ui/Modal/Modal';
import { resolveAvatarSrc } from '../../shared/lib/resolveAvatarSrc';
import './SettingsPage.css';

const DEFAULT_AVATAR_FALLBACK =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobPreviewRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
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
        avatar: user.avatar || '',
      });
      revokeBlobPreview();
      setSelectedAvatarFile(null);
      setAvatarPreview(user.avatar || null);
    }
  }, [user, revokeBlobPreview]);

  const predefinedAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=9',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=10',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=11',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=12',
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Размер файла не должен превышать 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
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
      alert('Имя не может быть пустым');
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
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const previewSrc =
    resolveAvatarSrc(avatarPreview || undefined) || DEFAULT_AVATAR_FALLBACK;

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
              {avatarPreview || user?.avatar ? (
                <img
                  src={previewSrc}
                  alt="Avatar"
                  className="avatar-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR_FALLBACK;
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
            <Button variant="outline" onClick={triggerFileInput}>
              Загрузить фото
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
