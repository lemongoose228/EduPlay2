import React from 'react';
import { FaTimes, FaCircle, FaHeart, FaStar } from 'react-icons/fa';

export type TicTacToeSymbol = 'cross' | 'circle' | 'heart' | 'star';

const SYMBOL_CONFIG: Record<
  TicTacToeSymbol,
  { Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }
> = {
  cross: { Icon: FaTimes, color: '#ef4444' },
  circle: { Icon: FaCircle, color: '#22c55e' },
  heart: { Icon: FaHeart, color: '#ec4899' },
  star: { Icon: FaStar, color: '#eab308' },
};

export const SYMBOL_OPTIONS: TicTacToeSymbol[] = ['cross', 'circle', 'heart', 'star'];

export const SYMBOL_LABELS: Record<TicTacToeSymbol, string> = {
  cross: 'Крестик',
  circle: 'Нолик',
  heart: 'Сердечко',
  star: 'Звёздочка',
};

interface TeamSymbolProps {
  symbol: TicTacToeSymbol;
  size?: number;
  className?: string;
}

export const TeamSymbol: React.FC<TeamSymbolProps> = ({ symbol, size = 32, className }) => {
  const { Icon, color } = SYMBOL_CONFIG[symbol];
  return (
    <Icon
      className={className}
      style={{ color, fontSize: size, width: size, height: size }}
      aria-hidden
    />
  );
};
