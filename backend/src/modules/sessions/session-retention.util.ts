const DEFAULT_RETENTION_DAYS = 90;

export function getSessionRetentionDays(): number {
  const raw = process.env.SESSION_RETENTION_DAYS;
  if (raw == null || raw.trim() === '') {
    return DEFAULT_RETENTION_DAYS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RETENTION_DAYS;
  }
  return parsed;
}

export function getSessionRetentionCutoffDate(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - getSessionRetentionDays());
  return cutoff;
}

/** SQL fragment for DELETE (no table alias). */
export const SESSION_EXPIRED_WHERE = `(
  ("finishedAt" IS NOT NULL AND "finishedAt" < :cutoff)
  OR ("finishedAt" IS NULL AND "createdAt" < :cutoff)
)`;

/** SQL fragment for sessions still within retention (alias: session). */
export const SESSION_WITHIN_RETENTION_WHERE = `(
  (session."finishedAt" IS NOT NULL AND session."finishedAt" >= :cutoff)
  OR (session."finishedAt" IS NULL AND session."createdAt" >= :cutoff)
)`;
