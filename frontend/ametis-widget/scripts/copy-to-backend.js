// Copia el bundle construido al classpath de agent-factory-app para que
// PublicWidgetController lo sirva en GET /api/agent-factory/public/widget.js.
// Manual por ahora: ejecutar `npm run build:copy` tras cada cambio del widget.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "dist", "ametis-widget.js");
const destDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "apps",
  "agent-factory-app",
  "src",
  "main",
  "resources",
  "widget"
);
const dest = path.join(destDir, "ametis-widget.js");

if (!fs.existsSync(src)) {
  console.error("No se encontró el bundle. Ejecuta 'npm run build' primero.");
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copiado a ${dest}`);
