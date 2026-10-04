# BeatGrid - Full Project Brief

**Document status:** Active planning baseline  
**Date:** 4 October 2026  
**Current implementation target:** **Milestone 4 - Complete Core Round + Interaction Refinements**  
**Completed:** **Milestones 1-3**  
**Primary purpose:** Give Codex and future contributors enough context to understand the intended full game while only implementing the milestone or task explicitly requested in the current prompt.

---

## 1. Executive Summary

BeatGrid is a browser-based rhythm memory microgame. The player hears a short drum beat, commits it to memory, recreates it on a step grid, optionally names a song that uses the same or a similar groove, and then receives a reveal showing rhythm accuracy and bonus results.

The intended normal round is:

1. **Memorise** - listen to the target beat as many times as desired. The target may be looped.
2. **Recreate** - commit to the attempt, lose access to the target, and rebuild it from memory on the grid.
3. **Similar-song bonus** - optionally name a song that uses the same or a meaningfully similar beat/groove.
4. **Reveal** - show reconstruction accuracy, the correct beat, target-listen efficiency, and the similar-song bonus result.

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
6. Optionally enter a song that uses the same or a similar groove.
7. Reveal accuracy and results.

The key skill is not merely copying a visible or continuously available target. The player must decide when they have listened enough and then reproduce the pattern from memory.

### Desired qualities

- Quick to learn.
- Short rounds.
- Unlimited target listening during the memorisation phase.
- A meaningful reward for needing fewer target listens.
- Tight, satisfying audio timing.
- Clear interaction for non-musicians.
- Difficulty settings that genuinely change cognitive load.
- A bonus challenge based on recognising a song with a similar groove, without pretending that one rhythm uniquely belongs to one song.
- Easy to watch on stream or in short-form video.
- Strong "one more puzzle" potential.
- Clean enough to work on desktop and, later, mobile.

### What BeatGrid is not

BeatGrid is not intended to become a full drum sequencer, DAW, music-learning suite, or fully automatic song-transcription product. Features should be judged by whether they strengthen the puzzle game.

---

## 3. Core Game Loop

The four-part loop below is the intended identity of BeatGrid.

### 3.1 Memorise the target

The player hears the target drum beat rendered with BeatGrid's own drum sounds.

Rules:

- Target listening is **unlimited** in the normal game.
- The target may be played once or looped continuously.
- Each completed target playback counts as one **target listen**.
- Each completed loop repetition also counts as another target listen.
- Instrument one-shot previews do not count as target listens.
- Playback of the player's own recreation does not count as a target listen.
- There is no hard listen limit; fewer listens are rewarded rather than extra listens being forbidden.

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

### 3.3 Similar-song bonus

The bonus question should not ask the player to identify one supposedly unique source song.

Instead, the intended prompt is conceptually:

> **Do you know a song with the same or a similar beat?**

Rationale:

- common drum grooves are reused across many songs
- a beat may reasonably match more than one song
- treating one arbitrarily chosen song as the only correct answer would often feel unfair

The bonus should therefore support **multiple accepted answers**.

Early versions should use a curated list of accepted examples for each puzzle. A player may skip the bonus.

If a player's answer is not in the curated list, the UI should avoid implying with certainty that the song has no similar beat. Prefer wording such as "Not matched in our accepted answers" unless the game has a stronger validation system.

### 3.4 Reveal

Only after the player has submitted the reconstruction and completed or skipped the similar-song bonus should the game reveal:

- the correct beat pattern
- the player's rhythm accuracy
- missed target hits
- extra incorrect hits
- target listen count
- memory-efficiency bonus
- accepted example songs for the groove
- whether the player's submitted song matched an accepted answer

Rhythm correctness should not be revealed before the bonus opportunity if that information could influence the player's answer.

---

## 4. Difficulty Design

BeatGrid should eventually provide three clear difficulty settings.

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
- common, readable grooves
- moderate density
- some off-beat or syncopated elements, but still approachable

### Hard

- **3 active instruments:** Kick + Snare + Hi-Hat
- rhythmically more complex patterns
- more syncopation
- less obvious kick placement
- more demanding hi-hat patterns
- potentially denser or less repetitive grooves

Hard should not simply mean "more instruments forever." Three rows are enough to give BeatGrid a compact and recognisable identity.

### Difficulty and scoring

Accuracy should remain the main measure of performance.

Later scoring may apply a modest difficulty modifier so that an equally accurate Hard attempt is worth more than an Easy attempt, but the exact formula should remain tunable until playtesting provides evidence.

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

## 6. Memory-Efficiency Reward

Listening remains unlimited, but using fewer target listens should be rewarded.

### Principle

A player who recreates a beat accurately after three target listens has demonstrated stronger memory performance than a player who needs ten target listens.

However:

- accuracy remains the primary score
- listen efficiency is a secondary bonus
- extra listens never prevent completion
- the system should encourage skill without punishing accessibility

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

### Provisional memory bonus

The exact values are **tunable**. An initial prototype may use:

| Target listens | Memory bonus |
| --- | ---: |
| 1 | +10 |
| 2 | +8 |
| 3 | +6 |
| 4-5 | +4 |
| 6-7 | +2 |
| 8+ | +0 |

Keep this logic isolated in a function such as `calculateMemoryBonus(listenCount)` so it can be changed easily after playtesting.

Do not hide the components of the result. A reveal may show, for example:

```text
Rhythm Accuracy: 91.7%
Target Listens: 3
Memory Bonus: +6
```

A future combined score may also include a difficulty modifier, but the formula is not locked yet.

---

## 7. Product Principles

### 7.1 Prove fun before infrastructure

Do not build databases, authentication, leaderboards, automated transcription, admin systems, deployment pipelines, or commercial-song integrations until the core loop has been tested with real players.

### 7.2 Hand-curated quality beats automated quantity

The early game should use handcrafted patterns. A small number of good puzzles is more useful than hundreds of noisy auto-generated ones.

### 7.3 Audio timing is core functionality

The rhythm must feel tight. Visual polish can be simple in early versions, but inaccurate or jittery drum playback undermines the game itself.

### 7.4 Keep the UI game-like

The grid should be visually clear and playful. Avoid unnecessary production terminology or controls that make the game look like music software.

### 7.5 Memory is part of the challenge

The target should be freely available during memorisation, then unavailable once the player commits to recreating it. The challenge is not to copy-paste while repeatedly checking the answer.

### 7.6 Reveal information at the right time

The player's rhythm accuracy and bonus outcome should be revealed only after the player has finished the reconstruction and had the opportunity to answer or skip the similar-song bonus.

### 7.7 Build in replaceable layers

Puzzle data, accepted-song metadata, scoring, audio playback, and UI should be separated enough that local prototype implementations can later be replaced by server-backed versions without rewriting the whole app.

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
- Normal difficulty: Kick + Snare + Hi-Hat with approachable grooves.
- Hard difficulty: Kick + Snare + Hi-Hat with more complex grooves.
- Target listening during memorisation: unlimited.
- Fewer target listens: rewarded with a secondary memory bonus.
- Target access after committing to recreate: disabled for the rest of the attempt.
- Player recreation: may be replayed freely and should eventually loop by default.
- Instrument rows: obvious one-shot audition buttons.
- Grid editing: activating a cell should audition that row's instrument.
- Song bonus: name a song with the same/similar groove, not necessarily a single source song.
- Similar-song bonus may be skipped.
- Multiple accepted song answers should be supported.
- Commercial song audio: not required for the core game.
- Early versions: desktop-first and local-state focused.
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

Known interaction refinements still pending include making the instrument audition controls more obviously clickable and auditioning the appropriate sound when a grid cell is turned on.

---

## 10. Milestone 4 - Complete Core Round + Interaction Refinements - CURRENT TARGET

Milestone 4 should build on the working memory game rather than replacing it.

### 10.1 Interaction refinements

- Replace ambiguous coloured triangle instrument indicators with obvious speaker/play buttons.
- Instrument buttons play one Kick/Snare/Hi-Hat hit.
- Turning a grid cell on auditions that row's sound immediately.
- Turning a grid cell off does not play a sound.
- Preserve Web Audio buffer reuse and accurate pattern scheduling.

### 10.2 Target-listen tracking

- Track target listens during Memorise.
- Count every completed loop repetition as another listen.
- Do not count instrument previews or the player's own pattern playback.
- Freeze the listen count when Recreate begins.
- Keep listening unlimited.

### 10.3 Memory bonus

- Calculate a small, clearly separated memory-efficiency bonus.
- Accuracy remains the primary score.
- Keep the bonus formula isolated and easy to tune.

### 10.4 Submission flow

The temporary development-style Check action should evolve into a real submission flow:

1. Submit the recreated beat.
2. Freeze the grid.
3. Do not reveal accuracy yet.
4. Offer the similar-song bonus question.
5. Allow the player to answer or skip.
6. Reveal all results together.

### 10.5 Similar-song bonus

The question should be framed around a song using the **same or a similar beat**, not identifying one unique source song.

The puzzle should support multiple curated accepted answers.

Initial matching can be deterministic and local:

- lowercase
- trim whitespace
- ignore simple punctuation differences
- support aliases

Do not use external APIs or fuzzy AI matching for this milestone.

### 10.6 Reveal

Show:

- rhythm accuracy
- correct grid
- missed hits
- extra hits
- target-listen count
- memory bonus
- accepted similar-song examples
- whether the player's song answer matched the curated accepted list

### 10.7 Restart

A Play Again / Restart Round action should reset:

- grid
- phase
- target-listen count
- target loop state
- player-pattern playback
- similar-song answer
- reveal state

For now, replaying the same handcrafted puzzle is acceptable.

---

## 11. Future Difficulty Milestone

Difficulty is a confirmed product direction but does not need to be forced into Milestone 4 unless explicitly requested.

A later milestone should introduce:

```ts
type Difficulty = "easy" | "normal" | "hard";
```

Puzzle data should be able to declare:

- difficulty
- active instruments
- rhythm pattern
- BPM
- optional complexity tags

The UI should adapt cleanly so Easy can genuinely use only two active rows instead of showing an unnecessary Hi-Hat challenge.

Playtesting should determine whether BPM itself should be a difficulty lever; it should not be assumed that simply making a beat faster makes the puzzle better.

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

### Secondary score: memory efficiency

Reward fewer target listens using a modest bonus.

### Future difficulty component

A future combined score may account for difficulty, for example conceptually:

```text
final score = rhythm performance + memory bonus + difficulty adjustment
```

This is a design direction, not a locked production formula.

The UI should keep the components understandable rather than showing only an unexplained number.

---

## 13. Similar-Song Data Model Direction

The game should not require a puzzle to have exactly one "correct source song" for player-facing validation.

A future-friendly local shape could be:

```ts
type AcceptedSong = {
  title: string;
  artist?: string;
  aliases?: string[];
};

type Puzzle = {
  id: string;
  difficulty: "easy" | "normal" | "hard";
  bpm: number;
  steps: 16;
  activeInstruments: ("kick" | "snare" | "hat")[];
  kick: number[];
  snare: number[];
  hat?: number[];
  acceptedSongs?: AcceptedSong[];
  referenceSong?: {
    title: string;
    artist: string;
  };
};
```

`referenceSong` may be useful internally for provenance or curation, but it should not imply that every other song using the groove is wrong.

The player-facing bonus should validate against `acceptedSongs`.

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
- player's beat should eventually loop by default when played
- clear Stop control/state
- Reset
- Submit Beat

Do not expose the target playback controls.

### Similar-song phase

Show a lightweight prompt such as:

> Know a song with the same or a similar beat?

Provide:

- title input
- optional artist field only if useful
- Submit
- Skip

### Reveal phase

Show the payoff together:

- rhythm accuracy
- target vs player differences
- target listen count
- memory bonus
- accepted song examples
- whether the submitted song matched an accepted answer
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
  game/
    scoring.ts
    types.ts
  App.tsx
```

### Responsibilities

**Audio engine**  
Loads sounds, auditions one-shots, and schedules target/player patterns.

**Puzzle data**  
Defines handcrafted patterns, difficulty, and curated accepted-song examples independently from UI state.

**Scoring**  
Calculates rhythm performance and memory bonus.

**Grid UI**  
Displays and edits player state. It should not contain the core audio scheduler.

**Round state**  
Controls phases such as Memorise, Recreate, Similar Song, and Reveal without requiring a global state-management library.

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
- PostgreSQL/Supabase
- backend frameworks

---

## 17. Future Product Roadmap

The exact milestone numbering may evolve, but the intended order is:

### Milestones 1-3 - COMPLETE

Foundation, Web Audio, and memory/recreation flow.

### Milestone 4 - CURRENT

Complete the local round flow and interaction refinements:

- obvious instrument audition buttons
- grid-cell audition
- target-listen counting
- memory bonus
- submission
- similar-song bonus
- reveal
- restart

### Next: Difficulty + Puzzle Variety

- Easy / Normal / Hard
- 2-row Easy mode
- 3-row Normal/Hard
- multiple handcrafted puzzles
- difficulty-appropriate groove selection
- tune scoring through playtesting

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
- text metadata for accepted song examples

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

1. Make instrument audition controls unmistakably clickable.
2. Audition a drum sound whenever the player turns a grid hit on.
3. Track target listens accurately, including repeated target loops.
4. Reward fewer target listens without ever limiting access during Memorise.
5. Replace the one-source-song concept with a multiple-answer similar-song bonus.
6. Keep player-created beat playback freely available during Recreate and move toward loop-by-default playback.
7. Maintain the target lockout once the player commits to recreating.
8. Introduce Easy / Normal / Hard later using the agreed mixed difficulty model.

