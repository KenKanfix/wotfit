import { db } from '../db'
import type { HiitSession } from '../types'
import { dateKey } from './format'
import type { HiitProgram } from './hiit'

export async function saveHiitSession(
  program: HiitProgram,
  startedAt: number,
  finishedAt: number,
): Promise<void> {
  const session: HiitSession = {
    id: `hiit-${startedAt}`,
    date: dateKey(new Date(startedAt)),
    startedAt,
    finishedAt: Math.max(startedAt, finishedAt),
    mode: program.mode,
    workSeconds: program.workSeconds,
    restSeconds: program.restSeconds,
    restMode: program.restMode,
    restRatio: program.restRatio,
    ladderSteps: program.ladderSteps,
    rounds: program.rounds,
    totalSeconds: program.totalSeconds,
    intervals: program.intervals,
  }

  await db.hiitSessions.put(session)
}

export async function deleteHiitSession(id: string): Promise<void> {
  await db.hiitSessions.delete(id)
}
