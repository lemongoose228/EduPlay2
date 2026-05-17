import React from 'react';
import { FaCompress, FaExpand } from 'react-icons/fa';
import { useFullscreen } from '../../lib/useFullscreen';
import './GameFullscreenShell.css';

interface GameFullscreenShellProps {
  children: React.ReactNode;
  className?: string;
}

export const GameFullscreenShell: React.FC<GameFullscreenShellProps> = ({
  children,
  className,
}) => {
  const { ref, isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

  const shellClassName = ['game-fullscreen-shell', className].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={shellClassName}>
      {isSupported && (
        <button
          type="button"
          className="game-fullscreen-toggle"
          onClick={() => void toggleFullscreen()}
          aria-label={
            isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'
          }
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
        >
          {isFullscreen ? <FaCompress aria-hidden /> : <FaExpand aria-hidden />}
        </button>
      )}
      {children}
    </div>
  );
};
