import type { AuthUser } from '../../features/auth/api/authApi';

/** Достаёт role из access-token (без проверки подписи — только для UI). */
export function parseRoleFromJwt(token: string | null): AuthUser['role'] | undefined {
  if (!token) return undefined;
  const parts = token.split('.');
  if (parts.length < 2) return undefined;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64));
    const r = json.role;
    if (r === 'admin' || r === 'super_admin' || r === 'user') return r;
  } catch {
    return undefined;
  }
  return undefined;
}
