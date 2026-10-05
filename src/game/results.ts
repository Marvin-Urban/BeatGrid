export function cellOutcome(placed: boolean, target: boolean) {
  if (placed && target) return 'correct'
  if (!placed && target) return 'missed'
  if (placed && !target) return 'extra'
  return 'empty'
}
