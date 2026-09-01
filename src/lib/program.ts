import {
  LANDMARKS as LANDMARKS,
  MUSCLE_LABEL as MUSCLE_LABEL,
  MUSCLE_ORDER as MUSCLE_ORDER,
  PHASE_LABEL as PHASE_LABEL,
  flagFor as flagFor,
  phaseOf as phaseOf,
} from "./landmarks";
import {
  accessoryLoad as accessoryLoad,
  formatKg as formatKg,
  percentOf as percentOf,
  roundTo2p5 as roundTo2p5,
} from "./rm";
import type {
  BlockId,
  BlockMeta,
  DayId,
  LiftId,
  Muscle,
  OneRMs as OneRMs,
  Phase,
  ProgramRow as ProgramRow,
  WeeklyVolume as WeeklyVolume,
} from "./types";

export const TOTAL_WEEKS = 16;

export const DEFAULT_RMS: OneRMs = {
  bench: 125,
  squat: 175,
  deadlift: 175,
  ohp: 60,
  bodyweight: 74,
};

export const BLOCKS: BlockMeta[] = [
  {
    id: 1,
    name: "肥大蓄積",
    subtitle: "肩・僧帽・胸のセット数を積み、デッドはポーズで位置を固める",
    weeks: [1, 4],
    focus:
      "8〜12レップ中心。メインも肥大域。デッド＝スクワットのズレを、膝下ポーズと上背で修正する。",
  },
  {
    id: 2,
    name: "筋力×肥大",
    subtitle: "メインを5〜8レップへ上げつつ、優先部位のボリュームは維持",
    weeks: [5, 8],
    focus:
      "ベンチとデッドを中重量で慣らす。補助は肥大のまま。金曜はBJJ用に腕の密度を上げる。",
  },
  {
    id: 3,
    name: "筋力特化",
    subtitle: "3〜5レップで特異的強度。肥大は補助種目でMAV超を維持",
    weeks: [9, 12],
    focus:
      "デッドの3レップ、ベンチの4〜5レップ。肩胸僧帽はレップ数を落とさずセットで稼ぐ。",
  },
  {
    id: 4,
    name: "ピーク",
    subtitle: "デッドとベンチを単発〜2レップへ。15週に優先部位MRV、16週ディロード",
    weeks: [13, 16],
    focus: "重いシングルは火曜デッド。金曜は軽くして土日の回復とBJJを守る。16週後に1RMテスト可。",
  },
];

export const DAYS: Record<
  DayId,
  { weekday: string; weekdayShort: string; session: string; dayName: string }
> = {
  A: {
    weekday: "月",
    weekdayShort: "月",
    session: "ベンチ＋フロントスクワット＋胸",
    dayName: "Day A",
  },
  B: {
    weekday: "火",
    weekdayShort: "火",
    session: "デッド＋背中・僧帽",
    dayName: "Day B",
  },
  C: {
    weekday: "水",
    weekdayShort: "水",
    session: "OHP＋腕・肩",
    dayName: "Day C",
  },
  D: {
    weekday: "木",
    weekdayShort: "木",
    session: "スクワット＋後面＋肩・胸",
    dayName: "Day D",
  },
  E: {
    weekday: "金",
    weekdayShort: "金",
    session: "胸・腕のBJJポンプ",
    dayName: "Day E",
  },
};

export const DAY_ORDER: DayId[] = ["A", "B", "C", "D", "E"];

export const REST_DAYS = [
  {
    weekday: "土",
    label: "完全休養",
    note: "リフトもBJJも入れない。歩行と食事・睡眠だけ。日曜のロールに神経系を残す。",
  },
  {
    weekday: "日",
    label: "BJJ（トレなし）",
    note: "ウエイトは禁止。ロールは通常通り。試合週はドリル中心でもよい。",
  },
] as const;

export function blockOf(week: number): BlockMeta {
  return BLOCKS[Math.min(3, Math.floor((week - 1) / 4))];
}

function rpeFor(phase: Phase, isMain: boolean): number {
  if (phase === "deload") return isMain ? 5 : 6;
  if (phase === "mrv") return isMain ? 8.5 : 9;
  if (phase === "build") return isMain ? 8 : 8.5;
  return isMain ? 7.5 : 8;
}

function restLabel(sec: number): string {
  if (sec >= 180) return `${sec / 60}分`;
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}分${s}秒` : `${m}分`;
  }
  return `${sec}秒`;
}

function muscleLabel(muscles: Muscle[]): string {
  return muscles.map((m) => MUSCLE_LABEL[m]).join("・");
}

function addedPullupKg(week: number): number {
  const block = blockOf(week).id;
  const phase = phaseOf(week);
  if (phase === "deload") return 0;
  if (block === 1) return 0;
  if (block === 2) return 2.5;
  if (block === 3) return 5;
  return 7.5;
}

function bwDisplay(
  bodyweight: number,
  added: number,
): { kg: number; display: string } {
  const kg = roundTo2p5(bodyweight + added);
  if (added <= 0) return { kg, display: "自重" };
  return { kg, display: `自重+${formatKg(added)}` };
}

function lateralKg(week: number): number {
  const phase = phaseOf(week);
  if (phase === "deload") return 5;
  const block = blockOf(week).id;
  if (block === 1) return week === 3 ? 10 : 7.5;
  if (block === 2) return 10;
  if (block === 3) return week === 11 ? 12.5 : 10;
  return 12.5;
}

function rearKg(week: number): number {
  return phaseOf(week) === "deload" ? 2.5 : 5;
}

function frontKg(week: number): number {
  return phaseOf(week) === "deload" ? 5 : 7.5;
}

type MainSpec = {
  name: string;
  sets: number;
  reps: string;
  pct: number;
  variantNote: string;
};

function benchMain(week: number): MainSpec {
  const table: Record<number, MainSpec> = {
    1: { name: "ベンチプレス", sets: 4, reps: "8", pct: 0.675, variantNote: "2レップ余裕。肩甲骨をベンチに固定。" },
    2: { name: "ベンチプレス", sets: 4, reps: "8", pct: 0.7, variantNote: "トップまで伸ばし切る。手首は縦。" },
    3: { name: "ベンチプレス", sets: 5, reps: "6", pct: 0.75, variantNote: "MRV週。フォームが崩れたらそのセットで終了。" },
    4: { name: "ベンチプレス", sets: 2, reps: "5", pct: 0.6, variantNote: "ディロード。楽に動かす。" },
    5: { name: "ベンチプレス", sets: 4, reps: "6", pct: 0.75, variantNote: "脚ドライブを使う。軌道は下胸。" },
    6: { name: "ベンチプレス", sets: 4, reps: "6", pct: 0.775, variantNote: "バーをレールに乗せる意識。" },
    7: { name: "ベンチプレス", sets: 5, reps: "5", pct: 0.8, variantNote: "MRV週。補助者なしなら最後は1レップ残す。" },
    8: { name: "ベンチプレス", sets: 2, reps: "5", pct: 0.625, variantNote: "ディロード。" },
    9: { name: "ベンチプレス", sets: 5, reps: "5", pct: 0.8, variantNote: "セット間3.5〜4分。" },
    10: { name: "ベンチプレス", sets: 4, reps: "4", pct: 0.85, variantNote: "レッグドライブと広背で軌道を固定。" },
    11: { name: "ベンチプレス", sets: 5, reps: "3", pct: 0.875, variantNote: "MRV週。重いが補助量は落とさない。" },
    12: { name: "ベンチプレス", sets: 2, reps: "3", pct: 0.675, variantNote: "ディロード。" },
    13: { name: "ベンチプレス", sets: 4, reps: "3", pct: 0.875, variantNote: "ピーク。毎回同じセットアップ。" },
    14: { name: "ベンチプレス", sets: 5, reps: "2", pct: 0.9, variantNote: "ダブル。尻を浮かさない。" },
    15: { name: "ベンチプレス", sets: 3, reps: "2", pct: 0.925, variantNote: "重いダブルのあと、胸のMRVは補助で稼ぐ。" },
    16: { name: "ベンチプレス", sets: 2, reps: "3", pct: 0.7, variantNote: "ディロード。翌週以降に1RMテスト可。" },
  };
  return table[week];
}

function deadliftMain(week: number): MainSpec {
  const table: Record<number, MainSpec> = {
    1: { name: "ポーズデッドリフト（膝下1秒）", sets: 4, reps: "5", pct: 0.65, variantNote: "膝下で1秒止める。背中の角度を維持。ロックアウトで肩をすくめない。" },
    2: { name: "ポーズデッドリフト（膝下1秒）", sets: 4, reps: "5", pct: 0.675, variantNote: "バーは脛に沿わせる。尻が先に上がったら重量を下げる。" },
    3: { name: "ポーズデッドリフト（膝下1秒）", sets: 5, reps: "5", pct: 0.7, variantNote: "デッドのセットは増やしすぎない。MRVは上半身側。" },
    4: { name: "デッドリフト", sets: 2, reps: "3", pct: 0.6, variantNote: "通常引き。動きの確認だけ。" },
    5: { name: "デッドリフト", sets: 4, reps: "5", pct: 0.75, variantNote: "通常引き開始。床を足で押す。" },
    6: { name: "デッドリフト", sets: 5, reps: "4", pct: 0.775, variantNote: "セット間4分。ベルトは任意。" },
    7: { name: "デッドリフト", sets: 5, reps: "4", pct: 0.8, variantNote: "上背を固めてロックアウト。僧帽はシュラッグで別途。" },
    8: { name: "デッドリフト", sets: 2, reps: "3", pct: 0.625, variantNote: "ディロード。" },
    9: { name: "デッドリフト", sets: 5, reps: "3", pct: 0.825, variantNote: "床離れとロックアウトを同じ速度で。" },
    10: { name: "デッドリフト", sets: 4, reps: "3", pct: 0.85, variantNote: "Mixed Gripかフック。交互に入れ替えてもよい。" },
    11: { name: "デッドリフト", sets: 5, reps: "2", pct: 0.875, variantNote: "腰を丸めない。火曜実施なので日曜BJJまで4日空く。" },
    12: { name: "デッドリフト", sets: 2, reps: "2", pct: 0.675, variantNote: "ディロード。" },
    13: { name: "デッドリフト", sets: 4, reps: "2", pct: 0.9, variantNote: "ピーク。ウォームアップを多めに。" },
    14: { name: "デッドリフト", sets: 3, reps: "2", pct: 0.925, variantNote: "失敗しそうならシングルに切る。" },
    15: { name: "デッドリフト", sets: 3, reps: "1", pct: 0.95, variantNote: "シングル3本。記録会のセットアップを再現。" },
    16: { name: "デッドリフト", sets: 2, reps: "2", pct: 0.7, variantNote: "ディロード。翌週に180〜190kgを試してよい。" },
  };
  return table[week];
}

function squatMain(week: number): MainSpec {
  const table: Record<number, MainSpec> = {
    1: { name: "バックスクワット", sets: 3, reps: "5", pct: 0.7, variantNote: "週2四頭の木。月曜フロントと合わせてMEV以上。" },
    2: { name: "バックスクワット", sets: 3, reps: "5", pct: 0.725, variantNote: "膝とつま先を同じ向きに。" },
    3: { name: "バックスクワット", sets: 3, reps: "5", pct: 0.75, variantNote: "火曜デッドの疲労がある。無理に伸ばさない。" },
    4: { name: "バックスクワット", sets: 2, reps: "5", pct: 0.6, variantNote: "ディロード。" },
    5: { name: "バックスクワット", sets: 3, reps: "5", pct: 0.75, variantNote: "月曜フロントと合わせてMEV付近。" },
    6: { name: "バックスクワット", sets: 3, reps: "4", pct: 0.775, variantNote: "ブレースを先に作ってからしゃがむ。" },
    7: { name: "バックスクワット", sets: 3, reps: "4", pct: 0.8, variantNote: "上半身MRV週。四頭セットは増やさない。" },
    8: { name: "バックスクワット", sets: 2, reps: "5", pct: 0.625, variantNote: "ディロード。" },
    9: { name: "バックスクワット", sets: 3, reps: "5", pct: 0.775, variantNote: "パターン維持。重量は欲張らない。" },
    10: { name: "バックスクワット", sets: 3, reps: "4", pct: 0.825, variantNote: "RPEが9なら2.5kg下げる。" },
    11: { name: "バックスクワット", sets: 3, reps: "3", pct: 0.85, variantNote: "トリプル。深さだけは落とさない。" },
    12: { name: "バックスクワット", sets: 2, reps: "3", pct: 0.65, variantNote: "ディロード。" },
    13: { name: "バックスクワット", sets: 3, reps: "3", pct: 0.825, variantNote: "ピーク期は脚の疲労を残さない。" },
    14: { name: "バックスクワット", sets: 3, reps: "2", pct: 0.85, variantNote: "ダブル。ウォームアップは短くてよい。" },
    15: { name: "バックスクワット", sets: 2, reps: "2", pct: 0.8, variantNote: "デッドのシングルを優先。月曜フロントでMEVを確保。" },
    16: { name: "バックスクワット", sets: 2, reps: "3", pct: 0.65, variantNote: "ディロード。" },
  };
  return table[week];
}

function ohpMain(week: number): MainSpec {
  const table: Record<number, MainSpec> = {
    1: { name: "オーバーヘッドプレス", sets: 3, reps: "8", pct: 0.675, variantNote: "推定1RM基準。RPEが9なら翌週据え置き。" },
    2: { name: "オーバーヘッドプレス", sets: 4, reps: "8", pct: 0.7, variantNote: "顎を引いてバーを顔の近くに通す。" },
    3: { name: "オーバーヘッドプレス", sets: 4, reps: "6", pct: 0.75, variantNote: "ストリクト。脚の反動は使わない。" },
    4: { name: "オーバーヘッドプレス", sets: 2, reps: "5", pct: 0.6, variantNote: "ディロード。" },
    5: { name: "オーバーヘッドプレス", sets: 4, reps: "6", pct: 0.725, variantNote: "肘は体のやや前方。" },
    6: { name: "オーバーヘッドプレス", sets: 4, reps: "6", pct: 0.75, variantNote: "握りは肩幅より拳一つ外。" },
    7: { name: "オーバーヘッドプレス", sets: 4, reps: "5", pct: 0.775, variantNote: "サイドレイズの前に肩を潰さない。" },
    8: { name: "オーバーヘッドプレス", sets: 2, reps: "5", pct: 0.625, variantNote: "ディロード。" },
    9: { name: "オーバーヘッドプレス", sets: 4, reps: "5", pct: 0.775, variantNote: "ベルト任意。" },
    10: { name: "オーバーヘッドプレス", sets: 4, reps: "4", pct: 0.8, variantNote: "頭をバーの下に入れるロックアウト。" },
    11: { name: "オーバーヘッドプレス", sets: 4, reps: "3", pct: 0.825, variantNote: "MRVはレイズ側で稼ぐ。" },
    12: { name: "オーバーヘッドプレス", sets: 2, reps: "4", pct: 0.65, variantNote: "ディロード。" },
    13: { name: "オーバーヘッドプレス", sets: 4, reps: "3", pct: 0.825, variantNote: "トリプル。パンプは後のレイズで。" },
    14: { name: "オーバーヘッドプレス", sets: 4, reps: "3", pct: 0.85, variantNote: "RPE9を超えたら2.5kg下げる。" },
    15: { name: "オーバーヘッドプレス", sets: 3, reps: "2", pct: 0.875, variantNote: "推定1RMが甘いとここで崩れる。修正してよい。" },
    16: { name: "オーバーヘッドプレス", sets: 2, reps: "4", pct: 0.65, variantNote: "ディロード。" },
  };
  return table[week];
}

const MAIN_BY_LIFT: Record<LiftId, (week: number) => MainSpec> = {
  bench: benchMain,
  deadlift: deadliftMain,
  squat: squatMain,
  ohp: ohpMain,
};

type AccDef = {
  key: string;
  name: string;
  day: DayId;
  order: number;
  muscles: Muscle[];
  restSec: number;
  notes: string;
  bjjNote: string;
  sets: Record<Phase, number>;
  reps: Record<BlockId, string>;
  load: (rms: OneRMs, week: number) => { kg: number; display: string };
};

const ACCESSORIES: AccDef[] = [
  {
    key: "front-squat-a",
    name: "フロントスクワット",
    day: "A",
    order: 2,
    muscles: ["quads"],
    restSec: 180,
    notes:
      "週2四頭の月。クリーングリップかクロスアーム。肘を高く、胴を立てたまま。木曜バックと合わせてMEV以上。",
    bjjNote: "",
    sets: { mav: 3, build: 4, mrv: 4, deload: 2 },
    reps: { 1: "8", 2: "6", 3: "5", 4: "5" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.squat, 0.55), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "cgbp",
    name: "クローズグリップベンチ",
    day: "A",
    order: 3,
    muscles: ["chest", "triceps"],
    restSec: 120,
    notes: "握りは肩幅。肘を体側に寄せ、三頭と内側胸を狙う。",
    bjjNote: "フレームとポストの肘伸展に直結。",
    sets: { mav: 4, build: 4, mrv: 4, deload: 2 },
    reps: { 1: "10", 2: "8", 3: "8", 4: "8" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.bench, 0.62), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "pullup-a",
    name: "懸垂（プロネイト）",
    day: "A",
    order: 4,
    muscles: ["back", "biceps"],
    restSec: 120,
    notes: "胸をバーに近づける。8回できなければレストポーズで規定回数を揃える。加重はプレートを足に挟むかリュック。",
    bjjNote: "ガード引き込み・クリメ。最終セットは顎オーバーで3秒保持。",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "8", 2: "8", 3: "6-8", 4: "6-8" },
    load: (rms, week) => bwDisplay(rms.bodyweight, addedPullupKg(week)),
  },
  {
    key: "lateral-a",
    name: "プレートサイドレイズ",
    day: "A",
    order: 5,
    muscles: ["shoulders"],
    restSec: 60,
    notes: "小指側を少し上げ、肩の高さ直前で止める。下部で伸張位を1秒。週内に分散した肩の1本。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "15", 2: "12-15", 3: "12", 4: "12" },
    load: (_rms, week) => {
      const kg = lateralKg(week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "shrug-a",
    name: "バーベルシュラッグ",
    day: "A",
    order: 6,
    muscles: ["traps"],
    restSec: 75,
    notes: "肩を耳に近づける。回転させない。1秒収縮。ストラップ可。僧帽は週4日に薄く分散。",
    bjjNote: "襟を持つ姿勢の維持。",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "12", 2: "10-12", 3: "10", 4: "10" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.deadlift, 0.285), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "row-b",
    name: "ベントオーバーロウ",
    day: "B",
    order: 2,
    muscles: ["back"],
    restSec: 120,
    notes: "体幹は床とほぼ平行。バーをお腹に引く。デッドの後なので重量は欲張らない。",
    bjjNote: "プルとクローズの姿勢。",
    sets: { mav: 4, build: 4, mrv: 4, deload: 2 },
    reps: { 1: "8", 2: "8", 3: "6-8", 4: "6" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.deadlift, 0.285), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "chin-b",
    name: "チンアップ（アンダーグリップ）",
    day: "B",
    order: 3,
    muscles: ["back", "biceps"],
    restSec: 120,
    notes: "手のひら向き。胸をバーへ。8回未満ならレストポーズ。",
    bjjNote: "ガードリテンションの二頭。最終セットは10秒ぶら下がり。",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "8", 2: "8", 3: "6-8", 4: "6" },
    load: (rms, week) => bwDisplay(rms.bodyweight, addedPullupKg(week)),
  },
  {
    key: "upright-b",
    name: "バーベルアップライトロウ",
    day: "B",
    order: 4,
    muscles: ["shoulders", "traps"],
    restSec: 75,
    notes: "握りは肩幅以上。バーは鎖骨まで。狭い握りは肩の衝突リスクがあるので避ける。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "12", 2: "10", 3: "10", 4: "10" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.ohp, 0.55), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "shrug-b",
    name: "バーベルシュラッグ",
    day: "B",
    order: 5,
    muscles: ["traps"],
    restSec: 75,
    notes: "デッドの後なので重量はDay Aより2.5〜5kg軽くてもよい。収縮を優先。セットは抑えめ（他日と分散）。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "15", 2: "12", 3: "12", 4: "10" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.deadlift, 0.27), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "lateral-c",
    name: "プレートサイドレイズ",
    day: "C",
    order: 2,
    muscles: ["shoulders"],
    restSec: 60,
    notes: "やや前傾。プレートの縁を持つ。パンプ優先で休憩は短く。フロント／リアは木曜へ移し、この日の肩集中を避ける。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "15", 2: "15", 3: "12-15", 4: "12" },
    load: (_rms, week) => {
      const kg = lateralKg(week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "skull-c",
    name: "スカルクラッシャー",
    day: "C",
    order: 3,
    muscles: ["triceps"],
    restSec: 75,
    notes: "バーベルを額のやや後ろへ。肘を開かない。肩を少し伸ばして長頭を使う。月曜から移し、三頭を週内分散。",
    bjjNote: "エビ・ポストの肘伸ばし持久。",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "12", 2: "10", 3: "10", 4: "8" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.bench, 0.28), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "oh-ext-c",
    name: "プレートオーバーヘッドエクステンション",
    day: "C",
    order: 4,
    muscles: ["triceps"],
    restSec: 75,
    notes: "プレートを両手で持ち、肘を耳の横に固定して頭の後ろへ。三頭長頭。",
    bjjNote: "頭上からのフレーム維持。",
    sets: { mav: 3, build: 3, mrv: 3, deload: 2 },
    reps: { 1: "12", 2: "12", 3: "10", 4: "10" },
    load: (_rms, week) => {
      const kg = accessoryLoad(10, week, 2.5);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "curl-c",
    name: "バーベルカール",
    day: "C",
    order: 5,
    muscles: ["biceps"],
    restSec: 60,
    notes: "肘を体側。下ろし3秒。金曜の高レップと分け、二頭を週2以上に分散。",
    bjjNote: "クローズドガードの引き。",
    sets: { mav: 3, build: 3, mrv: 3, deload: 2 },
    reps: { 1: "10", 2: "10", 3: "8", 4: "8" },
    load: (_rms, week) => {
      const kg = accessoryLoad(30, week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "rdl-d",
    name: "ルーマニアンデッドリフト",
    day: "D",
    order: 2,
    muscles: ["posterior"],
    restSec: 150,
    notes:
      "膝は軽く曲げ、バーは腿に沿わせて下ろす。ハムの伸びを感じたら戻す。腰を丸めない。デッドと合わせて後面をMEV〜MAVへ。",
    bjjNote: "ヒップヒンジとタックル耐性。",
    sets: { mav: 4, build: 4, mrv: 5, deload: 2 },
    reps: { 1: "8", 2: "8", 3: "6", 4: "6" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.deadlift, 0.66), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "spoto-d",
    name: "スポトプレス",
    day: "D",
    order: 3,
    muscles: ["chest"],
    restSec: 120,
    notes: "胸の2〜3cm上で1秒停止。大胸筋の緊張を切らない。ピークMRV週はメインのセット不足をここで補う。",
    bjjNote: "",
    sets: { mav: 3, build: 4, mrv: 5, deload: 2 },
    reps: { 1: "8", 2: "8", 3: "6-8", 4: "6" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.bench, 0.64), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "front-d",
    name: "プレートフロントレイズ",
    day: "D",
    order: 4,
    muscles: ["shoulders"],
    restSec: 60,
    notes: "腕はほぼ伸ばしたまま、顔の高さまで。反動禁止。水曜OHP日から移し、肩の日内集中を避ける。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "12", 2: "12", 3: "10-12", 4: "10" },
    load: (_rms, week) => {
      const kg = frontKg(week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "rear-d",
    name: "プレートリアデルトフライ",
    day: "D",
    order: 5,
    muscles: ["shoulders"],
    restSec: 60,
    notes: "前傾し、小指側から開く。僧帽で引かない。重量より位置。水曜から移して肩を分散。",
    bjjNote: "姿勢を保つ肩甲骨周り。",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "15", 2: "15", 3: "12", 4: "12" },
    load: (_rms, week) => {
      const kg = rearKg(week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "shrug-d",
    name: "バーベルシュラッグ",
    day: "D",
    order: 6,
    muscles: ["traps"],
    restSec: 75,
    notes: "収縮1秒。首を前に出さない。僧帽の週内分散枠。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "12", 2: "12", 3: "10", 4: "10" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.deadlift, 0.27), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "floor-e",
    name: "フロアプレス",
    day: "E",
    order: 1,
    muscles: ["chest", "triceps"],
    restSec: 120,
    notes: "ブロック1-2はフロアプレス（上腕が床についたら1秒）。ブロック3-4は胸で1秒ポーズベンチ。金曜は重量より精度。",
    bjjNote: "胸の圧と三頭のロックアウト。日曜ロールの前々日なのでRPEを守る。",
    sets: { mav: 3, build: 4, mrv: 5, deload: 2 },
    reps: { 1: "10", 2: "8", 3: "6-8", 4: "6" },
    load: (rms, week) => {
      const pct = blockOf(week).id <= 2 ? 0.68 : 0.64;
      const kg = accessoryLoad(percentOf(rms.bench, pct), week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "pullup-e",
    name: "懸垂（筋持久）",
    day: "E",
    order: 2,
    muscles: ["back", "biceps"],
    restSec: 60,
    notes: "休憩を短くする。最後のセットはAMRAP（1レップ残し）。加重は控えめ。",
    bjjNote: "ロール中の引き持久。試合週はAMRAPをやめる。",
    sets: { mav: 3, build: 3, mrv: 3, deload: 2 },
    reps: { 1: "AMRAP-1", 2: "AMRAP-1", 3: "8", 4: "AMRAP-2" },
    load: (rms, week) => {
      const added =
        phaseOf(week) === "deload" ? 0 : addedPullupKg(week) >= 5 ? 2.5 : 0;
      return bwDisplay(rms.bodyweight, added);
    },
  },
  {
    key: "lateral-e",
    name: "プレートサイドレイズ",
    day: "E",
    order: 3,
    muscles: ["shoulders"],
    restSec: 60,
    notes: "この日は仕上げ。少し軽いプレートでも可。片側ずつでもよい。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "15", 2: "15", 3: "12", 4: "12" },
    load: (_rms, week) => {
      const kg = lateralKg(week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "curl-e",
    name: "バーベルカール（高レップ）",
    day: "E",
    order: 4,
    muscles: ["biceps"],
    restSec: 45,
    notes: "BJJ用密度。休憩45秒。水曜カールと分け、金曜は高レップ寄り。",
    bjjNote: "クローズドガードの引き、襟制御。試合週はRPE7で打切り。",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "12", 2: "15", 3: "12", 4: "10" },
    load: (_rms, week) => {
      const kg = accessoryLoad(30, week);
      return { kg, display: formatKg(kg) };
    },
  },
  {
    key: "narrow-pu-e",
    name: "ナロープッシュアップ",
    day: "E",
    order: 5,
    muscles: ["chest", "triceps"],
    restSec: 45,
    notes: "手は肩幅より狭く。胸を床すれすれまで。途中で止まったらレストポーズで規定回数へ。",
    bjjNote: "胸と三頭の密度。ガードパスの圧。最後のセットは6秒フレーム姿勢。",
    sets: { mav: 3, build: 3, mrv: 5, deload: 2 },
    reps: { 1: "12", 2: "15", 3: "12", 4: "10" },
    load: (rms) => bwDisplay(rms.bodyweight, 0),
  },
  {
    key: "shrug-e",
    name: "バーベルシュラッグ",
    day: "E",
    order: 6,
    muscles: ["traps"],
    restSec: 75,
    notes: "収縮1秒。首を前に出さない。金曜は中重量。セットは他日と分散した残り枠。",
    bjjNote: "",
    sets: { mav: 3, build: 3, mrv: 4, deload: 2 },
    reps: { 1: "12", 2: "12", 3: "10", 4: "8" },
    load: (rms, week) => {
      const kg = accessoryLoad(percentOf(rms.deadlift, 0.285), week);
      return { kg, display: formatKg(kg) };
    },
  },
];

function floorPressName(week: number): string {
  return blockOf(week).id <= 2 ? "フロアプレス" : "ポーズベンチ（胸で1秒）";
}

function makeMainRow(
  week: number,
  day: DayId,
  lift: LiftId,
  rms: OneRMs,
): ProgramRow {
  const spec = MAIN_BY_LIFT[lift](week);
  const kg = percentOf(rms[lift], spec.pct);
  const phase = phaseOf(week);
  const block = blockOf(week);
  const muscles: Muscle[] =
    lift === "bench"
      ? ["chest"]
      : lift === "deadlift"
        ? ["posterior"]
        : lift === "squat"
          ? ["quads"]
          : ["shoulders"];
  const meta = DAYS[day];
  const pctDisplay = Math.round(spec.pct * 1000) / 10;
  return {
    id: `w${week}-${day}-1-${lift}`,
    week,
    block: block.id,
    blockName: block.name,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    dayId: day,
    dayName: meta.dayName,
    weekday: meta.weekday,
    session: meta.session,
    order: 1,
    exercise: spec.name,
    isMain: true,
    liftId: lift,
    sets: spec.sets,
    reps: spec.reps,
    weightKg: kg,
    displayWeight: formatKg(kg),
    percent1RM: pctDisplay,
    rpe: rpeFor(phase, true),
    restSec: restLabel(lift === "deadlift" ? 240 : 210),
    muscles,
    muscleLabel: muscleLabel(muscles),
    notes: spec.variantNote,
    bjjNote:
      lift === "deadlift"
        ? "火曜実施。日曜BJJまで中2日以上空く。ハードローリング週でも%は維持。"
        : "",
  };
}

function makeAccRow(def: AccDef, week: number, rms: OneRMs): ProgramRow | null {
  const phase = phaseOf(week);
  let sets = def.sets[phase];
  if (def.key === "spoto-d" && phase === "mrv") {
    sets += Math.max(0, 5 - benchMain(week).sets);
  }
  if (def.key === "lateral-e" && phase === "mrv") {
    sets += Math.max(0, 4 - ohpMain(week).sets);
  }
  if (sets <= 0) return null;

  const block = blockOf(week);
  const name = def.key === "floor-e" ? floorPressName(week) : def.name;
  const load = def.load(rms, week);
  const meta = DAYS[def.day];

  return {
    id: `w${week}-${def.day}-${def.order}-${def.key}`,
    week,
    block: block.id,
    blockName: block.name,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    dayId: def.day,
    dayName: meta.dayName,
    weekday: meta.weekday,
    session: meta.session,
    order: def.order,
    exercise: name,
    isMain: false,
    liftId: null,
    sets,
    reps: def.reps[block.id],
    weightKg: load.kg,
    displayWeight: load.display,
    percent1RM: null,
    rpe: rpeFor(phase, false),
    restSec: restLabel(def.restSec),
    muscles: def.muscles,
    muscleLabel: muscleLabel(def.muscles),
    notes: def.notes,
    bjjNote: def.bjjNote,
  };
}

export function buildProgram(rms: OneRMs = DEFAULT_RMS): ProgramRow[] {
  const rows: ProgramRow[] = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    rows.push(makeMainRow(week, "A", "bench", rms));
    rows.push(makeMainRow(week, "B", "deadlift", rms));
    rows.push(makeMainRow(week, "C", "ohp", rms));
    rows.push(makeMainRow(week, "D", "squat", rms));
    for (const def of ACCESSORIES) {
      const row = makeAccRow(def, week, rms);
      if (row) rows.push(row);
    }
  }
  return rows.sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    const d = DAY_ORDER.indexOf(a.dayId) - DAY_ORDER.indexOf(b.dayId);
    if (d !== 0) return d;
    return a.order - b.order;
  });
}

export function weeklyVolumes(rows: ProgramRow[]): WeeklyVolume[] {
  const byWeek = new Map<number, ProgramRow[]>();
  for (const row of rows) {
    const list = byWeek.get(row.week) ?? [];
    list.push(row);
    byWeek.set(row.week, list);
  }
  const out: WeeklyVolume[] = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const list = byWeek.get(week) ?? [];
    const sets = Object.fromEntries(MUSCLE_ORDER.map((m) => [m, 0])) as Record<
      Muscle,
      number
    >;
    for (const row of list) {
      for (const m of row.muscles) {
        sets[m] += row.sets;
      }
    }
    const phase = phaseOf(week);
    const block = blockOf(week);
    const flags = Object.fromEntries(
      MUSCLE_ORDER.map((m) => [m, flagFor(m, sets[m], phase)]),
    ) as WeeklyVolume["flags"];
    out.push({
      week,
      phase,
      phaseLabel: PHASE_LABEL[phase],
      block: block.id,
      blockName: block.name,
      sets,
      flags,
    });
  }
  return out;
}

export function volumeAudit(volumes: WeeklyVolume[]): string[] {
  const issues: string[] = [];
  const priority: Muscle[] = ["chest", "shoulders", "traps"];
  const mavMuscles: Muscle[] = [
    "chest",
    "shoulders",
    "traps",
    "biceps",
    "triceps",
  ];
  const mevFloor: Muscle[] = ["posterior", "quads"];
  for (const v of volumes) {
    if (v.phase === "deload") continue;
    for (const m of mavMuscles) {
      if (v.sets[m] <= LANDMARKS[m].mav) {
        issues.push(
          `W${v.week} ${LANDMARKS[m].label}: ${v.sets[m]}セットはMAV ${LANDMARKS[m].mav} を超えていない`,
        );
      }
    }
    for (const m of mevFloor) {
      if (v.sets[m] < LANDMARKS[m].mev) {
        issues.push(
          `W${v.week} ${LANDMARKS[m].label}: ${v.sets[m]}セットはMEV ${LANDMARKS[m].mev} 未満`,
        );
      }
    }
    if (v.phase === "mrv") {
      for (const m of priority) {
        if (v.sets[m] < LANDMARKS[m].mrv) {
          issues.push(
            `W${v.week} ${LANDMARKS[m].label}: ${v.sets[m]}セットはMRV ${LANDMARKS[m].mrv} 未達`,
          );
        }
      }
    }
  }
  return issues;
}

export const MAIN_WARMUP =
  "メイン種目のウォームアップ（ボリュームに数えない）: バーのみ × 10 → 40% × 5 → 60% × 3 → 作業重量の90% × 1。";
