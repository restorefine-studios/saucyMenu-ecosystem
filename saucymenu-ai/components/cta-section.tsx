"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { DemoBookingModal } from "@/components/demo-booking-modal";

export function CTASection() {
  const [isModalOpen, setIsModalOpen] = useState(false)
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
    <section ref={sectionRef} className="pt-20 pb-36">
      <div className="px-8 md:px-32 xl:px-60">
        <div className={`bg-[#FFF2E4] rounded-3xl w-full h-auto md:h-[400px] grid grid-cols-1 md:grid-cols-2 items-center overflow-hidden transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <div className="p-9 md:p-12 space-y-12 md:space-y-16 col-span-1">
            <div className={`space-y-2 transition-all duration-700 ${isVisible ? "animate-slideUp opacity-0" : ""}`}>
              <p className="text-base text-[#F7941D]" >Get a free demo of Saucy Menu today!</p>
              <h2 className="w-full text-2xl md:text-3xl font-medium tracking-tighter">
                The Future of Dining Isn't Coming, It's Already At Your Table
              </h2>
            </div>

            <div className={`transition-all duration-700 ${isVisible ? "animate-slideUp opacity-0" : ""}`} style={{ transitionDelay: "150ms" }}>
              <p className="">Book A Call Now</p>
              <div className="mt-3 flex flex-col md:flex-row items-center gap-2">
                <label htmlFor="book-now" className="w-full">
                  <input 
                    id="book-now" 
                    placeholder="hello@myrestaurant.com" 
                    type="text" 
                    className="w-full bg-white h-12 rounded-lg px-5 text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F7941D] focus:ring-opacity-50" 
                  />
                </label>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#F7941D] w-full md:w-fit text-white h-12 px-5 text-sm rounded-full font-medium hover:bg-[#E68C24] transition-all duration-300 hover:scale-105 hover:shadow-lg whitespace-nowrap"
                >
                  Book A Demo
                </button>
              </div>
            </div>
          </div>

          <Image 
            src="/customer-chooseaction.webp" 
            alt="Customer Choose Action" 
            width={400} 
            height={400} 
            className={`col-span-1 px-3 pr-0 lg:pr-0 md:aspect-square aspect-auto h-fit object-contain transition-all duration-700 ${isVisible ? "animate-fadeInRight opacity-0" : ""}`}
            style={{ transitionDelay: "200ms" }}
            priority 
          />
        </div>
      </div>

      <DemoBookingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  )
}
