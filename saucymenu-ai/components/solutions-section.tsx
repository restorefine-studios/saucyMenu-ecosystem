"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"

const solutions = [
  {
    id: "translation",
    title: "Real-time language translations",
    description:
      "Break down language barriers instantly. Serve international customers with confidence as our AI translates your menu into 100+ languages in real-time.",
    image: "/traditional-italian-food-world-tourism-day copy.webp",
  },
  {
    id: "analytics",
    title: "Real-time analytics dashboard",
    description:
      "Make data-driven decisions with live insights into menu performance, customer behavior, and revenue trends.",
    image: "/traditional-mexican-food-world-tourism-day.webp",
  },
  {
    id: "customer-care",
    title: "Increased customer priority",
    description:
      "Elevate your service standards with AI-powered customer insights. Track preferences, dietary needs, and feedback to deliver personalized experiences.",
    image: "/close-up-hands-holding-phone-with-online-menu.webp",
  },
  {
    id: "ai-chat",
    title: "AI recommended dishes & personal chat for your customers",
    description:
      "Engage customers with intelligent recommendations tailored to their preferences. Our AI chatbot answers questions, suggests pairings, and guides diners to their perfect meal.",
    image: "/17-lifestyle-people-ordering-sushi-home.webp",
  },
]

export function SolutionsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [textKey, setTextKey] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % solutions.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const getPrevIndex = () => (currentIndex - 1 + solutions.length) % solutions.length
  const getNextIndex = () => (currentIndex + 1) % solutions.length

  const handleSlideChange = (newIndex: number) => {
    setIsTransitioning(true)
    setTextKey((prev) => prev + 1)
    setCurrentIndex(newIndex)
    setTimeout(() => setIsTransitioning(false), 1000)
  }

  useEffect(() => {
    setTextKey((prev) => prev + 1)
  }, [currentIndex])

  return (
    <section
      ref={sectionRef}
      className={`py-12 md:py-20 bg-white transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="px-4 md:px-8 lg:px-32">
        <h2
          className={`text-xl md:text-2xl lg:text-4xl font-medium text-[#E68C24] text-left md:pl-28 mb-8 md:mb-16 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"
          }`}
        >
          Why Leading Restaurants Are <br />
          Choosing Saucy Menu
        </h2>

        <div className="relative w-screen -mx-4 md:-mx-8 lg:-mx-32 overflow-hidden">
          <div className="flex items-center gap-2 md:gap-4 h-[300px] md:h-[500px] lg:h-[650px] px-2 md:px-0">
            <div
              className="hidden md:block relative flex-shrink-0 transition-all duration-1000 ease-in-out rounded-r-3xl overflow-hidden grayscale hover:grayscale-0 cursor-pointer transform hover:scale-105"
              style={{ width: "15%", height: "100%" }}
              onClick={() => handleSlideChange(getPrevIndex())}
            >
              <Image
                src={solutions[getPrevIndex()].image || "/placeholder.svg"}
                alt={solutions[getPrevIndex()].title}
                fill
                className="object-cover transition-transform duration-1000 ease-in-out"
                priority
              />
            </div>

            <div
              className="relative flex-shrink-0 transition-all duration-1000 ease-in-out transform w-full md:w-[70%]"
              style={{ height: "100%" }}
            >
              <div className="relative rounded-2xl md:rounded-3xl overflow-hidden h-full">
                <Image
                  src={solutions[currentIndex].image || "/placeholder.svg"}
                  alt={solutions[currentIndex].title}
                  fill
                  className={`object-cover transition-all duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isTransitioning ? "scale-[1.08] opacity-80" : "scale-100 opacity-100"
                  }`}
                  priority
                />

                <div className="absolute left-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent w-full h-48 md:h-72">
                  <div className="max-w-full md:max-w-[50%] absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-auto">
                    <h3
                      key={`title-${textKey}`}
                      className="text-lg md:text-2xl lg:text-3xl font-medium text-white mb-1 md:mb-2 animate-[fadeInUp_0.8s_cubic-bezier(0.4,0,0.2,1)_forwards]"
                    >
                      {solutions[currentIndex].title}
                    </h3>
                    <p
                      key={`desc-${textKey}`}
                      className="text-xs md:text-sm text-white/60 leading-normal font-medium animate-[fadeInUp_0.8s_cubic-bezier(0.4,0,0.2,1)_0.15s_forwards] opacity-0"
                    >
                      {solutions[currentIndex].description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="hidden md:block relative flex-shrink-0 transition-all duration-1000 ease-in-out rounded-l-3xl overflow-hidden grayscale hover:grayscale-0 cursor-pointer transform hover:scale-105"
              style={{ width: "15%", height: "100%" }}
              onClick={() => handleSlideChange(getNextIndex())}
            >
              <Image
                src={solutions[getNextIndex()].image || "/placeholder.svg"}
                alt={solutions[getNextIndex()].title}
                fill
                className="object-cover transition-transform duration-1000 ease-in-out"
                priority
              />
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-6 md:mt-8 px-4">
            {solutions.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSlideChange(index)}
                className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ease-out ${
                  index === currentIndex
                    ? "w-6 md:w-8 bg-[#E68C24] scale-110"
                    : "w-1.5 md:w-2 bg-gray-300 hover:bg-gray-400 hover:scale-110"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
