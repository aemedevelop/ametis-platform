-- CREATE DATABASE no puede ejecutarse dentro de un bloque DO/transacción
-- (limitacion de Postgres, no del entorno). Este script solo lo ejecuta
-- docker-entrypoint-initdb.d la primera vez, sobre un volumen de datos
-- vacio -- las bases nunca existen ya, así que no hace falta IF NOT EXISTS.
CREATE DATABASE keycloak_db;
CREATE DATABASE core_db;
CREATE DATABASE newsletter_db;
CREATE DATABASE agent_factory_db;
CREATE DATABASE ametis_ai_db;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'core_user') THEN
    CREATE ROLE core_user LOGIN PASSWORD 'core_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'newsletter_user') THEN
    CREATE ROLE newsletter_user LOGIN PASSWORD 'newsletter_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agent_factory_user') THEN
    CREATE ROLE agent_factory_user LOGIN PASSWORD 'agent_factory_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ametis_ai_user') THEN
    CREATE ROLE ametis_ai_user LOGIN PASSWORD 'ametis_ai_pass';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE core_db TO core_user;
GRANT ALL PRIVILEGES ON DATABASE newsletter_db TO newsletter_user;
GRANT ALL PRIVILEGES ON DATABASE agent_factory_db TO agent_factory_user;
GRANT ALL PRIVILEGES ON DATABASE ametis_ai_db TO ametis_ai_user;

\connect core_db

CREATE SCHEMA IF NOT EXISTS core AUTHORIZATION core_user;

GRANT USAGE, CREATE ON SCHEMA core TO core_user;
ALTER ROLE core_user IN DATABASE core_db SET search_path TO core,public;

ALTER DEFAULT PRIVILEGES IN SCHEMA core
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO core_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA core
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO core_user;

\connect newsletter_db

CREATE SCHEMA IF NOT EXISTS newsletter AUTHORIZATION newsletter_user;

GRANT USAGE, CREATE ON SCHEMA newsletter TO newsletter_user;
ALTER ROLE newsletter_user IN DATABASE newsletter_db SET search_path TO newsletter,public;

ALTER DEFAULT PRIVILEGES IN SCHEMA newsletter
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO newsletter_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA newsletter
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO newsletter_user;

\connect agent_factory_db

CREATE SCHEMA IF NOT EXISTS agent_factory AUTHORIZATION agent_factory_user;

GRANT USAGE, CREATE ON SCHEMA agent_factory TO agent_factory_user;
ALTER ROLE agent_factory_user IN DATABASE agent_factory_db SET search_path TO agent_factory,public;

ALTER DEFAULT PRIVILEGES IN SCHEMA agent_factory
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_factory_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA agent_factory
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO agent_factory_user;

\connect ametis_ai_db

CREATE SCHEMA IF NOT EXISTS ametis_ai AUTHORIZATION ametis_ai_user;

GRANT USAGE, CREATE ON SCHEMA ametis_ai TO ametis_ai_user;
ALTER ROLE ametis_ai_user IN DATABASE ametis_ai_db SET search_path TO ametis_ai,public;

ALTER DEFAULT PRIVILEGES IN SCHEMA ametis_ai
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ametis_ai_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA ametis_ai
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ametis_ai_user;
