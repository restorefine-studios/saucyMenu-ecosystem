"use client"

import { Check, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"

const pricingTiers = [
  {
    name: "Starter",
    price: "£30",
    description: "Perfect for small restaurants getting started with AI",
    features: [
      "AI-powered digital menu",
      "Basic language translation",
      "Up to 50 menu items",
      "Email support",
      "Basic analytics",
    ],
  },
  {
    name: "Pro",
    price: "£60",
    description: "Ideal for growing restaurants seeking more features",
    features: [
      "Everything in Starter",
      "Advanced AI recommendations",
      "Unlimited menu items",
      "Priority support",
      "Real-time analytics dashboard",
      "Customer chat integration",
    ],
    popular: true,
  },
  {
    name: "Premium",
    price: "£90",
    description: "Complete solution for large-scale operations",
    features: [
      "Everything in Pro",
      "White-label branding",
      "Custom AI training",
      "Dedicated account manager",
      "Advanced integrations",
      "Multi-location support",
    ],
  },
]

const customerProfiles = [
  "/booking-headshot-1.webp",
  "/booking-headshot-2.webp",
  "/booking-headshot-3.webp",
  "/booking-headshot-1.webp",
]

export function PricingSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredTier, setHoveredTier] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

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

  return (
    <section ref={sectionRef} className="py-16">
      <div
        className={`text-center mb-8 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h2 className="text-3xl md:text-4xl font-medium text-[#E68C24] mb-4">Simple, Predictable Pricing</h2>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
          Choose the plan that fits your restaurant&apos;s needs. All plans include our core AI features with no hidden
          fees.
        </p>
      </div>

      <Link
        href="#book-demo"
        className={`flex items-center justify-center gap-3 mb-12 group hover:opacity-80 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
        style={{ transitionDelay: "100ms" }}
      >
        <div className="flex -space-x-3">
          {customerProfiles.map((profile, index) => (
            <div
              key={index}
              className="relative w-10 h-10 rounded-full border-2 border-white overflow-hidden transition-transform duration-300 group-hover:scale-110"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <Image src={profile || "/placeholder.svg"} alt={`Customer ${index + 1}`} fill className="object-cover" />
            </div>
          ))}
        </div>
        <span className="text-sm md:text-base text-gray-700 font-medium">Join our 100+ happy customers</span>
        <ChevronRight className="w-5 h-5 text-gray-700 group-hover:translate-x-1 transition-transform" />
      </Link>

      <section className="px-8 md:px-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.name}
              onMouseEnter={() => setHoveredTier(tier.name)}
              onMouseLeave={() => setHoveredTier(null)}
              className={`bg-[#343434] rounded-3xl p-8 flex flex-col relative transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              } ${tier.popular ? "ring-2 ring-[#F7941D]" : ""}`}
              style={{ transitionDelay: `${index * 100 + 200}ms` }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F7941D] text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-white mb-2">{tier.name}</h3>
                <div className="text-4xl font-bold text-white mb-3">
                  {tier.price}
                  <span className="text-lg font-normal text-gray-400">/month</span>
                </div>
                <p className="text-sm text-gray-400">{tier.description}</p>
              </div>

              <div className="border-t border-gray-600 mb-6"></div>

              <ul className="space-y-4 mb-8 flex-grow">
                {tier.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-start gap-3 transition-all duration-300"
                    style={{ transitionDelay: `${featureIndex * 50}ms` }}
                  >
                    <Check className="w-5 h-5 text-[#F7941D] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="#book-demo"
                className={`w-full font-medium py-3 px-6 rounded-xl text-center transition-all duration-300 ${
                  tier.popular
                    ? "bg-[#F7941D] text-white hover:bg-[#E68C24] hover:scale-105"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Book A Demo
              </Link>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
