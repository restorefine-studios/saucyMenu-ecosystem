import { userAtom } from "@/atoms/user";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const ItemRow = ({
	name,
	description,
	price,
	icon,
	onEdit,
	showEdit = false,
	showDelete = false,
	onDelete,
}: {
	name: string;
	description?: string;
	price?: string;
	icon?: React.ReactNode;
	onEdit?: () => void;
	showEdit?: boolean;
	showDelete?: boolean;
	onDelete?: () => void;
}) => {
	const { t } = useTranslation();
	const [user] = useAtom(userAtom);

	return (
		<div
			className={cn(
				"group flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card px-4 py-3.5 transition-colors hover:border-border hover:bg-muted/20",
				(showEdit || showDelete) && "pr-2"
			)}
		>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				{icon && (
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
						{icon}
					</span>
				)}
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium text-foreground truncate">{name}</p>
					{(description || price) && (
						<div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0 text-xs text-muted-foreground">
							{description && (
								<span className="truncate">{description}</span>
							)}
							{price != null && price !== "" && (
								<span className="font-medium tabular-nums">
									{user?.currency?.symbol}
									{price}
								</span>
							)}
						</div>
					)}
				</div>
			</div>
			{(showEdit || showDelete) && (
				<div className="flex shrink-0 items-center gap-1">
					{showEdit && (
						<button
							type="button"
							onClick={onEdit}
							className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							title={t("admin.menus.classifications.listItem.edit")}
						>
							<Pencil className="h-4 w-4" />
						</button>
					)}
					{showDelete && (
						<button
							type="button"
							onClick={onDelete}
							className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							title={t("admin.menus.classifications.listItem.delete")}
						>
							<Trash2 className="h-4 w-4" />
						</button>
					)}
				</div>
			)}
		</div>
	);
};
