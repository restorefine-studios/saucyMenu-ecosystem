"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

const problems = [
	{
		id: "language",
		number: "Speak Every Language of Hospitality",
		title: "Global Guests, Local Comfort",
		description:
			"From English to Arabic, Spanish to Japanese — your customers can read, chat, and order in their own language. No barriers, just better experiences.",
		image: "/customer-languages.webp",
	},
	{
		id: "performance",
		number: "Smarter Care for Dietary & Allergy Needs",
		title: "Serve Safety, Not Uncertainty",
		description:
			"AI matches each guest's preferences and allergens to the right dishes, making your restaurant inclusive, responsible, and trusted.",
		image: "/customer-allergies-new.webp",
	},
	{
		id: "experience",
		number: "AI Chat Concierge",
		title: "Your Menu's Smartest Waiter",
		description:
			"Guests can chat directly with your restaurant's AI assistant,asking about dishes, ingredients, or getting instant recommendations when they can't decide.",
		image: "/customer-aichat.webp",
	},
];

export function ProblemsSection() {
	// const [headerVisible, setHeaderVisible] = useState(false);
	const [problemVisibility, setProblemVisibility] = useState<
		Record<string, boolean>
	>({});
	const sectionRef = useRef<HTMLElement>(null);
	const problemRefs = useRef<(HTMLDivElement | null)[]>([]);

	// useEffect(() => {
	// 	const headerObserver = new IntersectionObserver(
	// 		([entry]) => {
	// 			if (entry.isIntersecting) {
	// 				setHeaderVisible(true);
	// 			}
	// 		},
	// 		{ threshold: 0.3 },
	// 	);

	// 	if (sectionRef.current) {
	// 		headerObserver.observe(sectionRef.current);
	// 	}

	// 	return () => headerObserver.disconnect();
	// }, []);

	useEffect(() => {
		const problemObservers: IntersectionObserver[] = [];

		problemRefs.current.forEach((ref, index) => {
			if (!ref) return;

			const observer = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						setProblemVisibility((prev) => ({
							...prev,
							[problems[index].id]: true,
						}));
					}
				},
				{ threshold: 0.2 },
			);

			observer.observe(ref);
			problemObservers.push(observer);
		});

		return () => {
			problemObservers.forEach((observer) => observer.disconnect());
		};
	}, []);

	return (
		<section
			id="solutions"
			ref={sectionRef}
			className="py-16">
			<div className="container mx-auto px-8 md:px-32">
				<div
					className={`text-center mb-16 transition-all duration-700 ease-out `}>
					<h2 className="w-full md:w-5/6 mx-auto text-3xl md:text-4xl font-semibold tracking-tighter mb-2">
						The Modern Way to Care for Every Guest
					</h2>
					<p className="w-full md:w-3/4 mx-auto text-black/50 text-base">
						Smarter menus, faster choices, and personalized experiences, all
						working quietly behind the scenes to make dining simple, seamless,
						and unforgettable.
					</p>
				</div>

				<div className="flex flex-col gap-16 md:gap-24 mb-16">
					{problems.map((problem, index) => {
						const isVisible = problemVisibility[problem.id] ?? false;
						const isEven = index % 2 === 0;

						return (
							<div
								key={problem.id}
								ref={(el) => {
									problemRefs.current[index] = el;
								}}
								className={`flex flex-col ${
									isEven ? "md:flex-row" : "md:flex-row-reverse"
								} gap-8 md:gap-12 items-center`}>
								<div className="w-full md:w-1/2 flex-shrink-0">
									<div
										className={`relative overflow-hidden rounded-3xl ${
											problem.id === "performance"
												? "w-full h-[500px] md:h-[700px]"
												: "w-full h-[400px] md:h-[500px] bg-[#FFF2E4]"
										}`}
										style={{
											opacity: isVisible ? 1 : 0,
											transform: isVisible
												? isEven
													? "translateX(0)"
													: "translateX(0)"
												: isEven
													? "translateX(-60px)"
													: "translateX(60px)",
											transition: `opacity 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
											transitionDelay: `${index * 100}ms`,
										}}>
										<Image
											src={problem.image || "/placeholder.svg"}
											alt={problem.title}
											fill
											className={`object-cover ${
												isVisible ? "scale-100" : "scale-110"
											}`}
											style={{
												transition:
													"transform 1200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
												transitionDelay: `${index * 100 + 200}ms`,
											}}
										/>
									</div>
								</div>

								<div className="w-full md:w-1/2 h-auto md:h-[500px] flex flex-col items-start justify-center md:justify-evenly gap-6">
									<div
										className="bg-orange-100 rounded-full px-6 h-12 text-orange-950 flex items-center justify-center text-sm"
										style={{
											opacity: isVisible ? 1 : 0,
											transform: isVisible
												? "translateX(0) scale(1)"
												: "translateX(40px) scale(0.9)",
											transition: `opacity 600ms ease-out, transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
											transitionDelay: `${index * 100 + 300}ms`,
										}}>
										{problem.number}
									</div>

									<div
										style={{
											opacity: isVisible ? 1 : 0,
											transform: isVisible
												? "translateY(0)"
												: "translateY(30px)",
											transition: `opacity 700ms ease-out, transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
											transitionDelay: `${index * 100 + 450}ms`,
										}}>
										<h3 className="tracking-tight text-xl md:text-2xl font-semibold mb-3">
											{problem.title}
										</h3>
										<p className="text-black/50 text-base leading-relaxed">
											{problem.description}
										</p>
									</div>

									<div
										style={{
											opacity: isVisible ? 1 : 0,
											transform: isVisible
												? "translateY(0)"
												: "translateY(20px)",
											transition: `opacity 500ms ease-out, transform 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
											transitionDelay: `${index * 100 + 550}ms`,
										}}>
										<button
											// onClick={() => setIsModalOpen(true)}
											className="cursor-pointer bg-gradient-to-tr from-black via-black to-transparent text-white rounded-full w-fit h-12 px-5 text-xs font-medium flex items-center gap-x-1 transition-all duration-300 hover:scale-105 hover:shadow-lg">
											Book A Free Demo{" "}
											<ChevronRight
												size={16}
												className="font-normal"
											/>
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
