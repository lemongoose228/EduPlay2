import React from 'react';
import { Button } from '../../shared/ui/Button/Button';
import './TemplateCard.css';

interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  icon: string | React.ReactNode;
  color: string;
  onSelect: (id: string) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  id,
  title,
  description,
  icon,
  color,
  onSelect
}) => {
  return (
    <div className="template-card" style={{ '--template-color': color } as React.CSSProperties}>
      <div className="template-card-header">
        {typeof icon === 'string' ? (
          <img
            className={`template-icon ${id === 'custom' ? 'template-icon-own' : ''} ${id === 'tictactoe' ? 'template-icon-tictactoe' : ''}`}
            src={icon}
            alt={title}
          />
        ) : (
          icon
        )}
        <h3 className="template-title">{title}</h3>
      </div>
      <div className="template-card-content">
        <p className="template-description">{description}</p>
      </div>
      <div className="template-card-footer">
        <Button 
          variant="primary" 
          fullWidth 
          onClick={() => onSelect(id)}
        >
          Создать игру
        </Button>
      </div>
    </div>
  );
};