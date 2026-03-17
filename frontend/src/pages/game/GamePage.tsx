import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../shared/ui/Button/Button';
import './GamePage.css';

interface Team {
  id: string;
  name: string;
  score: number;
}

export const GamePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'Команда А', score: 0 },
    { id: '2', name: 'Команда Б', score: 0 },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [questionValue, setQuestionValue] = useState(200);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleStartGame = () => {
    setIsGameStarted(true);
  };

  const handleAddScore = (teamId: string) => {
    setTeams(teams.map(team =>
      team.id === teamId ? { ...team, score: team.score + questionValue } : team
    ));
  };

  const handleSubtractScore = (teamId: string) => {
    setTeams(teams.map(team =>
      team.id === teamId ? { ...team, score: team.score - questionValue } : team
    ));
  };

  if (!isGameStarted) {
    return (
      <div className="game-page lobby">
        <div className="game-container">
          <h1 className="game-title">Игровая сессия</h1>
          <div className="session-info">
            <p>Код приглашения: <strong>ABC123</strong></p>
            <p>Игра: История России</p>
          </div>

          <div className="teams-section">
            <h2>Команды</h2>
            <div className="teams-list">
              {teams.map((team) => (
                <div key={team.id} className="team-item">
                  <span className="team-name">{team.name}</span>
                  <span className="team-players">👥 2 игрока</span>
                </div>
              ))}
            </div>
          </div>

          <div className="game-actions">
            <Button variant="primary" size="large" onClick={handleStartGame}>
              Начать игру
            </Button>
            <Button variant="outline" size="large">
              Пригласить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page active">
      <div className="game-header">
        <div className="game-info">
          <span className="game-code">Код: ABC123</span>
          <span className="game-question">Вопрос {currentQuestion}/25</span>
        </div>
        <div className="game-controls">
          <Button variant="secondary" size="small">Пауза</Button>
        </div>
      </div>

      <div className="game-content">
        <div className="question-container">
          <div className="question-value">{questionValue}</div>
          <div className="question-text">
            В каком году произошло крещение Руси?
          </div>
          <div className="question-answer hidden">
            Ответ: 988 год
          </div>
        </div>

        <div className="teams-scoreboard">
          <h3>Счет команд</h3>
          {teams.map((team) => (
            <div key={team.id} className="scoreboard-row">
              <span className="team-name">{team.name}</span>
              <span className="team-score">{team.score}</span>
              <div className="score-actions">
                <Button 
                  variant="success" 
                  size="small"
                  onClick={() => handleAddScore(team.id)}
                >
                  +{questionValue}
                </Button>
                <Button 
                  variant="danger" 
                  size="small"
                  onClick={() => handleSubtractScore(team.id)}
                >
                  -{questionValue}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-footer">
        <Button variant="primary">Подтвердить ответ</Button>
        <Button variant="outline">Следующий вопрос</Button>
      </div>
    </div>
  );
};