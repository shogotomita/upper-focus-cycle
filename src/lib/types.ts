export type Muscle =
  | "chest"
  | "shoulders"
  | "traps"
  | "biceps"
  | "triceps"
  | "back"
  | "posterior"
  | "quads";

export type Phase = "mav" | "build" | "mrv" | "deload";

export type DayId = "A" | "B" | "C" | "D" | "E";

export type LiftId = "bench" | "squat" | "deadlift" | "ohp";

export type OneRMs = Record<LiftId, number> & { bodyweight: number };

export type BlockId = 1 | 2 | 3 | 4;

export interface BlockMeta {
  id: BlockId;
  name: string;
  subtitle: string;
  weeks: [number, number];
  focus: string;
}

export interface Prescription {
  sets: number;
  reps: string;
  weightKg: number;
  percent1RM: number | null;
  rpe: number;
  restSec: number;
  displayWeight: string;
}

export interface ProgramRow {
  id: string;
  week: number;
  block: BlockId;
  blockName: string;
  phase: Phase;
  phaseLabel: string;
  dayId: DayId;
  dayName: string;
  weekday: string;
  session: string;
  order: number;
  exercise: string;
  isMain: boolean;
  liftId: LiftId | null;
  sets: number;
  reps: string;
  weightKg: number;
  displayWeight: string;
  percent1RM: number | null;
  rpe: number;
  restSec: string;
  muscles: Muscle[];
  muscleLabel: string;
  notes: string;
  bjjNote: string;
}

export interface WeeklyVolume {
  week: number;
  phase: Phase;
  phaseLabel: string;
  block: BlockId;
  blockName: string;
  sets: Record<Muscle, number>;
  flags: Record<Muscle, VolumeFlag>;
}

export type VolumeFlag =
  | "below-mev"
  | "mev-to-mav"
  | "above-mav"
  | "at-mrv"
  | "deload";
