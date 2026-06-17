import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

const TOUR_KEY = 'saucy-tour-done'

interface Step {
  target: string      // data-tour attribute value
  title: string
  body: string
  position: 'top' | 'bottom'
}

const STEPS: Step[] = [
  {
    target: 'new-arrivals',
    title: 'New Arrivals',
    body: "See what's just been added to the menu — freshest items are here.",
    position: 'bottom',
  },
  {
    target: 'section-nav',
    title: 'Browse by Category',
    body: 'Swipe through sections like Starters, Mains, Desserts and jump straight there.',
    position: 'bottom',
  },
  {
    target: 'filter-pills',
    title: 'Dietary Filters',
    body: 'Filter by Gluten Free, Halal, Dairy Free and more — tap any pill to apply.',
    position: 'bottom',
  },
  {
    target: 'menu-item',
    title: 'Item Details',
    body: 'Tap any dish to see full description, ingredients, reviews and more.',
    position: 'top',
  },
  {
    target: 'ai-button',
    title: 'Ask Saucy AI',
    body: 'Have a question about the menu? Tap the glowing button and just ask.',
    position: 'top',
  },
]

interface Rect { top: number; left: number; width: number; height: number }

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function scrollToTarget(target: string) {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ─── Welcome prompt ───────────────────────────────────────────────────────────

interface WelcomeProps {
  onYes: () => void
  onNo: () => void
}

export function MenuTourWelcome({ onYes, onNo }: WelcomeProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <div className="w-12 h-1 rounded-full bg-gray-200 mx-auto mb-6" />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#FFF4E8] flex items-center justify-center shrink-0">
            <img src="/saucy-ai-icon.svg" alt="" className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Quick tour?</h2>
        </div>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          We can show you around the menu in 5 quick steps — categories, filters, AI chat and more.
        </p>
        <button
          onClick={onYes}
          className="w-full h-12 rounded-full bg-[#F7941D] text-white font-semibold text-sm mb-3 active:scale-95 transition-transform"
        >
          Show me around
        </button>
        <button
          onClick={onNo}
          className="w-full h-12 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm active:scale-95 transition-transform"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

// ─── Tour overlay ─────────────────────────────────────────────────────────────

interface TourProps {
  onDone: () => void
}

export function MenuTourOverlay({ onDone }: TourProps) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  const current = STEPS[step]

  const updateRect = useCallback(() => {
    setTimeout(() => setRect(getRect(current.target)), 400)
  }, [current.target])

  useEffect(() => {
    scrollToTarget(current.target)
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [current.target, updateRect])

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      localStorage.setItem(TOUR_KEY, '1')
      onDone()
    }
  }

  const skip = () => {
    localStorage.setItem(TOUR_KEY, '1')
    onDone()
  }

  const PAD = 8
  const highlight = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark overlay with hole */}
      {highlight && (
        <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={skip}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={highlight.left} y={highlight.top}
                width={highlight.width} height={highlight.height}
                rx="12" fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
        </svg>
      )}

      {/* Highlight ring */}
      {highlight && (
        <div
          className="absolute rounded-xl ring-2 ring-[#F7941D] ring-offset-1 pointer-events-none"
          style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={`absolute left-4 right-4 pointer-events-auto ${
          current.position === 'bottom' ? 'top-[72%]' : 'bottom-32'
        }`}
        style={
          highlight && current.position === 'bottom' && highlight.top + highlight.height + 80 < window.innerHeight
            ? { top: highlight.top + highlight.height + 16 }
            : highlight && current.position === 'top'
            ? { bottom: window.innerHeight - highlight.top + 16 }
            : {}
        }
      >
        <div className="bg-white rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-gray-900 text-base">{current.title}</h3>
            <button onClick={skip} className="w-6 h-6 flex items-center justify-center text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">{current.body}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{step + 1} of {STEPS.length}</span>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-[#F7941D]' : 'w-1.5 bg-gray-200'}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="px-5 py-2 rounded-full bg-[#F7941D] text-white text-xs font-semibold active:scale-95 transition-transform"
            >
              {step < STEPS.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMenuTour() {
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTour, setShowTour] = useState(false)

  const triggerIfFirst = useCallback(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      setTimeout(() => setShowWelcome(true), 800)
    }
  }, [])

  const startTour = () => { setShowWelcome(false); setShowTour(true) }
  const skipTour = () => { localStorage.setItem(TOUR_KEY, '1'); setShowWelcome(false) }
  const doneTour = () => setShowTour(false)
  const replayTour = () => setShowTour(true)

  return { showWelcome, showTour, triggerIfFirst, startTour, skipTour, doneTour, replayTour }
}
