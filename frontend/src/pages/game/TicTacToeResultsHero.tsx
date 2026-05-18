import React from 'react';
import { FaTrophy } from 'react-icons/fa';
import { TeamSymbol } from './components/TeamSymbol';
import type { TicTacToeSymbol } from './components/TeamSymbol';

interface Team {
  id: string;
  name: string;
}

interface TictactoeState {
  team1Id: string;
  team2Id: string;
  team1Symbol: TicTacToeSymbol;
  team2Symbol: TicTacToeSymbol;
  winnerTeamId: string | null;
  isDraw?: boolean;
}

interface TicTacToeResultsHeroProps {
  teams: Team[];
  tictactoeState?: TictactoeState | null;
}

export const TicTacToeResultsHero: React.FC<TicTacToeResultsHeroProps> = ({
  teams,
  tictactoeState,
}) => {
  const symbolFor = (teamId: string) => {
    if (!tictactoeState) return null;
    if (teamId === tictactoeState.team1Id) return tictactoeState.team1Symbol;
    if (teamId === tictactoeState.team2Id) return tictactoeState.team2Symbol;
    return null;
  };

  const winner =
    tictactoeState?.winnerTeamId && !tictactoeState.isDraw
      ? teams.find((t) => t.id === tictactoeState.winnerTeamId)
      : null;

  return (
    <div className="tictactoe-results-hero">
      {tictactoeState?.isDraw ? (
        <>
          <p className="tictactoe-results-label">Ничья</p>
          <p className="tictactoe-results-subtitle">Обе команды сыграли вничью</p>
          <div className="tictactoe-results-teams">
            {teams.map((team) => {
              const symbol = symbolFor(team.id);
              return (
                <div key={team.id} className="tictactoe-results-team-card">
                  {symbol && <TeamSymbol symbol={symbol} size={48} />}
                  <span className="tictactoe-results-team-name">{team.name}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : winner ? (
        <>
          <FaTrophy className="tictactoe-results-trophy" aria-hidden />
          <p className="tictactoe-results-label">Победитель</p>
          <div className="tictactoe-results-winner-card">
            {symbolFor(winner.id) && <TeamSymbol symbol={symbolFor(winner.id)!} size={64} />}
            <span className="tictactoe-results-winner-name">{winner.name}</span>
          </div>
        </>
      ) : (
        <p className="tictactoe-results-subtitle">Игра завершена</p>
      )}
    </div>
  );
};
