import { Link } from "react-router-dom";
import { MenuData } from "../types";
import { useTranslation } from "react-i18next";
import { renderMediaUrl } from "@/lib/utils";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteMenu } from "../hooks/use-menu";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useAtom } from "jotai";
import { userAtom } from "@/atoms/user";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEditMenu } from "../hooks/use-menu";

const MenuCard = ({ menu }: { menu: MenuData }) => {
	const { t } = useTranslation();
	const [user] = useAtom(userAtom);
	const [isHovered, setIsHovered] = useState(false);
	const [editOpen, setEditOpen] = useState(false);

	const [editName, setEditName] = useState(menu.name);
	const [editDescription, setEditDescription] = useState(menu.description);

	const deleteMutation = useDeleteMenu();
	const editMutation = useEditMenu();

	const handleDelete = () => {
		// console.log("Attempting to delete menu:", menu.id);
		// console.log("User authentication status:", user ? "Logged in" : "Not logged in");
		// console.log("User token available:", user?.token ? "Yes" : "No");

		if (!user?.token) {
			toast.error(t("admin.menus.components.menuCard.toast.authRequired"));
			return;
		}

		deleteMutation.mutate(menu.id, {
			onSuccess: (data) => {
				console.log("Delete menu success response:", data);
				if (data?.success) {
					toast.success(data?.message || t("admin.menus.components.menuCard.toast.deleteSuccess"));
				} else {
					toast.error(data?.message || t("admin.menus.components.menuCard.toast.deleteError"));
				}
			},
			onError: (error) => {
				console.error("Delete menu error:", error);
				if (error && "response" in error) {
					const axiosError = error as AxiosError;
					console.error("Error response:", axiosError.response?.data);
					console.error("Error status:", axiosError.response?.status);
				}
				toast.error(t("admin.menus.components.menuCard.toast.deleteError"));
			},
		});
	};

	const handleEdit = () => {
		editMutation.mutate(
			{ id: menu.id, data: { name: editName, description: editDescription } },
			{
				onSuccess: (data) => {
					if (data?.success) {
						toast.success(data?.message || t("admin.menus.components.menuCard.toast.updateSuccess"));
						setEditOpen(false);
					} else {
						toast.error(data?.message || t("admin.menus.components.menuCard.toast.updateError"));
					}
				},
				onError: () => {
					toast.error(t("admin.menus.components.menuCard.toast.updateError"));
				},
			},
		);
	};

	return (
		<div
			className="bg-gray-100 relative rounded-3xl h-72 group"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}>
			<Link
				to={`/admin/menus/sections/${menu.id}`}
				state={{ menu }}
				className="absolute inset-0 z-10">
				<div className="absolute inset-0 z-0">
					<img
						src={renderMediaUrl(menu?.image)}
						alt="menu"
						className="w-full h-full object-cover rounded-xl"
					/>
				</div>
				<div className="relative z-20 h-full flex flex-end items-end">
					<div className="bg-[#171717] w-full rounded-b-xl h-auto p-4">
						<div className="flex items-start justify-between gap-3 pt-0">
							<div>
								<h3 className="text-sm font-medium text-white">{menu.name}</h3>
								<p className="w-full max-w-[160px] mt-0 text-xs truncate line-clamp-1 text-ellipsis text-[#A1A1A1]">
									{menu.description}
								</p>
							</div>

							<div
								className={` ${
									menu.active ? "bg-[#3a3a3a] text-white" : ""
								}  font-medium rounded-full w-fit px-3 py-1 text-xs`}>
								{menu.active
									? t("admin.menus.components.menuCard.active")
									: t("admin.menus.components.menuCard.inactive")}
							</div>
						</div>

						<Link
							to={`/admin/menus/sections/${menu.id}`}
							state={{ menu }}
							className="">
							<button className="cursor-pointer mt-5 p-0 w-full h-8 rounded-lg bg-white text-black text-xs">
								{t("admin.menus.components.menuCard.viewMenuSections")}
							</button>
						</Link>
					</div>
				</div>

				<p className="text-sm text-gray-500">{menu.startTime}</p>
				<p className="text-sm text-gray-500">{menu.endTime}</p>
			</Link>

			{/* Edit and Delete Icons */}
			<div
				className={`absolute top-2 right-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isHovered ? "opacity-100" : ""}`}>
				<button
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setEditOpen(true);
					}}
					className="bg-white/80 hover:bg-white rounded-full p-2 shadow-md">
					<Edit
						size={16}
						className="text-gray-700"
					/>
				</button>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<button className="bg-white/80 hover:bg-white rounded-full p-2 shadow-md">
							<Trash2
								size={16}
								className="text-red-600"
							/>
						</button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("admin.menus.components.menuCard.delete.title")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("admin.menus.components.menuCard.delete.description", { name: menu.name })}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("admin.menus.components.menuCard.delete.cancel")}</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								className="bg-red-600 hover:bg-red-700">
								{t("admin.menus.components.menuCard.delete.confirm")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			{/* Edit Dialog */}
			<Dialog
				open={editOpen}
				onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>{t("admin.menus.components.menuCard.edit.title")}</DialogTitle>
						<DialogDescription>
							{t("admin.menus.components.menuCard.edit.description")}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label
								htmlFor="edit-name"
								className="text-right">
								{t("admin.menus.components.menuCard.edit.form.name")}
							</Label>
							<Input
								id="edit-name"
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								className="col-span-3"
							/>
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label
								htmlFor="edit-description"
								className="text-right">
								{t("admin.menus.components.menuCard.edit.form.description")}
							</Label>
							<Textarea
								id="edit-description"
								value={editDescription}
								onChange={(e) => setEditDescription(e.target.value)}
								className="col-span-3"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="submit"
							onClick={handleEdit}
							disabled={editMutation.isPending}>
							{editMutation.isPending ? t("admin.menus.components.menuCard.edit.saving") : t("admin.menus.components.menuCard.edit.save")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default MenuCard;
