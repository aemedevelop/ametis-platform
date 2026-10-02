"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale, useT } from "@/components/IntlProviderClient";
import { AgentAnalytics, AgentFactoryApiError, fetchAgentAnalytics, fetchAgents } from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const RANGE_PRESETS = [7, 30, 90] as const;
type RangePreset = (typeof RANGE_PRESETS)[number];

export default function AgentAnalyticsPage() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams();
  const id = String(params.id);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<RangePreset>(30);
  const [data, setData] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const to = new Date();
      const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
      const [result, agents] = await Promise.all([
        fetchAgentAnalytics(id, from.toISOString(), to.toISOString()),
        fetchAgents()
      ]);
      setData(result);
      setAgentName(agents.find((agent) => agent.id === id)?.name ?? null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [id, rangeDays]);

  useEffect(() => {
    load();
  }, [load]);

  const dailyChartData = useMemo(
    () => (data?.byDay ?? []).map((point) => ({ label: formatShortDate(point.date, locale), count: point.count })),
    [data, locale]
  );
  // Con 90 días de datos, mostrar todas las etiquetas las amontona y se
  // vuelven ilegibles -- se salta lo necesario para que queden ~10 visibles
  // sin importar el largo del rango seleccionado.
  const dailyTickInterval = Math.max(0, Math.ceil(dailyChartData.length / 10) - 1);

  const hourlyChartData = useMemo(() => {
    const byHour = new Map((data?.byHour ?? []).map((point) => [point.hour, point.count]));
    return Array.from({ length: 24 }, (_, hour) => ({ label: `${hour}h`, count: byHour.get(hour) ?? 0 }));
  }, [data]);

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("analytics.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("analytics.eyebrow")}</span>
          <h2>{t("analytics.title")}{agentName ? ` · ${agentName}` : ""}</h2>
          <p>{t("analytics.description")}</p>
        </div>
        <Link className="small-action" href="/analytics">{t("analytics.back")}</Link>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <div className="analytics-range">
        {RANGE_PRESETS.map((days) => (
          <button key={days} type="button" className={rangeDays === days ? "active" : ""} onClick={() => setRangeDays(days)}>
            {t("analytics.rangeDays", { count: days })}
          </button>
        ))}
      </div>

      {data ? (
        <>
          <section className="analytics-stats">
            <div className="stat-card blue">
              <span className="stat-label">{t("analytics.totalQuestions")}</span>
              <strong className="stat-value">{data.totalQuestions}</strong>
            </div>
            <div className="stat-card success">
              <span className="stat-label">{t("analytics.uniqueVisitors")}</span>
              <strong className="stat-value">{data.uniqueVisitors}</strong>
            </div>
            <div className="stat-card purple">
              <span className="stat-label">{t("analytics.returningVisitors")}</span>
              <strong className="stat-value">{data.returningVisitors}</strong>
            </div>
            <div className="stat-card danger">
              <span className="stat-label">{t("analytics.fallbackRate")}</span>
              <strong className="stat-value">{Math.round(data.fallbackRate * 100)}%</strong>
              <small>{t("analytics.fallbackCount", { count: data.fallbackCount })}</small>
            </div>
            <div className="stat-card amber">
              <span className="stat-label">{t("analytics.suggestionUsed")}</span>
              <strong className="stat-value">{data.suggestionUsedCount}</strong>
            </div>
          </section>

          <section className="analytics-panel">
            <h3>{t("analytics.byDayTitle")}</h3>
            {data.byDay.length ? (
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      interval={dailyTickInterval}
                      tick={{ fill: "var(--muted)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--line)" }}
                      tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<AnalyticsTooltip />} cursor={{ fill: "var(--blue-soft)" }} />
                    <Bar dataKey="count" fill="var(--blue)" radius={[5, 5, 2, 2]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="muted-copy">{t("analytics.empty")}</p>
            )}
          </section>

          <section className="analytics-panel">
            <h3>{t("analytics.byHourTitle")}</h3>
            <p className="section-description">{t("analytics.byHourHint")}</p>
            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={hourlyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" interval={1} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<AnalyticsTooltip />} cursor={{ fill: "var(--blue-soft)" }} />
                  <Bar dataKey="count" fill="var(--blue)" radius={[4, 4, 2, 2]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="analytics-panel">
            <h3>{t("analytics.topQuestionsTitle")}</h3>
            {data.topQuestions.length ? (
              <ol className="top-questions-list">
                {data.topQuestions.map((item) => (
                  <li key={item.question}>
                    <span>{item.question}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted-copy">{t("analytics.empty")}</p>
            )}
          </section>

          <section className="analytics-panel">
            <h3>{t("analytics.topFallbackTitle")}</h3>
            <p className="section-description">{t("analytics.topFallbackHint")}</p>
            {data.topFallbackQuestions.length ? (
              <ol className="top-questions-list fallback">
                {data.topFallbackQuestions.map((item) => (
                  <li key={item.question}>
                    <span>{item.question}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted-copy">{t("analytics.topFallbackEmpty")}</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function AnalyticsTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{label}</strong>
      <span>{payload[0]?.value ?? 0}</span>
    </div>
  );
}

/**
 * "27 sep" en vez de "27/9". Construir la fecha a partir de los componentes
 * (no parseando el string ISO completo) evita el corrimiento de un día que
 * daría `new Date("2026-09-27")` según la zona horaria del navegador.
 */
function formatShortDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(".", "");
  return `${day} ${monthLabel}`;
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}
