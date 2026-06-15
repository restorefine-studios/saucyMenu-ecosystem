"use client"

import type React from "react"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { countries } from "@/lib/country-list"

const waitlistSchema = z.object({
  restaurantName: z.string().min(1, "Restaurant name is required"),
  email: z.string().email("Invalid email address"),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State/Region is required"),
})

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      restaurantName: "",
      email: "",
      country: "",
      state: "",
    },
  })

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error: insertError } = await supabase.from("waitlist").insert({
        restaurant_name: data.restaurantName,
        email: data.email,
        country: data.country,
        state: data.state,
      })

      if (insertError) throw insertError

      setSuccess(true)
      form.reset()

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("duplicate key")) {
          setError("This email is already on the waitlist!")
        } else {
          setError(err.message)
        }
      } else {
        setError("An error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-400 cursor-pointer" />
        </button>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Join The Waitlist</h2>
          <p className="text-sm text-black/50 mb-6">Be the first to experience AI-powered restaurant management</p>

          {success ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">You're on the list!</h3>
              <p className="text-sm text-gray-600">We'll be in touch soon with exclusive early access.</p>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="restaurantName" className="block text-xs font-medium text-black/50 mb-1">
                  Restaurant Name
                </label>
                 <input
                   type="text"
                   id="restaurantName"
                   {...form.register("restaurantName")}
                   className="text-sm w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-[#F7941D] focus:border-transparent outline-none transition-all"
                   placeholder="Your Restaurant"
                 />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-black/50 mb-1">
                  Email Address
                </label>
                 <input
                   type="email"
                   id="email"
                   {...form.register("email")}
                   className="text-sm w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-[#F7941D] focus:border-transparent outline-none transition-all"
                   placeholder="you@restaurant.com"
                 />
              </div>

               <div>
                 <label htmlFor="country" className="block text-xs font-medium text-black/50 mb-1">
                   Country
                 </label>
                 <Controller
                   name="country"
                   control={form.control}
                   render={({ field }) => (
                     <Select value={field.value} onValueChange={field.onChange}>
                       <SelectTrigger className="text-sm w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-[#F7941D] focus:border-transparent outline-none transition-all">
                         <SelectValue placeholder="Select Country" />
                       </SelectTrigger>
                       <SelectContent>
                         {countries.map(country => (
                           <SelectItem key={country.name} value={country.name}>
                             {country.flag} {country.name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   )}
                 />
               </div>

              <div>
                <label htmlFor="state" className="block text-xs font-medium text-black/50 mb-1">
                  State/Region
                </label>
                 <input
                   type="text"
                   id="state"
                   {...form.register("state")}
                   className="text-sm w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-[#F7941D] focus:border-transparent outline-none transition-all"
                   placeholder="London"
                 />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#F7941D] text-white font-medium py-3 px-6 rounded-lg hover:bg-[#E68C24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Joining..." : "Join The Waitlist"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
