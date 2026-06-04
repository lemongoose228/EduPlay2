import React, { useMemo, useState } from 'react';
import { FaTrophy } from 'react-icons/fa';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Input/Input';
import { Modal } from '../../shared/ui/Modal/Modal';
import {
  TeamSymbol,
  SYMBOL_OPTIONS,
  SYMBOL_LABELS,
  type TicTacToeSymbol,
} from './components/TeamSymbol';
import { QuestionContent } from './QuestionContent';
import './TicTacToeGamePage.css';

export interface TicTacToeQuestion {
  id: string;
  question: string;
  answer: string;
  imageUrl?: string;
}

export interface TicTacToeCell {
  index: number;
  questionId: string;
  occupiedByTeamId: string | null;
}

export interface TicTacToeState {
  setupComplete: boolean;
  team1Id: string;
  team2Id: string;
  team1Symbol: TicTacToeSymbol;
  team2Symbol: TicTacToeSymbol;
  currentTurnTeamId: string;
  cells: TicTacToeCell[];
  removedQuestionIds: string[];
  selectedCellIndex: number | null;
  winnerTeamId: string | null;
  isDraw?: boolean;
}

interface Team {
  id: string;
  name: string;
}

interface TicTacToeGamePageProps {
  title: string;
  questions: TicTacToeQuestion[];
  teams: Team[];
  tictactoeState?: TicTacToeState | null;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  isHost: boolean;
  onStart: () => Promise<void> | void;
  onSetup: (payload: {
    team1Name: string;
    team2Name: string;
    team1Symbol: TicTacToeSymbol;
    team2Symbol: TicTacToeSymbol;
  }) => Promise<void> | void;
  onOpenCell: (cellIndex: number) => Promise<void> | void;
  onAnswer: (correct: boolean) => Promise<void> | void;
  onFinish: () => Promise<void> | void;
  onVictoryClose: () => void;
}

export const TicTacToeGamePage: React.FC<TicTacToeGamePageProps> = ({
  title,
  questions,
  teams,
  tictactoeState,
  status,
  isHost,
  onStart,
  onSetup,
  onOpenCell,
  onAnswer,
  onFinish,
  onVictoryClose,
}) => {
  const [team1Name, setTeam1Name] = useState('Команда 1');
  const [team2Name, setTeam2Name] = useState('Команда 2');
  const [team1Symbol, setTeam1Symbol] = useState<TicTacToeSymbol>('cross');
  const [team2Symbol, setTeam2Symbol] = useState<TicTacToeSymbol>('circle');
  const [isLoading, setIsLoading] = useState(false);

  const questionsMap = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions],
  );

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const needsSetup = status === 'active' && !tictactoeState?.setupComplete;
  const isPlaying = Boolean(tictactoeState?.setupComplete && tictactoeState.cells?.length === 9);

  const getTeamSymbol = (teamId: string): TicTacToeSymbol | null => {
    if (!tictactoeState) return null;
    if (teamId === tictactoeState.team1Id) return tictactoeState.team1Symbol;
    if (teamId === tictactoeState.team2Id) return tictactoeState.team2Symbol;
    return null;
  };

  const selectedQuestion =
    tictactoeState?.selectedCellIndex != null
      ? questionsMap.get(
          tictactoeState.cells[tictactoeState.selectedCellIndex]?.questionId ?? '',
        )
      : null;

  const currentTurnTeam = tictactoeState
    ? teamMap.get(tictactoeState.currentTurnTeamId)
    : null;

  const winnerTeam =
    tictactoeState?.winnerTeamId && !tictactoeState.isDraw
      ? teamMap.get(tictactoeState.winnerTeamId)
      : null;

  const showVictoryModal = Boolean(
    status === 'finished' &&
      tictactoeState &&
      (tictactoeState.winnerTeamId || tictactoeState.isDraw),
  );

  const handleSetup = async () => {
    if (!team1Name.trim() || !team2Name.trim()) return;
    if (team1Symbol === team2Symbol) return;
    setIsLoading(true);
    try {
      await onSetup({
        team1Name: team1Name.trim(),
        team2Name: team2Name.trim(),
        team1Symbol,
        team2Symbol,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = async (cellIndex: number) => {
    if (!isHost || !tictactoeState?.setupComplete) return;
    if (tictactoeState.winnerTeamId || tictactoeState.isDraw) return;
    if (tictactoeState.selectedCellIndex !== null) return;
    const cell = tictactoeState.cells[cellIndex];
    if (!cell || cell.occupiedByTeamId) return;

    setIsLoading(true);
    try {
      await onOpenCell(cellIndex);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (correct: boolean) => {
    setIsLoading(true);
    try {
      await onAnswer(correct);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSetupForm = () => (
    <div className="tictactoe-setup">
      <div className="tictactoe-setup-team">
        <Input label="Название команды 1" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} />
        <p className="tictactoe-setup-label">Символ команды 1</p>
        <div className="tictactoe-symbol-picker">
          {SYMBOL_OPTIONS.map((sym) => (
            <button
              key={`t1-${sym}`}
              type="button"
              className={`tictactoe-symbol-btn ${team1Symbol === sym ? 'tictactoe-symbol-btn--selected' : ''}`}
              disabled={!isHost || team2Symbol === sym}
              onClick={() => setTeam1Symbol(sym)}
              title={SYMBOL_LABELS[sym]}
            >
              <TeamSymbol symbol={sym} size={28} />
            </button>
          ))}
        </div>
      </div>
      <div className="tictactoe-setup-team">
        <Input label="Название команды 2" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} />
        <p className="tictactoe-setup-label">Символ команды 2</p>
        <div className="tictactoe-symbol-picker">
          {SYMBOL_OPTIONS.map((sym) => (
            <button
              key={`t2-${sym}`}
              type="button"
              className={`tictactoe-symbol-btn ${team2Symbol === sym ? 'tictactoe-symbol-btn--selected' : ''}`}
              disabled={!isHost || team1Symbol === sym}
              onClick={() => setTeam2Symbol(sym)}
              title={SYMBOL_LABELS[sym]}
            >
              <TeamSymbol symbol={sym} size={28} />
            </button>
          ))}
        </div>
      </div>
      {team1Symbol === team2Symbol && (
        <p className="tictactoe-setup-error">Команды должны выбрать разные символы</p>
      )}
    </div>
  );

  if (status === 'waiting') {
    return (
      <div className="tictactoe-page tictactoe-page--lobby">
        <div className="tictactoe-lobby-card">
          <h1 className="tictactoe-title">{title}</h1>
          <p className="tictactoe-lobby-text">Крестики-нолики с вопросами</p>
          {isHost && (
            <Button onClick={() => void onStart()} disabled={isLoading}>
              Начать игру
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="tictactoe-page tictactoe-page--setup">
        <div className="tictactoe-setup-screen">
          <h1 className="tictactoe-title">{title}</h1>
          <p className="tictactoe-setup-screen-subtitle">
            Настройте две команды и выберите символы перед началом игры
          </p>
          {renderSetupForm()}
          {isHost ? (
            <Button
              className="tictactoe-setup-start-btn"
              onClick={() => void handleSetup()}
              disabled={isLoading || team1Symbol === team2Symbol}
            >
              Начать игру
            </Button>
          ) : (
            <p className="tictactoe-wait-host">Ожидайте, пока преподаватель настроит команды</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tictactoe-page tictactoe-page--playing">
      <h1 className="tictactoe-title tictactoe-title--compact">{title}</h1>

      <div className="tictactoe-game-body">
        {isPlaying && currentTurnTeam && (
          <div className="tictactoe-turn-bar">
            <div className="tictactoe-turn-bar-main">
              <span className="tictactoe-turn-bar-label">Сейчас ходит</span>
              <strong className="tictactoe-turn-bar-team">{currentTurnTeam.name}</strong>
              {getTeamSymbol(currentTurnTeam.id) && (
                <TeamSymbol symbol={getTeamSymbol(currentTurnTeam.id)!} size={32} />
              )}
            </div>
            <div className="tictactoe-turn-bar-teams">
              {teams.map((team) => {
                const symbol = getTeamSymbol(team.id);
                const isActive = team.id === tictactoeState!.currentTurnTeamId;
                return (
                  <div
                    key={team.id}
                    className={`tictactoe-team-chip ${isActive ? 'tictactoe-team-chip--active' : ''}`}
                  >
                    {symbol && <TeamSymbol symbol={symbol} size={20} />}
                    <span>{team.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isPlaying && (
          <div className="tictactoe-layout">
            <div className="tictactoe-board-wrap">
              <div className="tictactoe-board">
                {tictactoeState!.cells.map((cell) => {
                  const symbolTeamId = cell.occupiedByTeamId;
                  const symbol = symbolTeamId ? getTeamSymbol(symbolTeamId) : null;
                  const isSelected = tictactoeState!.selectedCellIndex === cell.index;
                  const isClickable =
                    isHost &&
                    !symbol &&
                    tictactoeState!.selectedCellIndex === null &&
                    !tictactoeState!.winnerTeamId &&
                    !tictactoeState!.isDraw;

                  return (
                    <button
                      key={cell.index}
                      type="button"
                      className={`tictactoe-cell ${isSelected ? 'tictactoe-cell--selected' : ''} ${isClickable ? 'tictactoe-cell--clickable' : ''}`}
                      onClick={() => void handleCellClick(cell.index)}
                      disabled={!isClickable || isLoading}
                    >
                      {symbol ? <TeamSymbol symbol={symbol} size={64} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="tictactoe-panel">
              {selectedQuestion ? (
                <>
                  <h2 className="tictactoe-panel-title">Вопрос</h2>
                  <QuestionContent
                    text={selectedQuestion.question}
                    imageUrl={selectedQuestion.imageUrl}
                    textClassName="tictactoe-question-text"
                  />
                  {isHost && (
                    <div className="tictactoe-answer-actions">
                      <Button
                        variant="secondary"
                        onClick={() => void handleAnswer(false)}
                        disabled={isLoading}
                      >
                        Неправильно
                      </Button>
                      <Button onClick={() => void handleAnswer(true)} disabled={isLoading}>
                        Правильно
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="tictactoe-panel-placeholder">
                  <p>Выберите клетку на поле, чтобы открыть вопрос</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      {isHost && isPlaying && status === 'active' && (
        <div className="tictactoe-footer">
          <Button variant="secondary" onClick={() => void onFinish()}>
            Завершить игру
          </Button>
        </div>
      )}

      <Modal
        isOpen={showVictoryModal}
        onClose={onVictoryClose}
        title={tictactoeState?.isDraw ? 'Ничья!' : 'Победа!'}
        closeOnClickOutside={false}
        footer={<Button onClick={onVictoryClose}>Закрыть</Button>}
      >
        <div className="tictactoe-victory">
          {tictactoeState?.isDraw ? (
            <p>Все клетки заняты. Ничья!</p>
          ) : (
            winnerTeam && (
              <>
                <FaTrophy className="tictactoe-trophy" />
                <p className="tictactoe-victory-team">{winnerTeam.name}</p>
                {tictactoeState?.winnerTeamId && getTeamSymbol(tictactoeState.winnerTeamId) && (
                  <TeamSymbol symbol={getTeamSymbol(tictactoeState.winnerTeamId)!} size={56} />
                )}
              </>
            )
          )}
        </div>
      </Modal>
    </div>
  );
};
