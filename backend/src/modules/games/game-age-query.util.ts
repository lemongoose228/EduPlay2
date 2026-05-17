import { Brackets, SelectQueryBuilder } from 'typeorm';
import { Game } from './entities/game.entity';

export const GAME_AGE_SCALE_MIN = 2;
export const GAME_AGE_PLUS_CODE = 26;
const AGE_FILTER_UPPER_SENTINEL = 999999;

export function applyGameAgeOverlapFilter(
  queryBuilder: SelectQueryBuilder<Game>,
  tableAlias: string,
  qAgeFrom: number,
  qAgeTo: number,
): void {
  const ageFromCol = `CAST(${tableAlias}."ageFrom" AS integer)`;
  const ageToCol = `CAST(${tableAlias}."ageTo" AS integer)`;

  queryBuilder.andWhere(
    new Brackets((qb) => {
      qb.where(`(${tableAlias}."ageFrom" IS NULL AND ${tableAlias}."ageTo" IS NULL)`).orWhere(
        new Brackets((inner) => {
          inner
            .where(`${tableAlias}."ageFrom" IS NOT NULL`)
            .andWhere(`${tableAlias}."ageTo" IS NOT NULL`)
            .andWhere(
              `GREATEST(CAST(:ageQFrom AS integer), ${ageFromCol}) <= LEAST(` +
                `CASE WHEN CAST(:ageQTo AS integer) >= CAST(:agePlus AS integer) THEN CAST(:ageCap AS integer) ELSE CAST(:ageQTo AS integer) END, ` +
                `CASE WHEN ${ageToCol} >= CAST(:agePlus AS integer) THEN CAST(:ageCap AS integer) ELSE ${ageToCol} END` +
                `)`,
            );
        }),
      );
    }),
  );
  queryBuilder.setParameter('ageQFrom', qAgeFrom);
  queryBuilder.setParameter('ageQTo', qAgeTo);
  queryBuilder.setParameter('agePlus', GAME_AGE_PLUS_CODE);
  queryBuilder.setParameter('ageCap', AGE_FILTER_UPPER_SENTINEL);
}
