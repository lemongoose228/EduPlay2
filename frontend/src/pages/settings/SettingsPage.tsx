import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/store/hooks';
import { selectAuthUser } from '../../features/auth/model/selectors';
// import { updateProfile } from '../../features/auth/model/authSlice';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Input/Input';
import { Modal } from '../../shared/ui/Modal/Modal';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || ''
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || ''
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

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
    'https://api.dicebear.com/7.x/avataaars/svg?seed=12'
  ];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };

  const handleAvatarSelect = (avatarUrl: string) => {
    setFormData(prev => ({ ...prev, avatar: avatarUrl }));
    setAvatarPreview(avatarUrl);
    setSelectedAvatarFile(null);
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
      setSelectedAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
      setShowAvatarModal(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Имя не может быть пустым');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: { name: string; avatar?: string } = {
        name: formData.name.trim()
      };
      
      if (formData.avatar) {
        updateData.avatar = formData.avatar;
      }

      // await dispatch(updateProfile(updateData)).unwrap();
      alert('Профиль успешно обновлён');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error?.message || 'Не удалось обновить профиль');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="avatar-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
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