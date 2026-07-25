"use client";

import { TopBar } from "@/components/top-bar";
import { useT } from "@/components/IntlProviderClient";

export default function AccountPage() {
  const t = useT();

  return (
    <main className="p-4 lg:p-6">
      <TopBar />
      <section className="mx-auto w-full max-w-4xl">
        <div className="panel rounded-2xl px-5 py-4 shadow-panel">
          <p className="font-display text-xl font-semibold tracking-tight">{t("account.title")}</p>
          <p className="mt-1 text-sm text-slate-300">{t("account.subtitle")}</p>
        </div>

        <div className="mt-3 grid gap-3">
          <section className="panel rounded-2xl px-5 py-4 shadow-panel">
            <p className="text-sm font-semibold">{t("account.plan.title")}</p>
            <p className="mt-1 text-sm text-slate-300">{t("account.plan.subtitle")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-200">
                {t("account.plan.current")}
              </span>
              <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-brand-400/15">
                {t("account.plan.manage")}
              </button>
            </div>
          </section>

          <section className="panel rounded-2xl px-5 py-4 shadow-panel">
            <p className="text-sm font-semibold">{t("account.security.title")}</p>
            <p className="mt-1 text-sm text-slate-300">{t("account.security.subtitle")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-brand-400/15">
                {t("account.security.changePassword")}
              </button>
              <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-brand-400/15">
                {t("account.security.mfa")}
              </button>
            </div>
          </section>

          <section className="panel rounded-2xl px-5 py-4 shadow-panel">
            <p className="text-sm font-semibold">{t("account.billing.title")}</p>
            <p className="mt-1 text-sm text-slate-300">{t("account.billing.subtitle")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-brand-400/15">
                {t("account.billing.view")}
              </button>
              <button className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-brand-400/15">
                {t("account.billing.payment")}
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
