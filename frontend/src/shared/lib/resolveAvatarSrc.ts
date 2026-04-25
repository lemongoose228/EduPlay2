import { config } from '../config';

export function resolveAvatarSrc(
  avatar: string | null | undefined,
): string | undefined {
  if (!avatar) return undefined;
  if (
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('data:') ||
    avatar.startsWith('blob:')
  ) {
    return avatar;
  }
  if (avatar.startsWith('/')) {
    return `${config.apiOrigin}${avatar}`;
  }
  return avatar;
}
