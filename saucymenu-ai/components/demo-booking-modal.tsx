"use client";

import type React from "react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { z } from "zod";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { countries } from "@/lib/country-list";

const demoBookingSchema = z.object({
	date: z.date({ required_error: "Date is required" }),
	time: z.string().min(1, "Time is required"),
	restaurantName: z.string().min(1, "Restaurant name is required"),
	email: z.string().email("Invalid email address"),
	country: z.string().min(1, "Country is required"),
});

interface DemoBookingModalProps {
	initialEmail?: string;
	isOpen: boolean;
	onClose: () => void;
}

export function DemoBookingModal({
	isOpen,
	onClose,
	initialEmail,
}: DemoBookingModalProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const form = useForm({
		resolver: zodResolver(demoBookingSchema),
		defaultValues: {
			date: undefined,
			time: "",
			restaurantName: "",
			email: initialEmail,
			country: "",
		},
	});

	const onSubmit = async (data: any) => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/book-demo", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					restaurantName: data.restaurantName,
					email: data.email,
					country: data.country,
					date: data.date.toISOString(),
					time: data.time,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to book demo");
			}

			setSuccess(true);
			form.reset();

			setTimeout(() => {
				onClose();
				setSuccess(false);
			}, 2000);
		} catch (err: unknown) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("An error occurred. Please try again.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	const timeSlots = [
		"9:00 AM",
		"10:00 AM",
		"11:00 AM",
		"12:00 PM",
		"1:00 PM",
		"2:00 PM",
		"3:00 PM",
		"4:00 PM",
		"5:00 PM",
	];

	return (
		<div className="fixed w-screen min-h-screen inset-0 z-50 flex items-center justify-center p-8 animate-in fade-in duration-400">
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div className="mx-auto max-w-2xl bg-white rounded-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-auto">
				<button
					onClick={onClose}
					className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100 transition-colors"
					aria-label="Close modal">
					<X className="h-5 w-5 text-gray-500" />
				</button>

				<div className="p-6 md:p-8">
					<h2 className="text-2xl md:text-3xl font-medium text-gray-900 mb-2">
						Book Your Demo
					</h2>
					<p className="text-sm text-gray-600 mb-6">
						Schedule a personalized walkthrough of our AI-powered restaurant
						management platform
					</p>

					{success ? (
						<div className="py-8 text-center">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									className="w-8 h-8 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
							<h3 className="text-xl font-medium text-gray-900 mb-2">
								Demo Booked!
							</h3>
							<p className="text-sm text-gray-600">
								We'll be in touch soon to confirm your appointment.
							</p>
						</div>
					) : (
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-6">
							<div className="h-full grid grid-cols-1 md:grid-cols-2 items-start gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Select Date
									</label>
									<Controller
										name="date"
										control={form.control}
										render={({ field }) => (
											<DayPicker
												mode="single"
												selected={field.value}
												onSelect={field.onChange}
												disabled={{ before: new Date() }}
												className="h-full flex items-center justify-center border rounded-lg"
											/>
										)}
									/>
								</div>

								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Select Time
										</label>
										<Controller
											name="time"
											control={form.control}
											render={({ field }) => (
												<Select
													value={field.value}
													onValueChange={field.onChange}>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select Time" />
													</SelectTrigger>
													<SelectContent>
														{timeSlots.map((time) => (
															<SelectItem
																key={time}
																value={time}>
																{time}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Restaurant Name
										</label>
										<input
											type="text"
											{...form.register("restaurantName")}
											className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F7941D] focus:border-transparent outline-none transition-all"
											placeholder="Your Restaurant"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Email Address
										</label>
										<input
											type="email"
											defaultValue={initialEmail}
											{...form.register("email")}
											className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F7941D] focus:border-transparent outline-none transition-all"
											placeholder="you@restaurant.com"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Country
										</label>
										<Controller
											name="country"
											control={form.control}
											render={({ field }) => (
												<Select
													value={field.value}
													onValueChange={field.onChange}>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select Country" />
													</SelectTrigger>
													<SelectContent>
														{countries.map((country) => (
															<SelectItem
																key={country.name}
																value={country.name}>
																{country.flag} {country.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
									</div>
								</div>
							</div>

							{error && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
									<p className="text-sm text-red-600">{error}</p>
								</div>
							)}

							<button
								type="submit"
								disabled={isLoading}
								className="w-full bg-[#F7941D] text-white font-medium py-3 px-6 rounded-lg hover:bg-[#E68C24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
								{isLoading ? "Booking..." : "Book Demo"}
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
