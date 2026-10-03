/**
 * Round axis ticks from 0 up to at least `max`: steps of 1, 2, 2.5 or 5 times
 * a power of ten, about `count` intervals. 3,000 -> 0, 1,000, 2,000, 3,000.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ??
    10 * magnitude;
  const top = Math.ceil(max / step - 1e-9) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) =>
    Number((i * step).toPrecision(12)),
  );
}
