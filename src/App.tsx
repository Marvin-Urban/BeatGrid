import { useEffect, useRef, useState } from 'react'
import {
  choosePuzzle,
  difficulties,
  puzzleHits,
  type Difficulty,
  type Instrument,
  type Puzzle,
} from './data/puzzles'
import { createEmptyGrid, patternFromGrid, scoreGrid, type PlayerGrid } from './game/scoring'
import { cellOutcome } from './game/results'
import { readPersonalBest, updatePersonalBest } from './game/personalRecords'
import { initializePlayerSession, saveAttempt } from './backend/resultsService'
import { auditionInstrument, playPattern, stopPlayback, type AudioPattern } from './audio/audioEngine'
import './App.css'

type GamePhase = 'select' | 'memorise' | 'recreate' | 'reveal'
type Playback = 'targetOnce' | 'targetLoop' | 'playerLoop'
const labels: Record<Instrument, string> = { kick: 'Kick', snare: 'Snare', hat: 'Hi-Hat' }
const outcomeLabels = { correct: 'Correct hit', missed: 'Missed hit', extra: 'Extra hit', empty: 'Correctly empty' }
const outcomeSymbols = { correct: '●', missed: '○', extra: '×', empty: '' }
const difficultyCopy: Record<Difficulty, string> = {
  easy: 'Easy', normal: 'Normal', hard: 'Hard', insane: 'Insane',
}
const phaseLabels: Partial<Record<GamePhase, string>> = {
  memorise: '01 / MEMORISE', recreate: '02 / RECREATE', reveal: '03 / REVEAL',
}

function listenLabel(value: number) {
  return value === 1 ? '1 listen' : `${value} listens`
}

function SpeakerIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></svg>
}

function targetPattern(puzzle: Puzzle): AudioPattern {
  return {
    kick: puzzle.activeInstruments.includes('kick') ? puzzleHits(puzzle, 'kick') : [],
    snare: puzzle.activeInstruments.includes('snare') ? puzzleHits(puzzle, 'snare') : [],
    hat: puzzle.activeInstruments.includes('hat') ? puzzleHits(puzzle, 'hat') : [],
  }
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('select')
  const phaseRef = useRef<GamePhase>('select')
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [grid, setGrid] = useState<PlayerGrid>(() => createEmptyGrid(16))
  const [playback, setPlayback] = useState<Playback | null>(null)
  const [audioError, setAudioError] = useState('')
  const playbackRequest = useRef(0)
  const lastPuzzleIds = useRef<Partial<Record<Difficulty, string>>>({})
  const [listenCount, setListenCount] = useState(0)
  const [result, setResult] = useState<ReturnType<typeof scoreGrid> | null>(null)
  const [personalBest, setPersonalBest] = useState<number | null>(null)
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false)
  const phaseHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => () => {
    playbackRequest.current++
    stopPlayback()
  }, [])
  useEffect(() => {
    void initializePlayerSession()
  }, [])
  useEffect(() => {
    if (phase !== 'select' && phase !== 'memorise') phaseHeading.current?.focus()
  }, [phase])

  function stop() {
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

  function beginPuzzle(difficulty: Difficulty) {
    stop()
    const next = choosePuzzle(difficulty, lastPuzzleIds.current[difficulty])
    lastPuzzleIds.current[difficulty] = next.id
    setPuzzle(next)
    setGrid(createEmptyGrid(next.steps))
    setListenCount(0)
    setResult(null)
    setPersonalBest(readPersonalBest(next.id, window.localStorage))
    setIsNewPersonalBest(false)
    phaseRef.current = 'memorise'
    setPhase('memorise')
  }

  async function startPattern(mode: Playback, pattern: AudioPattern, loop: boolean, selectedPuzzle: Puzzle) {
    stop()
    const request = playbackRequest.current
    setPlayback(mode)
    try {
      const countsTarget = mode === 'targetOnce' || mode === 'targetLoop'
      await playPattern(pattern, selectedPuzzle.bpm, selectedPuzzle.steps, loop, countsTarget ? delta => {
        if (request === playbackRequest.current && phaseRef.current === 'memorise') {
          setListenCount(count => count + delta)
        }
      } : undefined)
    } catch (error) {
      if (request === playbackRequest.current) {
        setAudioError(error instanceof Error ? error.message : 'Audio could not play. Please try again.')
      }
    } finally {
      if (request === playbackRequest.current) setPlayback(null)
    }
  }

  function playTarget(loop: boolean) {
    if (!puzzle || phaseRef.current !== 'memorise') return
    void startPattern(loop ? 'targetLoop' : 'targetOnce', targetPattern(puzzle), loop, puzzle)
  }

  function playPlayerGrid(nextGrid: PlayerGrid = grid) {
    if (!puzzle || phaseRef.current !== 'recreate') return
    void startPattern('playerLoop', patternFromGrid(nextGrid, puzzle), true, puzzle)
  }

  async function audition(instrument: Instrument) {
    if (!puzzle || !puzzle.activeInstruments.includes(instrument)) return
    if (phaseRef.current !== 'memorise' && phaseRef.current !== 'recreate') return
    try {
      await auditionInstrument(instrument)
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'That sound could not play. Please try again.')
    }
  }

  function toggle(instrument: Instrument, step: number) {
    if (!puzzle || phaseRef.current !== 'recreate' || !puzzle.activeInstruments.includes(instrument)) return
    const turningOn = !grid[instrument][step]
    const nextGrid = {
      ...grid,
      [instrument]: grid[instrument].map((active, index) => index === step ? !active : active),
    }
    const loopWasPlaying = playback === 'playerLoop'
    setGrid(nextGrid)
    if (loopWasPlaying) playPlayerGrid(nextGrid)
    if (turningOn) void audition(instrument)
  }

  function resetGrid() {
    if (!puzzle || phaseRef.current !== 'recreate') return
    stop()
    setGrid(createEmptyGrid(puzzle.steps))
  }

  function reveal() {
    if (phaseRef.current !== 'recreate' || !puzzle) return
    const nextResult = scoreGrid(grid, puzzle)
    const record = updatePersonalBest(puzzle.id, listenCount, nextResult.percentage, window.localStorage)
    setResult(nextResult)
    setPersonalBest(record.best)
    setIsNewPersonalBest(record.isNew)
    void saveAttempt({
      puzzleId: puzzle.id,
      difficulty: puzzle.difficulty,
      accuracy: nextResult.percentage,
      targetListens: listenCount,
      isPerfect: nextResult.percentage === 100,
    })
    transition('reveal')
  }

  function returnToDifficulties() {
    stop()
    setPuzzle(null)
    setGrid(createEmptyGrid(16))
    setListenCount(0)
    setResult(null)
    setPersonalBest(null)
    setIsNewPersonalBest(false)
    phaseRef.current = 'select'
    setPhase('select')
  }

  if (phase === 'select' || !puzzle) {
    return <main>
      <header className="page-header">
        <span className="brand"><span className="brand-mark" aria-hidden="true">▥</span> BeatGrid</span>
        <span className="badge">PUZZLE LAB</span>
      </header>
      <section className="intro difficulty-intro">
        <p className="eyebrow">CHOOSE YOUR CHALLENGE</p>
        <h1>Select difficulty</h1>
      </section>
      <section className="difficulty-picker" aria-label="Difficulty">
        <div className="difficulty-options">
          {difficulties.map(difficulty => <button key={difficulty} className={'difficulty-card difficulty-' + difficulty} onClick={() => beginPuzzle(difficulty)}>
            <span className="difficulty-name">{difficultyCopy[difficulty]}</span>
          </button>)}
        </div>
      </section>
      <footer>MEMORISE. RECREATE. COMPARE.</footer>
    </main>
  }

  const steps = Array.from({ length: puzzle.steps }, (_, index) => index)
  const memorising = phase === 'memorise'
  const recreating = phase === 'recreate'
  const revealed = phase === 'reveal'
  const audioNote = playback === 'targetLoop' ? 'Target looping. Every completed bar counts as a listen.'
    : playback === 'targetOnce' ? 'Playing the target once…'
    : playback === 'playerLoop' ? 'Your beat is looping. Grid edits restart it with the updated pattern.'
    : 'Speaker buttons and new cells audition one sound without stopping your loop.'
  const heading = memorising ? 'Let the beat sink in.' : recreating ? 'Make it from memory.' : 'Your round, revealed.'

  return <main>
    <header className="page-header">
      <span className="brand"><span className="brand-mark" aria-hidden="true">▥</span> BeatGrid</span>
      <div className="round-meta"><span className={'difficulty-chip ' + puzzle.difficulty}>{difficultyCopy[puzzle.difficulty]}</span><span className="badge">{puzzle.id}</span></div>
    </header>
    <section className="intro">
      <p className="eyebrow">A LITTLE RHYTHM. A LITTLE PUZZLE.</p>
      <h1 ref={phaseHeading} tabIndex={-1}>{heading}</h1>
    </section>
    <section className={'game rows-' + puzzle.activeInstruments.length} aria-label="BeatGrid puzzle">
      <div className="game-heading">
        <div><p className="eyebrow">{phaseLabels[phase]}</p><h2>{revealed ? 'Your rhythm results' : memorising ? 'Listen. Learn the sounds. Remember.' : 'Your memory. Your pattern.'}</h2></div>
        <div className="tempo"><strong>{puzzle.bpm}</strong> BPM <span> / </span> 1 BAR</div>
      </div>
      <p className="listen-count" aria-live="polite">Target listens: <strong>{listenCount}</strong> <span>·</span> Difficulty: <strong>{difficultyCopy[puzzle.difficulty]}</strong></p>

      {result && <div className="round-results" aria-label="Round results">
        <div className="accuracy"><span>Rhythm accuracy</span><strong>{result.percentage.toFixed(1)}%</strong><small>{result.correct} / {result.total} active cells correct</small></div>
        <div><span>Target listens</span><strong>{listenCount}</strong></div>
        <div><span>Personal best</span><strong>{personalBest === null ? '—' : listenLabel(personalBest)}</strong>{isNewPersonalBest && <small>New best</small>}</div>
        <div><span>Difficulty</span><strong className="result-difficulty">{difficultyCopy[puzzle.difficulty]}</strong></div>
      </div>}

      <div className="grid-scroll">
        <div className={'sequencer ' + (revealed ? 'revealed' : '')}>
          <div className="grid-line step-labels" aria-hidden="true"><span />{steps.map(step => <span key={step} className={step % 4 === 0 ? 'beat-start' : ''}>{step + 1}</span>)}</div>
          {puzzle.activeInstruments.map(instrument => <div key={instrument} className={'grid-line instrument-row ' + instrument} role="group" aria-label={labels[instrument]}>
            <div className="row-label">
              {(memorising || recreating) && <button className="audition" aria-label={'Hear ' + labels[instrument]} onClick={() => void audition(instrument)}><SpeakerIcon /></button>}
              <span>{labels[instrument]}</span>
            </div>
            {steps.map(step => {
              const outcome = revealed ? cellOutcome(grid[instrument][step], puzzleHits(puzzle, instrument).includes(step)) : null
              return <button key={step} type="button" disabled={!recreating}
                className={'cell ' + (step > 0 && step % 4 === 0 ? 'beat-divider ' : '') + (outcome ? 'outcome-' + outcome : grid[instrument][step] ? 'active' : '')}
                aria-label={labels[instrument] + ', step ' + (step + 1) + (outcome ? ': ' + outcomeLabels[outcome] : '')}
                aria-pressed={grid[instrument][step]} onClick={() => toggle(instrument, step)}
              ><span aria-hidden="true">{outcome ? outcomeSymbols[outcome] : grid[instrument][step] ? '●' : ''}</span></button>
            })}
          </div>)}
        </div>
      </div>
      {revealed && <div className="grid-legend"><span>● Correct</span><span>○ Missed</span><span>× Extra</span></div>}

      {(memorising || recreating) && <>
        <div className="controls">
          {memorising ? <>
            <div className="audio-controls"><button className="primary-listen" onClick={() => playTarget(false)}>Listen</button><button aria-pressed={playback === 'targetLoop'} onClick={() => playback === 'targetLoop' ? stop() : playTarget(true)}>Loop Target: {playback === 'targetLoop' ? 'ON' : 'OFF'}</button></div>
            <button disabled={listenCount < 1} title={listenCount < 1 ? 'Complete one target listen first' : undefined} onClick={() => { if (phaseRef.current === 'memorise') transition('recreate') }}>Start Recreating →</button>
          </> : <>
            <button aria-pressed={playback === 'playerLoop'} onClick={() => playback === 'playerLoop' ? stop() : playPlayerGrid()}>{playback === 'playerLoop' ? 'Stop My Beat' : 'Play My Beat'}</button>
            <div className="action-controls"><button className="reset" onClick={resetGrid}>Reset</button><button className="check" onClick={reveal}>Submit Beat →</button></div>
          </>}
        </div>
        <p className="sr-only" role="status">{audioNote}</p>
      </>}
      {audioError && <p className="audio-error" role="alert">{audioError}</p>}

      {revealed && <div className="next-actions">
          <button onClick={returnToDifficulties}>Change Difficulty</button>
          <button className="check" onClick={() => beginPuzzle(puzzle.difficulty)}>Another {difficultyCopy[puzzle.difficulty]} Puzzle →</button>
      </div>}
    </section>
    <footer>MEMORISE. RECREATE. COMPARE.</footer>
  </main>
}
