import React, { useRef, useState } from 'react';
import { uploadQuestionImageApi } from '../../../features/games/api/gamesApi';
import { Button } from '../../../shared/ui/Button/Button';
import { Input } from '../../../shared/ui/Input/Input';
import { useDialogs } from '../../../shared/ui/DialogProvider';
import './QuestionImageField.css';

type QuestionImageFieldProps = {
  imageUrl?: string;
  onChange: (next: string) => void;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const QuestionImageField: React.FC<QuestionImageFieldProps> = ({ imageUrl, onChange }) => {
  const { showAlert } = useDialogs();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await showAlert('Можно загружать только изображения');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      await showAlert('Размер изображения не должен превышать 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadQuestionImageApi(file);
      onChange(uploaded.url);
    } catch {
      await showAlert('Не удалось загрузить изображение');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="question-image-field">
      <Input
        label="URL изображения (необязательно)"
        value={imageUrl || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
      />
      <div className="question-image-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Button
          type="button"
          variant="outline"
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Загрузка...' : 'Загрузить файл'}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="small"
          onClick={() => onChange('')}
          disabled={!imageUrl}
        >
          Очистить
        </Button>
      </div>
      {imageUrl ? (
        <div className="question-image-preview-wrap">
          <img
            className="question-image-preview"
            src={imageUrl}
            alt="Превью вопроса"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
