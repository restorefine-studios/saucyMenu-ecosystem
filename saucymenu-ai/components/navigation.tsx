"use client";

import type React from "react";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import { DemoBookingModal } from "./demo-booking-modal";

export function Navigation() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	// const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const handleNavClick = (
		e: React.MouseEvent<HTMLAnchorElement>,
		href: string,
	) => {
		e.preventDefault();
		setIsMenuOpen(false);

		const targetId = href.replace("#", "");
		const targetElement = document.getElementById(targetId);

		if (targetElement) {
			targetElement.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
			window.history.pushState(null, "", href);
		}
	};

	// const handleWaitlistClick = () => {
	// 	setIsWaitlistOpen(true);
	// 	setIsMenuOpen(false);
	// };

	return (
		<>
			<nav
				className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
					isScrolled
						? "backdrop-blur-md bg-white/80 shadow-sm"
						: "backdrop-blur-sm bg-transparent"
				}`}>
				<div className="w-full container bg-transparent rounded-full mx-auto pt-2 px-8 lg:px-32">
					<div className="flex items-center justify-between h-20">
						<section className="flex items-center gap-x-8">
							<div className="flex-shrink-0 animate-fadeInLeft">
								<Link
									href="/"
									className="text-2xl font-bold text-black">
									<Image
										src="/saucymenu-registeredlogo.svg"
										width={80}
										height={30}
										alt="Saucy Menu Logo"
										className="aspect-auto"
									/>
								</Link>
							</div>

							<div className="hidden md:flex items-center gap-8 text-sm text-[#868686]">
								{["Features", "Solutions", "Contact"].map((item, index) => (
									<Link
										key={item}
										href={`#${item.toLowerCase()}`}
										onClick={(e) => handleNavClick(e, `#${item.toLowerCase()}`)}
										className="relative group hover:text-[#F7941D] transition-colors duration-300 animate-fadeInLeft"
										style={{ animationDelay: `${(index + 1) * 100}ms` }}>
										{item}
										<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#F7941D] transition-all duration-300 group-hover:w-full" />
									</Link>
								))}
							</div>
						</section>

						<div className="hidden md:flex items-center gap-2">
							<a
								href="mailto:hello@saucymenu.com"
								className="bg-[#F1F1F1] text-black text-xs hover:bg-[#E1E1E1] font-medium tracking-tight rounded-full w-fit h-10 px-5 flex items-center justify-center transition-all duration-300 hover:scale-105 animate-fadeInRight">
								Send An Email
							</a>
							<button
								onClick={() => setIsModalOpen(true)}
								className="bg-[#F7941D] text-white text-xs hover:bg-[#E68C24] font-medium tracking-tight rounded-full w-fit h-10 px-5 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fadeInRight">
								Book A Demo
							</button>
						</div>

						<button
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							className="md:hidden p-2 text-gray-700 hover:text-[#F7941D] transition-colors"
							aria-label="Toggle menu">
							{isMenuOpen ? (
								<X className="w-6 h-6 transition-transform duration-300 rotate-90" />
							) : (
								<Menu className="w-6 h-6 transition-transform duration-300" />
							)}
						</button>
					</div>
				</div>

				<div
					className={`md:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
						isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
					}`}>
					<div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
						<div className="container mx-auto px-4 py-6 space-y-4">
							<Link
								href="#features"
								onClick={(e) => handleNavClick(e, "#features")}
								className="flex items-center justify-between text-[#868686] hover:text-[#F7941D] transition-colors py-3 border-b border-gray-100">
								<span>Features</span>
								<ChevronRight className="w-4 h-4" />
							</Link>
							<Link
								href="#solutions"
								onClick={(e) => handleNavClick(e, "#solutions")}
								className="flex items-center justify-between text-[#868686] hover:text-[#F7941D] transition-colors py-3 border-b border-gray-100">
								<span>Solutions</span>
								<ChevronRight className="w-4 h-4" />
							</Link>
							<Link
								href="#contact"
								onClick={(e) => handleNavClick(e, "#contact")}
								className="flex items-center justify-between text-[#868686] hover:text-[#F7941D] transition-colors py-3 border-b border-gray-100">
								<span>Contact</span>
								<ChevronRight className="w-4 h-4" />
							</Link>

							<div className="flex flex-col gap-3 pt-4">
								<a
									href="mailto:hello@saucymenu.com"
									className="bg-[#F1F1F1] text-black text-sm flex items-center justify-center hover:bg-[#E1E1E1] font-medium tracking-tight rounded-full w-full h-12 px-5 transition-colors">
									Send An Email
								</a>
								<button
									onClick={() => setIsModalOpen(true)}
									className="bg-[#F7941D] text-white text-sm hover:bg-[#E68C24] font-medium tracking-tight rounded-full w-full h-12 px-5 transition-colors">
									Book A Demo
								</button>
							</div>
						</div>
					</div>
				</div>
			</nav>

			<DemoBookingModal
				initialEmail=""
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</>
	);
}
