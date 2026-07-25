"use client";

import { useState } from "react";
import { checkAuthorization } from "@/lib/api";
import { useT } from "@/components/IntlProviderClient";

export function AuthorizationPlayground() {
  const t = useT();
  const [tenantId, setTenantId] = useState("");
  const [permissionCode, setPermissionCode] = useState("mercantil.trends.read");
  const [token, setToken] = useState("");
  const [resultKey, setResultKey] = useState<string>("authorization.result.idle");
  const [resultText, setResultText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onCheck() {
    setLoading(true);
    setResultKey("authorization.result.running");
    setResultText("");
    try {
      const response = await checkAuthorization(token.trim(), tenantId.trim(), permissionCode.trim());
      setResultKey("");
      setResultText(
        response.allowed
          ? `${t("authorization.result.allow")}: ${response.reasons.join(", ")}`
          : `${t("authorization.result.deny")}: ${response.reasons.join(", ")}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      setResultKey("");
      setResultText(`${t("authorization.result.error")}: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel rounded-xl p-5 shadow-panel">
      <h3 className="font-display text-lg font-semibold">{t("authorization.title")}</h3>
      <p className="mt-1 text-sm text-slate-300">{t("authorization.subtitle")}</p>

      <div className="mt-4 grid gap-3">
        <input
          className="rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-brand-300"
          placeholder={t("authorization.tenantPlaceholder")}
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        />
        <input
          className="rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-brand-300"
          placeholder={t("authorization.permissionPlaceholder")}
          value={permissionCode}
          onChange={(event) => setPermissionCode(event.target.value)}
        />
        <textarea
          className="min-h-24 rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-brand-300"
          placeholder={t("authorization.tokenPlaceholder")}
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onCheck}
          disabled={loading}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
        >
          {loading ? t("authorization.checking") : t("authorization.check")}
        </button>
        <p className="text-sm text-slate-200">{resultKey ? t(resultKey) : resultText}</p>
      </div>
    </section>
  );
}
