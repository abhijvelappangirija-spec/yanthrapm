# Supabase RLS Rollout

## Objective

Lock `brds`, `projects`, `sprints`, and `technical_context` to the authenticated owner at the database layer.

## Why this step matters

The app now scopes records in API routes, but application logic alone is not enough. Row Level Security makes the database enforce ownership even if:

1. a route is implemented incorrectly later,
2. a browser client talks to Supabase directly,
3. a future feature accidentally exposes raw queries.

## Files added

1. `supabase/migrations/202603240001_phase1_rls.sql`
2. `docs/supabase-rls-rollout.md`

## What the migration does

1. Creates an `is_current_user(target_user_id text)` helper using `auth.uid()`.
2. Adds ownership indexes for the main query paths.
3. Enables and forces RLS on:
   - `brds`
   - `projects`
   - `sprints`
   - `technical_context`
4. Adds `select`, `insert`, `update`, and `delete` policies for authenticated users.
5. Ensures `sprints` and `technical_context` cannot point to another user's BRD.

## Important architectural note

Current server routes use [supabase-server.ts](/Users/hariraja.prabhu/SDLC/yanthrapm/lib/supabase-server.ts).

Current behavior:

1. authenticated requests use an actor-scoped Supabase client with the user's bearer token, so RLS applies during normal signed-in flows,
2. fallback or internal-only requests can still use the server key path when no user token is available.

That is acceptable for now because:

1. the route layer still scopes queries by the server-derived actor,
2. authenticated user traffic now cooperates with RLS directly,
3. service-role access remains available only for fallback/internal cases that are explicitly controlled.

Long-term target:

1. keep user-bound server clients for end-user reads/writes,
2. reserve service-role access for admin-only or internal jobs,
3. remove fallback actor mode from production entirely.

## Environment requirement

Add this in production/server environments:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Do not expose it to the browser. It must never use the `NEXT_PUBLIC_` prefix.

Fallback actor policy:

```env
# Local/dev only when needed
APP_ALLOW_FALLBACK_ACTOR=true
APP_DEFAULT_USER_ID=your-local-test-user-id
```

Production target:

1. do not set `APP_ALLOW_FALLBACK_ACTOR`
2. do not set `APP_DEFAULT_USER_ID`
3. require a real authenticated Supabase session

## Rollout order

1. Confirm the base tables exist.
2. Confirm the app has a real authentication path or a planned cutover date.
3. Apply `supabase/migrations/202603240001_phase1_rls.sql` in Supabase SQL editor or migration tooling.
4. Verify authenticated users can only see their own records.
5. Verify unauthenticated direct access is blocked.
6. Verify server routes still work with the intended environment credentials.

## Verification checklist

1. Authenticated user A can create and read their own `projects`.
2. Authenticated user B cannot read or update user A's `projects`.
3. Authenticated user A can create `sprints` only for their own BRDs.
4. Authenticated user B cannot attach `technical_context` to user A's BRD.
5. Browser-side direct Supabase reads fail unless the row belongs to the authenticated user.

## Auth verification checklist

1. Open `/auth` and create or sign in with a real Supabase user.
2. Call `GET /api/auth/actor` in the browser session.
3. Confirm the response shows:
   - `authenticated: true`
   - `actor.source: "supabase-auth"`
4. Sign out and call `GET /api/auth/actor` again.
5. In production-like environments, confirm the route now returns `401`.
6. In local environments where fallback is intentionally enabled, confirm the response clearly shows:
   - `authenticated: false`
   - `actor.source: "configured-default"` or `"development-fallback"`
7. Confirm protected pages redirect unauthenticated users to `/auth` when fallback is disabled.

## Production rollout checks

1. Verify `APP_ALLOW_FALLBACK_ACTOR` is unset in production.
2. Verify `APP_DEFAULT_USER_ID`, `DEMO_USER_ID`, and `DEFAULT_USER_ID` are unset in production.
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is present only on the server.
4. Verify sign-in, sign-out, and page refresh all preserve the expected actor resolution.

## Known limitation

The current schema stores `user_id` as `text`. Policies compare `user_id` to `auth.uid()::text`. This works, but the cleaner long-term schema is:

1. store `user_id` as `uuid`,
2. reference `auth.users(id)` semantics consistently,
3. remove string-based fallback identities from production.

## Next step after this

Replace the default actor fallback in [request-actor.ts](/Users/hariraja.prabhu/SDLC/yanthrapm/lib/auth/request-actor.ts) with the real authentication/session flow used by the app.
