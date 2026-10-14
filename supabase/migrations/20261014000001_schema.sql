create extension if not exists pgtap with schema extensions;

create type influence as enum ('drunk', 'high', 'both', 'sober');
create type visibility as enum ('private', 'crew', 'friends', 'public');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text,
  avatar_url text,
  birthdate date not null,
  created_at timestamptz default now()
);

create function enforce_adult() returns trigger language plpgsql as $$
begin
  if new.birthdate > current_date - interval '21 years' then
    raise exception 'must be 21+' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger profiles_enforce_adult
  before insert or update of birthdate on profiles
  for each row execute function enforce_adult();

create table movies (
  tmdb_id int primary key,
  title text not null,
  year int,
  poster_path text,
  backdrop_path text,
  genres text[],
  runtime int,
  cached_at timestamptz not null
);

create table crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table crew_members (
  crew_id uuid references crews(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  primary key (crew_id, user_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tmdb_id int not null references movies(tmdb_id),
  watched_on date not null default current_date,
  influence influence not null,
  rating numeric(2,1) check (rating is null or (rating between 0.5 and 5 and rating * 2 = floor(rating * 2))),
  recommend boolean,
  review text,
  visibility visibility not null default 'friends',
  crew_id uuid references crews(id) on delete set null,
  rewatch boolean not null default false,
  created_at timestamptz default now(),
  check (influence <> 'sober' or recommend is null),
  check ((visibility = 'crew') = (crew_id is not null))
);

create table session_companions (
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (session_id, user_id)
);

create table friendships (
  user_a uuid references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  requested_by uuid not null references profiles(id) on delete cascade,
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create table cheers (
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (session_id, user_id)
);

create table lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  crew_id uuid references crews(id) on delete cascade,
  title text not null,
  description text,
  visibility visibility not null default 'friends',
  check ((owner_id is null) <> (crew_id is null))
);

create table list_items (
  list_id uuid references lists(id) on delete cascade,
  tmdb_id int references movies(tmdb_id),
  position int,
  added_by uuid references profiles(id) on delete set null,
  note text,
  primary key (list_id, tmdb_id)
);

create table queue (
  user_id uuid references profiles(id) on delete cascade,
  tmdb_id int references movies(tmdb_id),
  added_at timestamptz default now(),
  primary key (user_id, tmdb_id)
);

-- no policies yet (Task 3): deny-all for anon/authenticated
alter table profiles enable row level security;
alter table movies enable row level security;
alter table crews enable row level security;
alter table crew_members enable row level security;
alter table sessions enable row level security;
alter table session_companions enable row level security;
alter table friendships enable row level security;
alter table cheers enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table queue enable row level security;
