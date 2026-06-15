"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const footerList = [
	// { title: "Product", links: ["Features", "Pricing", "Integrations", "API"] },
	{ title: "Contact", links: ["hello@saucymenu.com"] },
];

export function Footer() {
	const [isVisible, setIsVisible] = useState(false);
	const footerRef = useRef<HTMLElement>(null);

	const currentYear = new Date().getFullYear();

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
				}
			},
			{ threshold: 0.1 },
		);

		if (footerRef.current) {
			observer.observe(footerRef.current);
		}

		return () => observer.disconnect();
	}, []);

	return (
		<section
			ref={footerRef}
			id="contact"
			className="pt-20 pb-8 bg-black">
			<div className="px-8 md:px-60">
				<div className="flex flex-col md:flex-row items-start justify-between gap-8 md:gap-4">
					<div
						className={`transition-all duration-700 ${
							isVisible
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-8"
						}`}>
						<Image
							src="/saucymenu-registeredlogo-white.svg"
							alt="Saucy Menu Logo"
							width={150}
							height={150}
						/>
					</div>

					<div className="flex items-start gap-16">
						{footerList.map((section, sectionIndex) => (
							<div
								key={section.title}
								className={`flex flex-col items-start mb-8 transition-all duration-700 ${
									isVisible
										? "opacity-100 translate-y-0"
										: "opacity-0 translate-y-8"
								}`}
								style={{ transitionDelay: `${(sectionIndex + 1) * 100}ms` }}>
								<h3 className="text-white text-xl font-medium mb-2">
									{section.title}
								</h3>
								{section.links.map((link, linkIndex) => (
									<a
										href="mailto:hello@saucymenu.com"
										key={link}
										className={`text-white/60 hover:text-white text-sm transition-all duration-300 cursor-pointer inline-block ${
											isVisible ? "animate-slideUp opacity-0" : ""
										}`}
										style={{
											transitionDelay: `${(sectionIndex + linkIndex + 2) * 100}ms`,
										}}>
										{link}
									</a>
								))}
							</div>
						))}
					</div>
				</div>

				<div
					className={`mt-8 w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-4 transition-all duration-700 ${
						isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
					}`}
					style={{ transitionDelay: "400ms" }}>
					<div className="flex flex-col items-start gap-3">
						<div className="bg-white/10 h-fit w-fit rounded-full px-4 py-2 text-sm text-white/50 font-medium flex items-center gap-x-2tracking-normal ">
							<span className="bg-green-500 w-2 h-2 rounded-full mr-2"> </span>{" "}
							All Systems Normal
						</div>
					</div>

					<div>
						<p className="w-full text-white/50 text-sm font-medium tracking-tight">
							{" "}
							© {currentYear} SaucyMenu Registered. All Rights Reserved.{" "}
						</p>
					</div>
				</div>

				<div className="pt-12">
					<div className="bg-white/15 h-0.5 w-full"></div>

					<div
						className={`mt-8 w-full text-sm text-white/50 leading-relaxed font-medium transition-all duration-700 tracking-tight ${
							isVisible
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-8"
						}`}
						style={{ transitionDelay: "500ms" }}>
						Our system never requests or stores additional customer data —
						everything runs securely within your menu environment. All allergen
						classifications follow the UK Government's 14 recognized allergens.
						Restaurants can add their own details, but the defaults are always
						compliant. <br /> <br />
						⚠️ Disclaimer: The AI system is a digital recommendation tool. It
						cannot verify ingredient handling or food preparation. Developers
						are not liable for any injury or health issues arising from
						inaccurate allergen reporting or food mismanagement within the
						restaurant.
					</div>
				</div>
			</div>
		</section>
	);
}
