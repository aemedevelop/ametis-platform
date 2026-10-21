"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/components/IntlProviderClient";

export type TourStep = {
  /** Selector CSS del elemento a resaltar (ej. "[data-tour='sidebar-agents']"). */
  selector: string;
  titleKey: string;
  descriptionKey: string;
};

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Estado de visibilidad de un tour guiado, persistido por `tourId` en
 * localStorage. La primera vez que el componente que lo usa se monta (por
 * negocio/usuario en este navegador) se abre solo; luego solo reaparece si
 * se llama a `restart()` manualmente (el botón "?" de cada sección).
 */
export function useTour(tourId: string) {
  const storageKey = `ametis-tour-seen:${tourId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const seen = window.localStorage.getItem(storageKey) === "true";
      if (!seen) setOpen(true);
    }, 300); // deja que la página termine de montar los elementos objetivo
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const close = useCallback(() => {
    window.localStorage.setItem(storageKey, "true");
    setOpen(false);
  }, [storageKey]);

  const restart = useCallback(() => setOpen(true), []);

  return { open, close, restart };
}

/** Botón "?" para volver a abrir el tour de una sección cuando se quiera. */
export function TourHelpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="tour-help-button" onClick={onClick} aria-label={label} title={label}>
      ?
    </button>
  );
}

export function GuidedTour({
  open,
  steps,
  onClose
}: {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;

    function measure() {
      const el = document.querySelector(step.selector);
      if (!el) {
        setRect(null);
        return;
      }
      const box = el.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const calloutStyle = useMemo(() => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } as const;
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const placeBelow = spaceBelow > 220 || rect.top < 220;
    const top = placeBelow ? rect.top + rect.height + 16 : rect.top - 16;
    const left = Math.min(Math.max(rect.left, 16), window.innerWidth - 340);
    return placeBelow
      ? { top: `${top}px`, left: `${left}px` }
      : { top: `${top}px`, left: `${left}px`, transform: "translateY(-100%)" };
  }, [rect]);

  if (!open || !step) return null;

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label={t(step.titleKey)}>
      {rect ? (
        <>
          <div className="tour-mask" style={{ top: 0, left: 0, right: 0, height: Math.max(rect.top - 8, 0) }} />
          <div className="tour-mask" style={{ top: rect.top + rect.height + 8, left: 0, right: 0, bottom: 0 }} />
          <div className="tour-mask" style={{ top: rect.top - 8, left: 0, width: Math.max(rect.left - 8, 0), height: rect.height + 16 }} />
          <div className="tour-mask" style={{ top: rect.top - 8, left: rect.left + rect.width + 8, right: 0, height: rect.height + 16 }} />
          <div
            className="tour-spotlight-ring"
            style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
          />
        </>
      ) : (
        <div className="tour-mask" style={{ inset: 0 }} />
      )}

      <div className="tour-callout" style={calloutStyle}>
        <button type="button" className="tour-close" onClick={onClose} aria-label={t("tour.close")}>×</button>
        <span className="tour-step-count">{t("tour.stepOf", { current: index + 1, total: steps.length })}</span>
        <h3>{t(step.titleKey)}</h3>
        <p>{t(step.descriptionKey)}</p>
        <div className="tour-dots" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`tour-dot ${i === index ? "active" : ""}`} />
          ))}
        </div>
        <div className="tour-actions">
          {index > 0 ? (
            <button type="button" className="secondary-button" onClick={() => setIndex((i) => i - 1)}>
              {t("tour.previous")}
            </button>
          ) : (
            <button type="button" className="link-button" onClick={onClose}>{t("tour.skip")}</button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
          >
            {isLast ? t("tour.finish") : t("tour.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
