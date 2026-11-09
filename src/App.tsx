import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { HiitTimerBar } from './components/HiitTimerBar'
import { RestTimerBar } from './components/RestTimerBar'
import { DEFAULT_SETTINGS, db } from './db'
import { useHiitTimer } from './hooks/useHiitTimer'
import { useRestTimer } from './hooks/useRestTimer'
import { useTheme } from './hooks/useTheme'
import { useWakeLock } from './hooks/useWakeLock'
import { saveHiitSession } from './lib/hiitHistory'
import { GOAL_LABELS } from './lib/recommend'
import { REST_STEP_SECONDS } from './lib/rest'
import { startWorkout } from './lib/workout'
import { HiitScreen } from './screens/HiitScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { PlanScreen } from './screens/PlanScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { WorkoutScreen } from './screens/WorkoutScreen'
import type { Goal, Tab } from './types'

function EmptyTrain({ goal, onStart }: { goal: Goal; onStart: () => void }) {
  return (
    <div className="px-5 pb-28 pt-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-300">
          Train
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">No active session</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Start a {GOAL_LABELS[goal].toLowerCase()} session or generate a plan
          first.
        </p>
      </header>
      <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 px-5 py-12 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900 text-brand-300">
          <Dumbbell size={22} />
        </span>
        <p className="mt-3 text-sm font-semibold text-zinc-300">
          Your logbook is open
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Pick exercises yourself, or let the plan screen build the session.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3 text-sm font-bold text-zinc-950"
        >
          <Sparkles size={16} />
          Start {GOAL_LABELS[goal]} workout
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [settingsReturnTab, setSettingsReturnTab] = useState<Tab | null>(null)
  const settings = useLiveQuery(() => db.settings.get(1), []) ?? DEFAULT_SETTINGS
  const active = useLiveQuery(
    () => db.workouts.where('status').equals('active').first(),
    [],
  )
  const rest = useRestTimer(settings.sound)
  const hiit = useHiitTimer(settings.sound, settings.voiceCues)
  const savedHiitRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      hiit.status !== 'finished' ||
      !hiit.program ||
      hiit.startedAt == null ||
      hiit.finishedAt == null ||
      savedHiitRef.current === hiit.startedAt
    ) {
      return
    }

    savedHiitRef.current = hiit.startedAt
    void saveHiitSession(hiit.program, hiit.startedAt, hiit.finishedAt)
  }, [hiit.status, hiit.program, hiit.startedAt, hiit.finishedAt])

  useTheme(settings.theme)
  useWakeLock(Boolean(active) || hiit.status === 'running')

  const handleTabChange = (next: Tab) => {
    setSettingsReturnTab(null)
    setTab(next)
  }

  const handleEditSettings = () => {
    setSettingsReturnTab('plan')
    setTab('settings')
  }

  const handleSettingsBack = () => {
    if (!settingsReturnTab) return
    setTab(settingsReturnTab)
    setSettingsReturnTab(null)
  }

  const handleStart = async (goal: Goal) => {
    await startWorkout(goal)
    setTab('workout')
  }

  const handleGeneratePlan = async (goal: Goal) => {
    await db.settings.update(1, { goal })
    setTab('plan')
  }

  return (
    <div className="safe-top mx-auto min-h-dvh w-full max-w-md border-x border-zinc-900/70 bg-zinc-950">
      <main>
        {tab === 'home' ? (
          <HomeScreen
            active={active}
            settings={settings}
            onStart={(goal) => void handleStart(goal)}
            onGeneratePlan={(goal) => void handleGeneratePlan(goal)}
            onNavigate={handleTabChange}
          />
        ) : null}

        {tab === 'workout' ? (
          active ? (
            <WorkoutScreen
              workout={active}
              settings={settings}
              onRest={rest.start}
              onFinished={() => setTab('home')}
              onDiscard={() => setTab('home')}
            />
          ) : (
            <EmptyTrain
              goal={settings.goal}
              onStart={() => void handleStart(settings.goal)}
            />
          )
        ) : null}

        {tab === 'hiit' ? <HiitScreen timer={hiit} /> : null}

        {tab === 'plan' ? (
          <PlanScreen
            settings={settings}
            active={active}
            onNavigate={handleTabChange}
            onEditSettings={handleEditSettings}
          />
        ) : null}

        {tab === 'history' ? <HistoryScreen settings={settings} /> : null}

        {tab === 'settings' ? (
          <SettingsScreen
            settings={settings}
            onBack={settingsReturnTab ? handleSettingsBack : undefined}
          />
        ) : null}
      </main>

      {rest.timer ? (
        <RestTimerBar
          remaining={rest.remaining}
          progress={rest.progress}
          onAdd={() => rest.add(REST_STEP_SECONDS)}
          onSkip={rest.skip}
        />
      ) : null}

      {hiit.status && tab !== 'hiit' ? (
        <HiitTimerBar
          timer={hiit}
          raised={Boolean(rest.timer)}
          onOpen={() => setTab('hiit')}
        />
      ) : null}

      <BottomNav
        tab={tab}
        onChange={handleTabChange}
        hasActive={Boolean(active)}
        hasHiit={hiit.status !== null}
      />
    </div>
  )
}
