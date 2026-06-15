"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DemoBookingModal } from "./demo-booking-modal";

interface LayerData {
	id: number;
	image: string;
	headline: string;
	subtext: string;
}

const layers: LayerData[] = [
	{
		id: 1,
		image: "/safari-window-saucymenudash.svg",
		headline: "See What's Working, Instantly",
		subtext:
			"From total dishes to real-time customer interactions, your dashboard tracks what people order, love, and talk about, all in one glance.",
	},
	{
		id: 2,
		image: "/safari-window-saucymenumenu.svg",
		headline: "A Menu That Understands Your Guests",
		subtext:
			"Tag every dish with cuisine, allergens, and dietary preferences, so customers can find exactly what fits them, faster.",
	},
	{
		id: 3,
		image: "/safari-window-saucymenureviews.svg",
		headline: "Every Review, Linked to Real Orders",
		subtext:
			"Each dish review connects to an order ID, giving you data that actually means something, not just opinions.",
	},
	{
		id: 4,
		image: "/safari-window-saucymenudishes.svg",
		headline: "Your Menu, Your Control",
		subtext:
			"Add or remove dishes anytime, no full reuploads, no friction, no fuss. Update in seconds, serve better in minutes.",
	},
];

export function FeaturesSection() {
	const [isVisible, setIsVisible] = useState(false);
	const [activeLayer, setActiveLayer] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const sectionRef = useRef<HTMLDivElement>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		const interval = setInterval(() => {
			setIsTransitioning(true);
			setTimeout(() => {
				setActiveLayer((prev) => (prev + 1) % layers.length);
				setIsTransitioning(false);
			}, 400);
		}, 20000);

		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
				}
			},
			{ threshold: 0.1 },
		);

		if (sectionRef.current) {
			observer.observe(sectionRef.current);
		}

		return () => observer.disconnect();
	}, []);

	const handlePrevious = () => {
		setIsTransitioning(true);
		setTimeout(() => {
			setActiveLayer((prev) => (prev === 0 ? layers.length - 1 : prev - 1));
			setIsTransitioning(false);
		}, 400);
	};

	const handleNext = () => {
		setIsTransitioning(true);
		setTimeout(() => {
			setActiveLayer((prev) => (prev === layers.length - 1 ? 0 : prev + 1));
			setIsTransitioning(false);
		}, 400);
	};

	const currentLayer = layers[activeLayer];

	return (
		<main>
			<section
				ref={sectionRef}
				id="features"
				className="py-12 md:py-16">
				<div className="px-8 md:px-32 xl:px-60">
					<div
						className={`space-y-4 transition-all duration-700 ${
							isVisible
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-8"
						}`}>
						<h2
							className="text-3xl md:text-4xl tracking-tighter font-semibold text-center mb-2 transition-all duration-500"
							key={`headline-${activeLayer}`}>
							{currentLayer.headline}
						</h2>

						<p
							className="text-base text-black/50 text-center mb-2 max-w-3xl mx-auto leading-relaxed transition-all duration-500"
							key={`subtext-${activeLayer}`}>
							{currentLayer.subtext}
						</p>

						<div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4">
							<button
								onClick={() => setIsModalOpen(true)}
								className="cursor-pointer bg-gradient-to-tr from-black via-black to-transparent text-white rounded-full w-fit h-12 px-5 text-xs font-medium flex items-center gap-x-1 transition-all duration-300 hover:scale-105 hover:shadow-lg">
								Book A Free Demo{" "}
								<ChevronRight
									size={16}
									className="font-normal"
								/>
							</button>
							<a
								href="mailto:hello@saucymenu.com"
								className="cursor-pointer text-sm font-medium text-black/50 hover:text-black flex items-center gap-x-1 transition-all duration-300 hover:gap-x-2">
								Send An Email{" "}
								<ChevronRight
									size={16}
									className="font-normal"
								/>
							</a>
						</div>
					</div>

					<div className="mt-6 relative w-full overflow-hidden">
						<div className="flex items-center justify-center h-fit">
							<div
								className={`relative w-full transition-all duration-500 ease-out ${
									isTransitioning
										? "opacity-0 scale-95"
										: "opacity-100 scale-100"
								} ${isVisible ? "animate-fadeInUp" : "opacity-0"}`}
								key={`image-${activeLayer}`}>
								<div className="relative rounded-2xl md:rounded-3xl overflow-hidden h-full hover:shadow-2xl transition-shadow duration-500">
									<Image
										src={currentLayer.image || "/placeholder.svg"}
										alt={currentLayer.headline}
										width={1920}
										height={1080}
										className="w-full h-full object-cover md:object-contain transition-transform duration-700 hover:scale-[1.02]"
										priority
									/>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-center gap-4 mt-4 md:mt-8 px-4">
							<button
								onClick={handlePrevious}
								className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-110"
								aria-label="Previous layer">
								<ChevronLeft className="w-6 h-6 text-gray-700" />
							</button>

							<div className="flex justify-center gap-2">
								{layers.map((_, index) => (
									<button
										key={index}
										onClick={() => {
											setIsTransitioning(true);
											setTimeout(() => {
												setActiveLayer(index);
												setIsTransitioning(false);
											}, 400);
										}}
										className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ease-out cursor-pointer ${
											index === activeLayer
												? "w-6 md:w-8 bg-[#E68C24] scale-110"
												: "w-1.5 md:w-2 bg-gray-300 hover:bg-gray-400 hover:scale-110"
										}`}
										aria-label={`Go to layer ${index + 1}`}
									/>
								))}
							</div>

							<button
								onClick={handleNext}
								className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-110"
								aria-label="Next layer">
								<ChevronRight className="w-6 h-6 text-gray-700" />
							</button>
						</div>
					</div>
				</div>
			</section>
			<DemoBookingModal
				initialEmail=""
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</main>
	);
}
