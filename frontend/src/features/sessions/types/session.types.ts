import type { Game } from '../../games/types/game.types';

export type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished';

export interface Team {
  id: string;
  name: string;
  players: Player[];
  score: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export interface GameSession {
  id: string;
  gameId: string;
  game?: Game;
  inviteCode: string;
  status: SessionStatus;
  teams: Team[];
  currentQuestion?: number;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  hostId: string;
  settings: SessionSettings;
}

export interface SessionSettings {
  maxTeams: number;
  maxPlayersPerTeam: number;
  timePerQuestion: number;
  allowNegativeScores: boolean;
}

export interface CreateSessionDto {
  gameId: string;
  settings: Partial<SessionSettings>;
}

export interface SessionResult {
  sessionId: string;
  gameId: string;
  teams: Team[];
  duration: number;
  finishedAt: string;
}

export const mockSessions: GameSession[] = [
  {
    id: '1',
    gameId: '1',
    inviteCode: 'ABC123',
    status: 'active',
    teams: [
      {
        id: 'team1',
        name: 'Команда А',
        players: [
          { id: 'p1', name: 'Игрок 1', isHost: true },
          { id: 'p2', name: 'Игрок 2', isHost: false }
        ],
        score: 1500
      },
      {
        id: 'team2',
        name: 'Команда Б',
        players: [
          { id: 'p3', name: 'Игрок 3', isHost: false }
        ],
        score: 1200
      }
    ],
    startedAt: '2024-01-25T15:30:00Z',
    createdAt: '2024-01-25T15:00:00Z',
    hostId: 'p1',
    settings: {
      maxTeams: 8,
      maxPlayersPerTeam: 4,
      timePerQuestion: 30,
      allowNegativeScores: true
    }
  },
  {
    id: '2',
    gameId: '2',
    inviteCode: 'XYZ789',
    status: 'waiting',
    teams: [
      {
        id: 'team3',
        name: 'Команда В',
        players: [
          { id: 'p4', name: 'Игрок 4', isHost: true }
        ],
        score: 0
      }
    ],
    createdAt: '2024-01-25T16:00:00Z',
    hostId: 'p4',
    settings: {
      maxTeams: 6,
      maxPlayersPerTeam: 3,
      timePerQuestion: 20,
      allowNegativeScores: false
    }
  }
];