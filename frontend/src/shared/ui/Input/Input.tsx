import React, { useState } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  type = 'text',
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <div className={`
        input-container 
        ${error ? 'input-error' : ''} 
        ${focused ? 'input-focused' : ''}
        ${leftIcon ? 'has-left-icon' : ''}
        ${rightIcon ? 'has-right-icon' : ''}
      `}>
        {leftIcon && <span className="input-left-icon">{leftIcon}</span>}
        <input
          className={`input-field ${className}`}
          type={type}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && <span className="input-right-icon">{rightIcon}</span>}
      </div>
      {error && <span className="input-error-message">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
};