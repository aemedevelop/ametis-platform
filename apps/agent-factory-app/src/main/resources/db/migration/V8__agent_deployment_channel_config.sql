alter table agent_deployments
  add column if not exists welcome_message varchar(500),
  add column if not exists rate_limit_per_minute integer,
  add column if not exists rate_limit_per_day integer;
