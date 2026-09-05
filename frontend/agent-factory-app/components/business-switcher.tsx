"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/IntlProviderClient";
import { Business, fetchBusinesses } from "@/lib/agent-factory-api";
import { getActiveBusinessId, setActiveBusinessId } from "@/lib/session";

export function BusinessSwitcher() {
  const t = useT();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchBusinesses();
      setBusinesses(list);
      const stored = getActiveBusinessId();
      const active = list.find((item) => item.id === stored) ?? list[0] ?? null;
      if (active && active.id !== stored) setActiveBusinessId(active.id);
      setActiveId(active?.id ?? null);
    } catch {
      /* sesión/permiso: lo gestiona el resto de la app */
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    window.addEventListener("ametis:businesses-changed", load);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("ametis:businesses-changed", load);
    };
  }, [load]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(id: string) {
    setOpen(false);
    if (id === activeId) return;
    setActiveBusinessId(id);
    window.location.reload();
  }

  const active = businesses.find((item) => item.id === activeId) ?? null;

  return (
    <details
      className="business-switcher"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      ref={menuRef}
    >
      <summary aria-label={t("business.switcherLabel")}>
        <span className="business-switcher-label">{t("business.switcherEyebrow")}</span>
        <strong>{active ? active.name : t("business.none")}</strong>
        <span className="profile-chevron" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </summary>
      <div className="business-switcher-menu">
        {businesses.length ? (
          businesses.map((business) => (
            <button
              key={business.id}
              type="button"
              className={business.id === activeId ? "active" : ""}
              onClick={() => choose(business.id)}
            >
              {business.name}
              {business.status === "ARCHIVED" ? <span className="business-archived-tag">{t("business.status.archived")}</span> : null}
            </button>
          ))
        ) : (
          <p className="business-switcher-empty">{t("business.emptyHint")}</p>
        )}
        <div className="profile-divider" />
        <Link href="/businesses" onClick={() => setOpen(false)}>{t("business.manage")}</Link>
      </div>
    </details>
  );
}
