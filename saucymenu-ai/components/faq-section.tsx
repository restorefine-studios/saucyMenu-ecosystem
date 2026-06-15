"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { DemoBookingModal } from "./demo-booking-modal";

interface FAQ {
	question: string;
	answer: string;
}

const faqs: FAQ[] = [
	{
		question: "Does this replace our staff or waiters?",
		answer:
			"Not at all. It supports them — freeing your team to focus on service while AI handles menu questions and recommendations.",
	},
	{
		question: "How difficult is setup?",
		answer:
			"It's plug-and-play. Once your menu is uploaded, AI begins learning from your dishes and customers instantly.",
	},
	{
		question: "Is this system safe for user data?",
		answer:
			"Yes. No personal data is collected or stored. The AI only interacts through your restaurant's menu data.",
	},
	{
		question: "Can we customize the menu to match our brand?",
		answer:
			"Absolutely. Saucy Menu offers white-label customization, allowing you to match your brand colors, fonts, and style. Your customers will experience a seamless extension of your restaurant's identity.",
	},
	{
		question: "How does this improve revenue?",
		answer:
			"By guiding guests to dishes they'll love (and likely reorder), improving satisfaction and reducing order hesitation.",
	},
	{
		question: "Is there a contract or can we cancel anytime?",
		answer:
			"We offer flexible month-to-month plans with no long-term contracts. You can upgrade, downgrade, or cancel anytime. We're confident you'll love the results, so we don't lock you in.",
	},
];

export function FAQSection() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const sectionRef = useRef<HTMLElement>(null);

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

	const toggleFAQ = (index: number) => {
		setOpenIndex(openIndex === index ? null : index);
	};

	return (
		<main>
			<section
				ref={sectionRef}
				className="py-0 md:py-16 pb-0 md:pb-66">
				<div className="px-8 md:px-32 xl:px-60">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
						<div className="flex flex-col justify-between">
							<div
								className={`transition-all duration-700 ${
									isVisible
										? "opacity-100 translate-y-0"
										: "opacity-0 translate-y-8"
								}`}>
								<h2 className="text-3xl md:text-4xl font-semibold tracking-tighter mb-2">
									Got Questions? <br /> Let's Clear the Table.
								</h2>
								<p className="text-black/50 text-sm md:text-base mb-8">
									Everything you need to know before your first AI-powered dish
									goes live.
								</p>
							</div>

							<div
								className={`bg-black rounded-3xl p-8 md:mt-0 transition-all duration-700 ${
									isVisible
										? "opacity-100 translate-y-0"
										: "opacity-0 translate-y-8"
								}`}
								style={{ transitionDelay: "200ms" }}>
								<h3 className="text-xl md:text-2xl font-medium text-white mb-1">
									Still Got Questions?
								</h3>
								<p className="text-white/50 text-sm mb-6">
									Our team is here to help you make the right decision for your
									restaurant. Book a demo and let's talk.
								</p>
								<button
									onClick={() => setIsModalOpen(true)}
									className="w-full bg-white text-black py-4 px-6 rounded-xl font-medium cursor-pointer hover:bg-gray-200 transition-all duration-300 hover:scale-[1.02]">
									Book A Demo Call
								</button>
							</div>
						</div>

						<div className="space-y-4 mb-28 md:mb-0">
							{faqs.map((faq, index) => (
								<div
									key={index}
									className={`bg-gray-100 rounded-xl overflow-hidden transition-all duration-500 ease-in-out ${
										isVisible ? "animate-slideUp opacity-0" : "opacity-0"
									}`}
									style={{ animationDelay: `${index * 100 + 300}ms` }}>
									<button
										onClick={() => toggleFAQ(index)}
										className={`w-full px-6 py-5 flex items-center justify-between text-left transition-colors duration-300 ${
											openIndex === index
												? "bg-[#F0E6D8]"
												: "hover:bg-[#F0E6D8]"
										}`}>
										<span className="font-normal text-black pr-4">
											{faq.question}
										</span>
										<ChevronDown
											className={`flex-shrink-0 w-5 h-5 text-black transition-transform duration-500 ease-in-out ${
												openIndex === index ? "rotate-180" : ""
											}`}
										/>
									</button>
									<div
										className={`grid transition-all duration-500 ease-in-out ${
											openIndex === index
												? "grid-rows-[1fr] opacity-100"
												: "grid-rows-[0fr] opacity-0"
										}`}>
										<div className="overflow-hidden">
											<div className="px-6 pb-5 pt-2">
												<p className="text-black/50 text-sm leading-relaxed">
													{faq.answer}
												</p>
											</div>
										</div>
									</div>
								</div>
							))}
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
