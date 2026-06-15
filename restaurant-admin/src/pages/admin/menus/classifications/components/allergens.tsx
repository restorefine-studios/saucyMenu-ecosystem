/* eslint-disable @typescript-eslint/no-explicit-any */
import apiRoutes from "@/apiRoutes";
import { axiosInstance } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ItemRow } from "./list-item";
import { useQueryState } from "nuqs";

const Allergens = () => {
	const [searchQuery] = useQueryState("search");
	const getAllergens = async () => {
		const res = await axiosInstance.get(apiRoutes.allegens);
		return res.data;
	};
	const { data: allergensData } = useQuery({
		queryKey: ["get_allergens"],
		queryFn: getAllergens,
	});
	const items = allergensData?.data
		?.filter((item: any) =>
			item.name.toLowerCase().includes(searchQuery?.toLowerCase() ?? ""),
		) ?? [];

	return (
		<div className="space-y-3">
			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground py-8 text-center rounded-xl bg-muted/30">
					{searchQuery ? "No allergens match your search." : "No allergens in the list."}
				</p>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
					{items.map((item: any) => (
						<ItemRow
							key={item.id}
							name={item.name}
							description={item.description}
							price={item.price}
							icon={item.icon}
							onEdit={() => {}}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default Allergens;
