# Temporary BeatGrid drum samples and audition kits

All WAV files were synthesized specifically for BeatGrid by
`scripts/generate-samples.mjs`. No third-party recording, commercial audio,
or downloaded sample was used. No third-party attribution is required.
They may be used, modified, and distributed with this project.

The root files remain the unchanged **Current** baseline:

- kick.wav: decaying sine with a downward pitch sweep, 320 ms
- snare.wav: seeded noise plus a short sine body, 200 ms
- hat.wav: short high-pass noise, 75 ms

Four temporary whole-kit alternatives live under `kits/`:

- `modern`: short, punchy kick; crisp snare; controlled bright hat

All files are mono, 44.1 kHz, 16-bit PCM. Attack/release fades avoid clicks.
Regenerate from the project root with `node scripts/generate-samples.mjs`.
These are temporary audition sounds, replaceable independently of puzzle data.
The in-game developer selector is not intended as a permanent player feature.
