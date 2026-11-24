-- REVIEW-ONLY proposal. NOT in supabase/migrations and NOT applied to the team instance.
-- Do not move into deployable migrations before Daven approves identity, RLS,
-- verified server RPC operations, invitation semantics, and negative tests.
-- This is deliberately deny-by-default even for authenticated users.
--
-- Source contracts:
--   app/src/model/groupPlans.ts
--   app/server/groupPlansService.ts
--   docs/GROUP_PLAN_SECURITY_CONTRACT.md
--
-- Requires public.events from M2 and a provider-managed auth.users(id).
-- The isolated CI fixture creates a fake auth.users table; production must
-- use the actual Supabase Auth schema without modifying its internals.

create table public.group_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  organizer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'cancelled')),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_participants (
  plan_id uuid not null references public.group_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text
    check (response is null or response in ('works', 'if', 'cant')),
  private_condition text,
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (plan_id, user_id),
  constraint group_condition_matches_response
    check (
      case when response = 'if'
        then private_condition is not null
          and char_length(btrim(private_condition)) between 1 and 280
        else private_condition is null
      end
    ),
  constraint group_response_time_consistent
    check ((response is null and responded_at is null)
      or (response is not null and responded_at is not null))
);

-- Pending invitations deliberately do NOT reference auth.users. Creating one
-- never looks up a target account or discloses whether the supplied UUID exists.
-- Only the verified recipient can accept; accepted membership has a real FK.
-- Expired invitations grant no access. Prune expired records when inviting and
-- arrange a retention cleanup job before enabling the feature.
create table public.group_invitations (
  plan_id uuid not null references public.group_plans(id) on delete cascade,
  recipient_id uuid not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  primary key (plan_id, recipient_id)
);
create index group_invitations_recipient_idx on public.group_invitations(recipient_id);

-- A member may leave, including after confirmation; deleting their Auth
-- account has the same effect. Invalidate confirmation rather than retain
-- a misleading confirmed outing after a member's consent disappears.
create function public.sidequest_group_member_deleted()
returns trigger language plpgsql security definer set search_path = '' as $
begin
  update public.group_plans
    set revision = revision + 1, updated_at = now(),
        status = case when status = 'confirmed' then 'cancelled' else status end
    where id = old.plan_id;
  return old;
end;
$;
alter function public.sidequest_group_member_deleted() owner to postgres;
revoke all on function public.sidequest_group_member_deleted() from public, anon, authenticated;
create trigger group_member_deleted
after delete on public.group_participants
for each row execute function public.sidequest_group_member_deleted();

create index group_plans_organizer_idx on public.group_plans(organizer_id);
create index group_plans_event_idx on public.group_plans(event_id);
create index group_participants_user_idx on public.group_participants(user_id);

alter table public.group_plans enable row level security;
alter table public.group_participants enable row level security;
alter table public.group_invitations enable row level security;

-- Important: NO SELECT/INSERT/UPDATE/DELETE policies or table grants for
-- anon/authenticated in this schema proposal. Neither a participant's private
-- condition nor the member list is safe to expose by generic table queries.
-- Future server-verifiable RPCs must return a filtered projection, as the
-- domain service's readGroupPlan already does. Do not grant table SELECT to
-- "fix" missing group UI before that authorization layer exists.
revoke all on public.group_plans from public, anon, authenticated;
revoke all on public.group_participants from public, anon, authenticated;
revoke all on public.group_invitations from public, anon, authenticated;

comment on table public.group_plans is
  'SideQuest proposed group plan schema; not production-ready until verified authenticated RPCs and RLS are reviewed.';
comment on table public.group_participants is
  'Private response condition is never granted for direct client table reads; exposed via a caller-filtered server projection only.';
