-- TEST-ONLY assertion helpers, included with \ir inside a test's transaction (rolled back with it).
-- Each helper raises 'FAIL <label>: ...', so psql with ON_ERROR_STOP 1 stops with a non-zero exit.
create schema sqtest;
grant usage on schema sqtest to anon, authenticated;

-- Fails unless stmt raises want_state (and, when given, a message matching want_msg).
-- Any other error, or success, is a failure.
create function sqtest.refused(label text, stmt text, want_state text, want_msg text default null)
returns void language plpgsql as $$
declare st text; msg text;
begin
  begin
    execute stmt;
  exception when others then
    get stacked diagnostics st = returned_sqlstate, msg = message_text;
    if st <> want_state or (want_msg is not null and msg !~ want_msg) then
      raise exception 'FAIL %: refused for the wrong reason (% "%"), wanted % "%"',
        label, st, msg, want_state, coalesce(want_msg, 'any message');
    end if;
    return;
  end;
  raise exception 'FAIL %: was allowed', label;
end $$;

-- Rows touched by an UPDATE or DELETE.
create function sqtest.touched(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin execute stmt; get diagnostics n = row_count; return n; end $$;

create function sqtest.eq(label text, got anycompatible, want anycompatible) returns void
language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL %: got %, want %', label, got, want; end if;
end $$;

-- Acts as this user for the rest of the transaction (both claim spellings auth_stub.sql reads).
create function sqtest.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', u::text, true),
         set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
$$;

grant execute on all functions in schema sqtest to anon, authenticated;
