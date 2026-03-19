import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';
import './GamePage.css';

interface Question {
  id: string;
  value: number;
  question: string;
  answer: string;
  isAnswered?: boolean;
}

interface Category {
  id: string;
  name: string;
  questions: Question[];
}

interface Team {
  id: string;
  name: string;
  score: number;
  players: { name: string }[];
}

interface GameSession {
  id: string;
  game: {
    title: string;
    categories: Category[];
  };
  teams: Team[];
  status: 'waiting' | 'active' | 'finished';
  currentQuestionIndex?: number;
  answeredQuestions: { categoryId: string; questionId: string }[];
  inviteCode: string;
}

export const GamePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<GameSession | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<{ category: Category; question: Question } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // Моковые данные для демонстрации
  useEffect(() => {
    const mockSession: GameSession = {
      id: sessionId || '1',
      game: {
        title: 'История России',
        categories: [
          {
            id: '1',
            name: 'Древняя Русь',
            questions: [
              { id: 'q1', value: 100, question: 'В каком году произошло крещение Руси?', answer: '988 год', isAnswered: false },
              { id: 'q2', value: 200, question: 'Кто был основателем династии Рюриковичей?', answer: 'Рюрик', isAnswered: false },
              { id: 'q3', value: 300, question: 'Как назывался сбор дани в Древней Руси?', answer: 'Полюдье', isAnswered: false },
              { id: 'q4', value: 400, question: 'Какой город был столицей Древней Руси до Киева?', answer: 'Новгород', isAnswered: false },
              { id: 'q5', value: 500, question: 'В каком веке была написана "Повесть временных лет"?', answer: 'XII век', isAnswered: false },
            ],
          },
          {
            id: '2',
            name: 'Российская Империя',
            questions: [
              { id: 'q6', value: 100, question: 'Кто был первым императором России?', answer: 'Петр I', isAnswered: false },
              { id: 'q7', value: 200, question: 'В каком году был основан Санкт-Петербург?', answer: '1703 год', isAnswered: false },
              { id: 'q8', value: 300, question: 'При ком произошло присоединение Крыма к Российской империи?', answer: 'Екатерина II', isAnswered: false },
              { id: 'q9', value: 400, question: 'Кто победил в Северной войне?', answer: 'Россия', isAnswered: false },
              { id: 'q10', value: 500, question: 'В каком году было отменено крепостное право?', answer: '1861 год', isAnswered: false },
            ],
          },
          {
            id: '3',
            name: 'Советский период',
            questions: [
              { id: 'q11', value: 100, question: 'В каком году произошла Октябрьская революция?', answer: '1917 год', isAnswered: false },
              { id: 'q12', value: 200, question: 'Кто был первым космонавтом?', answer: 'Юрий Гагарин', isAnswered: false },
              { id: 'q13', value: 300, question: 'В каком году началась Великая Отечественная война?', answer: '1941 год', isAnswered: false },
              { id: 'q14', value: 400, question: 'Кто был лидером СССР в период перестройки?', answer: 'Михаил Горбачев', isAnswered: false },
              { id: 'q15', value: 500, question: 'В каком году распался СССР?', answer: '1991 год', isAnswered: false },
            ],
          },
          {
            id: '4',
            name: 'Современная Россия',
            questions: [
              { id: 'q16', value: 100, question: 'Кто является действующим президентом РФ?', answer: 'Владимир Путин', isAnswered: false },
              { id: 'q17', value: 200, question: 'В каком году была принята действующая Конституция РФ?', answer: '1993 год', isAnswered: false },
              { id: 'q18', value: 300, question: 'Как называется российский парламент?', answer: 'Федеральное собрание', isAnswered: false },
              { id: 'q19', value: 400, question: 'В каком году проходили первые зимние Олимпийские игры в России?', answer: '2014 год', isAnswered: false },
              { id: 'q20', value: 500, question: 'Какой город стал столицей в 1918 году?', answer: 'Москва', isAnswered: false },
            ],
          },
        ],
      },
      teams: [
        { id: 't1', name: 'Команда А', score: 0, players: [{ name: 'Игрок 1' }, { name: 'Игрок 2' }] },
        { id: 't2', name: 'Команда Б', score: 0, players: [{ name: 'Игрок 3' }] },
      ],
      status: 'active',
      answeredQuestions: [],
      inviteCode: 'ABC123',
    };
    
    setSession(mockSession);
    setIsHost(true);
  }, [sessionId]);

  const handleQuestionClick = (category: Category, question: Question) => {
    if (question.isAnswered) return;
    setSelectedQuestion({ category, question });
    setShowAnswer(false);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleCloseQuestion = () => {
    if (selectedQuestion && session) {
      // Отмечаем вопрос как отвеченный
      const updatedSession = { ...session };
      const category = updatedSession.game.categories.find(c => c.id === selectedQuestion.category.id);
      const question = category?.questions.find(q => q.id === selectedQuestion.question.id);
      if (question) {
        question.isAnswered = true;
      }
      updatedSession.answeredQuestions.push({
        categoryId: selectedQuestion.category.id,
        questionId: selectedQuestion.question.id,
      });
      setSession(updatedSession);
    }
    setSelectedQuestion(null);
    setShowAnswer(false);
  };

  const handleAddScore = (teamId: string, points: number) => {
    if (!session) return;
    
    const updatedTeams = session.teams.map(team =>
      team.id === teamId ? { ...team, score: team.score + points } : team
    );
    setSession({ ...session, teams: updatedTeams });
  };

  const handleSubtractScore = (teamId: string, points: number) => {
    if (!session) return;
    
    const updatedTeams = session.teams.map(team =>
      team.id === teamId ? { ...team, score: team.score - points } : team
    );
    setSession({ ...session, teams: updatedTeams });
  };

  if (!session) {
    return <div className="loading">Загрузка...</div>;
  }

  if (session.status === 'waiting') {
    return (
      <div className="game-page lobby">
        <div className="game-container">
          <h1 className="game-title">{session.game.title}</h1>
          <div className="session-info">
            <p>Код приглашения: <strong>{session.inviteCode}</strong></p>
          </div>

          <div className="teams-section">
            <h2>Команды ({session.teams.length})</h2>
            <div className="teams-list">
              {session.teams.map((team) => (
                <div key={team.id} className="team-item">
                  <span className="team-name">{team.name}</span>
                  <span className="team-players">
                    👥 {team.players.length} {team.players.length === 1 ? 'игрок' : 'игроков'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="game-actions">
              <Button variant="primary" size="large">
                Начать игру
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="game-page active">
      <div className="game-header">
        <div className="game-info">
          <span className="game-title-header">{session.game.title}</span>
          <span className="game-code">Код: {session.inviteCode}</span>
        </div>
        {isHost && (
          <Button variant="secondary" size="small">
            Завершить игру
          </Button>
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
              {[0, 1, 2, 3, 4].map((rowIndex) => (
                <tr key={rowIndex}>
                  {session.game.categories.map((category) => {
                    const question = category.questions[rowIndex];
                    const isAnswered = question?.isAnswered;
                    
                    return (
                      <td key={category.id} className="question-cell">
                        {question && (
                          <button
                            className={`question-button ${isAnswered ? 'answered' : ''}`}
                            onClick={() => handleQuestionClick(category, question)}
                            disabled={isAnswered}
                          >
                            {question.value}
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
                {isHost && (
                  <div className="score-actions">
                    <Button
                      variant="success"
                      size="small"
                      onClick={() => handleAddScore(team.id, selectedQuestion?.question.value || 100)}
                    >
                      +{selectedQuestion?.question.value || 100}
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleSubtractScore(team.id, selectedQuestion?.question.value || 100)}
                    >
                      -{selectedQuestion?.question.value || 100}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedQuestion}
        onClose={handleCloseQuestion}
        title={selectedQuestion?.category.name || ''}
        size="large"
        footer={
          <>
            {!showAnswer ? (
              <Button onClick={handleShowAnswer}>
                Показать ответ
              </Button>
            ) : (
              <Button onClick={handleCloseQuestion}>
                Закрыть вопрос
              </Button>
            )}
          </>
        }
      >
        {selectedQuestion && (
          <div className="question-modal">
            <div className="question-value">{selectedQuestion.question.value}</div>
            <div className="question-text">
              {selectedQuestion.question.question}
            </div>
            {showAnswer && (
              <div className="question-answer">
                <strong>Ответ:</strong> {selectedQuestion.question.answer}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};