/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosInstance } from "@/lib/utils";
import { ItemRow } from "./list-item";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiRoutes from "@/apiRoutes";
import { Modal } from "@/components/modal";
import { InputComponent } from "@/components/ui/input";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

const AddOns = () => {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [searchQuery] = useQueryState("search");
	const [openDelete, setOpenDelete] = useState(false);
	const [selectedAddOn, setSelectedAddOn] = useState<any>(null);
	const queryClient = useQueryClient();
	const form = useForm({
		defaultValues: {
			name: "",
			price: "",
		},
		onSubmit: async ({ value }) => {
			updateAddOn(value);
		},
	});

	const getAddOns = async () => {
		const res = await axiosInstance.get(apiRoutes.addOns());
		return res.data;
	};
	const { data: addonsData } = useQuery({
		queryKey: ["get_add_ons"],
		queryFn: getAddOns,
	});

	const { mutate: updateAddOn } = useMutation({
		mutationFn: async (data: any) => {
			const res = await axiosInstance.put(
				apiRoutes.addOns(selectedAddOn?.id),
				data,
			);
			return res.data;
		},
		onSuccess: (data) => {
			if (data.success) {
				toast.success(data?.message);
				setOpen(false);
				queryClient.invalidateQueries({
					queryKey: ["get_add_ons"],
				});
			} else {
				toast.error(data?.message);
			}
		},
		onError: (error: AxiosError<{ message: string }>) => {
			toast.error(error.response?.data.message);
		},
	});
	const { mutate: deleteAddOn } = useMutation({
		mutationFn: async (id: string) => {
			const res = await axiosInstance.delete(apiRoutes.addOns(id));
			return res.data;
		},
		onSuccess: (data) => {
			if (data.success) {
				toast.success(data?.message);
				setOpenDelete(false);
				queryClient.invalidateQueries({
					queryKey: ["get_add_ons"],
				});
			}
		},
		onError: (error: AxiosError<{ message: string }>) => {
			toast.error(error.response?.data.message);
		},
	});
	const items = addonsData?.data
		?.filter((item: any) =>
			item.name.toLowerCase().includes(searchQuery?.toLowerCase() ?? ""),
		) ?? [];

	return (
		<div className="space-y-3">
			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground py-8 text-center rounded-xl bg-muted/30">
					{searchQuery ? "No addons match your search." : "No addons yet. Create one to get started."}
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
						showDelete
						showEdit
						onDelete={() => {
							setSelectedAddOn(item);
							setOpenDelete(true);
						}}
						onEdit={() => {
							setSelectedAddOn(item);
							form.setFieldValue("name", item.name);
							form.setFieldValue("price", item.price);
							setOpen(true);
						}}
					/>
				))}
				</div>
			)}
			<Modal
				open={open}
				setOpen={setOpen}
				title={t("admin.menus.classifications.addons.edit.title")}
				description={t("admin.menus.classifications.addons.edit.description")}
				footer={
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
						children={([canSubmit]) => (
							<>
								<Button
									loading={form.state.isSubmitting}
									disabled={!canSubmit || form.state.isSubmitting}
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}>
									{t("admin.menus.classifications.addons.edit.button")}
								</Button>
							</>
						)}
					/>
				}>
				<form className="grid  gap-4">
					<form.Field
						name="name"
						children={(field) => (
							<InputComponent
								label={t(
									"admin.menus.classifications.addons.edit.form.name.label",
								)}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					/>
					<form.Field
						name="price"
						children={(field) => (
							<InputComponent
								label={t(
									"admin.menus.classifications.addons.edit.form.price.label",
								)}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						)}
					/>
				</form>
			</Modal>

			<AlertDialog
				open={openDelete}
				onOpenChange={setOpenDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("admin.menus.classifications.addons.delete.title")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("admin.menus.classifications.addons.delete.description")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t("admin.menus.classifications.addons.delete.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction onClick={() => deleteAddOn(selectedAddOn.id)}>
							{t("admin.menus.classifications.addons.delete.continue")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default AddOns;
