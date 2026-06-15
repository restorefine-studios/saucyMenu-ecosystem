"use client"

import { useState, useEffect, useRef } from "react"

export function GrowthSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20">
      <div className="px-8 md:px-32 container mx-auto">
        <h2
          className={`text-xl w-full md:max-w-[45%] mx-auto md:text-4xl font-medium text-[#E68C24] text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Global Coverage, On-The-Ground Expertise
        </h2>

        <div className="relative mx-auto">
          <div className="hidden inset-0 justify-between pointer-events-none">
            <div className="w-px bg-gray-200 h-full"></div>
            <div className="w-px bg-gray-200 h-full"></div>
            <div className="w-px bg-gray-200 h-full"></div>
            <div className="w-px bg-gray-200 h-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3">
            <StatCard
              title="100K + Concurrent Users"
              description="Handle massive traffic during peak hours without compromising performance or user experience"
              isVisible={isVisible}
              delay={0}
            />

            <StatCard
              title="47% Potential Revenue Increase"
              description="Average revenue boost from AI-powered upselling and personalized recommendations"
              isVisible={isVisible}
              delay={150}
            />

            <StatCard
              title="AI Powered Digital Menus"
              description="Intelligent menus that adapt in real-time to inventory, trends, and customer preferences"
              isVisible={isVisible}
              delay={300}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCard({
  title,
  description,
  isVisible,
  delay = 0
}: {
  title: string
  description: string
  isVisible: boolean
  delay?: number
}) {
  return (
    <div
      className={`text-left max-w-xs transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <h3 className="text-2xl max-w-[80%] md:text-2xl font-medium mb-3 leading-tight group">
        <span className="relative inline-block">
          {title}
          <span className={`absolute -bottom-1 left-0 h-0.5 bg-[#F7941D] transition-all duration-700 ${isVisible ? "w-full" : "w-0"}`} style={{ transitionDelay: `${delay + 200}ms` }} />
        </span>
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
