import {
  getSessionRetentionCutoffDate,
  getSessionRetentionDays,
  SESSION_EXPIRED_WHERE,
  SESSION_WITHIN_RETENTION_WHERE,
} from './session-retention.util';

describe('session-retention.util', () => {
  const originalEnv = process.env.SESSION_RETENTION_DAYS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SESSION_RETENTION_DAYS;
    } else {
      process.env.SESSION_RETENTION_DAYS = originalEnv;
    }
  });

  it('defaults retention to 90 days', () => {
    delete process.env.SESSION_RETENTION_DAYS;
    expect(getSessionRetentionDays()).toBe(90);
  });

  it('reads retention days from env', () => {
    process.env.SESSION_RETENTION_DAYS = '30';
    expect(getSessionRetentionDays()).toBe(30);
  });

  it('falls back to 90 for invalid env', () => {
    process.env.SESSION_RETENTION_DAYS = 'abc';
    expect(getSessionRetentionDays()).toBe(90);
  });

  it('computes cutoff 90 days before now', () => {
    delete process.env.SESSION_RETENTION_DAYS;
    const now = new Date('2026-05-21T12:00:00.000Z');
    const cutoff = getSessionRetentionCutoffDate(now);
    expect(cutoff.toISOString()).toBe('2026-02-20T12:00:00.000Z');
  });

  it('expired SQL matches finished sessions by finishedAt (no alias)', () => {
    expect(SESSION_EXPIRED_WHERE).toContain('"finishedAt"');
    expect(SESSION_EXPIRED_WHERE).toContain('"createdAt"');
    expect(SESSION_EXPIRED_WHERE).not.toContain('session.');
  });

  it('within-retention SQL is the complement condition', () => {
    expect(SESSION_WITHIN_RETENTION_WHERE).toContain('>=');
    expect(SESSION_WITHIN_RETENTION_WHERE).toContain('"finishedAt"');
  });

  it('finished 91 days ago is expired; 10 days ago is within retention', () => {
    delete process.env.SESSION_RETENTION_DAYS;
    const now = new Date('2026-05-21T12:00:00.000Z');
    const cutoff = getSessionRetentionCutoffDate(now);

    const finishedOld = new Date('2026-01-01T12:00:00.000Z');
    const finishedRecent = new Date('2026-05-11T12:00:00.000Z');
    expect(finishedOld < cutoff).toBe(true);
    expect(finishedRecent >= cutoff).toBe(true);
  });

  it('waiting session 91 days old by createdAt is expired', () => {
    delete process.env.SESSION_RETENTION_DAYS;
    const now = new Date('2026-05-21T12:00:00.000Z');
    const cutoff = getSessionRetentionCutoffDate(now);

    const createdOld = new Date('2026-01-01T12:00:00.000Z');
    expect(createdOld < cutoff).toBe(true);
  });
});
