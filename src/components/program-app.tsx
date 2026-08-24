"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EXERCISE_GUIDE, SCIENCE_SECTIONS } from "@/lib/content";
import { copyTsv, downloadCsv, downloadXlsx } from "@/lib/export";
import { withBase } from "@/lib/paths";
import { LANDMARKS, MUSCLE_ORDER } from "@/lib/landmarks";
import {
  BLOCKS,
  DAYS,
  DAY_ORDER,
  DEFAULT_RMS,
  MAIN_WARMUP,
  REST_DAYS,
  blockOf,
  buildProgram,
  weeklyVolumes,
} from "@/lib/program";
import type {
  Muscle,
  OneRMs,
  Phase,
  ProgramRow,
  VolumeFlag,
  WeeklyVolume,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "iron-cycle-v2";
const WEEK_STORAGE_KEY = "iron-cycle-week";
type TabId = "week" | "sheet" | "volume" | "guide";

function readStoredWeek(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(WEEK_STORAGE_KEY);
    const n = raw ? Number(raw) : 1;
    return Number.isInteger(n) && n >= 1 && n <= 16 ? n : 1;
  } catch {
    return 1;
  }
}

const MUSCLE_TONE: Record<Muscle, string> = {
  chest: "bg-[oklch(0.42_0.055_40/0.28)] text-[oklch(0.84_0.055_40)] ring-[oklch(0.55_0.05_40/0.45)]",
  shoulders:
    "bg-[oklch(0.44_0.06_72/0.26)] text-[oklch(0.86_0.07_72)] ring-[oklch(0.6_0.06_72/0.45)]",
  traps: "bg-[oklch(0.42_0.045_55/0.26)] text-[oklch(0.84_0.05_55)] ring-[oklch(0.55_0.04_55/0.45)]",
  biceps: "bg-[oklch(0.4_0.018_80/0.28)] text-[oklch(0.82_0.02_80)] ring-[oklch(0.5_0.02_80/0.4)]",
  triceps: "bg-[oklch(0.4_0.016_65/0.28)] text-[oklch(0.82_0.018_65)] ring-[oklch(0.5_0.018_65/0.4)]",
  back: "bg-[oklch(0.38_0.014_230/0.28)] text-[oklch(0.8_0.022_230)] ring-[oklch(0.5_0.02_230/0.4)]",
  posterior:
    "bg-[oklch(0.38_0.012_80/0.32)] text-[oklch(0.78_0.015_80)] ring-[oklch(0.48_0.015_80/0.4)]",
  quads: "bg-[oklch(0.38_0.008_72/0.32)] text-[oklch(0.76_0.012_72)] ring-[oklch(0.48_0.01_72/0.4)]",
};

const PHASE_TONE: Record<Phase, string> = {
  mav: "bg-secondary text-foreground",
  build: "bg-secondary text-foreground",
  mrv: "bg-[color-mix(in_oklch,oklch(0.64_0.135_32)_18%,transparent)] text-[oklch(0.72_0.12_32)]",
  deload: "border border-border bg-transparent text-muted-foreground",
};

const FLAG_TONE: Record<VolumeFlag, string> = {
  "at-mrv": "text-[oklch(0.72_0.12_32)]",
  "above-mav": "text-primary",
  "mev-to-mav": "text-foreground",
  "below-mev": "text-muted-foreground",
  deload: "text-muted-foreground",
};

const FLAG_BAR: Record<VolumeFlag, string> = {
  "at-mrv": "bg-[oklch(0.64_0.135_32)]",
  "above-mav": "bg-primary",
  "mev-to-mav": "bg-foreground/30",
  "below-mev": "bg-muted-foreground/40",
  deload: "bg-muted-foreground/30",
};

const FLAG_JA: Record<VolumeFlag, string> = {
  "at-mrv": "MRV",
  "above-mav": "MAV超",
  "mev-to-mav": "MEV〜MAV",
  "below-mev": "MEV未満",
  deload: "ディロード",
};

const LIFT_FIELDS: { key: keyof OneRMs; label: string; short: string }[] = [
  { key: "bench", label: "ベンチ 1RM", short: "ベンチ" },
  { key: "squat", label: "スクワット 1RM", short: "スクワット" },
  { key: "deadlift", label: "デッド 1RM", short: "デッド" },
  { key: "ohp", label: "OHP 1RM（推定可）", short: "OHP" },
  { key: "bodyweight", label: "体重", short: "体重" },
];

function weekdayJa(date = new Date()) {
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] ?? "";
}

export function ProgramApp() {
  const [rms, setRms] = useState<OneRMs>(DEFAULT_RMS);
  const [week, setWeek] = useState(1);
  const [tab, setTab] = useState<TabId>("week");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sheetAll, setSheetAll] = useState(true);
  const [isMd, setIsMd] = useState(true);
  const today = weekdayJa();

  function selectWeek(next: number) {
    const clamped = Math.min(16, Math.max(1, Math.round(next)));
    setWeek(clamped);
    setTab("week");
    try {
      window.localStorage.setItem(WEEK_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { rms?: OneRMs; done?: string[] };
          if (parsed.rms) setRms({ ...DEFAULT_RMS, ...parsed.rms });
          if (parsed.done) setDone(new Set(parsed.done));
        }
        setWeek(readStoredWeek());
      } catch {
        /* ignore */
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsMd(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rms, done: [...done] }));
  }, [rms, done, hydrated]);

  const rows = useMemo(() => buildProgram(rms), [rms]);
  const volumes = useMemo(() => weeklyVolumes(rows), [rows]);
  const weekRows = rows.filter((row) => row.week === week);
  const weekVolume = volumes[week - 1];
  const block = blockOf(week);
  const doneCount = weekRows.filter((row) => done.has(row.id)).length;
  const weekendToday = today === "土" || today === "日";

  function toggleDone(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCopy() {
    await copyTsv(rows);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function resetRms() {
    setRms(DEFAULT_RMS);
    setDone(new Set());
  }

  const tools = <ToolsPanel rms={rms} setRms={setRms} onReset={resetRms} />;

  const restCards = (
    <div className="grid gap-3 sm:grid-cols-2">
      {REST_DAYS.map((rest) => (
        <Card
          key={rest.weekday}
          className={cn(
            "border-dashed bg-muted/20",
            rest.weekday === today && "border-l-2 border-l-primary border-dashed",
          )}
        >
          <CardHeader>
            <CardTitle className="font-medium text-[1.0625rem]">
              {rest.weekday} · {rest.label}
            </CardTitle>
            <CardDescription>{rest.note}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  const sessionGrid = (
    <div className="grid gap-4 lg:grid-cols-2">
      {DAY_ORDER.map((day) => {
        const session = weekRows.filter((row) => row.dayId === day);
        const meta = DAYS[day];
        const finished =
          session.length > 0 && session.every((row) => done.has(row.id));
        const isToday = meta.weekday === today;
        return (
          <Card
            key={day}
            className={cn(
              isToday && "border-l-2 border-l-primary",
              finished && "bg-muted/25",
            )}
          >
            <CardHeader className="border-b">
              <CardTitle className="flex items-center justify-between gap-2 font-medium text-[1.0625rem]">
                <span>
                  {meta.weekday} · {meta.dayName}
                </span>
                {finished ? (
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    完了
                  </span>
                ) : null}
              </CardTitle>
              <CardDescription>{meta.session}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {session.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  この日の種目がありません。
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {session.map((row) => (
                    <ExerciseRow
                      key={row.id}
                      row={row}
                      checked={done.has(row.id)}
                      onToggle={() => toggleDone(row.id)}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="sr-only">16週トレーニング表</h1>
          <div className="flex flex-wrap items-start justify-end gap-3">
            <div className="hidden flex-wrap items-center justify-end gap-2 print:hidden md:flex">
              <Button onClick={() => downloadXlsx(rows, volumes, rms)}>
                <FileSpreadsheet />
                Excelをダウンロード
              </Button>
              <Button variant="outline" onClick={() => void handleCopy()}>
                {copied ? <Check /> : <ClipboardCopy />}
                {copied ? "コピー済み" : "Sheetsに貼る"}
              </Button>
              <Button variant="ghost" onClick={() => downloadCsv(rows)}>
                CSV
              </Button>
              <a
                className={buttonVariants({ variant: "ghost" })}
                href={withBase("/upper-focus-cycle.zip")}
                download="upper-focus-cycle.zip"
              >
                ZIP
              </a>
              <a
                className={buttonVariants({ variant: "ghost" })}
                href={withBase("/16week-training-program.xlsx")}
                download="16week-training-program.xlsx"
              >
                固定Excel
              </a>
            </div>
            <div className="w-full print:hidden md:hidden">
              <Button
                className="w-full"
                onClick={() => downloadXlsx(rows, volumes, rms)}
              >
                <FileSpreadsheet />
                Excelをダウンロード
              </Button>
            </div>
          </div>

          {isMd ? (
            tools
          ) : (
            <details className="print:hidden">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                1RMと書き出し
              </summary>
              <div className="mt-3 space-y-3">
                {tools}
                <div className="flex flex-col gap-1 text-sm">
                <button
                  type="button"
                  className="text-left text-primary underline-offset-4 hover:underline"
                  onClick={() => void handleCopy()}
                >
                  {copied ? "コピー済み" : "Sheetsに貼る"}
                </button>
                <button
                  type="button"
                  className="text-left text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => downloadCsv(rows)}
                >
                  CSV
                </button>
                <a
                  className="text-muted-foreground underline-offset-4 hover:underline"
                  href={withBase("/upper-focus-cycle.zip")}
                  download="upper-focus-cycle.zip"
                >
                  ソースZIP
                </a>
                <a
                  className="text-muted-foreground underline-offset-4 hover:underline"
                  href={withBase("/16week-training-program.xlsx")}
                  download="16week-training-program.xlsx"
                >
                  固定Excel
                </a>
              </div>
            </div>
          </details>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-border bg-background px-4 py-3 md:static md:z-auto md:mx-0 md:space-y-4 md:border-0 md:bg-transparent md:px-0 md:py-0 print:static print:border-0 print:bg-transparent">
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {weekVolume ? (
                <Badge className={PHASE_TONE[weekVolume.phase]}>
                  {weekVolume.phaseLabel}
                </Badge>
              ) : null}
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{week}週</span>
                {" · "}
                ブロック{block.id} {block.name} · {weekRows.length}種目 · {doneCount}/
                {weekRows.length} 完了
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{block.focus}</p>
            <div
              className="flex flex-wrap gap-3 print:hidden"
              role="radiogroup"
              aria-label="週を選択"
            >
              {BLOCKS.map((group) => {
                const active = week >= group.weeks[0] && week <= group.weeks[1];
                return (
                  <div
                    key={group.id}
                    className={cn(
                      "flex flex-col gap-1 rounded-md p-1 -m-1 transition-colors",
                      active && "bg-muted/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectWeek(group.weeks[0])}
                      className={cn(
                        "text-left text-[10px] transition-colors",
                        active
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {group.name}
                    </button>
                    <div className="flex gap-1">
                      {volumes
                        .filter(
                          (volume) =>
                            volume.week >= group.weeks[0] &&
                            volume.week <= group.weeks[1],
                        )
                        .map((volume) => {
                          const selected = volume.week === week;
                          return (
                            <label
                              key={volume.week}
                              className={cn(
                                "relative isolate flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md px-2 font-mono text-[0.8125rem] font-medium ring-1 transition-colors",
                                selected
                                  ? "bg-primary text-primary-foreground ring-primary"
                                  : "bg-card text-muted-foreground ring-border hover:bg-muted hover:text-foreground",
                                volume.phase === "mrv" &&
                                  !selected &&
                                  "ring-[oklch(0.64_0.135_32)]",
                                volume.phase === "deload" &&
                                  !selected &&
                                  "text-muted-foreground",
                              )}
                            >
                              <input
                                type="radio"
                                name="program-week"
                                value={volume.week}
                                checked={selected}
                                onChange={() => selectWeek(volume.week)}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                aria-label={`第${volume.week}週`}
                              />
                              <span aria-hidden="true">{volume.week}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <nav className="flex gap-1 overflow-x-auto border-b border-border print:hidden">
            {(
              [
                ["week", "今週のメニュー"],
                ["sheet", "スプレッドシート"],
                ["volume", "ボリューム"],
                ["guide", "解説"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "relative shrink-0 px-3 py-2 text-sm font-medium transition-colors",
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0",
                  tab === id
                    ? "text-foreground after:opacity-100"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {tab === "week" ? (
          <div className="space-y-4 pt-1 md:pt-2">
            <p className="text-xs text-muted-foreground">{MAIN_WARMUP}</p>
            {weekendToday ? (
              <>
                {restCards}
                {sessionGrid}
              </>
            ) : (
              <>
                {sessionGrid}
                {restCards}
              </>
            )}
            {weekVolume ? (
              <>
                <details className="md:hidden">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    今週のセット数
                  </summary>
                  <div className="mt-3">
                    <VolumeStrip volume={weekVolume} />
                  </div>
                </details>
                <div className="hidden md:block">
                  <VolumeStrip volume={weekVolume} />
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {tab === "sheet" ? (
          <div className="space-y-3 pt-1 md:pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                全16週・約{rows.length}行。Excelは6シート。Sheetsなら「貼る」で全行をコピー。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSheetAll((value) => !value)}
              >
                {sheetAll ? "今週だけ表示" : "全16週を表示"}
              </Button>
            </div>
            <SheetTable
              rows={sheetAll ? rows : weekRows}
              done={done}
              onToggle={toggleDone}
              showWeek={sheetAll}
            />
          </div>
        ) : null}

        {tab === "volume" ? (
          <div className="space-y-4 pt-1 md:pt-2">
            <VolumeTable
              volumes={volumes}
              currentWeek={week}
              onSelect={selectWeek}
            />
          </div>
        ) : null}

        {tab === "guide" ? (
          <div className="space-y-6 pt-1 md:pt-2">
            <GuidePanel />
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ToolsPanel({
  rms,
  setRms,
  onReset,
}: {
  rms: OneRMs;
  setRms: (next: OneRMs | ((prev: OneRMs) => OneRMs)) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LIFT_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={field.key} className="text-xs text-muted-foreground">
              {field.short}（kg）
            </Label>
            <Input
              id={field.key}
              type="number"
              step={2.5}
              min={0}
              className="h-9 font-mono text-[0.9375rem] tabular-nums"
              value={rms[field.key]}
              onChange={(event) => {
                const next = Number(event.currentTarget.value) || 0;
                setRms((prev) => ({
                  ...prev,
                  [field.key]: next,
                }));
              }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        OHPは未計測なら推定のまま開始し、Day CのRPEで±2.5〜5kgする。入力はブラウザに保存される。
        <Button variant="ghost" size="xs" className="ml-2" onClick={onReset}>
          <RotateCcw />
          初期値に戻す
        </Button>
      </p>
    </div>
  );
}

function ExerciseRow({
  row,
  checked,
  onToggle,
}: {
  row: ProgramRow;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3.5 md:py-3">
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle()}
        aria-label={`${row.exercise} 完了`}
        className="mt-0.5 size-4 after:-inset-3 data-checked:border-[oklch(0.7_0.055_145)] data-checked:bg-[oklch(0.7_0.055_145)] data-checked:text-[oklch(0.18_0.02_145)]"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn("text-[0.9375rem] font-medium", checked && "text-muted-foreground line-through")}>
          {row.order}. {row.exercise}
          {row.isMain ? (
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
              メイン
            </span>
          ) : null}
        </p>
        <p className="font-mono text-[1.0625rem] font-medium whitespace-nowrap tabular-nums sm:text-[1.125rem]">
          {row.sets} × {row.reps} @ {row.displayWeight}
          {row.percent1RM != null ? (
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {" "}
              {row.percent1RM}% / RPE{row.rpe}
            </span>
          ) : (
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {" "}
              RPE{row.rpe}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {row.muscles.map((muscle) => (
            <span
              key={muscle}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] ring-1",
                MUSCLE_TONE[muscle],
              )}
            >
              {LANDMARKS[muscle].label}
            </span>
          ))}
          <span className="text-[10px] text-muted-foreground">休憩 {row.restSec}</span>
        </div>
        <p className="text-xs text-muted-foreground">{row.notes}</p>
        {row.bjjNote ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-mono text-[10px]">BJJ</span> {row.bjjNote}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function SheetTable({
  rows,
  done,
  onToggle,
  showWeek = false,
}: {
  rows: ProgramRow[];
  done: Set<string>;
  onToggle: (id: string) => void;
  showWeek?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          この週の行がありません。週番号を選び直してください。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              {showWeek ? <TableHead>週</TableHead> : null}
              <TableHead>Day</TableHead>
              <TableHead>種目</TableHead>
              <TableHead>セット</TableHead>
              <TableHead>レップ</TableHead>
              <TableHead>重量</TableHead>
              <TableHead>%1RM</TableHead>
              <TableHead>RPE</TableHead>
              <TableHead>休憩</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>メモ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(done.has(row.id) && "text-muted-foreground")}
              >
                <TableCell>
                  <Checkbox
                    checked={done.has(row.id)}
                    onCheckedChange={() => onToggle(row.id)}
                    aria-label={`${row.exercise} 完了`}
                    className="data-checked:border-[oklch(0.7_0.055_145)] data-checked:bg-[oklch(0.7_0.055_145)] data-checked:text-[oklch(0.18_0.02_145)]"
                  />
                </TableCell>
                {showWeek ? (
                  <TableCell className="font-mono text-[0.8125rem]">
                    {row.week}
                  </TableCell>
                ) : null}
                <TableCell className="font-medium">
                  {row.dayId}
                  <div className="text-[10px] text-muted-foreground">{row.weekday}</div>
                </TableCell>
                <TableCell>
                  {row.exercise}
                  {row.isMain ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">メイン</span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-[0.8125rem]">{row.sets}</TableCell>
                <TableCell className="font-mono text-[0.8125rem]">{row.reps}</TableCell>
                <TableCell className="font-mono text-[0.8125rem]">
                  {row.displayWeight}
                </TableCell>
                <TableCell className="font-mono text-[0.8125rem] text-muted-foreground">
                  {row.percent1RM ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-[0.8125rem]">{row.rpe}</TableCell>
                <TableCell>{row.restSec}</TableCell>
                <TableCell>{row.muscleLabel}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {row.notes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function VolumeStrip({ volume }: { volume: WeeklyVolume }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium">今週のセット数</CardTitle>
        <CardDescription>
          作業週は胸・肩・僧帽・二頭・三頭がMAVを超える。MRV週は胸・肩・僧帽が上限。四頭は月フロント＋木バックでMEV以上、後面はデッド＋RDL。肩・僧帽・腕は日内集中を避け週内に分散。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MUSCLE_ORDER.map((muscle) => {
          const { mev, mav, mrv, label } = LANDMARKS[muscle];
          const sets = volume.sets[muscle];
          const flag = volume.flags[muscle];
          const max = Math.max(mrv, sets, 1);
          return (
            <div key={muscle} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span>{label}</span>
                <span className={cn("font-mono", FLAG_TONE[flag])}>
                  {sets} · {FLAG_JA[flag]}
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("absolute inset-y-0 left-0 rounded-full", FLAG_BAR[flag])}
                  style={{ width: `${Math.min(100, (sets / max) * 100)}%` }}
                />
                <span
                  className="absolute top-0 h-full w-px bg-white/25"
                  style={{ left: `${(mev / max) * 100}%` }}
                />
                <span
                  className="absolute top-0 h-full w-px bg-white/25"
                  style={{ left: `${(mav / max) * 100}%` }}
                />
                <span
                  className="absolute top-0 h-full w-px bg-[oklch(0.64_0.135_32)]"
                  style={{ left: `${(mrv / max) * 100}%` }}
                />
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                MEV {mev} / MAV {mav} / MRV {mrv}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function VolumeTable({
  volumes,
  currentWeek,
  onSelect,
}: {
  volumes: WeeklyVolume[];
  currentWeek: number;
  onSelect: (week: number) => void;
}) {
  const priority: Muscle[] = ["chest", "shoulders", "traps"];
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>週</TableHead>
            <TableHead>フェーズ</TableHead>
            {MUSCLE_ORDER.map((muscle) => (
              <TableHead
                key={muscle}
                className={cn(
                  priority.includes(muscle) ? "font-medium" : "text-muted-foreground",
                )}
              >
                {LANDMARKS[muscle].label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {volumes.map((volume) => (
            <TableRow
              key={volume.week}
              className={cn(
                "cursor-pointer",
                volume.week === currentWeek && "border-l-2 border-l-primary bg-muted",
              )}
              onClick={() => onSelect(volume.week)}
            >
              <TableCell className="font-medium">{volume.week}</TableCell>
              <TableCell>
                <Badge className={PHASE_TONE[volume.phase]}>{volume.phaseLabel}</Badge>
              </TableCell>
              {MUSCLE_ORDER.map((muscle) => (
                <TableCell
                  key={muscle}
                  className={cn(
                    "font-mono text-[0.8125rem]",
                    FLAG_TONE[volume.flags[muscle]],
                    priority.includes(muscle) &&
                      volume.phase === "mrv" &&
                      "font-semibold",
                  )}
                >
                  {volume.sets[muscle]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function GuidePanel() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="max-w-prose space-y-8">
        {SCIENCE_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-base font-medium">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <section className="space-y-3">
          <h2 className="text-base font-medium">ブロック一覧</h2>
          <dl className="space-y-3">
            {BLOCKS.map((block) => (
              <div key={block.id} className="border-b border-border/60 pb-3 last:border-0">
                <dt className="font-medium">
                  {block.id}. {block.name}（{block.weeks[0]}–{block.weeks[1]}週）
                </dt>
                <dd className="text-xs text-muted-foreground">{block.subtitle}</dd>
                <dd className="mt-1 text-sm text-muted-foreground">{block.focus}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <div className="space-y-4">
        <h2 className="text-base font-medium">種目と器具</h2>
        <p className="text-sm text-muted-foreground">
          懸垂バー、バーベルとプレート、ベンチ、プレートレイズ、自重のみ。
        </p>
        <div className="space-y-3">
          {EXERCISE_GUIDE.map((exercise) => (
            <div
              key={exercise.name}
              className="border-b border-border/60 pb-3 last:border-0"
            >
              <p className="font-medium">{exercise.name}</p>
              <p className="text-xs text-muted-foreground">{exercise.gear}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {exercise.cue}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
