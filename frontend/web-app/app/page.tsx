"use client";

import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { useT } from "@/components/IntlProviderClient";
import { SOLUTION_VERTICALS, TOOL_NAV_ITEMS } from "@/lib/navigation";

const capabilityCards = [
  { titleKey: "landing.capability.semantic.title", textKey: "landing.capability.semantic.text" },
  { titleKey: "landing.capability.selfService.title", textKey: "landing.capability.selfService.text" },
  { titleKey: "landing.capability.governance.title", textKey: "landing.capability.governance.text" }
];

const heroStats = [
  { labelKey: "landing.hero.stat.queries", value: "1.2M", valueClassName: "text-cyanAccent" },
  { labelKey: "landing.hero.stat.insightTime", value: "-37%", valueClassName: "text-brand-200" },
  { labelKey: "landing.hero.stat.sla", value: "99.95%", valueClassName: "text-brand-100" }
];

const infoCards = [
  { id: "planes", titleKey: "landing.info.pricing.title", textKey: "landing.info.pricing.text" },
  { id: "recursos", titleKey: "landing.info.resources.title", textKey: "landing.info.resources.text" },
  { id: "comunidad", titleKey: "landing.info.community.title", textKey: "landing.info.community.text" }
];

const verticalMarketingContent: Record<string, { objectiveKey: string; bulletKeys: string[] }> = {
  "mercantile-intelligence": {
    objectiveKey: "vertical.mercantileIntelligence.objective",
    bulletKeys: [
      "vertical.mercantileIntelligence.bullet.marketTrends",
      "vertical.mercantileIntelligence.bullet.movements",
      "vertical.mercantileIntelligence.bullet.competition",
      "vertical.mercantileIntelligence.bullet.opportunities"
    ]
  },
  "financial-intelligence": {
    objectiveKey: "vertical.financialIntelligence.objective",
    bulletKeys: [
      "vertical.financialIntelligence.bullet.incomeCosts",
      "vertical.financialIntelligence.bullet.profitability",
      "vertical.financialIntelligence.bullet.breakEven",
      "vertical.financialIntelligence.bullet.scenarios"
    ]
  },
  "commercial-intelligence": {
    objectiveKey: "vertical.commercialIntelligence.objective",
    bulletKeys: [
      "vertical.commercialIntelligence.bullet.pricingTools",
      "vertical.commercialIntelligence.bullet.margins",
      "vertical.commercialIntelligence.bullet.marketPrices",
      "vertical.commercialIntelligence.bullet.optimization"
    ]
  },
  "enterprise-copilot": {
    objectiveKey: "vertical.enterpriseCopilot.objective",
    bulletKeys: [
      "vertical.enterpriseCopilot.bullet.insights",
      "vertical.enterpriseCopilot.bullet.naturalLanguage",
      "vertical.enterpriseCopilot.bullet.automatedAnalysis",
      "vertical.enterpriseCopilot.bullet.aiAssistance"
    ]
  }
};

export default function LandingPage() {
  const t = useT();

  return (
    <main className="p-4 lg:p-6">
      <TopBar />

      <section className="mx-auto max-w-[1400px]">
        <section id="producto" className="panel overflow-hidden rounded-2xl shadow-panel">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-8 lg:p-10">
              <p className="inline-flex rounded-full bg-cyanAccent/15 px-3 py-1 text-xs font-semibold text-cyanAccent">
                {t("landing.hero.badge")}
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white lg:text-5xl">
                {t("landing.hero.title")}
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-300">{t("landing.hero.description")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400">
                  {t("landing.hero.openPlatform")}
                </Link>
                <Link href="/login" className="rounded-lg border border-brand-300/40 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-brand-400/20">
                  {t("actions.login")}
                </Link>
              </div>
            </div>

            <div className="grid-pattern border-t border-brand-300/20 p-8 lg:border-l lg:border-t-0">
              <div className="space-y-3">
                {heroStats.map((stat) => (
                  <article key={stat.labelKey} className="panel rounded-xl p-4">
                    <p className="text-sm text-slate-300">{t(stat.labelKey)}</p>
                    <p className={`font-display text-3xl font-semibold ${stat.valueClassName}`}>{stat.value}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="soluciones" className="mt-5">
          <h2 className="font-display text-2xl font-semibold">{t("landing.capabilities.title")}</h2>
          <p className="mt-1 text-sm text-slate-300">{t("landing.capabilities.subtitle")}</p>
          <div className="mt-4 grid grid-cols-1 gap-4">
            {capabilityCards.map((card) => (
              <article key={card.titleKey} className="panel rounded-xl p-5 shadow-panel">
                <p className="font-display text-xl font-semibold">{t(card.titleKey)}</p>
                <p className="mt-2 text-sm text-slate-300">{t(card.textKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 verticals-showcase rounded-3xl p-5 md:p-7">
          <h2 className="font-display text-2xl font-semibold">{t("landing.verticals.title")}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">{t("landing.verticals.subtitle")}</p>

          <div className="mt-5 grid grid-cols-1 gap-4">
            {SOLUTION_VERTICALS.map((vertical) => {
              const tools = TOOL_NAV_ITEMS.filter((tool) => vertical.toolHrefs.includes(tool.href));
              const marketing = verticalMarketingContent[vertical.id];
              if (!marketing) return null;

              return (
                <article key={vertical.id} className="vertical-card rounded-2xl p-5 shadow-panel">
                  <p className="font-display text-xl font-semibold">{t(vertical.titleKey)}</p>
                  <p className="mt-2 text-sm text-slate-300">{t(vertical.descriptionKey)}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.08em] text-cyanAccent">{t("vertical.objective.label")}</p>
                  <p className="mt-1 text-sm text-slate-300">{t(marketing.objectiveKey)}</p>

                  <ul className="mt-4 space-y-1">
                    {marketing.bulletKeys.map((bulletKey) => (
                      <li key={bulletKey} className="vertical-point text-sm text-slate-200">
                        {t(bulletKey)}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tools.map((tool) => (
                      tool.disabled ? (
                        <button
                          key={tool.href}
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-lg border border-brand-300/25 px-3 py-2 text-xs font-semibold text-slate-400 opacity-70"
                        >
                          {t(tool.titleKey)}
                          {tool.statusKey ? <span className="ml-2 text-[10px] uppercase tracking-[0.08em]">{t(tool.statusKey)}</span> : null}
                        </button>
                      ) : (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-[1px] hover:bg-brand-400"
                          target={tool.href.startsWith("http") ? "_blank" : undefined}
                          rel={tool.href.startsWith("http") ? "noreferrer" : undefined}
                        >
                          {t(tool.titleKey)}
                        </Link>
                      )
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link href="/login" className="rounded-lg border border-brand-300/40 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-brand-400/20">
                      {t("actions.login")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4">
          {infoCards.map((card) => (
            <article key={card.id} id={card.id} className="panel rounded-xl p-5 shadow-panel">
              <p className="font-display text-xl font-semibold">{t(card.titleKey)}</p>
              <p className="mt-2 text-sm text-slate-300">{t(card.textKey)}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
