import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Input/Input';
import { QuestionContent } from './QuestionContent';
import {
  getSessionsSocket,
  waitForSessionsSocketConnected,
} from '../../features/sessions/api/sessionsSocket';
import type { GameSession } from '../../features/sessions/types/session.types';
import { useDialogs } from '../../shared/ui/DialogProvider';
import './GamePage.css';
import './QuizGamePage.css';

interface QuizReview {
  categoryId: string;
  questionId: string;
  questionText: string;
  correctAnswer: string;
  value: number;
}

export interface QuizGamePageProps {
  session: GameSession;
  isHost: boolean;
  userId?: string;
  myTeamId?: string;
  showInviteCode: boolean;
  onSessionUpdate: React.Dispatch<React.SetStateAction<GameSession | null>>;
}

const getQuestionTimerStorageKey = (sessionValue: GameSession) =>
  `quiz:startAt:${sessionValue.id}:${
    sessionValue.startedAt ? new Date(sessionValue.startedAt).getTime() : 'nostart'
  }:${sessionValue.currentQuestionIndex ?? 0}`;

export const QuizGamePage: React.FC<QuizGamePageProps> = ({
  session,
  isHost,
  userId,
  myTeamId,
  showInviteCode,
  onSessionUpdate,
}) => {
  const { showAlert } = useDialogs();
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizAnswerDraft, setQuizAnswerDraft] = useState('');
  const [quizReview, setQuizReview] = useState<QuizReview | null>(null);
  const [submittedLocks, setSubmittedLocks] = useState<string[]>([]);
  const [submitSavedKey, setSubmitSavedKey] = useState<string | null>(null);
  const quizReviewTimeoutRef = useRef<number | null>(null);
  const quizQuestionStartedAtRef = useRef<{ key: string; startedAtMs: number } | null>(null);

  useEffect(() => {
    const socket = getSessionsSocket();
    const handleRevealed = (payload: {
      categoryId: string;
      questionId: string;
      questionText: string;
      correctAnswer: string;
      value: number;
      reason?: 'manual' | 'timer';
    }) => {
      if (payload.reason === 'timer') {
        setQuizReview(null);
        setQuizAnswerDraft('');
        return;
      }
      setQuizReview({
        categoryId: payload.categoryId,
        questionId: payload.questionId,
        questionText: payload.questionText,
        correctAnswer: payload.correctAnswer,
        value: payload.value,
      });
      if (quizReviewTimeoutRef.current) {
        window.clearTimeout(quizReviewTimeoutRef.current);
      }
      quizReviewTimeoutRef.current = window.setTimeout(() => {
        setQuizReview(null);
        setQuizAnswerDraft('');
      }, 1500);
    };

    socket.on('quiz:revealed', handleRevealed);

    return () => {
      socket.off('quiz:revealed', handleRevealed);
      if (quizReviewTimeoutRef.current) {
        window.clearTimeout(quizReviewTimeoutRef.current);
        quizReviewTimeoutRef.current = null;
      }
    };
  }, [session.id]);

  const quizQuestionRefs = useMemo(
    () =>
      session.game.categories.flatMap((cat) =>
        cat.questions.map((q) => ({
          categoryId: cat.id,
          questionId: q.id,
          category: cat,
          question: q,
        })),
      ),
    [session.game.categories],
  );

  const currentQuizIndex = session.currentQuestionIndex ?? 0;
  const currentQuizQuestionRef = quizQuestionRefs[currentQuizIndex];

  useEffect(() => {
    if (session.status !== 'active' || quizReview) {
      setTimeLeft(0);
      return;
    }
    if (!currentQuizQuestionRef) {
      setTimeLeft(0);
      return;
    }

    const key = getQuestionTimerStorageKey(session);
    const timePerQuestion = session.settings?.timePerQuestion ?? 30;
    const persisted = window.sessionStorage.getItem(key);
    const serverStartedAt = session.questionStartedAt
      ? new Date(session.questionStartedAt).getTime()
      : Number.NaN;
    const cachedStartedAt =
      quizQuestionStartedAtRef.current?.key === key
        ? quizQuestionStartedAtRef.current.startedAtMs
        : Number.NaN;

    let startedAtMs = Number.NaN;
    if (Number.isFinite(serverStartedAt)) {
      startedAtMs = serverStartedAt;
      window.sessionStorage.setItem(key, String(serverStartedAt));
    } else if (Number.isFinite(cachedStartedAt)) {
      startedAtMs = cachedStartedAt;
    } else if (persisted) {
      const parsed = Number(persisted);
      if (Number.isFinite(parsed)) {
        startedAtMs = parsed;
      }
    }

    if (!Number.isFinite(startedAtMs)) {
      startedAtMs = Date.now();
      window.sessionStorage.setItem(key, String(startedAtMs));
    }

    quizQuestionStartedAtRef.current = { key, startedAtMs };

    const recalc = () => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      setTimeLeft(Math.max(0, timePerQuestion - elapsed));
    };

    recalc();
    const interval = window.setInterval(recalc, 250);
    return () => window.clearInterval(interval);
  }, [
    session.id,
    session.status,
    session.currentQuestionIndex,
    session.questionStartedAt,
    session.settings?.timePerQuestion,
    session.startedAt,
    currentQuizQuestionRef?.categoryId,
    currentQuizQuestionRef?.questionId,
    quizReview,
  ]);

  useEffect(() => {
    setQuizAnswerDraft('');
    quizQuestionStartedAtRef.current = null;
  }, [session.id, session.currentQuestionIndex, session.status]);

  useEffect(() => {
    const key = currentQuizQuestionRef
      ? `${currentQuizQuestionRef.categoryId}:${currentQuizQuestionRef.questionId}`
      : null;
    if (submitSavedKey && key !== submitSavedKey) {
      setSubmitSavedKey(null);
    }
  }, [
    session.id,
    session.currentQuestionIndex,
    currentQuizQuestionRef?.categoryId,
    currentQuizQuestionRef?.questionId,
    submitSavedKey,
  ]);

  useEffect(() => {
    if (!userId) return;
    const serverSubmittedKeys = session.answeredQuestions
      .filter((aq) => aq.userId === userId)
      .map((aq) => `${aq.categoryId}:${aq.questionId}`);

    if (!serverSubmittedKeys.length) return;
    setSubmittedLocks((prev) => {
      const merged = new Set([...prev, ...serverSubmittedKeys]);
      return Array.from(merged);
    });
  }, [session.answeredQuestions, userId]);

  const total = quizQuestionRefs.length;
  const q = currentQuizQuestionRef;

  if (!q) {
    return (
      <div className="game-page quiz-active">
        <div className="game-header">
          <div className="game-info">
            <span className="game-title-header">{session.game.title}</span>
            {showInviteCode ? <span className="game-code">Код: {session.inviteCode}</span> : null}
          </div>
        </div>
        <div className="quiz-empty">Вопросы не найдены.</div>
      </div>
    );
  }

  const myCurrentSubmission = session.answeredQuestions.find(
    (aq) =>
      aq.userId === userId &&
      aq.categoryId === q.categoryId &&
      aq.questionId === q.questionId,
  );
  const currentQuestionKey = `${q.categoryId}:${q.questionId}`;
  const isSubmissionLocked =
    Boolean(myCurrentSubmission) || submittedLocks.includes(currentQuestionKey);

  const quizReviewIndex =
    quizReview?.questionId
      ? quizQuestionRefs.findIndex(
          (x) => x.questionId === quizReview.questionId && x.categoryId === quizReview.categoryId,
        )
      : -1;

  const correctTeamsForReview = quizReview
    ? new Set(
        session.answeredQuestions
          .filter(
            (aq) =>
              aq.categoryId === quizReview.categoryId &&
              aq.questionId === quizReview.questionId &&
              Boolean(aq.teamId) &&
              aq.isCorrect &&
              aq.scored,
          )
          .map((aq) => aq.teamId as string),
      )
    : new Set<string>();

  return (
    <div className="game-page quiz-active">
      <div className="game-header">
        <div className="game-info">
          <span className="game-title-header">{session.game.title}</span>
          {showInviteCode ? <span className="game-code">Код: {session.inviteCode}</span> : null}
        </div>
        {isHost && (
          <Button
            variant="secondary"
            size="small"
            onClick={async () => {
              try {
                const socket = await waitForSessionsSocketConnected(2000);
                socket.emit('session:finish', { sessionId: session.id });
              } catch (e) {
                console.error(e);
                await showAlert('Не удалось завершить игру');
              }
            }}
          >
            Завершить игру
          </Button>
        )}
      </div>

      <div className="quiz-content">
        <div className="quiz-meta">
          <span>
            Вопрос{' '}
            {quizReview
              ? `${Math.min(quizReviewIndex + 1, total)}/${total}`
              : `${Math.min(currentQuizIndex + 1, total)}/${total}`}
          </span>
          {!quizReview && (
            <span>
              Время: <strong>{timeLeft}s</strong>
            </span>
          )}
        </div>

        {quizReview ? (
          <div className="quiz-answer-block">
            <div className="quiz-answer">
              <strong>Правильный ответ:</strong> {quizReview.correctAnswer}
            </div>

            <div className="quiz-results">
              <div className="quiz-results-title">Результаты</div>
              {session.teams.map((team) => {
                const isCorrectTeam = correctTeamsForReview.has(team.id);
                return (
                  <div key={team.id} className="quiz-team-result">
                    <span className="quiz-team-name">{team.name}</span>
                    <span className="quiz-team-score">{team.score}</span>
                    <span className="quiz-team-correct">{isCorrectTeam ? '✅' : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="quiz-card">
            <QuestionContent
              text={q.question.question}
              imageUrl={q.question.imageUrl}
              textClassName="quiz-question"
            />

            <div className="quiz-answer-input">
              <Input
                label="Ваш ответ"
                value={quizAnswerDraft}
                onChange={(e) => setQuizAnswerDraft(e.target.value)}
                placeholder="Введите ответ"
                disabled={!myTeamId || isSubmissionLocked || timeLeft <= 0}
              />

              <Button
                variant="primary"
                disabled={
                  !myTeamId || isSubmissionLocked || timeLeft <= 0 || !quizAnswerDraft.trim()
                }
                onClick={async () => {
                  try {
                    const socket = await waitForSessionsSocketConnected(2000);
                    socket.emit('quiz:answer', {
                      sessionId: session.id,
                      categoryId: q.categoryId,
                      questionId: q.questionId,
                      answer: quizAnswerDraft,
                    });
                    setSubmittedLocks((prev) =>
                      prev.includes(currentQuestionKey) ? prev : [...prev, currentQuestionKey],
                    );
                    onSessionUpdate((prev) => {
                      if (!prev) return prev;
                      const exists = prev.answeredQuestions.some(
                        (aq) =>
                          aq.userId === userId &&
                          aq.categoryId === q.categoryId &&
                          aq.questionId === q.questionId,
                      );
                      if (exists) return prev;
                      return {
                        ...prev,
                        answeredQuestions: [
                          ...prev.answeredQuestions,
                          {
                            categoryId: q.categoryId,
                            questionId: q.questionId,
                            userId,
                            teamId: myTeamId,
                            submittedAnswer: quizAnswerDraft,
                            scored: false,
                          },
                        ],
                      };
                    });
                    setQuizAnswerDraft('');
                    setSubmitSavedKey(currentQuestionKey);
                  } catch (e) {
                    console.error(e);
                    await showAlert('Не удалось отправить ответ');
                  }
                }}
              >
                Отправить
              </Button>

              {myCurrentSubmission ? (
                <div className="quiz-submitted-note">
                  Ответ принят. Правильность будет показана по истечению времени.
                </div>
              ) : null}
              {submitSavedKey === currentQuestionKey ? (
                <div className="quiz-submitted-note">Ответ сохранён</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
