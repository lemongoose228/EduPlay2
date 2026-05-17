import React from 'react';
import { AgeRangeSlider } from '../../../shared/ui/AgeRangeSlider/AgeRangeSlider';
import './GameAgeCategoryCard.css';

export type GameAgeCategoryCardProps = {
  anyAgeAudience: boolean;
  ageMin: number;
  ageMax: number;
  onAnyAgeChange: (value: boolean) => void;
  onRangeChange: (min: number, max: number) => void;
};

export const GameAgeCategoryCard: React.FC<GameAgeCategoryCardProps> = ({
  anyAgeAudience,
  ageMin,
  ageMax,
  onAnyAgeChange,
  onRangeChange,
}) => {
  return (
    <section className="builder-age-panel" aria-labelledby="builder-age-title">
      <p id="builder-age-title" className="builder-age-panel__title">
        Возрастная категория
      </p>
      <label className="builder-age-panel__any">
        <input
          type="checkbox"
          checked={anyAgeAudience}
          onChange={(e) => onAnyAgeChange(e.target.checked)}
        />
        <span>Для любого возраста</span>
      </label>
      {!anyAgeAudience && (
        <div className="builder-age-panel__slider">
          <AgeRangeSlider
            id="builder-age"
            valueMin={ageMin}
            valueMax={ageMax}
            onChange={onRangeChange}
          />
        </div>
      )}
    </section>
  );
};
