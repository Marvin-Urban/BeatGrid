export const personalBestPrefix = 'beatgrid.bestListens.'

export type RecordStorage = Pick<Storage, 'getItem' | 'setItem'>

export function personalBestKey(puzzleId: string) {
  return personalBestPrefix + puzzleId
}

export function readPersonalBest(puzzleId: string, storage: RecordStorage): number | null {
  try {
    const value = Number(storage.getItem(personalBestKey(puzzleId)))
    return Number.isInteger(value) && value >= 1 ? value : null
  } catch {
    return null
  }
}

export function updatePersonalBest(
  puzzleId: string,
  listenCount: number,
  accuracy: number,
  storage: RecordStorage,
) {
  const current = readPersonalBest(puzzleId, storage)
  if (accuracy !== 100 || !Number.isInteger(listenCount) || listenCount < 1) {
    return { best: current, isNew: false }
  }

  if (current !== null && current <= listenCount) return { best: current, isNew: false }

  try {
    storage.setItem(personalBestKey(puzzleId), String(listenCount))
    return { best: listenCount, isNew: true }
  } catch {
    return { best: current, isNew: false }
  }
}
