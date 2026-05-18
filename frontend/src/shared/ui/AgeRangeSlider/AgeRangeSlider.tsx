import React, { useCallback, useState } from 'react';
import { formatGameAgeCode, GAME_AGE_CODE_MAX, GAME_AGE_CODE_MIN } from '../../lib/gameAgeConstants';
import './AgeRangeSlider.css';

export type AgeRangeSliderProps = {
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  id?: string;
  className?: string;
  variant?: 'default' | 'compact';
};

export const AgeRangeSlider: React.FC<AgeRangeSliderProps> = ({
  valueMin,
  valueMax,
  onChange,
  id = 'age-range',
  className = '',
  variant = 'default',
}) => {
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

  const span = GAME_AGE_CODE_MAX - GAME_AGE_CODE_MIN;
  const pct = (v: number) => ((v - GAME_AGE_CODE_MIN) / span) * 100;
  const leftPct = pct(valueMin);
  const rightPct = pct(valueMax);

  const handleMinChange = useCallback(
    (raw: number) => {
      const next = Math.min(raw, valueMax);
      onChange(next, valueMax);
    },
    [onChange, valueMax],
  );

  const handleMaxChange = useCallback(
    (raw: number) => {
      const next = Math.max(raw, valueMin);
      onChange(valueMin, next);
    },
    [onChange, valueMin],
  );

  const zMin = activeThumb === 'min' ? 4 : activeThumb === 'max' ? 2 : 3;
  const zMax = activeThumb === 'max' ? 4 : activeThumb === 'min' ? 2 : 3;

  const rootClass = [
    'age-range-slider',
    variant === 'compact' ? 'age-range-slider--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <div className="age-range-slider__meta" aria-hidden>
        <span className="age-range-slider__hint age-range-slider__hint--edge">до 3</span>
        <span className="age-range-slider__selection">
          от <strong>{formatGameAgeCode(valueMin)}</strong>
          <span className="age-range-slider__sep">—</span>
          до <strong>{formatGameAgeCode(valueMax)}</strong>
        </span>
        <span className="age-range-slider__hint age-range-slider__hint--edge">25+</span>
      </div>
      <div className="age-range-slider__track-wrap">
        <div className="age-range-slider__track" aria-hidden>
          <div
            className="age-range-slider__active"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(0, rightPct - leftPct)}%`,
            }}
          />
        </div>
        <input
          id={`${id}-min`}
          type="range"
          className="age-range-slider__input age-range-slider__input--min"
          style={{ zIndex: zMin }}
          min={GAME_AGE_CODE_MIN}
          max={GAME_AGE_CODE_MAX}
          step={1}
          value={valueMin}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          onMouseDown={() => setActiveThumb('min')}
          onTouchStart={() => setActiveThumb('min')}
          onMouseUp={() => setActiveThumb(null)}
          onTouchEnd={() => setActiveThumb(null)}
          aria-label="Возраст от"
        />
        <input
          id={`${id}-max`}
          type="range"
          className="age-range-slider__input age-range-slider__input--max"
          style={{ zIndex: zMax }}
          min={GAME_AGE_CODE_MIN}
          max={GAME_AGE_CODE_MAX}
          step={1}
          value={valueMax}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          onMouseDown={() => setActiveThumb('max')}
          onTouchStart={() => setActiveThumb('max')}
          onMouseUp={() => setActiveThumb(null)}
          onTouchEnd={() => setActiveThumb(null)}
          aria-label="Возраст до"
        />
      </div>
    </div>
  );
};
