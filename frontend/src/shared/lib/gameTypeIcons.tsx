import React from 'react';
import { FaRoute } from 'react-icons/fa6';
import ownIcon from '../../assets/own_icon.png';
import quizIcon from '../../assets/quiz_icon.png';
import crocodileIcon from '../../assets/crocodile_icon.png';
import wheelIcon from '../../assets/wheel_icon.png';

export type GameType = 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';

const GAME_TYPE_IMAGE_SRC: Record<Exclude<GameType, 'station'>, string> = {
  own: ownIcon,
  quiz: quizIcon,
  crocodile: crocodileIcon,
  wheel: wheelIcon,
};

export interface GameTypeIconProps {
  type: GameType;
  className?: string;
  alt?: string;
}

export const GameTypeIcon: React.FC<GameTypeIconProps> = ({ type, className, alt = '' }) => {
  if (type === 'station') {
    return <FaRoute className={className} aria-label={alt} title={alt || undefined} />;
  }
  return <img src={GAME_TYPE_IMAGE_SRC[type]} alt={alt} className={className} />;
};
