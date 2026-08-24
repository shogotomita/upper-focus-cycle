import * as XLSX from "xlsx";
import { LANDMARKS, MUSCLE_ORDER, PHASE_LABEL, phaseOf } from "./landmarks";
import {
  BLOCKS,
  DAYS,
  DAY_ORDER,
  MAIN_WARMUP,
  REST_DAYS,
  TOTAL_WEEKS,
  blockOf,
} from "./program";
import type { OneRMs, ProgramRow, WeeklyVolume } from "./types";

const WIDE = new Set(["メモ", "BJJメモ", "種目", "ブロック"]);

function programSheet(rows: ProgramRow[]) {
  return rows.map((r) => ({
    週: r.week,
    ブロック: r.blockName,
    フェーズ: r.phaseLabel,
    曜日: r.weekday,
    セッション: r.session,
    順番: r.order,
    種目: r.exercise,
    メイン: r.isMain ? "○" : "",
    セット: r.sets,
    レップ: r.reps,
    重量: r.displayWeight,
    kg: r.weightKg,
    "%1RM": r.percent1RM ?? "",
    RPE: r.rpe,
    休憩: r.restSec,
    対象: r.muscleLabel,
    メモ: r.notes,
    BJJメモ: r.bjjNote,
  }));
}

function flagJa(flag: WeeklyVolume["flags"][keyof WeeklyVolume["flags"]]): string {
  switch (flag) {
    case "at-mrv":
      return "MRV到達";
    case "above-mav":
      return "MAV超";
    case "mev-to-mav":
      return "MEV〜MAV";
    case "below-mev":
      return "MEV未満";
    case "deload":
      return "ディロード";
  }
}

function volumeSheet(volumes: WeeklyVolume[]) {
  return volumes.map((v) => {
    const row: Record<string, string | number> = {
      週: v.week,
      ブロック: v.blockName,
      フェーズ: v.phaseLabel,
    };
    for (const m of MUSCLE_ORDER) {
      row[LANDMARKS[m].label] = v.sets[m];
      row[`${LANDMARKS[m].label}判定`] = flagJa(v.flags[m]);
    }
    return row;
  });
}

function rmSheet(rms: OneRMs) {
  return [
    { 種目: "ベンチプレス", "1RM_kg": rms.bench, 備考: "実測PR" },
    { 種目: "スクワット", "1RM_kg": rms.squat, 備考: "実測PR。本プログラムでは維持" },
    {
      種目: "デッドリフト",
      "1RM_kg": rms.deadlift,
      備考: "実測PR。スクワットと同重量のためブロック1はポーズで位置を修正",
    },
    { 種目: "オーバーヘッドプレス", "1RM_kg": rms.ohp, 備考: "未計測なら推定。RPEで修正" },
    { 種目: "体重", "1RM_kg": rms.bodyweight, 備考: "懸垂の自重計算用" },
  ];
}

function overviewSheet() {
  return BLOCKS.map((b) => ({
    ブロック: b.id,
    名称: b.name,
    週: `${b.weeks[0]}–${b.weeks[1]}`,
    ねらい: b.subtitle,
    内容: b.focus,
  }));
}

function calendarSheet() {
  return Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const week = i + 1;
    const block = blockOf(week);
    const row: Record<string, string | number> = {
      週: week,
      ブロック: block.name,
      フェーズ: PHASE_LABEL[phaseOf(week)],
    };
    for (const day of DAY_ORDER) {
      const meta = DAYS[day];
      row[meta.weekday] = `${meta.dayName} ${meta.session}`;
    }
    for (const rest of REST_DAYS) {
      row[rest.weekday] = `${rest.label}（トレなし）`;
    }
    return row;
  });
}

function usageSheet() {
  return [
    ["ウォームアップ"],
    [MAIN_WARMUP],
    [],
    ["重量の刻み"],
    ["すべて2.5kg刻み。メイン種目は記載の%1RMを逆算して丸めている。"],
    [],
    ["RPEの使い方"],
    ["記載RPEより1以上重いと感じたら翌週は据え置き。1以上軽ければ+2.5kg。"],
    [],
    ["週の休み"],
    ["月〜金がリフト。土曜は完全休養。日曜はBJJのみでウエイト禁止。"],
    [],
    ["Googleスプレッドシートでの開き方"],
    ["1. このExcelをダウンロードする"],
    ["2. drive.google.com にアップロードし、右クリック → アプリで開く → Googleスプレッドシート"],
    ["または CSV をスプレッドシートで ファイル → インポート → CSV（UTF-8）。"],
  ];
}

function colWidths(rows: Record<string, unknown>[]): { wch: number }[] {
  const keys = Object.keys(rows[0] ?? {});
  return keys.map((k) => ({ wch: WIDE.has(k) ? 36 : Math.max(10, k.length + 2) }));
}

export function buildWorkbook(
  rows: ProgramRow[],
  volumes: WeeklyVolume[],
  rms: OneRMs,
) {
  const wb = XLSX.utils.book_new();
  const program = programSheet(rows);
  const ws1 = XLSX.utils.json_to_sheet(program);
  ws1["!cols"] = colWidths(program);
  XLSX.utils.book_append_sheet(wb, ws1, "全スケジュール");

  const cal = calendarSheet();
  const wsCal = XLSX.utils.json_to_sheet(cal);
  wsCal["!cols"] = colWidths(cal);
  XLSX.utils.book_append_sheet(wb, wsCal, "週カレンダー");

  const vol = volumeSheet(volumes);
  const ws2 = XLSX.utils.json_to_sheet(vol);
  ws2["!cols"] = colWidths(vol);
  XLSX.utils.book_append_sheet(wb, ws2, "週次ボリューム");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rmSheet(rms)), "1RM");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(overviewSheet()),
    "ブロック概要",
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(usageSheet()), "使い方");
  return wb;
}

export function workbookXlsxBuffer(
  rows: ProgramRow[],
  volumes: WeeklyVolume[],
  rms: OneRMs,
): Buffer {
  const wb = buildWorkbook(rows, volumes, rms);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function workbookCsv(rows: ProgramRow[]): string {
  return "\uFEFF" + XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(programSheet(rows)));
}

export const SPREADSHEET_FILENAME = "16week-training-program.xlsx";

export function downloadXlsx(
  rows: ProgramRow[],
  volumes: WeeklyVolume[],
  rms: OneRMs,
) {
  XLSX.writeFile(buildWorkbook(rows, volumes, rms), SPREADSHEET_FILENAME);
}

export function downloadCsv(rows: ProgramRow[]) {
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(programSheet(rows)));
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "16week-training-program.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyTsv(rows: ProgramRow[]): Promise<void> {
  const tsv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(programSheet(rows)), {
    FS: "\t",
  });
  await navigator.clipboard.writeText(tsv);
}
