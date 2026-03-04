create table if not exists users (
  id uuid primary key,
  email text unique not null,
  name text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists aircraft_profiles (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  cruise_tas int,
  fuel_burn_kgph int,
  reserve_minutes int default 45,
  created_at timestamptz not null default now()
);

create table if not exists airports (
  icao text primary key,
  iata text,
  name text not null,
  country text,
  lat double precision not null,
  lon double precision not null,
  elevation_ft int
);

create table if not exists flight_plans (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  dep_icao text not null references airports(icao),
  arr_icao text not null references airports(icao),
  route_text text,
  flight_level int,
  etd timestamptz,
  aircraft_profile_id uuid references aircraft_profiles(id),
  cycle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
