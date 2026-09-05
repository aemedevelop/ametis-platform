alter table agent_deployments
  add column if not exists public_id varchar(48);

update agent_deployments
set public_id = 'dep_' || replace(gen_random_uuid()::text, '-', '')
where public_id is null;

alter table agent_deployments
  alter column public_id set not null;

create unique index if not exists uq_agent_deployments_public_id
  on agent_deployments (public_id);
