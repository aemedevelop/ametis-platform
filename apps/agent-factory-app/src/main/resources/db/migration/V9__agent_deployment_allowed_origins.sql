alter table agent_deployments
  add column if not exists allowed_origins varchar(1000);
