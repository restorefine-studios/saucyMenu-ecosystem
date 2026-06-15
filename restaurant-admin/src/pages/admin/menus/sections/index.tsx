import { useLocation, useParams } from "react-router-dom";
import ScreenWrapper from "../../components/screenWrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { Search, Edit, Trash2 } from "lucide-react";
import { useMenuSections, useEditMenu, useDeleteMenu } from "../hooks/use-menu";
import { DataList } from "@/components/dataList";
import SectionItemCard from "./components/section-item-card";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/utils";
import apiRoutes from "@/apiRoutes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import Back from "@/components/back";

const MenuSections = () => {
	const { t } = useTranslation();
	const { menuId } = useParams();
	const { state } = useLocation();
	const menu = state?.menu;

	const { data, isLoading } = useMenuSections(menuId as string);
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [editOpen, setEditOpen] = useState(false);
	const [editName, setEditName] = useState(menu?.name || "");
	const [editDescription, setEditDescription] = useState(
		menu?.description || "",
	);
	const queryClient = useQueryClient();

	const editMutation = useEditMenu();
	const deleteMutation = useDeleteMenu();

	const handleEditMenu = () => {
		editMutation.mutate(
			{
				id: menuId as string,
				data: { name: editName, description: editDescription },
			},
			{
				onSuccess: (data) => {
					if (data?.success) {
						toast.success(data?.message || t("admin.menus.sections.menu.edit.toast.success"));
						setEditOpen(false);
					} else {
						toast.error(data?.message || t("admin.menus.sections.menu.edit.toast.error"));
					}
				},
				onError: () => {
					toast.error(t("admin.menus.sections.menu.edit.toast.error"));
				},
			},
		);
	};

	const handleDeleteMenu = () => {
		deleteMutation.mutate(menuId as string, {
			onSuccess: (data) => {
				if (data?.success) {
					toast.success(data?.message || t("admin.menus.sections.menu.delete.toast.success"));
					// Redirect back to menus page
					window.location.href = "/admin/menus";
				} else {
					toast.error(data?.message || t("admin.menus.sections.menu.delete.toast.error"));
				}
			},
			onError: () => {
				toast.error(t("admin.menus.sections.menu.delete.toast.error"));
			},
		});
	};

	const { mutate, isPending } = useMutation({
		mutationFn: async (data: { name: string; description: string }) => {
			const res = await axiosInstance.post(
				apiRoutes.menuSections(menuId as string),
				data,
			);
			return res.data;
		},
		onSuccess: (data) => {
			if (data?.success) {
				toast.success(
					data?.message || t("admin.menus.sections.create.toast.success"),
				);
				setOpen(false);
				setName("");
				setDescription("");
				queryClient.invalidateQueries({ queryKey: ["menuSections", menuId] });
			} else {
				toast.error(
					data?.message || t("admin.menus.sections.create.toast.error"),
				);
			}
		},
		onError: (error: AxiosError<{ message: string }>) => {
			toast.error(
				error.response?.data.message ||
					t("admin.menus.sections.create.toast.error"),
			);
		},
	});

	return (
		<ScreenWrapper
			title={t("admin.menus.sections.header.title")}
			className="grid gap-5"
			loading={isLoading}>
			<section className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Back title={menu?.name} />
				</div>
				<div className="flex items-center gap-2.5">
					<div className="pl-4 pr-10 border border-gray-300 rounded-lg flex items-center">
						<Search
							size={18}
							className="items-center border-none "
						/>
						<Input
							className="border-none focus:outline-none focus:ring-0"
							type="text"
							placeholder={t("admin.menus.sections.search.placeholder")}
						/>
					</div>

					<div className="flex gap-2">
						<button
							onClick={() => setEditOpen(true)}
							className="bg-[#A1A1A1] px-3 h-11 hover:bg-white rounded-lg p-2 text-sm flex items-center justify-center gap-2 text-white">
							<Edit
								size={16}
								className="text-white"
							/>
							<span className="hidden md:block">{t("admin.menus.sections.menu.edit.button")}</span>
						</button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<button className="bg-red-400 px-3 h-11 hover:bg-white rounded-lg p-2 text-sm flex items-center justify-center gap-2 text-white">
									<Trash2
										size={16}
										className="text-white"
									/>
									<span className="hidden md:block">{t("admin.menus.sections.menu.delete.button")}</span>
								</button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t("admin.menus.sections.menu.delete.dialog.title")}</AlertDialogTitle>
									<AlertDialogDescription>
										{t("admin.menus.sections.menu.delete.dialog.description", { name: menu?.name })}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{t("admin.menus.sections.menu.delete.dialog.cancel")}</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDeleteMenu}
										className="bg-red-600 hover:bg-red-700">
										{t("admin.menus.sections.menu.delete.dialog.confirm")}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</section>

			<div className="grid gap-5">
				<div className="relative h-56 md:h-72">
					<img
						src="/saucymenu-admin-menu-sections.webp"
						alt="menu"
						className="w-full h-full object-cover rounded-2xl"
					/>
					<div className="absolute left-10 bottom-[31%]">
						<div className="mb-6">
							<h3 className="text-2xl text-white font-normal">
								{menu?.name}{t("admin.menus.sections.menu.suffix")}
							</h3>
							<p className="text-sm text-[#A1A1A1]">{menu?.description}</p>
						</div>

						<Dialog
							open={open}
							onOpenChange={setOpen}>
							<DialogTrigger asChild>
								<Button className="w-fit">
									{t("admin.menus.sections.create.button")}
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[425px]">
								<DialogHeader>
									<DialogTitle>
										{t("admin.menus.sections.create.dialog.title")}
									</DialogTitle>
									<DialogDescription>
										{t("admin.menus.sections.create.dialog.description")}
									</DialogDescription>
								</DialogHeader>
								<div className="grid gap-4 py-4">
									<div className="grid grid-cols-4 items-center gap-4">
										<Label
											htmlFor="name"
											className="text-right">
											{t("admin.menus.sections.create.dialog.form.name.label")}
										</Label>
										<Input
											id="name"
											value={name}
											onChange={(e) => setName(e.target.value)}
											className="col-span-3"
											placeholder={t(
												"admin.menus.sections.create.dialog.form.name.placeholder",
											)}
										/>
									</div>
									<div className="grid grid-cols-4 items-center gap-4">
										<Label
											htmlFor="description"
											className="text-right">
											{t(
												"admin.menus.sections.create.dialog.form.description.label",
											)}
										</Label>
										<Textarea
											id="description"
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											className="col-span-3"
											placeholder={t(
												"admin.menus.sections.create.dialog.form.description.placeholder",
											)}
										/>
									</div>
								</div>
								<DialogFooter>
									<Button
										type="submit"
										onClick={() => mutate({ name, description })}
										disabled={isPending}>
										{isPending
											? t("admin.menus.sections.create.dialog.button.creating")
											: t("admin.menus.sections.create.dialog.button.create")}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<div className="mt-5">
					<DataList
						data={data?.data ?? []}
						className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-10"
						renderItem={(section, index) => (
							<SectionItemCard
								key={section.id}
								index={index}
								section={section}
							/>
						)}
					/>
				</div>
			</div>

			{/* Edit Menu Dialog */}
			<Dialog
				open={editOpen}
				onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>{t("admin.menus.sections.menu.edit.dialog.title")}</DialogTitle>
						<DialogDescription>
							{t("admin.menus.sections.menu.edit.dialog.description")}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label
								htmlFor="edit-name"
								className="text-right">
								{t("admin.menus.sections.menu.edit.dialog.form.name.label")}
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
								{t("admin.menus.sections.menu.edit.dialog.form.description.label")}
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
							onClick={handleEditMenu}
							disabled={editMutation.isPending}>
							{editMutation.isPending ? t("admin.menus.sections.menu.edit.dialog.saving") : t("admin.menus.sections.menu.edit.dialog.save")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ScreenWrapper>
	);
};

export default MenuSections;
