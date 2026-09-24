"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { clearSession, getAuthToken } from "@/lib/session";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/components/IntlProviderClient";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { BusinessSwitcher } from "@/components/business-switcher";
import { GuidedTour, TourHelpButton, useTour, type TourStep } from "@/components/guided-tour";

const WORKSPACE_TOUR_STEPS: TourStep[] = [
  { selector: "[data-tour='shell-business-switcher']", titleKey: "tour.workspace.business.title", descriptionKey: "tour.workspace.business.description" },
  { selector: "[data-tour='shell-nav-businesses']", titleKey: "tour.workspace.navBusinesses.title", descriptionKey: "tour.workspace.navBusinesses.description" },
  { selector: "[data-tour='shell-nav-documents']", titleKey: "tour.workspace.navDocuments.title", descriptionKey: "tour.workspace.navDocuments.description" },
  { selector: "[data-tour='shell-nav-knowledge']", titleKey: "tour.workspace.navKnowledge.title", descriptionKey: "tour.workspace.navKnowledge.description" },
  { selector: "[data-tour='shell-nav-agents']", titleKey: "tour.workspace.navAgents.title", descriptionKey: "tour.workspace.navAgents.description" },
  { selector: "[data-tour='shell-nav-deployments']", titleKey: "tour.workspace.navDeployments.title", descriptionKey: "tour.workspace.navDeployments.description" },
  { selector: "[data-tour='shell-profile-menu']", titleKey: "tour.workspace.profile.title", descriptionKey: "tour.workspace.profile.description" }
];

type AuthProfile = {
  name: string;
  email: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const workspaceTour = useTour("workspace-shell");

  useEffect(() => {
    // Se reevalúa en cada cambio de ruta: tras iniciar sesión (contraseña o SSO)
    // la navegación es del lado del cliente (sin recargar la página), así que el
    // token recién guardado no se leería si esto solo corriera al montar.
    const timeout = window.setTimeout(() => setProfile(buildProfileFromToken(getAuthToken())), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSidebarCollapsed(window.localStorage.getItem("ametis-agent-factory-sidebar-collapsed") === "true");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function closeProfileMenu(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeProfileMenu);
    return () => document.removeEventListener("mousedown", closeProfileMenu);
  }, []);

  if (pathname.startsWith("/auth/") || pathname === "/onboarding") return children;

  function signOut() {
    clearSession();
    setProfileMenuOpen(false);
    setProfile(null);
    router.push("/auth/login");
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("ametis-agent-factory-sidebar-collapsed", String(next));
      return next;
    });
  }

  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3000";
  const profileName = profile?.name ?? t("navigation.user");
  const isDocumentsActive = pathname === "/";
  const isBusinessesActive = pathname.startsWith("/businesses");
  const isKnowledgeBasesActive = pathname.startsWith("/knowledge-bases");
  const isAgentsActive = pathname.startsWith("/agents");
  const isDeploymentsActive = pathname.startsWith("/deployments");

  return (
    <main className={`app-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <button
        className="sidebar-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-expanded={!sidebarCollapsed}
        aria-controls="agent-factory-sidebar"
        aria-label={t(sidebarCollapsed ? "navigation.expandMenu" : "navigation.collapseMenu")}
        title={t(sidebarCollapsed ? "navigation.expandMenu" : "navigation.collapseMenu")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={sidebarCollapsed ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"} />
        </svg>
      </button>
      <aside className="sidebar" id="agent-factory-sidebar">
        <Link className="brand" href={hubUrl}>
          <span className="brand-mark" aria-hidden="true">A</span>
          <span><strong>{t("brand.company")}</strong><small>{t("brand.product")}</small></span>
        </Link>
        <nav className="side-nav">
          <span className="nav-section">{t("navigation.section.workspace")}</span>
          <Link data-tour="shell-nav-businesses" className={`nav-item ${isBusinessesActive ? "active" : ""}`} href="/businesses">{t("navigation.businesses")}</Link>
          <Link data-tour="shell-nav-documents" className={`nav-item ${isDocumentsActive ? "active" : ""}`} href="/">{t("navigation.documents")}</Link>
          <Link data-tour="shell-nav-knowledge" className={`nav-item ${isKnowledgeBasesActive ? "active" : ""}`} href="/knowledge-bases">{t("navigation.knowledgeBases")}</Link>
          <Link data-tour="shell-nav-agents" className={`nav-item ${isAgentsActive ? "active" : ""}`} href="/agents">{t("navigation.agents")}</Link>
          <Link data-tour="shell-nav-deployments" className={`nav-item ${isDeploymentsActive ? "active" : ""}`} href="/deployments">{t("navigation.deployments")}</Link>
        </nav>
      </aside>
      <section className="content-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">{t("header.eyebrow")}</span>
            <h1>{t("header.title")}</h1>
          </div>
          <div className="topbar-actions">
            <TourHelpButton onClick={workspaceTour.restart} label={t("tour.workspace.helpButton")} />
            <div data-tour="shell-business-switcher"><BusinessSwitcher /></div>
            <LanguageSwitcher />
            <ThemeSwitcher />
            <details
              data-tour="shell-profile-menu"
              className="profile-menu"
              open={profileMenuOpen}
              onToggle={(event) => setProfileMenuOpen(event.currentTarget.open)}
              ref={profileMenuRef}
            >
              <summary aria-label={t("navigation.userMenu")}>
                <span className="profile-avatar">{initialsFor(profileName)}</span>
                <span className="profile-chevron" aria-hidden="true">{profileMenuOpen ? "▴" : "▾"}</span>
              </summary>
              <div className="profile-dropdown">
                <div className="profile-summary">
                  <strong>{profileName}</strong>
                  {profile?.email ? <span>{profile.email}</span> : null}
                </div>
                <div className="profile-divider" />
                <a href={`${hubUrl}/profile`} onClick={() => setProfileMenuOpen(false)}>{t("navigation.editProfile")}</a>
                <a href={`${hubUrl}/account`} onClick={() => setProfileMenuOpen(false)}>{t("navigation.account")}</a>
                <button type="button" onClick={signOut}>{t("navigation.signOut")}</button>
              </div>
            </details>
          </div>
        </header>
        {children}
      </section>
      <GuidedTour open={workspaceTour.open} steps={WORKSPACE_TOUR_STEPS} onClose={workspaceTour.close} />
    </main>
  );
}

function buildProfileFromToken(token: string | null): AuthProfile | null {
  if (!token) return null;
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    const payload = JSON.parse(window.atob(padded)) as Record<string, unknown>;
    const name = String(payload.name || payload.preferred_username || payload.email || "");
    const email = String(payload.email || "");
    return name || email ? { name: name || email, email } : null;
  } catch {
    return null;
  }
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
