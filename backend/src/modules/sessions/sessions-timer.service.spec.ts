import { SessionsTimerService } from './sessions-timer.service';

describe('SessionsTimerService', () => {
  const service = new SessionsTimerService({} as any);

  it('builds expected quiz timer key', () => {
    expect(service.buildQuizTimerKey('session-1', 2)).toBe('quiz:timer:session-1:2');
  });

  it('parses quiz timer key', () => {
    expect(service.parseQuizTimerKey('quiz:timer:session-1:7')).toEqual({
      sessionId: 'session-1',
      questionIndex: 7,
    });
  });

  it('ignores foreign keys', () => {
    expect(service.parseQuizTimerKey('other:key')).toBeNull();
  });
});
