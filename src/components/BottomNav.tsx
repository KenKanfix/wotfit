import {
  Dumbbell,
  History,
  Home,
  Settings,
  Sparkles,
  Timer,
} from 'lucide-react'
import type { Tab } from '../types'

const ITEMS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workout', label: 'Train', icon: Dumbbell },
  { id: 'hiit', label: 'HIIT', icon: Timer },
  { id: 'plan', label: 'Plan', icon: Sparkles },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
  hasActive: boolean
  hasHiit: boolean
}

export function BottomNav({ tab, onChange, hasActive, hasHiit }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-md grid-cols-6 safe-bottom">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          const showDot =
            (item.id === 'workout' && hasActive) ||
            (item.id === 'hiit' && hasHiit)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[9px] font-medium tracking-wide transition-colors ${
                active ? 'text-brand-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span>{item.label}</span>
              {showDot ? (
                <span className="absolute right-[calc(50%-16px)] top-1.5 h-1.5 w-1.5 rounded-full bg-brand-400" />
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
