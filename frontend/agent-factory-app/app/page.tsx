"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/IntlProviderClient";
import {
  AgentFactoryApiError,
  Business,
  DriveConnection,
  fetchBusinesses,
  fetchDriveConnection,
  fetchRepository,
  provisionRepository,
  RepositoryStatus,
  startDriveConnection,
  updateRepositoryNamespace
} from "@/lib/agent-factory-api";
import { getActiveBusinessId } from "@/lib/session";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export default function RepositorySetupPage() {
  const t = useT();
  const [repository, setRepository] = useState<RepositoryStatus | null>(null);
  const [driveConnection, setDriveConnection] = useState<DriveConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<"connected" | "error" | null>(null);
  const [namespaceDraft, setNamespaceDraft] = useState("");
  const [savingNamespace, setSavingNamespace] = useState(false);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const businesses = await fetchBusinesses().catch(() => [] as Business[]);
      const active = businesses.find((item) => item.id === getActiveBusinessId()) ?? businesses[0] ?? null;
      setActiveBusiness(active);

      const connection = await fetchDriveConnection();
      setDriveConnection(connection);
      const driveReady = connection.status === "CONNECTED" || connection.status === "MANAGED";
      if (!driveReady) {
        setRepository(null);
        setNamespaceDraft(active?.slug ?? "");
        return;
      }

      let currentRepository: RepositoryStatus | null = null;
      try {
        currentRepository = await fetchRepository();
      } catch (repoError) {
        if (!(repoError instanceof AgentFactoryApiError) || repoError.status !== 404) throw repoError;
      }

      // Almacenamiento gestionado por AEME: se provisiona el repositorio del tenant
      // automáticamente, sin que el usuario tenga que hacer nada.
      if (connection.status === "MANAGED" && currentRepository?.status !== "ACTIVE") {
        try {
          currentRepository = await provisionRepository();
        } catch (provisionError) {
          setError(provisionError);
        }
      }

      setRepository(currentRepository);
      setNamespaceDraft(
        currentRepository?.status === "ACTIVE"
          ? currentRepository.repositoryAlias
          : active?.slug ?? ""
      );
    } catch (requestError) {
      if (requestError instanceof AgentFactoryApiError && requestError.status === 404) {
        setRepository(null);
      } else {
        setError(requestError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("drive");
    if (result === "connected" || result === "error") {
      setConnectionNotice(result);
      window.history.replaceState({}, "", window.location.pathname);
    }
    load();
  }, [load]);

  async function connectDrive() {
    setConnectingDrive(true);
    setError(null);
    setConnectionNotice(null);
    try {
      const result = await startDriveConnection();
      window.location.assign(result.authorizationUrl);
    } catch (requestError) {
      setError(requestError);
      setConnectingDrive(false);
    }
  }

  async function provision() {
    setProvisioning(true);
    setError(null);
    try {
      const result = await provisionRepository(
        driveConnection?.status === "MANAGED" ? undefined : namespaceDraft.trim()
      );
      setRepository(result);
      setNamespaceDraft(result.repositoryAlias);
    } catch (requestError) {
      setError(requestError);
      await load();
    } finally {
      setProvisioning(false);
    }
  }

  async function saveNamespace() {
    const nextNamespace = namespaceDraft.trim();
    if (!nextNamespace || !repository || nextNamespace === repository.repositoryAlias) return;
    setSavingNamespace(true);
    setError(null);
    try {
      const result = await updateRepositoryNamespace(nextNamespace);
      setRepository(result);
      setNamespaceDraft(result.repositoryAlias);
    } catch (requestError) {
      setError(requestError);
      setNamespaceDraft(repository.repositoryAlias);
    } finally {
      setSavingNamespace(false);
    }
  }

  if (loading) {
    return <section className="loading-card" role="status"><span className="spinner" aria-hidden="true" />{t("repository.loading")}</section>;
  }

  const repositoryActive = repository?.status === "ACTIVE";
  const managed = driveConnection?.status === "MANAGED";
  const driveReady = driveConnection?.status === "CONNECTED" || managed;

  return (
    <div className="page-grid">
      <section className="intro-card">
        <div>
          <span className="eyebrow blue">{t("repository.managed")}</span>
          <h2>{t("repository.introTitle")}</h2>
          <p>{t("repository.introDescription")}</p>
        </div>
        <div className="repository-status-actions">
          <RepositoryPill connection={driveConnection} t={t} />
          {driveConnection?.status === "CONNECTED" ? (
            <button className="reconnect-drive-button compact" type="button" onClick={connectDrive} disabled={connectingDrive}>
              {connectingDrive ? t("drive.connecting") : t("drive.reconnectAction")}
            </button>
          ) : null}
          {managed ? <span className="managed-storage-hint">{t("drive.managedByAmetis")}</span> : null}
        </div>
      </section>

      {connectionNotice === "connected" ? <div className="alert success" role="status"><strong>{t("drive.connectedTitle")}</strong><span>{t("drive.connectedDescription")}</span></div> : null}
      {connectionNotice === "error" ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{t("error.driveConnectionFailed")}</span></div> : null}
      {error ? <div className="alert error" role="alert"><strong>{t("operation.failedTitle")}</strong><span>{messageOf(error, t)}</span></div> : null}

      {!driveReady ? (
        <section className="setup-card drive-connect-card">
          <div className="setup-icon google-drive-icon" aria-hidden="true">G</div>
          <div>
            <span className="eyebrow">{t("drive.initialSetup")}</span>
            <h2>{t("drive.connectTitle")}</h2>
            <p>{t(driveConnection?.status === "NOT_CONFIGURED" ? "drive.notConfiguredDescription" : "drive.connectDescription")}</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={connectDrive}
            disabled={connectingDrive || driveConnection?.status === "NOT_CONFIGURED"}
          >
            {connectingDrive ? t("drive.connecting") : t("drive.connectAction")}
          </button>
        </section>
      ) : !repositoryActive ? (
        <section className="setup-card">
          <div className="setup-icon" aria-hidden="true">↗</div>
          <div>
            <span className="eyebrow">{t("repository.initialSetup")}</span>
            <h2>{repository?.status === "ERROR" ? t("repository.retryTitle") : t("repository.createTitle")}</h2>
            <p>{t(managed ? "repository.managedPreparingDescription" : "repository.createDescription")}</p>
            {managed ? null : (
              <label className="namespace-field">
                <span>{t("repository.namespaceInputLabel")}</span>
                <input
                  value={namespaceDraft}
                  onChange={(event) => setNamespaceDraft(event.target.value)}
                  placeholder={t("repository.namespacePlaceholder")}
                />
              </label>
            )}
          </div>
          <button className="primary-button" type="button" onClick={provision} disabled={provisioning}>
            {provisioning ? t("repository.preparing") : repository?.status === "ERROR" ? t("common.retry") : t("repository.prepareAction")}
          </button>
        </section>
      ) : (
        <section className="upload-card">
          <div className="repository-detail">
            <span className="detail-label">{t("drive.connectedAccount")}</span>
            <strong className="connection-account">
              {managed ? t("drive.managedByAmetis") : driveConnection?.accountEmail ?? t("common.notAvailable")}
            </strong>
            <span className="detail-label">{t("repository.workspaceStorageLabel")}</span>
            <p className="detail-help">{t("repository.workspaceIdentityHelp")}</p>
            <label className="namespace-editor">
              <span className="sr-only">{t("repository.namespaceInputLabel")}</span>
              <input
                value={namespaceDraft}
                onChange={(event) => setNamespaceDraft(event.target.value)}
                onBlur={saveNamespace}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveNamespace();
                  if (event.key === "Escape") setNamespaceDraft(repository.repositoryAlias);
                }}
                disabled={savingNamespace}
              />
              <button
                type="button"
                onClick={saveNamespace}
                disabled={savingNamespace || !namespaceDraft.trim() || namespaceDraft.trim() === repository.repositoryAlias}
              >
                {savingNamespace ? t("repository.savingNamespace") : t("repository.saveNamespace")}
              </button>
            </label>
            <div className="namespace-preview">
              <span>{t("repository.technicalId")}</span>
              <code>{repository.repositoryTechnicalId}</code>
            </div>
            <div className="namespace-preview">
              <span>{t("repository.driveFolder")}</span>
              <code>{repository.repositoryNamespace}</code>
            </div>
            {activeBusiness ? (
              <div className="active-business-folder">
                <span className="detail-label">{t("repository.activeBusinessLabel")}</span>
                <strong>{activeBusiness.name}</strong>
                <code>{repository.repositoryNamespace}/{activeBusiness.slug}/</code>
                <p className="detail-help">{t("repository.activeBusinessHelp")}</p>
              </div>
            ) : null}
            <p>{t("repository.nextStep")}</p>
            <div className="item-actions">
              <Link className="small-action" href="/businesses">{t("navigation.businesses")}</Link>
              <Link className="small-action" href="/knowledge-bases">{t("navigation.knowledgeBases")}</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function RepositoryPill({ connection, t }: { connection: DriveConnection | null; t: Translate }) {
  const ready = connection?.status === "CONNECTED" || connection?.status === "MANAGED";
  return (
    <span className={`status-badge ${ready ? "stored" : "inactive"}`}>
      {ready ? t("repository.connected") : t("repository.pending")}
    </span>
  );
}

function messageOf(error: unknown, t: Translate): string {
  if (error instanceof AgentFactoryApiError) return t(error.code, error.variables);
  return t("common.unexpectedError");
}
