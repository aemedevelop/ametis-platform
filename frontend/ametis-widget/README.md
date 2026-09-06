# ametis-widget

Widget de chat embebible para despliegues públicos (`WEB_CHAT`) de AMETIS Agent
Factory. Vanilla TypeScript, sin dependencias en runtime, empaquetado como un
único IIFE con esbuild. Todo el marcado y los estilos viven en un Shadow DOM
para no chocar con el CSS del sitio anfitrión.

## Uso (lo genera la plataforma en `DeploymentEndpoints`)

```html
<script src="{widgetUrl}" data-deployment="{publicId}" data-endpoint="{baseUrl}" async></script>
```

- `data-deployment`: `public_id` del despliegue (opaco, 32 hex).
- `data-endpoint`: base pública (`agent-factory.public.base-url`), ej.
  `http://localhost:8440/api/agent-factory/public`.
- `data-locale` (opcional): `es` (por defecto) o `en`.

## Build

```powershell
cd frontend\ametis-widget
npm install
npm run build:copy
```

`build:copy` compila a `dist/ametis-widget.js` y lo copia a
`apps/agent-factory-app/src/main/resources/widget/ametis-widget.js`, desde
donde `PublicWidgetController` lo sirve en
`GET /api/agent-factory/public/widget.js` (y `/v1/public/widget.js`). Hay que
reconstruir `agent-factory-app` después para que el `.jar` incluya el archivo
nuevo. **Paso manual por ahora** — no hay pipeline de CI que lo automatice.

## v1 — alcance

Burbuja flotante + panel de chat simple: mensaje de bienvenida +
pregunta/respuesta contra `POST /{publicId}/query`, con chips de sugerencias
(`suggestions` de la respuesta) y puntos de carga animados. Sin historial
persistente entre recargas, sin streaming de respuesta. Ver
`ametis-platform/.agents/architecture.md` (sección "Deployment Public
Endpoint") para el contrato completo.

## Diseño

Portado 1:1 del widget de la landing de AEME
(`am-landing-react/src/components/AmetisChatWidget/`): gradiente
`#1e3a8a → #2563eb`, bloque de marca en cabecera, botones minimizar/cerrar,
burbujas, sugerencias en columna, input tipo píldora, responsive full-width en
móvil. La diferencia es que aquí es vanilla + Shadow DOM (no React) para poder
embeberlo en cualquier sitio de cliente. Si cambia el estilo de la landing,
re-sincronizar aquí.

## Probar

`demo.html` en esta carpeta es una página de prueba: sírvela con
`npx serve frontend/ametis-widget` y ajusta `data-deployment` / `data-endpoint`
con un despliegue `WEB_CHAT` real.
