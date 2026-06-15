import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/setup/welcome')({
  component: Welcome,
})

const WELCOME_SEEN_KEY = 'saucy-welcome-seen'
const TOTAL_STEPS = 3

function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 rounded-full transition-all',
            i === step ? 'bg-[#F7941D] w-4' : 'bg-gray-300 w-2',
          )}
        />
      ))}
    </div>
  )
}

function NextButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-14 rounded-full bg-[#F7941D] text-white font-semibold text-lg active:scale-95 transition-transform mb-12"
    >
      {children}
    </button>
  )
}

function Welcome() {
  const router = useRouter()
  const [shouldShow, setShouldShow] = useState<boolean | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (localStorage.getItem(WELCOME_SEEN_KEY)) {
      router.navigate({ to: '/setup', replace: true })
    } else {
      setShouldShow(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFinish = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, '1')
    router.navigate({ to: '/setup' })
  }

  if (!shouldShow) {
    return <div className="min-h-screen bg-white" />
  }

  if (step === 0) {
    return (
      <main className="min-h-screen bg-white flex flex-col">
        <div className="relative h-[48vh] min-h-[280px] w-full overflow-hidden">
          <img
            src="/welcome-screen-hero.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="flex-1 flex flex-col px-6 pt-4 pb-10">
          <h1 className="text-3xl font-normal text-gray-900 uppercase leading-tight">
            Welcome to
          </h1>
          <h2 className="text-4xl sm:text-5xl font-extrabold uppercase leading-tight mb-4">
            <span className="text-[#F7941D]">Saucy</span>{' '}
            <span className="text-gray-900">Menu</span>
          </h2>
          <p className="text-[#757575] text-base leading-relaxed">
            Browse the menu, filter by allergens and dietary needs, and find
            dishes you'll love, all in your language.
          </p>

          <div className="flex-1" />

          <Dots step={step} />
          <NextButton onClick={() => setStep(1)}>Get Started</NextButton>
        </div>
      </main>
    )
  }

  if (step === 1) {
    return (
      <main className="min-h-screen bg-white flex flex-col px-6 pt-16 pb-10">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <ChatBubbleLeftRightIcon className="w-20 h-20 text-[#F7941D] mb-8" />
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Menus That Talk Back.
          </h2>
          <p className="text-[#757575] text-base leading-relaxed">
            Guests can ask Saucy AI anything, from "Is this strictly
            peanut-free?" to "What pairs best with the truffle pasta?"
            Instant answers, tailored recommendations, zero guesswork.
          </p>
        </div>

        <Dots step={step} />
        <NextButton onClick={() => setStep(2)}>Next</NextButton>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col px-6 pt-16 pb-10">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <ShieldCheckIcon className="w-20 h-20 text-[#F7941D] mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
          Dine with Confidence.
        </h2>
        <p className="text-[#757575] text-base leading-relaxed">
          Instantly highlight allergens so every guest knows exactly what
          they're ordering. Inclusive dining, engineered beautifully.
        </p>
      </div>

      <Dots step={step} />
      <NextButton onClick={handleFinish}>Unlock the Kitchen</NextButton>
    </main>
  )
}
