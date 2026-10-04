import { useEffect, useRef, useState } from 'react'
import { puzzle, type Instrument } from './data/puzzles'
import { createEmptyGrid, instruments, scoreGrid } from './game/scoring'
import { calculateMemoryBonus, cellOutcome, matchesSongGuess } from './game/results'
import { auditionInstrument, playPattern, stopPlayback, type AudioPattern } from './audio/audioEngine'
import './App.css'

type GamePhase = 'memorise' | 'recreate' | 'songGuess' | 'reveal'
type Playback = 'listen' | 'loop' | 'preview' | Instrument
const labels: Record<Instrument, string> = { kick: 'Kick', snare: 'Snare', hat: 'Hi-Hat' }
const steps = Array.from({ length: puzzle.steps }, (_, index) => index)
const outcomeLabels = { correct: 'Correct hit', missed: 'Missed hit', extra: 'Extra hit', empty: 'Correctly empty' }
const outcomeSymbols = { correct: '●', missed: '○', extra: '×', empty: '' }
const titles: Record<GamePhase, string> = {
  memorise: 'Let the beat sink in.', recreate: 'Make it from memory.',
  songGuess: 'Name that beat.', reveal: 'Your round, revealed.',
}
const phaseLabels: Record<GamePhase, string> = {
  memorise: '01 / MEMORISE', recreate: '02 / RECREATE', songGuess: '03 / GUESS', reveal: '04 / REVEAL',
}

function SpeakerIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></svg>
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('memorise')
  const phaseRef = useRef<GamePhase>('memorise')
  const [grid, setGrid] = useState(() => createEmptyGrid(puzzle.steps))
  const [playback, setPlayback] = useState<Playback | null>(null)
  const [audioError, setAudioError] = useState('')
  const playbackRequest = useRef(0)
  const [listenCount, setListenCount] = useState(0)
  const [guess, setGuess] = useState('')
  const [skipped, setSkipped] = useState(false)
  const phaseHeading = useRef<HTMLHeadingElement>(null)
  const guessInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    playbackRequest.current++
    stopPlayback()
  }, [])
  useEffect(() => {
    if (phase === 'songGuess') guessInput.current?.focus()
    else if (phase !== 'memorise') phaseHeading.current?.focus()
  }, [phase])

  function stop() {
    // Flush completed listens while the old phase/request is still valid.
    stopPlayback()
    playbackRequest.current++
    setPlayback(null)
    setAudioError('')
  }

  function transition(next: GamePhase) {
    stop()
    phaseRef.current = next
    setPhase(next)
  }

  async function play(mode: Playback) {
    const currentPhase = phaseRef.current
    if (currentPhase !== 'memorise' && currentPhase !== 'recreate') return
    if ((mode === 'listen' || mode === 'loop') && currentPhase !== 'memorise') return
    if (mode === 'preview' && currentPhase !== 'recreate') return
    stop()
    const request = playbackRequest.current
    setPlayback(mode)
    try {
      if (mode === 'kick' || mode === 'snare' || mode === 'hat') {
        await auditionInstrument(mode)
      } else {
        const isTarget = mode !== 'preview'
        const pattern: AudioPattern = isTarget ? puzzle : {
          kick: steps.filter(step => grid.kick[step]),
          snare: steps.filter(step => grid.snare[step]),
          hat: steps.filter(step => grid.hat[step]),
        }
        await playPattern(pattern, puzzle.bpm, puzzle.steps, mode === 'loop', isTarget ? delta => {
          if (request === playbackRequest.current && phaseRef.current === 'memorise') {
            setListenCount(count => count + delta)
          }
        } : undefined)
      }
    } catch (error) {
      if (request === playbackRequest.current) {
        setAudioError(error instanceof Error ? error.message : 'Audio could not play. Please try again.')
      }
    } finally {
      if (request === playbackRequest.current) setPlayback(null)
    }
  }

  function toggle(instrument: Instrument, step: number) {
    if (phaseRef.current !== 'recreate') return
    const turningOn = !grid[instrument][step]
    setGrid(current => ({
      ...current,
      [instrument]: current[instrument].map((active, index) => index === step ? !active : active),
    }))
    // Sound is a click side effect, never inside React's state updater.
    if (turningOn) void play(instrument)
  }

  function resetGrid() {
    if (phaseRef.current !== 'recreate') return
    stop()
    setGrid(createEmptyGrid(puzzle.steps))
  }

  function submitBeat() {
    if (phaseRef.current === 'recreate') transition('songGuess')
  }

  function reveal(skip: boolean) {
    if (phaseRef.current !== 'songGuess') return
    setSkipped(skip || guess.trim().length === 0)
    transition('reveal')
  }

  function restart() {
    transition('memorise')
    setGrid(createEmptyGrid(puzzle.steps))
    setListenCount(0)
    setGuess('')
    setSkipped(false)
  }

  const memorising = phase === 'memorise'
  const recreating = phase === 'recreate'
  const revealed = phase === 'reveal'
  // Correctness is calculated/rendered only after Guess or Skip.
  const result = revealed ? scoreGrid(grid, puzzle) : null
  const audioNote = playback === 'loop' ? 'Target looping. Switch Loop Target off to stop.'
    : playback === 'listen' ? 'Playing the target once…'
    : playback === 'preview' ? 'Playing your beat once. Empty steps are silent.'
    : playback ? `Playing one ${labels[playback]} hit…`
    : 'Speaker buttons play one sound and stop other playback.'

  return (
    <main>
      <header className="page-header">
        <span className="brand"><span className="brand-mark" aria-hidden="true">▥</span> BeatGrid</span>
        <span className="badge">CORE ROUND PROTOTYPE</span>
      </header>
      <section className="intro">
        <p className="eyebrow">A LITTLE RHYTHM. A LITTLE PUZZLE.</p>
        <h1 ref={phaseHeading} tabIndex={-1}>{titles[phase]}</h1>
        <p>{memorising ? 'Listen freely, then leave the target behind.' : recreating ? 'Place your hits. Play your beat. Trust your memory.' : phase === 'songGuess' ? 'Your beat is submitted. Take a guess, or skip to your results.' : 'See what you remembered, one step at a time.'}</p>
      </section>
      <section className="game" aria-label="BeatGrid puzzle">
        <div className="game-heading">
          <div><p className="eyebrow">{phaseLabels[phase]}</p><h2>{revealed ? 'Your rhythm results' : phase === 'songGuess' ? 'One last question' : memorising ? 'Listen. Learn the sounds. Remember.' : 'Your memory. Your pattern.'}</h2></div>
          <div className="tempo"><strong>{puzzle.bpm}</strong> BPM <span> / </span> 1 BAR</div>
        </div>
        {!revealed && <p className="phase-note">{memorising ? 'Start Recreating locks target playback for this attempt. Each complete bar counts as a listen.' : recreating ? 'Target locked. Submit Beat freezes your pattern; results come after the song guess.' : 'Your pattern is frozen. No correctness feedback until you guess or skip.'}</p>}
        <p className="listen-count" aria-live="polite">Target listens: <strong>{listenCount}</strong>{memorising ? ' · No limit' : ' · Final'}</p>

        {result && <div className="round-results" aria-label="Round results">
          <div className="accuracy"><span>Rhythm accuracy</span><strong>{result.percentage.toFixed(1)}%</strong><small>{result.correct} / {result.total} cells correct</small></div>
          <div><span>Target listens</span><strong>{listenCount}</strong></div>
          <div><span>Memory bonus</span><strong>+{calculateMemoryBonus(listenCount)}</strong><small>Separate from accuracy</small></div>
        </div>}

        <div className="grid-scroll">
          <div className={`sequencer ${revealed ? 'revealed' : ''}`}>
            <div className="grid-line step-labels" aria-hidden="true"><span />{steps.map(step => <span key={step} className={step % 4 === 0 ? 'beat-start' : ''}>{step + 1}</span>)}</div>
            {instruments.map(instrument => (
              <div key={instrument} className={`grid-line instrument-row ${instrument}`} role="group" aria-label={labels[instrument]}>
                <div className="row-label">
                  {(memorising || recreating) && <button className="audition" aria-label={`Hear ${labels[instrument]}`} onClick={() => void play(instrument)}><SpeakerIcon /></button>}
                  <span>{labels[instrument]}</span>
                </div>
                {steps.map(step => {
                  const outcome = revealed ? cellOutcome(grid[instrument][step], puzzle[instrument].includes(step)) : null
                  return <button key={step} type="button" disabled={!recreating}
                    className={`cell ${step > 0 && step % 4 === 0 ? 'beat-divider' : ''} ${outcome ? `outcome-${outcome}` : grid[instrument][step] ? 'active' : ''}`}
                    aria-label={`${labels[instrument]}, step ${step + 1}${outcome ? `: ${outcomeLabels[outcome]}` : ''}`}
                    aria-pressed={grid[instrument][step]} onClick={() => toggle(instrument, step)}
                  ><span aria-hidden="true">{outcome ? outcomeSymbols[outcome] : grid[instrument][step] ? '●' : ''}</span></button>
                })}
              </div>
            ))}
          </div>
        </div>
        {revealed ? <div className="grid-legend"><span>● Correct hit</span><span>○ Missed hit</span><span>× Extra hit</span><span>Blank = correctly empty</span><p>The correct beat is every ● and ○. Extra hits (×) are not in the target.</p></div> : <div className="grid-caption"><span>16 steps · 4 beats</span><span>● = your hit</span></div>}

        {(memorising || recreating) && <>
          <div className="controls">
            {memorising ? <>
              <div className="audio-controls"><button onClick={() => void play('listen')}>Listen</button><button aria-pressed={playback === 'loop'} onClick={() => playback === 'loop' ? stop() : void play('loop')}>Loop Target: {playback === 'loop' ? 'ON' : 'OFF'}</button></div>
              <button className="check" onClick={() => { if (phaseRef.current === 'memorise') transition('recreate') }}>Start Recreating →</button>
            </> : <>
              <button onClick={() => void play('preview')}>{playback === 'preview' ? 'Restart My Beat' : 'Play My Beat'}</button>
              <div className="action-controls"><button className="reset" onClick={resetGrid}>Reset</button><button className="check" onClick={submitBeat}>Submit Beat →</button></div>
            </>}
          </div>
          <p className="audio-note" role="status">{audioNote}</p>
        </>}
        {audioError && <p className="audio-error" role="alert">{audioError}</p>}

        {phase === 'songGuess' && <form className="song-guess" onSubmit={event => { event.preventDefault(); reveal(false) }}>
          <label htmlFor="song-title">What song do you think this beat is from?</label>
          {puzzle.placeholderSong && <p>This prototype uses placeholder song metadata. You can skip; no real song is associated yet.</p>}
          <input ref={guessInput} id="song-title" value={guess} onChange={event => setGuess(event.target.value)} placeholder="Song title (optional)" autoComplete="off" maxLength={200} />
          <div className="controls"><button type="button" onClick={() => reveal(true)}>Skip</button><button className="check" type="submit">Submit Guess →</button></div>
        </form>}

        {revealed && <>
          <section className="song-result" aria-label="Song result">
            <p className="eyebrow">{puzzle.placeholderSong ? 'PLACEHOLDER SONG' : 'THE SONG'}</p>
            <h2>{puzzle.songTitle}</h2><p>{puzzle.artist}</p>
            <strong>{skipped ? 'Song guess skipped' : matchesSongGuess(guess, puzzle) ? 'Correct song guess' : 'Song guess did not match'}</strong>
            {!skipped && <p>Your guess: {guess}</p>}
            {puzzle.placeholderSong && <p>No real song is associated with this handcrafted beat yet.</p>}
          </section>
          <div className="controls"><span className="audio-note">Same puzzle. A fresh memory challenge.</span><button className="check" onClick={restart}>Play Again</button></div>
        </>}
      </section>
      <footer>MEMORISE. RECREATE. GUESS. REVEAL.</footer>
    </main>
  )
}
