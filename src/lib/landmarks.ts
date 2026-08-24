import type { Muscle, Phase, VolumeFlag } from "./types";

/**
 * Weekly hard-set landmarks (Renaissance Periodization + Schoenfeld 2016–2024).
 * MAV is the upper-middle of the productive range; "exceed MAV" means strictly
 * more direct sets than this number. MRV is the target for chest / shoulders /
 * traps on the week before each deload.
 */
export const LANDMARKS: Record<
  Muscle,
  { mev: number; mav: number; mrv: number; label: string; priority: boolean }
> = {
  chest: { mev: 10, mav: 16, mrv: 24, label: "胸", priority: true },
  shoulders: { mev: 12, mav: 18, mrv: 26, label: "肩", priority: true },
  traps: { mev: 8, mav: 14, mrv: 20, label: "僧帽", priority: true },
  biceps: { mev: 8, mav: 12, mrv: 20, label: "上腕二頭", priority: false },
  triceps: { mev: 8, mav: 14, mrv: 20, label: "上腕三頭", priority: false },
  back: { mev: 8, mav: 12, mrv: 20, label: "広背・中背", priority: false },
  posterior: { mev: 6, mav: 10, mrv: 16, label: "ハム・臀・脊柱", priority: false },
  quads: { mev: 6, mav: 10, mrv: 16, label: "大腿四頭", priority: false },
};

export const MUSCLE_ORDER: Muscle[] = [
  "chest",
  "shoulders",
  "traps",
  "biceps",
  "triceps",
  "back",
  "posterior",
  "quads",
];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "胸",
  shoulders: "肩",
  traps: "僧帽",
  biceps: "二頭",
  triceps: "三頭",
  back: "背中",
  posterior: "後面",
  quads: "四頭",
};

export function flagFor(muscle: Muscle, sets: number, phase: Phase): VolumeFlag {
  if (phase === "deload") return "deload";
  const { mev, mav, mrv } = LANDMARKS[muscle];
  if (sets >= mrv) return "at-mrv";
  if (sets > mav) return "above-mav";
  if (sets >= mev) return "mev-to-mav";
  return "below-mev";
}

export const PHASE_LABEL: Record<Phase, string> = {
  mav: "MAV超",
  build: "ビルド",
  mrv: "MRV週",
  deload: "ディロード",
};

export function phaseOf(week: number): Phase {
  const pos = ((week - 1) % 4) + 1;
  if (pos === 1) return "mav";
  if (pos === 2) return "build";
  if (pos === 3) return "mrv";
  return "deload";
}
