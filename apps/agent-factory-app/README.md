# AMETIS Agent Factory

Aplicación de producto responsable de gestionar los documentos que alimentarán a los agentes AMETIS.

## MVP

- Aprovisiona una carpeta por workspace en el Google Drive gestionado por AMETIS.
- Adopta una carpeta histórica cuyo nombre coincida con el slug del tenant.
- Crea y reutiliza el directorio `docs`.
- Permite listar, subir, descargar y enviar a la papelera documentos soportados por AMETIS AI.
- Registra metadatos y auditoría básica de las subidas en PostgreSQL.

La aplicación no indexa documentos ni invoca AMETIS AI en esta fase.

## Configuración

Variables obligatorias:

```text
AGENT_FACTORY_GOOGLE_CREDENTIALS_FILE
AGENT_FACTORY_GOOGLE_ROOT_FOLDER_ID
```

La carpeta raíz debe estar dentro de una Unidad compartida de Google Drive. La cuenta de servicio debe ser miembro de esa unidad con permisos para añadir contenido; compartir una carpeta de `Mi unidad` como editora no es suficiente porque las cuentas de servicio no disponen de cuota propia. AMETIS AI puede continuar usando una credencial distinta con acceso de solo lectura.

## Desarrollo

```powershell
docker run --rm -v "${PWD}:/app" -w /app maven:3.9.9-eclipse-temurin-21 mvn test
```
