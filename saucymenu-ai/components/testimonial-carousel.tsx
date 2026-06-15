"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"

const testimonials = [
  {
    id: 1,
    restaurant: "La Bella Cucina",
    logo: "/italian-restaurant-logo.png",
    message:
      "Saucy Menu transformed our customer experience. The AI recommendations increased our average order value by 35%, and our international guests love the instant translation feature.",
  },
  {
    id: 2,
    restaurant: "Dragon Palace",
    logo: "/asian-restaurant-logo.jpg",
    message:
      "The analytics dashboard helped us identify our best-performing dishes and optimize our menu. We saw a 42% increase in revenue within the first three months of implementation.",
  },
  {
    id: 3,
    restaurant: "Burger Haven",
    logo: "/burger-restaurant-logo.png",
    message:
      "Our fast-paced environment needed a solution that could keep up. Saucy Menu handles our peak hours flawlessly, and the upselling features have been a game-changer for our bottom line.",
  },
  {
    id: 4,
    restaurant: "Sushi Master",
    logo: "/sushi-restaurant-logo.jpg",
    message:
      "The real-time translation feature has been incredible for our diverse customer base. We've seen a significant increase in international customers and their satisfaction scores.",
  },
]

export function TestimonialCarousel() {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (carouselRef.current) {
      observer.observe(carouselRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={carouselRef} className="space-y-8">
      <h2
        className={`text-2xl md:text-3xl font-medium text-[#F8E6D2] text-center transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        Track Your Performance And Start Profiting From It
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.id}
            onMouseEnter={() => setHoveredId(testimonial.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`bg-[#474747] rounded-3xl p-6 flex flex-col gap-4 transition-all duration-500 hover:bg-[#525252] cursor-pointer group ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            } ${hoveredId === testimonial.id ? "scale-[1.02]" : ""}`}
            style={{ transitionDelay: `${index * 100 + 200}ms` }}
          >
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
              <Image
                src={testimonial.logo || "/placeholder.svg"}
                alt={`${testimonial.restaurant} logo`}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-medium text-white mb-2 transition-colors duration-300 group-hover:text-[#F7941D]">
                {testimonial.restaurant}
              </h4>
              <p className="text-gray-300 text-xs leading-relaxed">{testimonial.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
