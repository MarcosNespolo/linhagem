-- Perfis e saves do jogo. Cada jogador, inclusive o anônimo, lê e escreve só as próprias linhas.
-- Login anônimo do Supabase usa o papel authenticated, então as políticas abaixo cobrem os dois casos.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados mínimos do jogador.';

create table public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  schema_version integer not null check (schema_version > 0),
  game_time_seconds double precision not null default 0 check (game_time_seconds >= 0),
  saved_at timestamptz not null default now(),
  device_id text check (char_length(device_id) <= 64),
  previous_state jsonb,
  constraint saves_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint saves_state_size check (pg_column_size(state) <= 1048576)
);

comment on table public.saves is
  'Um save por jogador. Em conflito entre aparelhos, vence o maior game_time_seconds.';
comment on column public.saves.previous_state is
  'Save anterior, guardado a cada atualização para restaurar em caso de perda.';

-- Guarda o save anterior e usa o relógio do servidor, que é mais confiável que o do aparelho.
create function public.saves_keep_previous_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.previous_state := old.state;
  new.saved_at := now();
  return new;
end;
$$;

create trigger saves_keep_previous_state
before update on public.saves
for each row execute function public.saves_keep_previous_state();

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

revoke all on public.profiles, public.saves from anon;
grant select, insert, update on public.profiles, public.saves to authenticated;

create policy "Jogador lê o próprio perfil"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Jogador cria o próprio perfil"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Jogador atualiza o próprio perfil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Jogador lê o próprio save"
  on public.saves for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Jogador cria o próprio save"
  on public.saves for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Jogador atualiza o próprio save"
  on public.saves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
