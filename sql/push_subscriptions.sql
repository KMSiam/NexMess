-- Push subscriptions table for Web Push Notifications
-- Run this in Supabase SQL Editor

create table if not exists public.push_subscriptions (
  id          uuid    default gen_random_uuid() primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  endpoint    text    not null,
  p256dh      text    not null,
  auth        text    not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "own_insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "own_select" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "own_update" on public.push_subscriptions
  for update using (auth.uid() = user_id);

create policy "own_delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
