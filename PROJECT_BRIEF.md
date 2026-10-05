# BeatGrid - Full Project Brief

**Document status:** Active planning baseline  
**Date:** 4 October 2026  
**Current implementation target:** **Configure and playtest the completed Milestone 7 prototype**
**Completed:** **Milestones 1-7**
**Primary purpose:** Give Codex and future contributors enough context to understand the intended full game while only implementing the milestone or task explicitly requested in the current prompt.

---

## 1. Executive Summary

BeatGrid is a browser-based rhythm memory microgame. The player hears a short drum beat, commits it to memory, recreates it on a step grid, and then receives a reveal showing rhythm accuracy and listen performance.

The intended normal round is:

1. **Memorise** - listen to the target beat as many times as desired. The target may be looped.
2. **Recreate** - commit to the attempt, lose access to the target, and rebuild it from memory on the grid.
3. **Reveal** - show reconstruction accuracy, the correct beat, and target-listen performance.

The target audio is BeatGrid's own drum rendering of a handcrafted rhythm pattern, not a commercial song recording. This keeps the core game focused on rhythm and avoids making licensed music playback a requirement.

The long-term product may become a daily puzzle game with multiple difficulties, hand-curated rhythm puzzles, streaks, shareable results, streamer-friendly presentation, and a scalable puzzle-authoring workflow. These features should be added only after the core game loop proves enjoyable.

Codex should use this document as long-term context, but must only implement the milestone or task explicitly requested in the current prompt.

---

## 2. Product Vision

BeatGrid should feel like a fast, understandable **memory + rhythm puzzle**, not like a music-production tool.

A new player should understand the round within seconds:

1. Hear the target groove.
2. Replay or loop it while memorising.
3. Press **Start Recreating** when ready.
4. Rebuild the groove from memory.
5. Listen to the player's own recreation as much as needed.
6. Submit the reconstruction and reveal accuracy and results.

The key skill is not merely copying a visible or continuously available target. The player must decide when they have listened enough and then reproduce the pattern from memory.

### Desired qualities

- Quick to learn.
- Short rounds.
- Unlimited target listening during the memorisation phase.
- A meaningful reward for needing fewer target listens.
- Tight, satisfying audio timing.
- Clear interaction for non-musicians.
- Difficulty settings that genuinely change cognitive load.
- Easy to watch on stream or in short-form video.
- Strong "one more puzzle" potential.
- Clean enough to work on desktop and, later, mobile.

### What BeatGrid is not

BeatGrid is not intended to become a full drum sequencer, DAW, music-learning suite, or fully automatic song-transcription product. Features should be judged by whether they strengthen the puzzle game.

---

## 3. Core Game Loop

The three-part loop below is the intended identity of BeatGrid.

### 3.1 Memorise the target

The player hears the target drum beat rendered with BeatGrid's own drum sounds.

Rules:

- Target listening is **unlimited** in the normal game.
- The target may be played once or looped continuously.
- Each completed target playback counts as one **target listen**.
- Each completed loop repetition also counts as another target listen.
- Instrument one-shot previews do not count as target listens.
- Playback of the player's own recreation does not count as a target listen.
- There is no hard listen limit or score penalty for extra listens.
- Start Recreating remains disabled until one full target bar has completed.

The player decides when they are ready and presses **Start Recreating** / **I'm Ready**.

### 3.2 Recreate from memory

Once the player commits:

- any target playback stops
- target looping stops
- the correct target beat is no longer available for that attempt
- the player edits the grid from memory

The player may listen to their **own** recreation as often as needed.

The default long-term UX should make the player's recreation **loop automatically when they choose to play it**, because a repeated groove is easier to judge musically than a single isolated bar. There should be an obvious way to stop that loop.

The player must never regain access to the target during the same attempt simply by pressing another playback control.

### 3.3 Reveal

Submitting the reconstruction stops player playback, freezes the grid, and moves directly to Reveal. Reveal shows:

- the correct beat pattern
- the player's rhythm accuracy
- missed target hits
- extra incorrect hits
- target listen count
- personal best for the fewest listens used on a perfect rhythm attempt

---

## 4. Difficulty Design

BeatGrid provides four clear difficulty settings.

Difficulty should use a **mixed approach**: change both the number of active drum parts and the intrinsic complexity of the rhythm.

### Easy

- **2 active instruments:** Kick + Snare
- simple, intuitive, easy-to-hear patterns
- limited syncopation
- lower density
- strong, common pulse

The Hi-Hat row should be absent or clearly inactive rather than presenting a fake third challenge.

### Normal

- **3 active instruments:** Kick + Snare + Hi-Hat
- Kick and Snare remain about as simple as Easy
- the added Hi-Hat row creates the main extra memory challenge
- common, readable grooves with limited syncopation

### Hard

- **3 active instruments:** Kick + Snare + Hi-Hat
- uses the patterns previously classified as Normal
- approachable syncopation and moderate density

### Insane

- **3 active instruments:** Kick + Snare + Hi-Hat
- uses the patterns previously classified as Hard
- rhythmically more complex patterns
- more syncopation
- less obvious kick placement
- more demanding hi-hat patterns
- potentially denser or less repetitive grooves

Insane should not simply mean "more instruments forever." Three rows are enough to give BeatGrid a compact and recognisable identity.

### Difficulty and scoring

Accuracy should remain the main measure of performance.

No difficulty multiplier is currently used. Playtesting should determine whether one is ever warranted.

---

## 5. Audio Interaction Rules

Audio interaction is core gameplay, not decoration.

### 5.1 Instrument audition controls

The player must be able to hear what each instrument means before and during recreation.

Each active row should have an obvious clickable control next to the label, for example a small speaker/play icon:

- Kick
- Snare
- Hi-Hat

Requirements:

- it must look clickable, not decorative
- use a real accessible button
- provide pointer, hover, focus, and ARIA affordances
- clicking plays exactly one hit of that instrument
- reuse already-decoded `AudioBuffer`s
- do not fetch/decode again on every click

The previously used small coloured triangle treatment is not clear enough as an interaction affordance and should be replaced.

### 5.2 Grid-cell audition

During recreation:

- turning an empty Kick cell **on** immediately plays one Kick hit
- turning an empty Snare cell **on** immediately plays one Snare hit
- turning an empty Hi-Hat cell **on** immediately plays one Hi-Hat hit
- turning an active cell **off** should not replay the sound

This feedback helps non-musicians understand the grid and makes editing feel responsive.

Grid-cell audition does not affect the target-listen count.

### 5.3 Player-pattern playback

The player must be able to listen to the current recreation during the recreate phase.

Intended long-term behavior:

- **Play My Beat** starts the player's current pattern in a loop by default
- looping continues cleanly until stopped
- the player can edit while evaluating the groove
- playback always uses the player's grid, never the hidden target
- player-pattern loops do not count as target listens

Audio scheduling should continue to use the Web Audio clock rather than JavaScript timers.

---

## 6. Listen Performance and Personal Records

Listening remains unlimited. Target listens are a performance stat, not a score component.

### Principle

Accuracy is the only rhythm score. A player who reaches 100% accuracy can also set a per-puzzle personal record for the fewest completed target listens.

### Target-listen counting

Count:

- each deliberate target playback
- each completed repetition while target looping is active

Do not count:

- instrument one-shot previews
- grid-cell audition sounds
- playback/looping of the player's own recreation
- failed target playback that produces no usable audio

Freeze the listen count when the player enters the Recreate phase.

### Local personal best

- Store the record under `beatgrid.bestListens.<puzzleId>` in `localStorage`.
- Create or improve a record only when rhythm accuracy is exactly 100%.
- Imperfect attempts never create or update a record.
- A worse or equal perfect attempt never replaces a better record.
- Records persist across rounds and page reloads; ordinary round state resets.
- The storage boundary should remain replaceable so a future leaderboard can use a backend without rewriting round logic.
- Completed attempts may also be stored in Supabase when configured, but the current display continues to use the local record.
- No public or global leaderboard is part of the prototype.

---

## 7. Product Principles

### 7.1 Add infrastructure in measured steps

Supabase now provides a small persistence foundation for completed attempts. Daily puzzles, global leaderboards, visible accounts, admin systems, deployment pipelines, and commercial-song integrations remain deferred.

### 7.2 Hand-curated quality beats automated quantity

The early game should use handcrafted patterns. A small number of good puzzles is more useful than hundreds of noisy auto-generated ones.

### 7.3 Audio timing is core functionality

The rhythm must feel tight. Visual polish can be simple in early versions, but inaccurate or jittery drum playback undermines the game itself.

### 7.4 Keep the UI game-like

The grid should be visually clear and playful. Avoid unnecessary production terminology or controls that make the game look like music software.

### 7.5 Memory is part of the challenge

The target should be freely available during memorisation, then unavailable once the player commits to recreating it. The challenge is not to copy-paste while repeatedly checking the answer.

### 7.6 Reveal information at the right time

The player's rhythm accuracy should be revealed only after the player submits the reconstruction.

### 7.7 Build in replaceable layers

Puzzle data, scoring, audio playback, persistence, and UI should be separated enough that implementations can be replaced without rewriting the whole app.

### 7.8 Avoid unnecessary dependencies

Prefer React, TypeScript, browser APIs, and small purpose-built modules. Do not install libraries merely for convenience when the platform already provides the required capability.

---

## 8. Current Product Decisions

- Frontend: React + TypeScript + Vite.
- Audio: browser Web Audio API.
- Early puzzle creation: handcrafted.
- Default grid resolution: 16 sixteenth-note steps across one 4/4 bar.
- Core instrument set: Kick, Snare, Hi-Hat.
- Easy difficulty: Kick + Snare only.
- Normal difficulty: Easy-like Kick + Snare plus a straightforward Hi-Hat part.
- Hard difficulty: the previous Normal patterns.
- Insane difficulty: the previous Hard patterns.
- Target listening during memorisation: unlimited.
- Start Recreating: disabled until one target bar has completed.
- Fewer target listens: shown as a per-puzzle personal best only after 100% accuracy.
- Memory bonus: removed; extra listens do not reduce rhythm accuracy.
- Target access after committing to recreate: disabled for the rest of the attempt.
- Player recreation: loops by default during Recreate and may be stopped or restarted freely.
- Instrument rows: obvious one-shot audition buttons.
- Grid editing: activating a cell should audition that row's instrument.
- Active round: Difficulty Select -> Memorise -> Recreate -> Reveal.
- Similar Song: removed from the active prototype because synthetic grooves do not support reliable song claims.
- Backend: Supabase Postgres with anonymous authentication and Row Level Security.
- Remote persistence: completed attempts only; failures never block local gameplay.
- Local personal records: remain the source displayed in the current UI.
- Commercial song audio: not required for the core game.
- Current version: desktop-first, local-gameplay focused, with optional remote attempt persistence.
- Automatic beat detection/transcription: not required for early development.

---

## 9. Completed Work

### Milestone 1 - Project Foundation and Interactive Grid - COMPLETE

Implemented:

- React + TypeScript + Vite project at `C:\dev\BeatGrid`
- one local handcrafted 16-step puzzle
- Kick, Snare, Hi-Hat rows
- interactive step grid
- local player state
- Reset behavior
- temporary local checking/scoring
- no backend/database dependency

### Milestone 2 - Web Audio Playback - COMPLETE

Implemented:

- Web Audio based drum playback
- local Kick, Snare, and Hi-Hat samples
- target beat playback
- playback of the player's current pattern
- accurate scheduling based on `AudioContext.currentTime`
- browser audio-context unlock/resume handling
- reuse of decoded sample buffers

### Milestone 3 - Memory Flow + UI Cleanup - COMPLETE

Implemented:

- explicit Memorise -> Recreate flow
- target replay during Memorise
- target looping during Memorise
- committing to Recreate removes access to the correct target
- player's own pattern can be played during Recreate
- grid layout was cleaned up
- unequal/narrow first step cells were corrected
- four-beat grouping was simplified so the grid reads more cleanly

---

## 10. Milestone 4 - Complete Core Round + Interaction Refinements - COMPLETE

Milestone 4 completed the local four-part round without replacing the working memory game.

### 10.1 Implemented interaction refinements

- Replace ambiguous coloured triangle instrument indicators with obvious speaker/play buttons.
- Instrument buttons play one Kick/Snare/Hi-Hat hit.
- Turning a grid cell on auditions that row's sound immediately.
- Turning a grid cell off does not play a sound.
- Preserve Web Audio buffer reuse and accurate pattern scheduling.

### 10.2 Implemented target-listen tracking

- Track target listens during Memorise.
- Count every completed loop repetition as another listen.
- Do not count instrument previews or the player's own pattern playback.
- Freeze the listen count when Recreate begins.
- Keep listening unlimited.

### 10.3 Superseded memory bonus

Milestone 4 introduced a provisional memory bonus. Milestone 6 removed its logic,
state, formula, and display after playtesting. Target listens now feed only the
perfect-round personal record.

### 10.4 Implemented submission flow

The temporary development-style Check action should evolve into a real submission flow:

1. Submit the recreated beat.
2. Freeze the grid.
3. Do not reveal accuracy yet.
4. Offer the similar-song bonus question.
5. Allow the player to answer or skip.
6. Reveal all results together.

### 10.5 Implemented similar-song bonus

The question should be framed around a song using the **same or a similar beat**, not identifying one unique source song.

The puzzle should support multiple curated accepted answers.

Initial matching can be deterministic and local:

- lowercase
- trim whitespace
- ignore simple punctuation differences
- support aliases

Do not use external APIs or fuzzy AI matching for this milestone.

### 10.6 Implemented reveal

Show:

- rhythm accuracy
- correct grid
- missed hits
- extra hits
- target-listen count
- personal best when the rhythm is perfect
- accepted similar-song examples
- whether the player's song answer matched the curated accepted list

### 10.7 Implemented restart

A Play Again / Restart Round action should reset:

- grid
- phase
- target-listen count
- target loop state
- player-pattern playback
- similar-song answer
- reveal state

The completed implementation includes obvious speaker buttons, grid-cell audition,
completed-bar listen counting, beat submission without
early correctness feedback, an optional similar-song question, full grid reveal,
and safe round reset.

---

## 11. Milestone 5 - Difficulty + Puzzle Variety - COMPLETE

Milestone 5 introduced:

```ts
type Difficulty = "easy" | "normal" | "hard";
```

Puzzle data now declares:

- difficulty
- active instruments
- rhythm pattern
- BPM
- optional complexity tags

- a pre-round Easy / Normal / Hard selector
- two handcrafted prototype puzzles per difficulty
- Easy with Kick + Snare only across playback, grid, scoring, and reveal
- Normal with three approachable instrument parts
- Hard with three denser, more syncopated parts rather than merely faster BPM
- random selection within the chosen pool with immediate-repeat avoidance
- another-puzzle and change-difficulty actions after Reveal
- player-created beat looping by default during Recreate
- clean loop restart from the updated grid when the player edits during playback
- multiple curated accepted-song objects per puzzle, with empty lists until verified
- cautious unmatched wording and accepted examples on Reveal when available

Difficulty is displayed throughout a round and in the results. No difficulty score
multiplier has been added; playtesting should determine whether one is warranted.

---

## 11.1 Milestone 6 - Playtest Refinement + Difficulty Rebalance - COMPLETE

Milestone 6 refined the local prototype without changing the core audio or round flow:

- expanded `Difficulty` to `easy | normal | hard | insane`
- kept the former Easy patterns as Easy
- added two Normal patterns with Easy-like Kick/Snare parts and an added Hi-Hat challenge
- moved the former Normal patterns to Hard
- moved the former Hard patterns to Insane
- reduced the difficulty screen to four direct choices
- made Listen the primary Memorise action
- disabled Start Recreating until one completed target listen
- removed the memory bonus completely
- added per-puzzle, perfect-round listen records in local storage
- simplified the main screen and Reveal copy while retaining the three essential result markers
- preserved target playback/looping, audition behavior, player looping, target lockout,
  the similar-song phase, and the Select -> Memorise -> Recreate -> Similar Song -> Reveal flow

---

## 11.2 Milestone 7 - Remove Similar Song + Supabase Foundation - COMPLETE

Milestone 7 changed the active round to Select -> Memorise -> Recreate -> Reveal.

Implemented:

- removed the Similar Song phase, inputs, result UI, matching helpers, and puzzle song metadata
- made Submit Beat stop playback, freeze the reconstruction, calculate results, and reveal immediately
- added the official Supabase browser client behind environment variables
- added anonymous Supabase identity without visible account UI
- added a typed service layer for saving completed attempts and reading a player's best perfect attempt
- retained localStorage as the current source for displayed personal records
- added a `game_attempts` migration with private user-owned RLS policies and one focused perfect-attempt index
- made missing configuration and backend failures non-blocking for the local game
- documented project setup without adding a global leaderboard or daily puzzle system

---

## 12. Scoring Direction

Scoring remains intentionally tunable.

### Primary score: rhythm accuracy

Possible metrics include:

- correctly placed hits
- missed target hits
- extra incorrect hits
- exact cell accuracy
- step-level accuracy

Avoid a metric that over-rewards correctly empty cells if that makes sparse beats appear easier than they should be.

### Secondary stat: listen performance

Show target listens and the best perfect-round listen count for that puzzle. Do not combine listens with rhythm accuracy.

### Future comparison

A future leaderboard may compare perfect-round listen records through the existing
backend service boundary. Public/global reads and leaderboard UI are not implemented.

---

## 13. Future Real-Beat / Song-Recognition Mode

Similar Song is not part of the active BeatGrid round. The current patterns are
synthetic handcrafted grooves and do not provide a strong enough connection to
specific real songs for reliable player-facing validation.

The idea may return in a separate future mode if BeatGrid gains verified song
transcriptions, intentionally curated real-world grooves, and suitable licensed
or legitimate rhythm data. Do not add accepted-song fields or song tables to the
current synthetic puzzle model.

---

## 14. UI/UX Direction

### Memorise phase

Show:

- clear target Listen control
- target Loop on/off control
- target-listen count
- obvious instrument audition buttons
- clear **Start Recreating** action

The reconstruction grid may be hidden, disabled, or visually secondary during Memorise depending on playtesting.

### Recreate phase

Show:

- editable grid
- obvious instrument audition buttons
- cell-on audio audition
- **Play My Beat**
- player's beat loops by default when played, with a clear Stop state
- clear Stop control/state
- Reset
- Submit Beat

Do not expose the target playback controls.

### Reveal phase

Show the payoff together:

- rhythm accuracy
- target vs player differences
- target listen count
- per-puzzle personal best
- difficulty
- Play Again

### Grid rules

- All step cells must have equal width.
- Row labels/controls must not affect cell widths.
- Groups of four steps should be visible through subtle spacing/dividers, not cluttered headers.
- All rows align perfectly.
- Active/inactive cells are immediately distinguishable.

---

## 15. Recommended Code Boundaries

The exact folder names are not mandatory, but avoid putting all game logic into one React component.

A reasonable structure is:

```text
src/
  audio/
    audioEngine.ts
  components/
    BeatGrid.tsx
    Controls.tsx
    Result.tsx
  data/
    puzzles.ts
  backend/
    supabase.ts
    resultsService.ts
    types.ts
  game/
    scoring.ts
    types.ts
  App.tsx
```

### Responsibilities

**Audio engine**  
Loads sounds, auditions one-shots, and schedules target/player patterns.

**Puzzle data**  
Defines handcrafted synthetic patterns and difficulty independently from UI state.

**Scoring**  
Calculates rhythm performance and reveal cell outcomes.

**Personal records**
Reads and conditionally updates perfect-round listen records through a small replaceable storage boundary.

**Backend service**
Owns Supabase authentication and attempt queries. React components pass game-facing values and do not contain raw database queries.

**Grid UI**  
Displays and edits player state. It should not contain the core audio scheduler.

**Round state**  
Controls Memorise, Recreate, and Reveal without requiring a global state-management library.

These separations should remain lightweight.

---

## 16. Current Development Environment

The project lives at:

```text
C:\dev\BeatGrid
```

Current local tools:

- Windows
- Node.js `v26.10.0`
- npm `11.19.1`
- Git `2.55.0.windows.5`
- Visual Studio Code `1.139.1` x64

React, TypeScript, and Vite are the frontend stack.

### PowerShell note

The machine blocks the PowerShell `npm.ps1` wrapper under its current execution policy. Use `npm.cmd` in PowerShell unless that policy is intentionally changed.

Examples:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

Node 26 has already worked with Vite on this machine. Do not change Node versions unless a real compatibility problem appears.

### Tools intentionally not required yet

Do not install these merely because they may appear in future planning:

- Python
- Librosa
- Essentia
- Aubio
- FFmpeg
- Docker
- backend frameworks

---

## 17. Future Product Roadmap

The exact milestone numbering may evolve, but the intended order is:

### Milestones 1-7 - COMPLETE

Foundation, Web Audio, memory/recreation flow, the complete local round,
interaction refinements, Easy/Normal/Hard/Insane, eight handcrafted puzzles,
active-row scoring, loop-by-default player playback, playtest copy cleanup,
local perfect-round listen records, removal of Similar Song from the active
round, and a private Supabase attempt-storage foundation.

### Next: Local playtesting and tuning

- test whether the eight grooves and four modes feel appropriately distinct
- tune puzzle patterns and sample levels
- decide from playtesting whether scoring should change or gain a difficulty modifier
- configure and observe anonymous attempt persistence before building public features

### Later: Daily/Persistence

Only after the game is fun locally:

- daily puzzle selection
- backend scoring
- persistence
- streaks
- optional leaderboard
- anti-cheat improvements

### Later: Content Scaling

Research:

- existing beat/bar datasets
- tool-assisted transcription
- semi-automatic drum extraction
- manual curation workflow

Automation should assist curation rather than become a prerequisite for the game.

### Later: Social / Presentation

Potential features:

- shareable result cards
- streamer mode
- mobile layout
- challenge links
- social comparison

---

## 18. Commercial Audio and Content Rights

BeatGrid does not require commercial song recordings to function.

Early and core versions should use:

- BeatGrid's own licensed/created drum samples
- abstract rhythm patterns
- optional verified song metadata only if a future real-beat mode is deliberately developed

Do not embed song clips or stream commercial recordings unless a suitable licensed source/API is deliberately selected and its terms are understood.

The project should keep a clear distinction between:

- an abstract drum transcription/groove
- metadata naming songs that use a similar groove
- copyrighted commercial recordings

---

## 19. Codex Working Rules

This document provides **context**, not permission to implement the whole roadmap.

When Codex is given a task:

1. Read this project brief first.
2. Inspect the existing repository before editing.
3. Implement only the requested milestone/task.
4. Do not proactively build future features.
5. Avoid unnecessary dependencies.
6. Keep puzzle data, audio, scoring, round state, and UI reasonably separate without overengineering.
7. Preserve working behavior outside the requested change.
8. Use the Web Audio clock for musical scheduling.
9. Run TypeScript/build checks after changes.
10. Fix errors introduced by the task.
11. Report which files changed and how to test the result.
12. Stop after the requested scope is complete.

### Credit-conscious development

Prefer small, testable Codex tasks over one giant implementation request.

Do not spend Codex effort on backend, deployment, automated transcription, or production-scale content tooling until the local core loop has been validated through actual play.

---

## 20. Immediate Design Priorities

The next development work should preserve these product decisions:

1. Playtest Easy, Normal, Hard, and Insane with musicians and non-musicians.
2. Tune the eight handcrafted patterns based on observed confusion and enjoyment.
3. Verify Supabase anonymous attempt storage and RLS with a configured development project.
4. Evaluate whether cell accuracy over-rewards empty cells, especially on Easy.
5. Keep player-created beat looping, target lockout, and accurate listen counting intact.
6. Defer difficulty multipliers until playtesting shows a clear need.
7. Keep global leaderboards and daily puzzles as future work.
