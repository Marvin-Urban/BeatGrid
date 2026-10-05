import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { toAttemptInsert, type Database, type GameAttemptInput } from './types'

type BeatGridClient = SupabaseClient<Database>
export type SaveAttemptResult = { status: 'saved'; id: string } | { status: 'skipped' | 'failed' }

let playerIdPromise: Promise<string | null> | null = null

async function resolvePlayerId(client: BeatGridClient) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData.session?.user.id) return sessionData.session.user.id

  const { data, error } = await client.auth.signInAnonymously()
  if (error) throw error
  return data.user?.id ?? null
}

export function initializePlayerSession(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null)
  if (!playerIdPromise) {
    playerIdPromise = resolvePlayerId(supabase).catch(error => {
      playerIdPromise = null
      console.warn('BeatGrid could not initialize remote persistence.', error)
      return null
    })
  }
  return playerIdPromise
}

export async function saveAttempt(input: GameAttemptInput): Promise<SaveAttemptResult> {
  if (!supabase) return { status: 'skipped' }

  try {
    const playerId = await initializePlayerSession()
    if (!playerId) return { status: 'failed' }

    const { data, error } = await supabase
      .from('game_attempts')
      .insert(toAttemptInsert(input, playerId))
      .select('id')
      .single()

    if (error) throw error
    return { status: 'saved', id: data.id }
  } catch (error) {
    console.warn('BeatGrid could not save this completed attempt.', error)
    return { status: 'failed' }
  }
}

export async function getPersonalBest(puzzleId: string): Promise<number | null> {
  if (!supabase) return null

  try {
    const playerId = await initializePlayerSession()
    if (!playerId) return null

    const { data, error } = await supabase
      .from('game_attempts')
      .select('target_listens')
      .eq('player_id', playerId)
      .eq('puzzle_id', puzzleId)
      .eq('is_perfect', true)
      .order('target_listens', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data?.target_listens ?? null
  } catch (error) {
    console.warn('BeatGrid could not read the remote personal best.', error)
    return null
  }
}
