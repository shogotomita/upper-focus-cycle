/** Round to the nearest 2.5 kg plate increment. */
export function roundTo2p5(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  return Math.round(kg / 2.5) * 2.5;
}

export function formatKg(kg: number): string {
  if (!Number.isFinite(kg)) return "—";
  const rounded = roundTo2p5(kg);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Epley: estimated 1RM from a set taken near failure. */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return roundTo2p5(weight * (1 + reps / 30));
}

export function percentOf(rm: number, pct: number): number {
  return roundTo2p5(rm * pct);
}

export function workingWeekIndex(week: number): number {
  const block = Math.ceil(week / 4);
  const pos = ((week - 1) % 4) + 1;
  if (pos === 4) return (block - 1) * 3 + 2;
  return (block - 1) * 3 + (pos - 1);
}

/**
 * Accessory loads climb inside a 4-week block, then only +2.5 kg per new block.
 * Linear +2.5 kg every working week across 16 weeks overshoots assistance lifts.
 */
export function accessoryLoad(
  baseKg: number,
  week: number,
  stepKg = 2.5,
): number {
  const pos = ((week - 1) % 4) + 1;
  const block = Math.ceil(week / 4);
  const workPos = pos === 4 ? 2 : pos - 1;
  const load = roundTo2p5(baseKg + stepKg * workPos + 2.5 * (block - 1));
  if (pos === 4) {
    return roundTo2p5(load * 0.85);
  }
  return load;
}
