"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { useT } from "@/components/IntlProviderClient";
import { ApiError, clearSessionTokens, fetchProfile, refreshSession, storeSessionTokens, updateProfile } from "@/lib/api";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("core_access_token") || sessionStorage.getItem("core_access_token");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildProfileFromToken(token: string | null): { fullName: string; email: string } {
  if (!token) return { fullName: "", email: "" };
  const payload = decodeJwtPayload(token);
  const fullName = payload?.name || payload?.preferred_username || "";
  const email = payload?.email || "";
  return {
    fullName: String(fullName || ""),
    email: String(email || "")
  };
}

export default function ProfilePage() {
  const t = useT();
  const [profile, setProfile] = useState(() => buildProfileFromToken(readStoredToken()));
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  function resolveProfileErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 401 || err.code === "authentication_error") {
        return "auth.session.expired";
      }
      if (err.status === 404 && err.message.includes("auth/refresh")) {
        return "auth.session.expired";
      }
      if (err.message.includes("No static resource") && err.message.includes("auth/refresh")) {
        return "auth.session.expired";
      }
      return "profile.error.generic";
    }
    return "common.unknownError";
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProfile((current) => {
      const tokenProfile = buildProfileFromToken(readStoredToken());
      return current.fullName || current.email ? current : tokenProfile;
    });
    fetchProfile()
      .then((data) => {
        if (!active) return;
        setProfile({ fullName: data.fullName, email: data.email });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profile:updated", {
              detail: { name: data.fullName, email: data.email }
            })
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          refreshSession()
            .then((tokens) => {
              storeSessionTokens(tokens);
              return fetchProfile();
            })
            .then((data) => {
              if (!active) return;
              setProfile({ fullName: data.fullName, email: data.email });
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("profile:updated", {
                    detail: { name: data.fullName, email: data.email }
                  })
                );
              }
            })
            .catch((refreshErr) => {
              if (!active) return;
              setErrorKey(resolveProfileErrorKey(refreshErr));
              clearSessionTokens();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("auth:expired"));
              }
            })
            .finally(() => {
              if (active) setLoading(false);
            });
          return;
        }
        setErrorKey(resolveProfileErrorKey(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorKey(null);
    try {
      const updated = await updateProfile({ fullName: profile.fullName });
      setProfile({ fullName: updated.fullName, email: updated.email });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile:updated", {
            detail: { name: updated.fullName, email: updated.email }
          })
        );
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try {
          const tokens = await refreshSession();
          storeSessionTokens(tokens);
          const updated = await updateProfile({ fullName: profile.fullName });
          setProfile({ fullName: updated.fullName, email: updated.email });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("profile:updated", {
                detail: { name: updated.fullName, email: updated.email }
              })
            );
          }
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (refreshErr) {
          setErrorKey(resolveProfileErrorKey(refreshErr));
          clearSessionTokens();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:expired"));
          }
        }
      } else {
        setErrorKey(resolveProfileErrorKey(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 lg:p-6">
      <TopBar />
      <section className="mx-auto w-full max-w-xl">
        <div className="panel rounded-2xl px-5 py-4 shadow-panel">
          <p className="font-display text-xl font-semibold tracking-tight">{t("profile.title")}</p>
          <p className="mt-1 text-sm text-slate-300">{t("profile.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="panel mt-3 rounded-2xl px-5 py-4 shadow-panel">
          <div className="grid gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {t("profile.fullName")}
              </label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
                placeholder={t("profile.fullName.placeholder")}
                className="mt-1 w-full rounded-lg border border-slate-500/30 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-brand-300"
                disabled={loading || saving}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {t("profile.email")}
              </label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-500/30 bg-slate-950/20 px-3 py-2 text-sm text-slate-300"
              />
            </div>
          </div>

          {errorKey ? <p className="mt-3 text-xs text-rose-300">{t(errorKey)}</p> : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            {saved ? <span className="text-xs text-cyanAccent">{t("profile.saved")}</span> : <span />}
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
            >
              {saving ? t("profile.saving") : t("actions.save")}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
