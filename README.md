# BeatGrid

A local React + TypeScript + Vite rhythm memory game. Milestone 4 implements one
complete round: **Memorise -> Recreate -> Guess -> Reveal**. The active task takes
precedence over older milestone labels in `BeatGrid_PROJECT_BRIEF.md`.

## Run and validate (PowerShell)

```powershell
cd C:\dev\BeatGrid
npm.cmd install
npm.cmd run dev
```

```powershell
npm.cmd run build
npm.cmd run lint
node --test tests/audioEngine.test.mjs tests/results.test.mjs
```

No new dependencies. Node 26 runs the tests directly with TypeScript type stripping.

## Four-phase round

- Memorise: unlimited Listen/Loop, instrument speaker buttons, disabled blank grid.
- Start Recreating: stops active/pending audio, freezes listen count, locks target.
- Recreate: toggle cells, Play My Beat, Reset, Submit Beat. Adding a hit auditions
  one sample; removing a hit is silent. Reset clears the grid but retains the phase
  and listen count. Player playback snapshots only the current player grid.
- Submit Beat: stops audio, freezes the grid, opens Song Guess. No accuracy, target
  cells, or per-cell correctness are rendered before Reveal.
- Guess: enter an optional title and submit, or Skip. Empty submission is a skip.
- Reveal: rhythm percentage, target listens, separate memory bonus, song title/
  artist, guess outcome, and grid comparison. Symbols distinguish correct hits
  (filled circle), missed hits (open circle), extras (cross), and correctly empty
  cells (blank). All filled and open circles together show the correct beat.
- Play Again: stops old audio and resets phase, grid, count, loop, guess, skipped
  state, errors and results for the same puzzle. No puzzle selector.

The UI and synchronous handler guards both enforce the phase boundaries. There is
no target replay control after commitment, including on the reveal screen.

## Listen counting and bonus

A listen is a **completed target bar**. One-shot Listen counts once after the bar;
every complete native loop repetition adds one. Failed/cancelled loading and
interrupted partial bars add zero. Instrument buttons, grid auditions, and player
playback never count. Counts are unlimited and freeze on Start Recreating.

The counter reads elapsed `AudioContext.currentTime`, including a final synchronous
flush before stopping. A 50 ms timer updates bookkeeping only, never musical timing.
Delayed background-tab updates catch up from the audio clock without losing bars.

`src/game/results.ts` contains the tunable memory table:

| Target listens | Bonus |
| --- | --- |
| 0 | +0 (no completed listening) |
| 1 | +10 |
| 2 | +8 |
| 3 | +6 |
| 4-5 | +4 |
| 6-7 | +2 |
| 8+ | +0 |

Rhythm accuracy remains the unchanged 48-cell comparison and the primary result.
The bonus is displayed separately; no combined score obscures the accuracy.

## Replace the placeholder song

Edit **`src/data/puzzles.ts`**, in the `puzzle` object:

- `songTitle`: replace `Prototype Beat (placeholder)` with the verified title.
- `artist`: replace the unassigned artist text.
- `acceptedSongAnswers`: optional alternate accepted titles.
- Set `placeholderSong: false` after supplying a genuine association.
- Update the kick/snare/hat arrays if the real transcription differs. Positions
  remain zero-based.

This generic beat is not attributed to a famous or real song. The guess screen
explicitly warns that placeholder metadata is being used. For matching tests,
`Prototype Beat` is the placeholder alias. Matching ignores case, whitespace and
punctuation via deterministic Unicode normalization; no fuzzy matching or APIs.
The answer is local client data for this prototype, not a production secret.

## Audio and interaction decisions

- Shared AudioContext, cached local decoded WAV samples, no additional audio library.
- One-shot hits use `source.start(startTime + step * (60 / bpm / 4))`.
- Loops use one mixed periodic bar and native buffer looping without JS restart gaps.
- A new playback/audition cancels old playback, including loops. Adding a grid hit
  therefore stops a running player preview and auditions the new instrument.
  Removing a hit makes no sound; any already-playing snapshot continues unchanged.
- Speaker controls use SVG, real buttons, labels, hover and focus states.
- Submission, phase transitions, restart and unmount stop pending/active audio.
- Failed loading/unlock/interruption shows a readable message and allows retry.
- Original local samples and their provenance remain in `src/assets/audio/`.

## Manual full-round checklist

1. Refresh: zero target listens, disabled empty grid, no automatic sound.
2. Audition Kick/Snare/Hi-Hat: one sample each, count unchanged.
3. Listen through one bar: count becomes 1. Repeat freely. Loop for several bars:
   each two-second bar at 120 BPM adds one; stopping a partial bar does not add it.
4. Start Recreating while looping: silence, target controls gone, final count fixed.
5. Add then remove a hit in each row: ON auditions, OFF does not. Play My Beat with
   empty/sparse/dense grids: only your selections play and target count stays fixed.
6. Reset: clear the grid without unlocking target or changing the listen count.
7. Submit Beat: grid frozen, no percentage or correctness markers. Audio stops.
8. Enter ` PROTOTYPE—BEAT!! ` to test normalized matching, then Submit Guess.
9. Reveal: title/artist placeholder, correct guess, accuracy, count/bonus, and all
   four grid states. For a useful mixed result, place Kick step 2, Snare step 5,
   Hi-Hat step 1: 35/48 = 72.9%, with extras, misses, correct hits and empty cells.
10. Play Again: every round field clears. Complete another round using Skip.
    With zero listens the bonus is +0; with an empty grid accuracy is 70.8%.
11. Check alignment and equal cell widths, plus keyboard activation/focus.

Automated tests cover audio timing/cache/cancellation, loop length, auditions,
completed listens (including failed and partial playback), bonus boundaries,
normalized song matching, and all four reveal outcomes. Browser checks cover
phase locks, no early correctness, loop counting, matching/Skip, and restart.
Listen on your own speakers/headphones to judge subjective sound quality.

No backend, accounts, daily puzzles, music APIs, commercial audio, extra puzzles,
leaderboards, sharing, or other later features are included.
