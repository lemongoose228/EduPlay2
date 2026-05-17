/** Коды возраста: 2 — «до 3», 3…25, 26 — «25+» */
export const GAME_AGE_CODE_MIN = 2;
export const GAME_AGE_CODE_MAX = 26;

export function formatGameAgeCode(value: number): string {
  if (value <= GAME_AGE_CODE_MIN) return 'до 3';
  if (value >= GAME_AGE_CODE_MAX) return '25+';
  return String(value);
}

export function formatGameAgeRange(ageFrom: number | null | undefined, ageTo: number | null | undefined): string {
  if (ageFrom == null || ageTo == null) return '';
  return `${formatGameAgeCode(ageFrom)}–${formatGameAgeCode(ageTo)}`;
}
