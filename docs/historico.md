# Histórico de cambios - AMETIS Platform

Este documento registra los cambios relevantes realizados sobre `ametis-platform`.

> Regla de trabajo: cada ajuste funcional, arquitectónico o de infraestructura debe añadir una entrada nueva en este histórico antes de cerrar la tarea.

## 2026-08-13 - Agent Factory / Fábrica de agentes

### Contexto

Se evolucionó la plataforma para incorporar una aplicación independiente llamada **Agent Factory**, responsable de preparar la documentación, bases de conocimiento y definición inicial de agentes por workspace.

La intención arquitectónica es que `ametis-platform` sea dueño de:

- autenticación y sesión;
- workspace/tenant activo;
- gestión documental;
- definición funcional del agente;
- asociación entre agente y bases de conocimiento;
- publicación de la configuración hacia `ametis-ai`.

`ametis-ai` queda como responsable de:

- ingesta documental;
- chunking;
- embeddings;
- almacenamiento vectorial;
- recuperación RAG;
- ejecución futura del agente.

### Autenticación y experiencia base

- Se integró Agent Factory con Keycloak mediante OIDC Authorization Code + PKCE.
- Se eliminó el uso del cliente confidencial `core-api` desde el frontend.
- Se configuró el cliente público `agent-factory-web`.
- Se creó una experiencia visual coherente con AMETIS para login, callback y shell de aplicación.
- Se añadieron soporte de idioma y tema siguiendo el patrón de AMETIS Platform.
- Se eliminó texto visible hardcodeado y se movió a catálogos i18n `es` y `en`.
- Se añadió `.editorconfig` para forzar `UTF-8` y evitar problemas con tildes y caracteres especiales.

### Repositorio documental

- Se implementó conexión de Google Drive por usuario mediante OAuth.
- Se dejó disponible el modo legacy con service account para raíces ubicadas en Google Shared Drive.
- Se creó el concepto de namespace documental por workspace.
- El usuario puede editar la parte legible del namespace; el identificador técnico del tenant no es editable.
- Al preparar el repositorio se crea/reutiliza la estructura:

```text
{namespace}/
└── docs/
```

- Se implementó subida, listado, descarga, eliminación y refresco manual de documentos.
- Se validan formatos soportados antes de subir documentos.
- Se gestionaron errores de Drive, CORS, cuotas y archivos no soportados.

### Bases de conocimiento

- Se añadió la fase **Bases de conocimiento**.
- Se crearon tablas y API para definir bases por tenant.
- Una base de conocimiento puede agrupar documentos ya almacenados.
- La fase queda preparada para indexación posterior en `ametis-ai`, pero no indexa por sí misma.

### Agentes

- Se añadió la fase **Agentes**.
- Se crearon tablas y API para definir agentes por tenant.
- Cada agente contiene:
  - nombre;
  - descripción;
  - instrucciones;
  - estado;
  - bases de conocimiento asociadas.
- Se añadió publicación MVP:
  - `DRAFT` -> `READY`;
  - `published_at`;
  - validación de que exista al menos una base asociada.

### Integración inicial con AMETIS AI

- Se añadió cliente opcional hacia el RAG service de `ametis-ai`.
- La integración se activa solo si existe:

```env
AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL=
```

- Si la variable está configurada, al publicar un agente Agent Factory llama por cada base asociada a:

```text
POST {AGENT_FACTORY_AMETIS_AI_RAG_BASE_URL}/tenants/{namespace}/agents/{agentId}/knowledge-bases/{knowledgeBaseId}/ingest
```

- Contrato actual:
  - `tenant_id` en `ametis-ai` = namespace documental del workspace;
  - `agent_id` = UUID del agente en Agent Factory;
  - `knowledge_base_id` = UUID de la base de conocimiento en Agent Factory.

### Infraestructura

- Se añadió `agent-factory-app` como servicio backend Spring Boot.
- Se añadió `agent-factory-web` como frontend independiente en Next.js.
- Se añadieron rutas Kong bajo `/api/agent-factory`.
- Se añadieron variables de entorno para Google OAuth, CORS y publicación hacia AMETIS AI.
- Se validaron builds Docker y migraciones Flyway hasta `V5`.

### Validaciones realizadas

- TypeScript `tsc --noEmit`.
- ESLint.
- Validación JSON de catálogos i18n.
- Tests Maven del backend en contenedor.
- Build Docker de backend y frontend.
- Recreación de servicios locales.
- Verificación de CORS para endpoints de Agent Factory.
- Verificación de aplicación de Flyway.

### Pendiente inmediato

- Crear endpoint real de sincronización de ficha completa en `ametis-ai`, por ejemplo `POST /agents/sync`.
- Enviar desde Platform nombre, descripción, instrucciones y bases asociadas.
- Persistir la ficha sincronizada en la base propia de `ametis-ai`.
- Separar publicación de agente e indexación documental si el flujo operativo lo requiere.
