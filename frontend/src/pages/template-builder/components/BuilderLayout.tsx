import React from 'react';
import './BuilderLayout.css';

interface BuilderLayoutProps {
  children: React.ReactNode;
}

export const BuilderLayout: React.FC<BuilderLayoutProps> = ({ children }) => {
  return (
    <div className="builder-layout">
      <div className="builder-container">
        {children}
      </div>
    </div>
  );
};