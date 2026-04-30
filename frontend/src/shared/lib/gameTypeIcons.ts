import ownIcon from '../../assets/own_icon.png';
import quizIcon from '../../assets/quiz_icon.png';
import crocodileIcon from '../../assets/crocodile_icon.png';
import wheelIcon from '../../assets/wheel_icon.png';
import stationIcon from '../../assets/station_icon.svg';

export type GameType = 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';

export const GAME_TYPE_ICON_MAP: Record<GameType, string> = {
  own: ownIcon,
  quiz: quizIcon,
  crocodile: crocodileIcon,
  wheel: wheelIcon,
  station: stationIcon,
};
