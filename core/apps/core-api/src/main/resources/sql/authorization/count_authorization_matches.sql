SELECT COUNT(1)
FROM user_tenants ut
JOIN roles r ON r.id = ut.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
JOIN subscriptions s ON s.tenant_id = ut.tenant_id AND s.status = 'ACTIVE'
JOIN plans pl ON pl.id = s.plan_id
JOIN plan_features pf ON pf.plan_id = pl.id AND pf.enabled = TRUE
WHERE ut.user_id = :userId
  AND ut.tenant_id = :tenantId
  AND ut.membership_status = 'ACTIVE'
  AND p.code = :permissionCode
  AND pf.feature_code = :permissionCode
