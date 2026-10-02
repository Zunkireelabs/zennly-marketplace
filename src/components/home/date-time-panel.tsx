"use client";

import { useState } from "react";
import { pillClass } from "@/components/ui/pill";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const ANY_TIME = "Any time";
const PERIODS = [
  { label: "Morning", hint: "6 am – 12 pm" },
  { label: "Afternoon", hint: "12 – 5 pm" },
  { label: "Evening", hint: "5 – 9 pm" },
];
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const CUSTOM_TIME = /^(d{1,2}):(d{2}) (am|pm)$/;

/** Local-date key, "YYYY-MM-DD". Not toISOString(), which would shift the day across time zones. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "Thu, Oct 1" */
export function formatDay(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

function Month({
  year,
  month,
  today,
  selected,
  onSelect,
}: {
  year: number;
  month: number;
  today: Date;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div role="grid" aria-label={`${MONTHS[month]} ${year}`}>
      <div className="mb-1 grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-2">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const d = new Date(year, month, day);
          const key = dateKey(d);
          const past = d < today;
          const isToday = d.getTime() === today.getTime();
          const on = key === selected;
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              aria-pressed={on}
              aria-label={d.toDateString()}
              onClick={() => onSelect(key)}
              className={`relative mx-auto flex size-10 items-center justify-center rounded-full text-sm transition-colors duration-150 ${
                on
                  ? "bg-primary font-semibold text-primary-foreground"
                  : past
                    ? "cursor-not-allowed text-muted-foreground/40"
                    : "text-foreground hover:bg-muted"
              }`}
            >
              {day}
              {isToday && !on && <span className="absolute bottom-1 size-1 rounded-full bg-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomTime({ time, onTime }: { time: string; onTime: (t: string) => void }) {
  const match = CUSTOM_TIME.exec(time);
  const [hour, setHour] = useState(match?.[1] ?? "10");
  const [minute, setMinute] = useState(match?.[2] ?? "00");
  const [ap, setAp] = useState(match?.[3] ?? "am");
  const on = Boolean(match);

  const commit = (h: string, m: string, a: string) => onTime(`${h}:${m} ${a}`);
  const select =
    "w-full appearance-none rounded-full border bg-card py-2 pl-3.5 pr-7 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none " +
    (on ? "border-foreground" : "border-border hover:border-foreground/40");

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Hour</span>
          <select
            value={hour}
            className={select}
            onChange={(e) => {
              setHour(e.target.value);
              commit(e.target.value, minute, ap);
            }}
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
          <Chevron />
        </label>
        <span className="text-muted-foreground" aria-hidden>
          :
        </span>
        <label className="relative flex-1">
          <span className="sr-only">Minutes</span>
          <select
            value={minute}
            className={select}
            onChange={(e) => {
              setMinute(e.target.value);
              commit(hour, e.target.value, ap);
            }}
          >
            {MINUTE_OPTIONS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <Chevron />
        </label>
      </div>
      <div role="group" aria-label="am or pm" className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {["am", "pm"].map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={ap === a}
            onClick={() => {
              setAp(a);
              commit(hour, minute, a);
            }}
            className={`rounded-full py-1.5 text-sm transition-colors ${ap === a ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {a.toUpperCase()}
          </button>
        ))}
      </div>
      {!on && (
        <button
          type="button"
          onClick={() => commit(hour, minute, ap)}
          className={`${pillClass()} mt-3 w-full justify-center`}
        >
          Use {hour}:{minute} {ap}
        </button>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function DateTimePanel({
  date,
  time,
  onDate,
  onTime,
  onClear,
  onDone,
}: {
  date: string;
  time: string;
  onDate: (key: string) => void;
  onTime: (t: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const [today] = useState(startOfToday);
  // First month shown. Starts on the picked date's month so reopening lands where you left off.
  const [view, setView] = useState(() => {
    const base = date ? fromKey(date) : startOfToday();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const next = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
  const atStart = view.y === today.getFullYear() && view.m === today.getMonth();
  const step = (delta: number) =>
    setView((v) => {
      const t = v.y * 12 + v.m + delta;
      return { y: Math.floor(t / 12), m: t % 12 };
    });

  const quick = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    onDate(dateKey(d));
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const weekend = () => {
    // Next Saturday; today if it already is one.
    const d = new Date(today);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    onDate(dateKey(d));
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const arrow = (dir: "prev" | "next", onClick: () => void, disabled = false, extra = "") => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      className={`flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:text-muted-foreground/40 disabled:hover:bg-transparent ${extra}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === "prev" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
      </svg>
    </button>
  );

  const chip = (on: boolean) => pillClass({ selected: on, size: "sm" });

  return (
    <div className="max-h-[70vh] overflow-y-auto overscroll-contain p-5 [scrollbar-width:none] sm:max-h-none sm:overflow-visible sm:p-7 [&::-webkit-scrollbar]:hidden">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_1px_15rem] sm:gap-7">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className={chip(date === dateKey(today))} onClick={() => quick(0)}>
              Today
            </button>
            <button type="button" className={chip(false)} onClick={() => quick(1)}>
              Tomorrow
            </button>
            <button type="button" className={chip(false)} onClick={weekend}>
              This weekend
            </button>
          </div>

          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {[view, next].map((mo, idx) => (
              <div key={`${mo.y}-${mo.m}`} className={idx === 1 ? "hidden sm:block" : ""}>
                <div className="mb-2 flex h-8 items-center justify-between">
                  {idx === 0 ? arrow("prev", () => step(-1), atStart) : <span />}
                  <p className="text-sm font-medium text-foreground">
                    {MONTHS[mo.m]} {mo.y}
                  </p>
                  {idx === 1 ? arrow("next", () => step(1)) : arrow("next", () => step(1), false, "sm:hidden")}
                  {idx === 0 && <span className="hidden size-8 sm:block" />}
                </div>
                <Month year={mo.y} month={mo.m} today={today} selected={date} onSelect={onDate} />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden bg-border sm:block" />

        <div className="sm:max-h-[26rem] sm:overflow-y-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
          <p className="mb-3 text-xs font-medium text-foreground">Time</p>
          <button type="button" className={`${chip(time === ANY_TIME)} mb-3`} onClick={() => onTime(ANY_TIME)}>
            {ANY_TIME}
          </button>
          <ul className="mb-4 flex flex-col gap-2">
            {PERIODS.map((p) => {
              const on = time === p.label;
              return (
                <li key={p.label}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onTime(p.label)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                      on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-muted"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? "border-background" : "border-muted-foreground/60"}`}
                    >
                      {on && <span className="size-2 rounded-full bg-background" />}
                    </span>
                    <span className="flex-1">{p.label}</span>
                    <span className={`text-xs ${on ? "text-background/70" : "text-muted-foreground"}`}>{p.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mb-2 text-xs font-medium text-foreground">Or set your own</p>
          <CustomTime time={time} onTime={onTime} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-[var(--radius-md)] bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Done
        </button>
      </div>
    </div>
  );
}
