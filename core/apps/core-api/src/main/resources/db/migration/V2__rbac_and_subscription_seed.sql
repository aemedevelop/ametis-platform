SET search_path TO core,public;

INSERT INTO roles (code, name)
VALUES
  ('OWNER', 'Owner'),
  ('ADMIN', 'Admin'),
  ('MEMBER', 'Member'),
  ('VIEWER', 'Viewer');

INSERT INTO permissions (code, vertical, resource, action)
VALUES
  ('core.users.manage', 'core', 'users', 'manage'),
  ('core.roles.manage', 'core', 'roles', 'manage'),
  ('core.subscription.read', 'core', 'subscription', 'read'),
  ('core.configuration.manage', 'core', 'configuration', 'manage'),
  ('mercantil.trends.read', 'mercantil', 'trends', 'read'),
  ('mercantil.competitors.read', 'mercantil', 'competitors', 'read'),
  ('comercial.pricing.read', 'comercial', 'pricing', 'read'),
  ('comercial.pricing.optimize', 'comercial', 'pricing', 'optimize'),
  ('financiera.simulation.read', 'financiera', 'simulation', 'read'),
  ('financiera.simulation.run', 'financiera', 'simulation', 'run'),
  ('ia.copilot.chat', 'ia', 'copilot', 'chat'),
  ('ia.recommendations.read', 'ia', 'recommendations', 'read');

WITH r AS (
  SELECT id, code FROM roles
),
p AS (
  SELECT id, code FROM permissions
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM r
JOIN p ON (
  r.code = 'OWNER'
  OR (r.code = 'ADMIN' AND p.code IN (
    'core.users.manage',
    'core.roles.manage',
    'core.subscription.read',
    'core.configuration.manage',
    'mercantil.trends.read',
    'mercantil.competitors.read',
    'comercial.pricing.read',
    'comercial.pricing.optimize',
    'financiera.simulation.read',
    'financiera.simulation.run',
    'ia.copilot.chat',
    'ia.recommendations.read'
  ))
  OR (r.code = 'MEMBER' AND p.code IN (
    'core.subscription.read',
    'mercantil.trends.read',
    'mercantil.competitors.read',
    'comercial.pricing.read',
    'financiera.simulation.read',
    'financiera.simulation.run',
    'ia.copilot.chat',
    'ia.recommendations.read'
  ))
  OR (r.code = 'VIEWER' AND p.code IN (
    'core.subscription.read',
    'mercantil.trends.read',
    'mercantil.competitors.read',
    'comercial.pricing.read',
    'financiera.simulation.read',
    'ia.recommendations.read'
  ))
);

INSERT INTO plans (code, name, rank_order)
VALUES
  ('FREE', 'Free', 10),
  ('PRO', 'Pro', 20),
  ('BUSINESS', 'Business', 30),
  ('ENTERPRISE', 'Enterprise', 40);

WITH pl AS (
  SELECT id, code FROM plans
)
INSERT INTO plan_features (plan_id, feature_code, enabled)
SELECT pl.id, feature_code, TRUE
FROM pl
CROSS JOIN LATERAL (
  VALUES
    ('mercantil.trends.read'),
    ('mercantil.competitors.read'),
    ('comercial.pricing.read'),
    ('financiera.simulation.read'),
    ('ia.recommendations.read')
) AS f(feature_code)
WHERE pl.code = 'FREE'
UNION ALL
SELECT pl.id, feature_code, TRUE
FROM pl
CROSS JOIN LATERAL (
  VALUES
    ('mercantil.trends.read'),
    ('mercantil.competitors.read'),
    ('comercial.pricing.read'),
    ('comercial.pricing.optimize'),
    ('financiera.simulation.read'),
    ('financiera.simulation.run'),
    ('ia.recommendations.read')
) AS f(feature_code)
WHERE pl.code = 'PRO'
UNION ALL
SELECT pl.id, feature_code, TRUE
FROM pl
CROSS JOIN LATERAL (
  VALUES
    ('mercantil.trends.read'),
    ('mercantil.competitors.read'),
    ('comercial.pricing.read'),
    ('comercial.pricing.optimize'),
    ('financiera.simulation.read'),
    ('financiera.simulation.run'),
    ('ia.copilot.chat'),
    ('ia.recommendations.read'),
    ('core.configuration.manage')
) AS f(feature_code)
WHERE pl.code = 'BUSINESS'
UNION ALL
SELECT pl.id, feature_code, TRUE
FROM pl
CROSS JOIN LATERAL (
  VALUES
    ('mercantil.trends.read'),
    ('mercantil.competitors.read'),
    ('comercial.pricing.read'),
    ('comercial.pricing.optimize'),
    ('financiera.simulation.read'),
    ('financiera.simulation.run'),
    ('ia.copilot.chat'),
    ('ia.recommendations.read'),
    ('core.configuration.manage'),
    ('core.users.manage'),
    ('core.roles.manage')
) AS f(feature_code)
WHERE pl.code = 'ENTERPRISE';
