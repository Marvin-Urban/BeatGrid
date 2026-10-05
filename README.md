# BeatGrid

BeatGrid is a React + TypeScript + Vite rhythm-memory game. Its current round is:

**Difficulty Select → Memorise → Recreate → Reveal**

It includes eight handcrafted puzzles across Easy, Normal, Hard, and Insane,
Web Audio playback, completed-bar listen counting, and per-puzzle local records
for the fewest listens used on a perfect reconstruction.

## Run locally

PowerShell blocks `npm.ps1` on this machine, so use `npm.cmd`:

```powershell
cd C:\dev\BeatGrid
npm.cmd install
npm.cmd run dev
```

The game remains fully playable when Supabase is not configured. Remote attempt
saves are skipped and local personal records continue to use `localStorage`.

## Supabase setup

1. Create or select a project at [Supabase](https://supabase.com/dashboard).
2. Open **Project Settings → API**. Copy the project URL and the browser-safe
   **anon/public key**. Never use the service-role key in this frontend.
3. Copy `.env.example` to `.env.local`:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Replace the placeholders in `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-browser-safe-anon-key
   ```

5. In the Supabase dashboard, open **Authentication → Providers → Anonymous**
   and enable anonymous sign-ins. BeatGrid uses an anonymous Supabase user UUID;
   it does not show registration or login UI.
6. Open **SQL Editor**, paste the complete contents of
   `supabase/migrations/202610040001_create_game_attempts.sql`, and run it once.
7. Restart `npm.cmd run dev` after adding or changing environment variables.
8. Complete a BeatGrid round, then open **Table Editor → game_attempts**. The new
   row should contain the puzzle, difficulty, accuracy, target listens, perfect
   flag, anonymous player UUID, and database-generated timestamp.

The migration enables Row Level Security. Authenticated users can insert and read
only rows whose `player_id` matches their Supabase identity. Client-side update
and delete access is intentionally not granted.

## Backend boundary

- `src/backend/supabase.ts` creates the configured browser client.
- `src/backend/resultsService.ts` initializes anonymous identity, saves attempts,
  and derives a player's best perfect attempt for a puzzle.
- `src/backend/types.ts` maps game-facing camelCase values to database rows.
- Local personal-best display still uses `beatgrid.bestListens.<puzzleId>` in
  `localStorage`. The remote lookup is ready for a future persistence milestone.

Backend errors are logged for development and never prevent Reveal. No global
leaderboard, daily puzzle, visible account system, or public attempt access is
included.

## Validate

```powershell
npm.cmd run build
npm.cmd run lint
node --experimental-strip-types --test tests\*.test.mjs
```

Automated tests cover puzzle pools, active-row scoring, local records, backend-row
mapping, Web Audio scheduling and cancellation, looping, auditions, and completed
target-listen counting.
