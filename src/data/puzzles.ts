export type Instrument = 'kick' | 'snare' | 'hat'

export type Puzzle = {
  id: string
  bpm: number
  steps: 16
  kick: readonly number[]
  snare: readonly number[]
  hat: readonly number[]
  songTitle: string
  artist: string
  acceptedSongAnswers?: readonly string[]
  placeholderSong?: boolean
}

// Hit positions are zero-based: 0 is the first step shown in the UI.
export const puzzle: Puzzle = {
  id: 'prototype-01',
  // Replace these fields (and the handcrafted rhythm if needed) with a verified
  // song association. This generic prototype is NOT attributed to a real song.
  songTitle: 'Prototype Beat (placeholder)',
  artist: 'Unassigned — replace with real artist',
  acceptedSongAnswers: ['Prototype Beat'],
  placeholderSong: true,
  bpm: 120,
  steps: 16,
  kick: [0, 4, 8, 12],
  snare: [4, 12],
  hat: [0, 2, 4, 6, 8, 10, 12, 14],
}

