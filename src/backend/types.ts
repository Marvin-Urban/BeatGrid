import type { Difficulty } from '../data/puzzles'

export type GameAttemptInput = {
  puzzleId: string
  difficulty: Difficulty
  accuracy: number
  targetListens: number
  isPerfect: boolean
}

export type GameAttemptRow = {
  id: string
  player_id: string
  puzzle_id: string
  difficulty: Difficulty
  accuracy: number
  target_listens: number
  is_perfect: boolean
  created_at: string
}

export type GameAttemptInsertRow = Omit<GameAttemptRow, 'id' | 'created_at'>

export function toAttemptInsert(input: GameAttemptInput, playerId: string): GameAttemptInsertRow {
  return {
    player_id: playerId,
    puzzle_id: input.puzzleId,
    difficulty: input.difficulty,
    accuracy: input.accuracy,
    target_listens: input.targetListens,
    is_perfect: input.isPerfect,
  }
}

export type Database = {
  public: {
    Tables: {
      game_attempts: {
        Row: GameAttemptRow
        Insert: GameAttemptInsertRow
        Update: Partial<GameAttemptInsertRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
