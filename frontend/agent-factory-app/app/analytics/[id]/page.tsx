"use client";

import { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale, useT } from "@/components/IntlProviderClient";
import { DateRange, DateRangePicker, resolveDateRange } from "@/components/date-range-picker";
import { AgentAnalytics, AgentFactoryApiError, fetchAgentAnalytics, fetchAnalyticsAgents } from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const TOPIC_COLORS = ["var(--blue)", "var(--success)", "#8b6bf2", "#f5a524", "#2bb7da", "var(--danger)", "#e879c6", "#9bd04b"];

const DAILY_CHART_MODES = ["both", "bars", "line"] as const;
type DailyChartMode = (typeof DAILY_CHART_MODES)[number];

export default function AgentAnalyticsPage() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams();
  const id = String(params.id);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>({ kind: "days", days: 30 });
  const [data, setData] = useState<AgentAnalytics | null>(null);
  // Rango (días) al que corresponde `data`: el eje X se arma con él y no con
  // `range`, que ya puede haber cambiado mientras llega la respuesta nueva.
  const [loadedDays, setLoadedDays] = useState<{ from: string; to: string } | null>(null);
  const [dailyChartMode, setDailyChartMode] = useState<DailyChartMode>("both");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // El backend agrega por día y toma la fecha tal cual viene en el
      // instante (sin convertir zona), así que se manda el día elegido en UTC
      // para que llegue exactamente esa fecha, de 00:00 a 23:59.
      const { from, to } = resolveDateRange(range);
      const [result, agents] = await Promise.all([
        fetchAgentAnalytics(id, `${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`),
        fetchAnalyticsAgents()
      ]);
      setData(result);
      setLoadedDays({ from, to });
      setAgentName(agents.find((agent) => agent.id === id)?.name ?? null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [id, range]);

  useEffect(() => {
    load();
  }, [load]);

  // El backend solo devuelve los días con preguntas; aquí se rellenan con 0
  // los demás para que el eje X muestre el rango completo.
  const dailyChartData = useMemo(() => {
    if (!loadedDays) return [];
    const countByDate = new Map((data?.byDay ?? []).map((point) => [point.date, point.count]));
    return daysBetween(loadedDays.from, loadedDays.to)
      .map((date) => ({ label: formatShortDate(date, locale), count: countByDate.get(date) ?? 0 }));
  }, [data, loadedDays, locale]);
  // Con 90 días de datos, mostrar todas las etiquetas las amontona y se
  // vuelven ilegibles -- se salta lo necesario para que queden ~10 visibles
  // sin importar el largo del rango seleccionado.
  const dailyTickInterval = Math.max(0, Math.ceil(dailyChartData.length / 10) - 1);

  const hourlyChartData = useMemo(() => {
    const byHour = new Map((data?.byHour ?? []).map((point) => [point.hour, point.count]));
    return Array.from({ length: 24 }, (_, hour) => ({ label: `${hour}h`, count: byHour.get(hour) ?? 0 }));
  }, [data]);

  // Barras apiladas por despliegue: con conocimiento + sin conocimiento = total.
  const deploymentBars = useMemo(
    () => (data?.byDeployment ?? []).map((item) => ({
      label: item.name ?? t("analytics.deploymentDeleted"),
      channel: item.channelType ? t(`deployments.channel.${item.channelType.toLowerCase()}`) : null,
      known: item.totalQuestions - item.fallbackCount,
      unknown: item.fallbackCount,
      total: item.totalQuestions
    })),
    [data, t]
  );

  // Porciones del pastel por tema. "Sin tema" va siempre en gris y al final,
  // para que no compita visualmente con los temas reales.
  const topicSlices = useMemo(() => {
    const points = data?.byTopic ?? [];
    const total = points.reduce((sum, point) => sum + point.count, 0);
    let colorIndex = 0;
    return points
      .filter((point) => point.count > 0)
      .sort((left, right) => Number(left.topicId === "") - Number(right.topicId === "") || right.count - left.count)
      .map((point) => ({
        key: point.topicId || "none",
        label: point.topicId === "" ? t("analytics.topicNone") : point.label ?? t("analytics.topicDeleted", { id: point.topicId }),
        count: point.count,
        percent: Math.round((point.count / total) * 100),
        color: point.topicId === "" ? "var(--muted)" : TOPIC_COLORS[colorIndex++ % TOPIC_COLORS.length]
      }));
  }, [data, t]);

  // Solo la primera carga reemplaza la vista: al refrescar o cambiar de rango
  // se mantienen los datos visibles hasta que llegan los nuevos.
  if (loading && !data) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("analytics.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card analytics-header">
        <div>
          <span className="eyebrow blue">{t("analytics.eyebrow")}</span>
          <h2>{t("analytics.title")}{agentName ? ` · ${agentName}` : ""}</h2>
          <p>{t("analytics.description")}</p>
        </div>
        <div className="intro-card-actions">
          <DateRangePicker value={range} onChange={setRange} />
          <button
            className={`icon-button${loading ? "spinning" : ""}`}
            type="button"
            onClick={load}
            disabled={loading}
            aria-label={t(loading ? "analytics.refreshing" : "analytics.refresh")}
            title={t(loading ? "analytics.refreshing" : "analytics.refresh")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.3L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.3 4.3L20 15" /><path d="M20 20v-5h-5" /></svg>
          </button>
          <Link className="icon-button" href="/analytics" aria-label={t("analytics.back")} title={t("analytics.back")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>
          </Link>
        </div>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      {data ? (
        <>
          <section className="analytics-stats">
            <div className="stat-card blue">
              <span className="stat-label">{t("analytics.totalQuestions")}</span>
              <strong className="stat-value">{data.totalQuestions}</strong>
              <StatDelta current={data.totalQuestions} previous={data.previous.totalQuestions} data={data} />
            </div>
            <div className="stat-card success">
              <span className="stat-label">{t("analytics.uniqueVisitors")}</span>
              <strong className="stat-value">{data.uniqueVisitors}</strong>
              <StatDelta current={data.uniqueVisitors} previous={data.previous.uniqueVisitors} data={data} />
            </div>
            <div className="stat-card purple">
              <span className="stat-label">{t("analytics.returningVisitors")}</span>
              <strong className="stat-value">{data.returningVisitors}</strong>
              <StatDelta current={data.returningVisitors} previous={data.previous.returningVisitors} data={data} />
            </div>
            <div className="stat-card danger">
              <span className="stat-label">{t("analytics.fallbackRate")}</span>
              <strong className="stat-value">{data.fallbackCount} <small>{Math.round(data.fallbackRate * 100)}%</small></strong>
              <StatDelta
                current={data.fallbackRate}
                previous={data.previous.totalQuestions ? data.previous.fallbackRate : null}
                data={data}
                unit="points"
                lowerIsBetter
              />
            </div>
            <div className="stat-card amber">
              <span className="stat-label">{t("analytics.suggestionUsed")}</span>
              <strong className="stat-value">{data.suggestionUsedCount}</strong>
              <StatDelta current={data.suggestionUsedCount} previous={data.previous.suggestionUsedCount} data={data} />
            </div>
          </section>

          <CollapsiblePanel
            title={t("analytics.byDayTitle")}
            actions={(
              <div className="segmented-control" role="group" aria-label={t("analytics.chartMode.label")}>
                {DAILY_CHART_MODES.map((mode) => (
                  <button key={mode} type="button" className={dailyChartMode === mode ? "active" : ""} aria-pressed={dailyChartMode === mode} onClick={() => setDailyChartMode(mode)}>
                    {t(`analytics.chartMode.${mode}`)}
                  </button>
                ))}
              </div>
            )}
          >
            {data.byDay.length ? (
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={dailyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                    {dailyChartMode !== "line" ? <Bar dataKey="count" fill="var(--blue)" radius={[5, 5, 2, 2]} maxBarSize={28} /> : null}
                    {dailyChartMode !== "bars" ? (
                      <Line
                        dataKey="count"
                        type="monotone"
                        stroke="var(--success)"
                        strokeWidth={2}
                        dot={dailyChartData.length <= 31 ? { r: 3, fill: "var(--success)", strokeWidth: 0 } : false}
                        activeDot={{ r: 4 }}
                      />
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="muted-copy">{t("analytics.empty")}</p>
            )}
          </CollapsiblePanel>

          <CollapsiblePanel title={t("analytics.byHourTitle")}>
            <p className="section-description">{t("analytics.byHourHint")}</p>
            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={hourlyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourly-area-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--blue)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" interval={1} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<AnalyticsTooltip />} cursor={{ stroke: "var(--blue)", strokeOpacity: 0.4 }} />
                  <Area dataKey="count" type="monotone" stroke="var(--blue)" strokeWidth={2} fill="url(#hourly-area-fill)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CollapsiblePanel>

          <div className="analytics-panel-row">
            <CollapsiblePanel title={t("analytics.byDeploymentTitle")}>
              <p className="section-description">{t("analytics.byDeploymentHint")}</p>
              {deploymentBars.length ? (
                <>
                  <div className="analytics-chart stacked-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={deploymentBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                        {/* shared={false}: el tooltip describe solo la porción bajo el cursor, no la barra entera. */}
                        <Tooltip shared={false} content={<DeploymentTooltip />} cursor={{ fill: "var(--blue-soft)" }} />
                        <Bar dataKey="known" name={t("analytics.withKnowledge")} stackId="questions" fill="var(--blue)" maxBarSize={56}>
                          <LabelList dataKey="known" position="center" formatter={segmentLabel} fill="#fff" fontSize={12} fontWeight={800} />
                        </Bar>
                        <Bar dataKey="unknown" name={t("analytics.fallbackRate")} stackId="questions" fill="var(--danger)" radius={[5, 5, 0, 0]} maxBarSize={56}>
                          <LabelList dataKey="unknown" position="center" formatter={segmentLabel} fill="#fff" fontSize={12} fontWeight={800} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="chart-legend">
                    <li><i style={{ background: "var(--blue)" }} aria-hidden="true" /><span>{t("analytics.withKnowledge")}</span></li>
                    <li><i style={{ background: "var(--danger)" }} aria-hidden="true" /><span>{t("analytics.fallbackRate")}</span></li>
                  </ul>
                </>
              ) : (
                <p className="muted-copy">{t("analytics.empty")}</p>
              )}
            </CollapsiblePanel>

            <CollapsiblePanel title={t("analytics.byTopicTitle")}>
              <p className="section-description">{t("analytics.byTopicHint")}</p>
              {topicSlices.length ? (
                <>
                  <div className="analytics-chart donut-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Tooltip content={<TopicTooltip />} />
                        <Pie data={topicSlices} dataKey="count" nameKey="label" innerRadius={62} outerRadius={98} paddingAngle={topicSlices.length > 1 ? 2 : 0} stroke="none">
                          {topicSlices.map((slice) => <Cell key={slice.key} fill={slice.color} />)}
                          <LabelList dataKey="count" position="inside" fill="#fff" stroke="none" fontSize={12} fontWeight={800} />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center" aria-hidden="true">
                      <strong>{data.totalQuestions}</strong>
                      <span>{t("analytics.donutTotal")}</span>
                    </div>
                  </div>
                  <ul className="chart-legend">
                    {topicSlices.map((slice) => (
                      <li key={slice.key}>
                        <i style={{ background: slice.color }} aria-hidden="true" />
                        <span>{slice.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted-copy">{t("analytics.empty")}</p>
              )}
            </CollapsiblePanel>
          </div>

          <CollapsiblePanel title={t("analytics.topQuestionsTitle")}>
            {data.topQuestions.length ? (
              <ol className="top-questions-list">
                {data.topQuestions.map((item) => (
                  <li key={item.question} style={shareStyle(item.count, data.topQuestions)}>
                    <span>{item.question}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted-copy">{t("analytics.empty")}</p>
            )}
          </CollapsiblePanel>

          <CollapsiblePanel title={t("analytics.topFallbackTitle")}>
            <p className="section-description">{t("analytics.topFallbackHint")}</p>
            {data.topFallbackQuestions.length ? (
              <ol className="top-questions-list fallback">
                {data.topFallbackQuestions.map((item) => (
                  <li key={item.question} style={shareStyle(item.count, data.topFallbackQuestions)}>
                    <span>{item.question}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted-copy">{t("analytics.topFallbackEmpty")}</p>
            )}
          </CollapsiblePanel>
        </>
      ) : null}
    </div>
  );
}

function formatDecimal(value: number | null, locale: string): string {
  if (value === null) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

/**
 * Variación de un KPI frente al periodo anterior (los mismos N días justo
 * antes del rango). `unit="points"` es para tasas (0-1): se muestra la
 * diferencia en puntos porcentuales, no el cambio relativo. Con
 * `lowerIsBetter` una subida se pinta como mala (p. ej. "sin respuesta").
 */
function StatDelta({ current, previous, data, unit = "percent", lowerIsBetter = false }: {
  current: number | null;
  previous: number | null;
  data: AgentAnalytics;
  unit?: "percent" | "points";
  lowerIsBetter?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const previousRange = `${formatLongDate(data.previousFrom, locale)} – ${formatLongDate(data.previousTo, locale)}`;
  // Sin base de comparación: no hubo datos antes (o ahora no hay ratio).
  if (current === null || previous === null || (unit === "percent" && previous === 0)) {
    return <small className="stat-delta flat" title={previousRange}>{t("analytics.delta.noPrevious")}</small>;
  }
  const change = unit === "points" ? Math.round((current - previous) * 100) : Math.round(((current - previous) / previous) * 100);
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const tone = direction === "flat" ? "flat" : (direction === "up") === lowerIsBetter ? "bad" : "good";
  const previousValue = unit === "points" ? `${Math.round(previous * 100)}%` : formatDecimal(previous, locale);
  return (
    <small className={`stat-delta ${tone}`} title={t("analytics.delta.tooltip", { value: previousValue, range: previousRange })}>
      {direction === "up" ? "▲" : direction === "down" ? "▼" : "="} {t(unit === "points" ? "analytics.delta.points" : "analytics.delta.percent", { value: Math.abs(change) })}
    </small>
  );
}

function formatLongDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

/** Panel de analíticas con cabecera plegable; `actions` solo se muestra expandido. */
function CollapsiblePanel({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const t = useT();
  const [expanded, setExpanded] = useState(true);
  return (
    <section className={`analytics-panel ${expanded ? "" : "collapsed"}`}>
      <div className="analytics-panel-heading">
        <h3>
          <button
            className="analytics-panel-toggle"
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            title={t(expanded ? "analytics.collapse" : "analytics.expand")}
          >
            <span className="agent-toggle-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
            </span>
            {title}
          </button>
        </h3>
        {expanded ? actions : null}
      </div>
      {expanded ? children : null}
    </section>
  );
}

/** Ancho de la barra de fondo de cada fila: proporcional a la pregunta con más repeticiones de su lista. */
function shareStyle(count: number, items: { count: number }[]): CSSProperties {
  const max = Math.max(1, ...items.map((item) => item.count));
  return { "--share": `${(count / max) * 100}%` } as CSSProperties;
}

type DeploymentBar = { label: string; channel: string | null; known: number; unknown: number; total: number };

/** Valor dentro de cada porción de la barra; las porciones en 0 no llevan etiqueta. */
function segmentLabel(value: unknown): string {
  return value ? String(value) : "";
}

/** Tooltip de una sola porción (con o sin conocimiento) y el % que representa dentro de su despliegue. */
function DeploymentTooltip({ active, payload }: { active?: boolean; payload?: { dataKey?: string | number; name?: string; value?: number; payload?: DeploymentBar }[] }) {
  const segment = payload?.[0];
  const bar = segment?.payload;
  if (!active || !segment || !bar) return null;
  const value = segment.value ?? 0;
  const percent = bar.total ? Math.round((value / bar.total) * 100) : 0;
  return (
    <div className="analytics-tooltip">
      <strong>{bar.label}{bar.channel ? ` · ${bar.channel}` : ""}</strong>
      <small>{segment.name}</small>
      <span style={{ color: segment.dataKey === "unknown" ? "var(--danger)" : "var(--blue)" }}>{value} · {percent} %</span>
    </div>
  );
}

/** Tooltip de una porción del pastel: cantidad de preguntas del tema y el % que representa del total. */
function TopicTooltip({ active, payload }: { active?: boolean; payload?: { payload?: { label: string; count: number; percent: number; color: string } }[] }) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{slice.label}</strong>
      <span style={{ color: slice.color }}>{slice.count} · {slice.percent} %</span>
    </div>
  );
}

function AnalyticsTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      {/* En el pastel no hay eje X: la etiqueta de la porción viene en el payload. */}
      <strong>{label ?? payload[0]?.name}</strong>
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

/** Todos los días `YYYY-MM-DD` entre dos fechas, ambas incluidas. */
function daysBetween(from: string, to: string): string[] {
  const [year, month, day] = from.split("-").map(Number);
  const days: string[] = [];
  for (let offset = 0; ; offset += 1) {
    const date = new Date(year, month - 1, day + offset);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (value > to) return days;
    days.push(value);
  }
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}
