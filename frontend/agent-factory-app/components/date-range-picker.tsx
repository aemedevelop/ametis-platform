"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/components/IntlProviderClient";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Rango de fechas al estilo del selector de Kibana: rangos rápidos relativos
 * (se recalculan contra "hoy" cada vez que se resuelven, así un refresco al
 * día siguiente avanza solo) o un rango fijo elegido a mano. Las fechas fijas
 * van como `YYYY-MM-DD` en hora local del navegador.
 */
export type DateRange =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "days"; days: number }
  | { kind: "custom"; from: string; to: string };

const QUICK_RANGES: DateRange[] = [
  { kind: "today" },
  { kind: "yesterday" },
  { kind: "days", days: 7 },
  { kind: "days", days: 30 },
  { kind: "days", days: 90 },
  { kind: "days", days: 365 }
];

/** Días inclusivos: "últimos 7 días" = hoy y los 6 anteriores. */
export function resolveDateRange(range: DateRange): { from: string; to: string } {
  const today = new Date();
  if (range.kind === "custom") return { from: range.from, to: range.to };
  if (range.kind === "today") return { from: toDateValue(today), to: toDateValue(today) };
  if (range.kind === "yesterday") {
    const yesterday = addDays(today, -1);
    return { from: toDateValue(yesterday), to: toDateValue(yesterday) };
  }
  return { from: toDateValue(addDays(today, -(range.days - 1))), to: toDateValue(today) };
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [viewMonth, setViewMonth] = useState(() => monthOf(toDateValue(new Date())));
  const containerRef = useRef<HTMLDivElement>(null);
  const today = toDateValue(new Date());
  const currentMonth = monthOf(today);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      const current = resolveDateRange(value);
      setDraftFrom(current.from);
      setDraftTo(current.to);
      setViewMonth(monthOf(current.to));
    }
    setOpen((current) => !current);
  }

  function pick(range: DateRange) {
    onChange(range);
    setOpen(false);
  }

  // Primer clic = inicio (descarta la selección anterior); segundo clic =
  // fin, ordenando si se eligió un día anterior al inicio.
  function pickDay(day: string) {
    if (!draftFrom || draftTo) {
      setDraftFrom(day);
      setDraftTo("");
    } else if (day < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(day);
    } else {
      setDraftTo(day);
    }
  }

  function applyCustom() {
    if (!draftFrom) return;
    // Sin segundo clic es un solo día.
    pick({ kind: "custom", from: draftFrom, to: draftTo || draftFrom });
  }

  // Nunca pasa del mes actual: no hay analíticas de fechas futuras.
  function shiftMonth(delta: number) {
    setViewMonth((current) => {
      const shifted = new Date(current.year, current.month + delta, 1);
      const last = new Date(currentMonth.year, currentMonth.month, 1);
      const target = shifted > last ? last : shifted;
      return { year: target.getFullYear(), month: target.getMonth() };
    });
  }

  const label = rangeLabel(value, locale, t);
  const draftEnd = draftTo || draftFrom;
  const atCurrentMonth = viewMonth.year === currentMonth.year && viewMonth.month === currentMonth.month;

  return (
    <div className="date-range" ref={containerRef}>
      <button
        className="date-range-trigger"
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("dateRange.triggerLabel", { range: label })}
        title={t("dateRange.triggerTitle")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
        <span>{label}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
      </button>

      {open ? (
        <div className="date-range-popover" role="dialog" aria-label={t("dateRange.triggerTitle")}>
          <div className="date-range-quick">
            <h4>{t("dateRange.quickTitle")}</h4>
            {QUICK_RANGES.map((range) => (
              <button
                key={range.kind === "days" ? `days-${range.days}` : range.kind}
                type="button"
                className={sameRange(range, value) ? "active" : ""}
                onClick={() => pick(range)}
              >
                {rangeLabel(range, locale, t)}
              </button>
            ))}
          </div>
          <div className="date-range-custom">
            <h4>{t("dateRange.customTitle")}</h4>
            <div className="date-range-month">
              <button className="icon-button" type="button" onClick={() => shiftMonth(-12)} aria-label={t("dateRange.previousYear")} title={t("dateRange.previousYear")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 6-6 6 6 6" /><path d="m18 6-6 6 6 6" /></svg>
              </button>
              <button className="icon-button" type="button" onClick={() => shiftMonth(-1)} aria-label={t("dateRange.previousMonth")} title={t("dateRange.previousMonth")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
              </button>
              <strong>{formatMonth(viewMonth, locale)}</strong>
              <button className="icon-button" type="button" onClick={() => shiftMonth(1)} disabled={atCurrentMonth} aria-label={t("dateRange.nextMonth")} title={t("dateRange.nextMonth")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
              </button>
              <button className="icon-button" type="button" onClick={() => shiftMonth(12)} disabled={atCurrentMonth} aria-label={t("dateRange.nextYear")} title={t("dateRange.nextYear")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 6 6-6 6" /><path d="m12 6 6 6-6 6" /></svg>
              </button>
            </div>
            <div className="date-range-grid">
              {weekdayLabels(locale).map((weekday) => <span className="date-range-weekday" key={weekday}>{weekday}</span>)}
              {monthCells(viewMonth).map((day, index) => day ? (
                <button
                  key={day}
                  type="button"
                  className={dayClassName(day, draftFrom, draftEnd, today)}
                  onClick={() => pickDay(day)}
                  disabled={day > today}
                  aria-pressed={Boolean(draftFrom) && day >= draftFrom && day <= draftEnd}
                  aria-label={formatDate(day, locale)}
                >
                  {Number(day.slice(8))}
                </button>
              ) : <span key={`blank-${index}`} />)}
            </div>
            <div className="date-range-summary">
              <div>
                <span>{t("dateRange.from")}</span>
                <strong>{draftFrom ? formatDate(draftFrom, locale) : "—"}</strong>
              </div>
              <div>
                <span>{t("dateRange.to")}</span>
                <strong>{draftFrom ? formatDate(draftEnd, locale) : "—"}</strong>
              </div>
            </div>
            <div className="date-range-footer">
              <small>{t("dateRange.singleDayHint")}</small>
              <button className="primary-button" type="button" onClick={applyCustom} disabled={!draftFrom}>{t("dateRange.apply")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Month = { year: number; month: number };

function monthOf(value: string): Month {
  const [year, month] = value.split("-").map(Number);
  return { year, month: month - 1 };
}

/** Celdas del mes con semana de lunes a domingo; `null` rellena los huecos previos al día 1. */
function monthCells({ year, month }: Month): (string | null)[] {
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => toDateValue(new Date(year, month, index + 1)))
  ];
}

function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // 1 de enero de 2024 fue lunes.
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 0, index + 1)).replace(".", ""));
}

function formatMonth({ year, month }: Month, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function dayClassName(day: string, from: string, end: string, today: string): string {
  const classes = ["date-range-day"];
  if (from && day >= from && day <= end) classes.push("in-range");
  if (day === from) classes.push("range-start");
  if (from && day === end) classes.push("range-end");
  if (day === today) classes.push("today");
  return classes.join(" ");
}

function rangeLabel(range: DateRange, locale: string, t: Translate): string {
  if (range.kind === "today") return t("dateRange.today");
  if (range.kind === "yesterday") return t("dateRange.yesterday");
  if (range.kind === "days") return range.days === 365 ? t("dateRange.lastYear") : t("dateRange.lastDays", { count: range.days });
  if (range.from === range.to) return formatDate(range.from, locale);
  return `${formatDate(range.from, locale)} – ${formatDate(range.to, locale)}`;
}

function sameRange(left: DateRange, right: DateRange): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "days" && right.kind === "days") return left.days === right.days;
  return left.kind !== "custom";
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A partir de los componentes, no del string ISO: evita el corrimiento de un día por zona horaria. */
function formatDate(value: string, locale: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}
