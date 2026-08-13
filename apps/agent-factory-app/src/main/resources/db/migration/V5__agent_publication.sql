alter table agents
  add column if not exists published_at timestamptz;
