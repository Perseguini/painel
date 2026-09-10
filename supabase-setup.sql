-- ============================================================
-- DevClub Study Pro — configuração do banco no Supabase
-- Cole todo este arquivo no SQL Editor do seu projeto Supabase
-- (painel Supabase > SQL Editor > New query > Run)
-- ============================================================

-- Tabela de tickets de estudo
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  priority text not null default 'Média',
  description text,
  created_at timestamptz not null default now()
);

-- Tabela de anotações
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Outros',
  content text not null,
  created_at timestamptz not null default now()
);

-- Progresso do curso (1 linha por usuário)
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  value int not null default 0,
  updated_at timestamptz not null default now()
);

-- Ativa Row Level Security (cada usuário só vê/edita os próprios dados)
alter table public.tickets enable row level security;
alter table public.notes enable row level security;
alter table public.progress enable row level security;

drop policy if exists "tickets_owner" on public.tickets;
create policy "tickets_owner" on public.tickets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_owner" on public.notes;
create policy "notes_owner" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_owner" on public.progress;
create policy "progress_owner" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE (fotos/prints)
-- Antes de rodar o bloco abaixo, crie o bucket manualmente em:
-- painel Supabase > Storage > New bucket > nome: "photos" > Public: DESLIGADO
-- ============================================================

drop policy if exists "photos_owner_select" on storage.objects;
create policy "photos_owner_select" on storage.objects
  for select using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "photos_owner_insert" on storage.objects;
create policy "photos_owner_insert" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "photos_owner_delete" on storage.objects;
create policy "photos_owner_delete" on storage.objects
  for delete using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- OPCIONAL: as seções de Tickets e Progresso foram removidas do app.
-- Se quiser apagar essas tabelas do banco (elas não são mais usadas),
-- descomente e rode as linhas abaixo:
-- drop table if exists public.tickets;
-- drop table if exists public.progress;
-- ============================================================
