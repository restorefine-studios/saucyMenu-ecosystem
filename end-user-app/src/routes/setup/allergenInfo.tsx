import { InformationCircleIcon } from '@heroicons/react/24/solid'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/setup/allergenInfo')({
  component: RouteComponent,
})

export function RouteComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isOpen &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  return (
    <main className="relative">
      <section className="">
        <div
          onClick={() => setIsOpen(true)}
          className="bg-blue-50 dark:bg-amber-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between text-blue-400 dark:text-amber-500 cursor-pointer transition-all duration-200 hover:bg-blue-100 hover:border-blue-200 active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="size-5" />
            <span className="text-base font-normal">
              Important Allergen Info
            </span>
          </div>
        </div>
      </section>

      <div
        className={`fixed inset-0 z-50 bg-black/20 dark:bg-black/70 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div className="h-full flex items-center justify-center p-6 md:p-24">
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-accent p-5 md:p-6 rounded-2xl transition-all duration-300 ease-out max-w-md w-full ${
              isOpen
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-90 translate-y-8'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <InformationCircleIcon className="size-5 text-blue-400 dark:text-amber-500" />
              <span className="text-lg md:text-base font-normal">
                Important Allergen Info
              </span>
            </div>
            <div className="text-[#757575] font-light text-base md:text-sm leading-relaxed">
              This menu provides guidance based on available data. Due to
              kitchen environments and preparation methods, allergens may be
              present. Always inform a member of staff about any allergies or
              dietary requirements before ordering.
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
