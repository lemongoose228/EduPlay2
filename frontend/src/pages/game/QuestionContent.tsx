import React from 'react';
import { resolveAvatarSrc } from '../../shared/lib/resolveAvatarSrc';
import './QuestionContent.css';

type QuestionContentProps = {
  text: string;
  imageUrl?: string | null;
  textClassName?: string;
};

export const QuestionContent: React.FC<QuestionContentProps> = ({
  text,
  imageUrl,
  textClassName,
}) => {
  const src = resolveAvatarSrc(imageUrl || undefined);

  return (
    <div className="question-content-block">
      <div className={textClassName}>{text}</div>
      {src ? (
        <div className="question-content-image-wrap">
          <img
            src={src}
            alt="Изображение к вопросу"
            className="question-content-image"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
