import Image from "next/image";

export function HeroImage() {
	return (
		<div className="relative w-full md:max-w-6xl mx-auto pt-16">
			<div className="relative mx-auto w-full max-w-[350px] md:max-w-2xl lg:max-w-3xl animate-float">
				<Image
					src="/restaurant-homescreens.webp"
					alt="Saucy Menu App Interface"
					width={1920}
					height={1080}
					className="aspect-auto md:object-cover animate-blurIn opacity-0"
				/>
			</div>

			<div className="hidden lg:block">
				<div className="absolute -right-28 top-[1%] -rotate-12 flex items-center gap-2 animate-fadeInRight  opacity-0 stagger-1">
					<div className="hidden w-36 h-px bg-gray-300"></div>
					<FeatureCard
						title="Digital Menu"
						description="All dishes, drinks, and offers in one updated digital menu."
					/>
				</div>

				<div className="absolute -right-20 top-[60%] rotate-20 flex items-center gap-2 ml-12 animate-fadeInRight   opacity-0 stagger-2">
					<div className="hidden w-44 h-px bg-gray-300"></div>
					<FeatureCard
						title="Saucy Chat"
						description="Ask questions and get smart help choosing your meal."
					/>
				</div>
			</div>

			<div className="hidden lg:block">
				<div className="absolute -left-12 top-[20%] rotate-12 flex items-center gap-2 flex-row-reverse animate-fadeInLeft   opacity-0 stagger-1">
					<div className="hidden w-44 h-px bg-gray-300"></div>
					<FeatureCard
						title="Priority For Health"
						description="Filter out ingredients to match your health needs."
						align="left"
					/>
				</div>

				<div className="absolute -left-24 top-[75%] -rotate-10 flex items-center gap-2 flex-row-reverse mr-12 animate-fadeInLeft   opacity-0 stagger-2">
					<div className="hidden w-44 h-px bg-gray-300"></div>
					<FeatureCard
						title="Language Translations"
						description="Read, chat, and explore in your preferred language."
						align="left"
					/>
				</div>
			</div>

			<div className="hidden mt-12 space-y-4 max-w-md mx-auto">
				<FeatureCard
					title="Added Food Rating"
					description="Customers rate dishes instantly, helping others make informed choices"
				/>
				<FeatureCard
					title="AI Recommended Dishes"
					description="Smart suggestions based on preferences and popular choices"
				/>
				<FeatureCard
					title="Suggest More Dishes With AI"
					description="Intelligent recommendations that complement customer selections"
				/>
				<FeatureCard
					title="Upsell with AI Paired Sides"
					description="Perfect pairings suggested automatically to boost order value"
				/>
			</div>
		</div>
	);
}

function FeatureCard({
	title,
	description,
	align = "left",
}: {
	title: string;
	description: string;
	align?: "left" | "right";
}) {
	return (
		<div
			className={`bg-[#F1F1F1] rounded-2xl p-5 w-[275px] transition-all duration-300 hover:bg-[#F0E6D8] hover:shadow-lg hover:-translate-y-1  ${align === "right" ? "text-right" : ""}`}>
			<div
				className={`flex items-center gap-2 mb-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
				<div className="relative flex h-3 w-3">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
					<span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
				</div>
				<h3 className="font-semibold text-base">{title}</h3>
			</div>
			<p className="text-sm text-black/50">{description}</p>
		</div>
	);
}
