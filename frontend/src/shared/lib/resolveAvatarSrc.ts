import { config } from '../config';

/** Полный URL для `<img src>`: внешние ссылки, blob/data или файлы с API */
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
