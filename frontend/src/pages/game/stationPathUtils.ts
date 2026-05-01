export interface PathPoint {
  x: number;
  y: number;
}

export interface StationPathLayout {
  points: PathPoint[];
  width: number;
  height: number;
  stepY: number;
  amplitude: number;
  paddingY: number;
}

const DEFAULTS = {
  width: 320,
  stepY: 108,
  amplitude: 52,
  paddingY: 32,
} as const;

/** Vertical centers of station nodes; zig-zag around horizontal center (Duolingo-style). */
export function getStationPathLayout(
  count: number,
  options?: Partial<{ width: number; stepY: number; amplitude: number; paddingY: number }>,
): StationPathLayout {
  const width = options?.width ?? DEFAULTS.width;
  const stepY = options?.stepY ?? DEFAULTS.stepY;
  const amplitude = options?.amplitude ?? DEFAULTS.amplitude;
  const paddingY = options?.paddingY ?? DEFAULTS.paddingY;
  const cx = width / 2;

  const points: PathPoint[] =
    count <= 0
      ? []
      : Array.from({ length: count }, (_, i) => ({
          x: cx + (i % 2 === 0 ? -amplitude : amplitude),
          y: paddingY + (i + 0.5) * stepY,
        }));

  const height = paddingY * 2 + Math.max(0, count) * stepY;

  return { points, width, height, stepY, amplitude, paddingY };
}

/** Smooth vertical S-curve between two node centers. */
export function segmentCurveD(p0: PathPoint, p1: PathPoint): string {
  const midY = (p0.y + p1.y) / 2;
  return `M ${p0.x} ${p0.y} C ${p0.x} ${midY} ${p1.x} ${midY} ${p1.x} ${p1.y}`;
}
