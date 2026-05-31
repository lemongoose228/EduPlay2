import React, { useRef, useState } from 'react';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Input } from '../../shared/ui/Input/Input';
import { QuestionContent } from './QuestionContent';
import {
  addTeamApi,
  answerQuestionApi,
  finishSessionApi,
  updateScoreApi,
} from '../../features/sessions/api/sessionsApi';
import type {
  GameSession,
  SessionCategory,
  SessionQuestion,
} from '../../features/sessions/types/session.types';
import { useDialogs } from '../../shared/ui/DialogProvider';
import './GamePage.css';
import './OwnGamePage.css';

export interface OwnGamePageProps {
  session: GameSession;
  isHost: boolean;
  showInviteCode: boolean;
  answeredSet: Set<string>;
  onSessionUpdate: React.Dispatch<React.SetStateAction<GameSession | null>>;
}

export const OwnGamePage: React.FC<OwnGamePageProps> = ({
  session,
  isHost,
  showInviteCode,
  answeredSet,
  onSessionUpdate,
}) => {
  const { showAlert } = useDialogs();
  const [selectedQuestion, setSelectedQuestion] = useState<{
    category: SessionCategory;
    question: SessionQuestion;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newOwnTeamName, setNewOwnTeamName] = useState('');
  const [isPointsLocked, setIsPointsLocked] = useState(false);
  const pointsLockRef = useRef(false);
  const currentQuestionValue = selectedQuestion?.question.value;

  const maxOwnRows = Math.max(...session.game.categories.map((c) => c.questions.length), 0);

  const handleQuestionClick = (category: SessionCategory, question: SessionQuestion) => {
    const isAlreadySelected =
      selectedQuestion?.category.id === category.id &&
      selectedQuestion?.question.id === question.id;

    const answeredKey = `${category.id}:${question.id}`;
    if (answeredSet.has(answeredKey) || isAlreadySelected) return;
    pointsLockRef.current = false;
    setIsPointsLocked(false);
    setSelectedQuestion({ category, question });
    setShowAnswer(false);
  };

  const handleCloseQuestion = () => {
    if (!selectedQuestion) return;

    answerQuestionApi(session.id, selectedQuestion.category.id, selectedQuestion.question.id)
      .then((updated) => onSessionUpdate(updated))
      .catch((e) => {
        console.error(e);
        void showAlert('Не удалось закрыть вопрос');
      })
      .finally(() => {
        pointsLockRef.current = false;
        setIsPointsLocked(false);
        setSelectedQuestion(null);
        setShowAnswer(false);
      });
  };

  const handleModalClose = () => {
    pointsLockRef.current = false;
    setIsPointsLocked(false);
    setSelectedQuestion(null);
    setShowAnswer(false);
  };

  const handleScoreChange = (teamId: string, points: number) => {
    if (pointsLockRef.current) return;
    pointsLockRef.current = true;
    setIsPointsLocked(true);

    updateScoreApi(session.id, { teamId, points })
      .then((updated) => onSessionUpdate(updated))
      .catch((e) => {
        console.error(e);
        void showAlert(points > 0 ? 'Не удалось начислить очки' : 'Не удалось снять очки');
      })
      .finally(() => {
        pointsLockRef.current = false;
        setIsPointsLocked(false);
      });
  };

  return (
    <div className="game-page active">
      <div className="game-header">
        <div className="game-info">
          <span className="game-title-header">{session.game.title}</span>
          {showInviteCode ? <span className="game-code">Код: {session.inviteCode}</span> : null}
        </div>
        {isHost && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              finishSessionApi(session.id)
                .then((updated) => onSessionUpdate(updated))
                .catch((e) => {
                  console.error(e);
                  void showAlert('Не удалось завершить игру');
                });
            }}
          >
            Завершить игру
          </Button>
        )}

        {isHost && (
          <div className="own-team-add">
            <Input
              label="Команда (необязательно)"
              value={newOwnTeamName}
              onChange={(e) => setNewOwnTeamName(e.target.value)}
              placeholder={`Команда ${session.teams.length + 1}`}
            />
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const updated = await addTeamApi(session.id, {
                    name: newOwnTeamName || undefined,
                  });
                  onSessionUpdate(updated);
                  setNewOwnTeamName('');
                } catch (e) {
                  console.error(e);
                  await showAlert('Не удалось добавить команду');
                }
              }}
            >
              Добавить команду
            </Button>
          </div>
        )}
      </div>

      <div className="game-content">
        <div className="game-board">
          <table className="jeopardy-table">
            <thead>
              <tr>
                {session.game.categories.map((category) => (
                  <th key={category.id} className="category-header">
                    {category.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxOwnRows }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {session.game.categories.map((category) => {
                    const question = category.questions[rowIndex];
                    const answeredKey = question ? `${category.id}:${question.id}` : '';
                    const isAnswered = question ? answeredSet.has(answeredKey) : false;
                    const isCurrentOpen =
                      !!question &&
                      selectedQuestion?.category.id === category.id &&
                      selectedQuestion?.question.id === question.id;
                    const isUsed = Boolean(isAnswered || isCurrentOpen);

                    return (
                      <td key={category.id} className="question-cell">
                        {question && (
                          <button
                            className={`question-button ${
                              isAnswered ? 'answered' : isCurrentOpen ? 'used' : ''
                            }`}
                            onClick={() => handleQuestionClick(category, question)}
                            disabled={isUsed}
                          >
                            {!isUsed && (
                              <span className="question-button__value">{question.value}</span>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="teams-scoreboard">
          <h3>Счет команд</h3>
          <div className="scoreboard-list">
            {session.teams.map((team) => (
              <div key={team.id} className="scoreboard-row">
                <div className="team-info">
                  <span className="team-name">{team.name}</span>
                  <span className="team-score">{team.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedQuestion}
        onClose={handleModalClose}
        title={selectedQuestion?.category.name || ''}
        size="large"
        footer={
          <>
            {!showAnswer ? (
              <Button onClick={() => setShowAnswer(true)}>Показать ответ</Button>
            ) : (
              <Button onClick={handleCloseQuestion}>Закрыть вопрос</Button>
            )}
          </>
        }
      >
        {selectedQuestion && (
          <div className="question-and-points">
            <div className="question-modal">
              <div className="question-value">{selectedQuestion.question.value}</div>
              <QuestionContent
                text={selectedQuestion.question.question}
                imageUrl={selectedQuestion.question.imageUrl}
                textClassName="question-text"
              />
              {showAnswer && (
                <div className="question-answer">
                  <strong>Ответ:</strong> {selectedQuestion.question.answer}
                </div>
              )}
            </div>

            <div className="points-modal" aria-label="Начисление очков командам">
              <h4 className="points-title">Начисление очков</h4>
              <div className="points-list">
                {session.teams.map((team) => (
                  <div key={team.id} className="points-team-row">
                    <div className="points-team-meta">
                      <span className="points-team-name">{team.name}</span>
                      <span className="points-team-score">{team.score}</span>
                    </div>
                    <div className="points-actions">
                      <Button
                        variant="success"
                        size="small"
                        disabled={!isHost || isPointsLocked}
                        onClick={() => handleScoreChange(team.id, currentQuestionValue ?? 0)}
                      >
                        +{currentQuestionValue ?? 0}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        disabled={!isHost || isPointsLocked}
                        onClick={() => handleScoreChange(team.id, -(currentQuestionValue ?? 0))}
                      >
                        -{currentQuestionValue ?? 0}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
