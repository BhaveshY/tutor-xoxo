drop policy "Users can insert their own chat messages" on "public"."chat_history";

drop policy "Users can view their own chat history" on "public"."chat_history";

drop policy "Users can insert their own roadmaps" on "public"."learning_roadmaps";

drop policy "Users can update their own roadmaps" on "public"."learning_roadmaps";

drop policy "Users can view their own roadmaps" on "public"."learning_roadmaps";

drop policy "Users can insert their own practice sessions" on "public"."practice_sessions";

drop policy "Users can update their own practice sessions" on "public"."practice_sessions";

drop policy "Users can view their own practice sessions" on "public"."practice_sessions";

drop policy "Users can update their own profile" on "public"."profiles";

drop policy "Users can view their own profile" on "public"."profiles";

revoke delete on table "public"."chat_history" from "anon";

revoke insert on table "public"."chat_history" from "anon";

revoke references on table "public"."chat_history" from "anon";

revoke select on table "public"."chat_history" from "anon";

revoke trigger on table "public"."chat_history" from "anon";

revoke truncate on table "public"."chat_history" from "anon";

revoke update on table "public"."chat_history" from "anon";

revoke delete on table "public"."chat_history" from "authenticated";

revoke insert on table "public"."chat_history" from "authenticated";

revoke references on table "public"."chat_history" from "authenticated";

revoke select on table "public"."chat_history" from "authenticated";

revoke trigger on table "public"."chat_history" from "authenticated";

revoke truncate on table "public"."chat_history" from "authenticated";

revoke update on table "public"."chat_history" from "authenticated";

revoke delete on table "public"."chat_history" from "service_role";

revoke insert on table "public"."chat_history" from "service_role";

revoke references on table "public"."chat_history" from "service_role";

revoke select on table "public"."chat_history" from "service_role";

revoke trigger on table "public"."chat_history" from "service_role";

revoke truncate on table "public"."chat_history" from "service_role";

revoke update on table "public"."chat_history" from "service_role";

revoke delete on table "public"."learning_roadmaps" from "anon";

revoke insert on table "public"."learning_roadmaps" from "anon";

revoke references on table "public"."learning_roadmaps" from "anon";

revoke select on table "public"."learning_roadmaps" from "anon";

revoke trigger on table "public"."learning_roadmaps" from "anon";

revoke truncate on table "public"."learning_roadmaps" from "anon";

revoke update on table "public"."learning_roadmaps" from "anon";

revoke delete on table "public"."learning_roadmaps" from "authenticated";

revoke insert on table "public"."learning_roadmaps" from "authenticated";

revoke references on table "public"."learning_roadmaps" from "authenticated";

revoke select on table "public"."learning_roadmaps" from "authenticated";

revoke trigger on table "public"."learning_roadmaps" from "authenticated";

revoke truncate on table "public"."learning_roadmaps" from "authenticated";

revoke update on table "public"."learning_roadmaps" from "authenticated";

revoke delete on table "public"."learning_roadmaps" from "service_role";

revoke insert on table "public"."learning_roadmaps" from "service_role";

revoke references on table "public"."learning_roadmaps" from "service_role";

revoke select on table "public"."learning_roadmaps" from "service_role";

revoke trigger on table "public"."learning_roadmaps" from "service_role";

revoke truncate on table "public"."learning_roadmaps" from "service_role";

revoke update on table "public"."learning_roadmaps" from "service_role";

revoke delete on table "public"."practice_sessions" from "anon";

revoke insert on table "public"."practice_sessions" from "anon";

revoke references on table "public"."practice_sessions" from "anon";

revoke select on table "public"."practice_sessions" from "anon";

revoke trigger on table "public"."practice_sessions" from "anon";

revoke truncate on table "public"."practice_sessions" from "anon";

revoke update on table "public"."practice_sessions" from "anon";

revoke delete on table "public"."practice_sessions" from "authenticated";

revoke insert on table "public"."practice_sessions" from "authenticated";

revoke references on table "public"."practice_sessions" from "authenticated";

revoke select on table "public"."practice_sessions" from "authenticated";

revoke trigger on table "public"."practice_sessions" from "authenticated";

revoke truncate on table "public"."practice_sessions" from "authenticated";

revoke update on table "public"."practice_sessions" from "authenticated";

revoke delete on table "public"."practice_sessions" from "service_role";

revoke insert on table "public"."practice_sessions" from "service_role";

revoke references on table "public"."practice_sessions" from "service_role";

revoke select on table "public"."practice_sessions" from "service_role";

revoke trigger on table "public"."practice_sessions" from "service_role";

revoke truncate on table "public"."practice_sessions" from "service_role";

revoke update on table "public"."practice_sessions" from "service_role";

alter table "public"."chat_history" drop constraint "chat_history_user_id_fkey";

alter table "public"."learning_roadmaps" drop constraint "learning_roadmaps_user_id_fkey";

alter table "public"."practice_sessions" drop constraint "practice_sessions_user_id_fkey";

alter table "public"."profiles" drop constraint "profiles_email_key";

drop function if exists "public"."handle_new_user"();

alter table "public"."chat_history" drop constraint "chat_history_pkey";

alter table "public"."learning_roadmaps" drop constraint "learning_roadmaps_pkey";

alter table "public"."practice_sessions" drop constraint "practice_sessions_pkey";

drop index if exists "public"."chat_history_pkey";

drop index if exists "public"."learning_roadmaps_pkey";

drop index if exists "public"."practice_sessions_pkey";

drop index if exists "public"."profiles_email_key";

drop table "public"."chat_history";

drop table "public"."learning_roadmaps";

drop table "public"."practice_sessions";

create table "public"."evolutionary_learning" (
    "id" uuid not null default gen_random_uuid(),
    "timestamp" timestamp with time zone default now(),
    "generation" integer not null,
    "fitness_score" double precision not null,
    "parameters" jsonb not null default '{}'::jsonb,
    "output" text not null,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."evolutionary_learning" enable row level security;

alter table "public"."profiles" add column "education" text;

alter table "public"."profiles" add column "interests" text[] default ARRAY[]::text[];

alter table "public"."profiles" alter column "created_at" set default timezone('utc'::text, now());

alter table "public"."profiles" alter column "created_at" set not null;

alter table "public"."profiles" alter column "email" drop not null;

alter table "public"."profiles" alter column "updated_at" set default timezone('utc'::text, now());

alter table "public"."profiles" alter column "updated_at" set not null;

CREATE UNIQUE INDEX evolutionary_learning_pkey ON public.evolutionary_learning USING btree (id);

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);

CREATE INDEX profiles_id_idx ON public.profiles USING btree (id);

alter table "public"."evolutionary_learning" add constraint "evolutionary_learning_pkey" PRIMARY KEY using index "evolutionary_learning_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$
;

grant delete on table "public"."evolutionary_learning" to "anon";

grant insert on table "public"."evolutionary_learning" to "anon";

grant references on table "public"."evolutionary_learning" to "anon";

grant select on table "public"."evolutionary_learning" to "anon";

grant trigger on table "public"."evolutionary_learning" to "anon";

grant truncate on table "public"."evolutionary_learning" to "anon";

grant update on table "public"."evolutionary_learning" to "anon";

grant delete on table "public"."evolutionary_learning" to "authenticated";

grant insert on table "public"."evolutionary_learning" to "authenticated";

grant references on table "public"."evolutionary_learning" to "authenticated";

grant select on table "public"."evolutionary_learning" to "authenticated";

grant trigger on table "public"."evolutionary_learning" to "authenticated";

grant truncate on table "public"."evolutionary_learning" to "authenticated";

grant update on table "public"."evolutionary_learning" to "authenticated";

grant delete on table "public"."evolutionary_learning" to "service_role";

grant insert on table "public"."evolutionary_learning" to "service_role";

grant references on table "public"."evolutionary_learning" to "service_role";

grant select on table "public"."evolutionary_learning" to "service_role";

grant trigger on table "public"."evolutionary_learning" to "service_role";

grant truncate on table "public"."evolutionary_learning" to "service_role";

grant update on table "public"."evolutionary_learning" to "service_role";

create policy "Enable insert for authenticated users only"
on "public"."evolutionary_learning"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."evolutionary_learning"
as permissive
for select
to public
using (true);


create policy "Enable CRUD for users based on user_id"
on "public"."profiles"
as permissive
for all
to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Enable read access for all users"
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on id"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


CREATE TRIGGER handle_evolutionary_learning_updated_at BEFORE UPDATE ON public.evolutionary_learning FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


