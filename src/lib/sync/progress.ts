import type { SyncOperation } from '@/types'

const PHASE_WEIGHTS: Record<string, number> = {
  preparing: 5,
  checking: 5,
  'downloading-entries': 10,
  'downloading-images': 60,
  merging: 5,
  'uploading-entries': 10,
  'uploading-images': 60,
  verifying: 5,
  cleanup: 5,
}

const OPERATION_PHASES: Record<SyncOperation, string[]> = {
  push: ['preparing', 'checking', 'uploading-entries', 'uploading-images', 'cleanup'],
  pull: ['preparing', 'checking', 'downloading-entries', 'downloading-images', 'verifying'],
  merge: [
    'preparing',
    'checking',
    'downloading-entries',
    'downloading-images',
    'merging',
    'uploading-entries',
    'uploading-images',
    'cleanup',
  ],
}

export function getOperationPhases(operation: SyncOperation): string[] {
  return [...OPERATION_PHASES[operation]]
}

export function calculateProgress(
  operation: SyncOperation,
  completedPhaseCount: number,
  currentPhaseProgress: number,
): number {
  const phases = OPERATION_PHASES[operation]
  const totalWeight = phases.reduce((sum, p) => sum + (PHASE_WEIGHTS[p] ?? 0), 0)

  if (totalWeight === 0) return 0
  if (completedPhaseCount >= phases.length) return 100

  let completedWeight = 0
  for (let i = 0; i < completedPhaseCount && i < phases.length; i++) {
    const phase = phases[i]
    if (phase) completedWeight += PHASE_WEIGHTS[phase] ?? 0
  }

  if (completedPhaseCount < phases.length) {
    const currentPhase = phases[completedPhaseCount]
    const currentPhaseWeight = currentPhase ? (PHASE_WEIGHTS[currentPhase] ?? 0) : 0
    completedWeight += currentPhaseWeight * Math.min(Math.max(currentPhaseProgress, 0), 1)
  }

  return Math.round((completedWeight / totalWeight) * 100)
}
