"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/components/IntlProviderClient";
import { AgentFactoryApiError, AnalyticsAgent, fetchAnalyticsAgents } from "@/lib/agent-factory-api";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export default function AnalyticsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [agents, setAgents] = useState<AnalyticsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAgents(await fetchAnalyticsAgents());
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("analyticsList.loading")}</section>;
  }

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("analyticsList.eyebrow")}</span>
          <h2>{t("analyticsList.title")}</h2>
          <p>{t("analyticsList.description")}</p>
        </div>
        <span className="count-badge">{t(agents.length === 1 ? "analyticsList.count.one" : "analyticsList.count.other", { count: agents.length })}</span>
      </section>

      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      <section className="knowledge-list">
        {agents.length ? (
          <div className="knowledge-items">
            {agents.map((agent) => (
              <article className="knowledge-item analytics-list-item" key={agent.id}>
                <div>
                  <span className="eyebrow analytics-business-label">{agent.businessName ?? t("analyticsList.noBusiness")}</span>
                  <span className={`agent-lifecycle-badge ${agent.status === "READY" ? "indexed" : "created-unindexed"}`}>
                    {t(`analyticsList.status.${agent.status.toLowerCase()}`)}
                  </span>
                  <h3>{agent.name}</h3>
                  <p>{agent.description || t("analyticsList.noDescription")}</p>
                  <small>{t("analyticsList.updatedAt", { date: formatDate(agent.updatedAt, locale) })}</small>
                </div>
                <div className="knowledge-meta">
                  <strong>{t("analyticsList.knowledgeBaseCount", { count: agent.knowledgeBaseCount })}</strong>
                  <span>{agent.knowledgeBaseNames.slice(0, 3).join(", ") || t("analyticsList.noLinkedBases")}</span>
                  <div className="item-actions">
                    <Link className="primary-button" href={`/analytics/${agent.id}`}>
                      {t("analyticsList.viewAction")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact"><span aria-hidden="true">0</span><strong>{t("analyticsList.emptyTitle")}</strong><p>{t("analyticsList.emptyDescription")}</p></div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}
