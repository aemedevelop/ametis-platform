# AMETIS Agent Factory Web

Frontend independiente para la biblioteca documental de los agentes AMETIS.

```powershell
npm install
npm run dev
```

La aplicación se inicia en `http://localhost:3200` y consume por defecto la API a través de Kong en `http://localhost:8000/api/agent-factory`.

## Internacionalización

- Los textos visibles se definen en `locales/es.json` y `locales/en.json` con claves semánticas por dominio.
- Los componentes cliente obtienen los mensajes mediante `useT()` y el idioma mediante `useLocale()`.
- Las fechas y los números se formatean con `Intl` usando el locale activo.
- El idioma seleccionado se conserva en `localStorage` y actualiza el atributo `lang` del documento.
- Toda clave nueva debe añadirse a ambos catálogos; no se introducen literales visibles en componentes.
