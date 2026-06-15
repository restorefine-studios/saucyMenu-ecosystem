"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HeroImage } from "@/components/hero-image";
import { DemoBookingModal } from "@/components/demo-booking-modal";
import { useForm, SubmitHandler } from "react-hook-form";

interface Mail {
	email: string;
}

export function HeroSection() {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<Mail>();

	const onSubmit: SubmitHandler<Mail> = (data) => console.log(data);

	const initEmail = watch("email");

	return (
		<section className="pt-24 md:pt-32 pb-12 md:pb-24">
			<div className="container mx-auto">
				{/* Hero Body - Centered */}
				<div className="flex flex-col items-center text-center max-w-xs md:max-w-2xl mx-auto gap-y-4">
					<h1 className="text-4xl md:text-5xl font-semibold text-black tracking-tighter animate-slideUp opacity-0 leading-tight">
						Menus Are Confusing.{" "}
						<span className="font-serif italic animate-slideUp opacity-0 stagger-1">
							Yours{" "}
							<span className="font-serif italic animate-slideUp opacity-0 stagger-1 inline-block">
								Doesn’t Have to Be.
							</span>
						</span>
					</h1>

					<p className="text-sm md:text-base text-black/50 w-full md:max-w-xl leading-relaxed animate-slideUp opacity-0 stagger-2">
						Turn your menu into a clear, personalised experience with AI. Help
						customers choose faster, avoid allergens, and order with confidence.
					</p>

					<form
						onSubmit={handleSubmit(onSubmit)}
						className="w-full md:w-fit mt-0 md:mt-2 mx-auto flex items-center gap-2 animate-slideUp opacity-0 stagger-3">
						<label
							htmlFor="email"
							className="w-full md:w-fit">
							<input
								id="email"
								placeholder="hello@myrestaurant.com"
								type="text"
								className="w-full md:w-[300px] bg-[#F1F1F1] h-12 rounded-lg px-6 text-sm"
								{...register("email", {
									pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
								})}
							/>
						</label>

						<Button
							onClick={() => setIsModalOpen(true)}
							className="bg-[#F7941D] w-fit text-white hover:bg-[#E68C24] rounded-full h-12 px-5 text-xs">
							Book A Demo
						</Button>
					</form>
					<div className="text-red-500 text-sm flex flex-start">
						{errors.email && <span>Please use a valid email address</span>}
					</div>
				</div>

				{/* Hero Image with Annotations */}
				<HeroImage />
			</div>

			<DemoBookingModal
				initialEmail={initEmail}
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</section>
	);
}
