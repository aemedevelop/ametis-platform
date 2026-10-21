"use client";

import { InputHTMLAttributes, useState } from "react";
import { useT } from "@/components/IntlProviderClient";

/** Campo de contraseña con el botón de ojo para ver u ocultar lo que se escribe. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const label = t(visible ? "common.hidePassword" : "common.showPassword");

  return (
    <div className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={label} aria-pressed={visible} title={label}>
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a13 13 0 0 1-2.8 3.6M6.5 7.6A13.2 13.2 0 0 0 2.5 12c1 2 4.5 6 9.5 6 1.4 0 2.7-.3 3.8-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12c1-2 4.5-6 9.5-6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6Z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}
