alter table profiles
  add column if not exists telegram_username text,
  add column if not exists budget_alert_enabled boolean not null default true,
  add column if not exists monthly_summary_enabled boolean not null default true;
