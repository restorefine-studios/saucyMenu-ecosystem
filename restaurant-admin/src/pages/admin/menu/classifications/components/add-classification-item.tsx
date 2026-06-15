import apiRoutes from "@/apiRoutes";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { InputComponent, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const formState = z.object({
  name: z.string().min(1, { message: "Please enter a valid name" }),
  type: z.string().min(1, { message: "Please enter a valid type" }),
  description: z.string(),
});

const AddClassificationItem = ({ open, setOpen }: Props) => {
  const form = useForm({
    defaultValues: {
      name: "",
      type: "",
      description: "",
    },
    validators: {
      onSubmit: formState,
    },
    onSubmit: async ({ value }) => {
      mutate(value);
    },
  });

  const queryClient = useQueryClient();

  const add = async (value: { name: string; type: string }) => {
    const res = await axiosInstance.post(apiRoutes.dishTags, {
      ...value,
    });
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: add,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data?.message);
        form.reset();
        queryClient.invalidateQueries({
          queryKey: ["get_dish_tags"],
        });
        setOpen(false);
      } else {
        toast.error(data?.message);
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(err.response?.data.message);
    },
  });

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      title={`Add Tag`}
      footer={
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit]) => (
            <Button
              loading={isPending}
              disabled={!canSubmit || isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              Add
            </Button>
          )}
        ></form.Subscribe>
      }
    >
      <div className=" mt-5 px-4 grid gap-3">
        <form.Field
          name="name"
          validators={{
            onSubmit: formState.shape.name,
          }}
          children={(field) => (
            <InputComponent
              label="Name"
              value={field.state.value}
              onChange={(e) => {
                const value = e.target.value;
                field.handleChange(value);
              }}
              placeholder="Enter Name"
            />
          )}
        />
        <div>
          <form.Field
            name="description"
            validators={{
              onSubmit: formState.shape.description,
            }}
            children={(field) => (
              <InputComponent
                label="Description"
                value={field.state.value}
                onChange={(e) => {
                  const value = e.target.value;
                  field.handleChange(value);
                }}
                placeholder="Enter Description"
              />
            )}
          />
        </div>
        <div>
          <form.Field
            name="type"
            validators={{
              onSubmit: formState.shape.type,
            }}
            children={(field) => (
              <div className="w-full">
                <Label>Select Type</Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger className="w-full py-7 bg-[#f8f8f8] indent-1.5">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "cuisine", label: "Cuisine" },
                      { value: "diet", label: "Diet" },
                      { value: "dish_type", label: "Dish Type" },
                      { value: "drink_type", label: "Drink Type" },
                      { value: "allergen", label: "Allergen" },
                    ].map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </div>
      </div>
    </Modal>
  );
};

export default AddClassificationItem;
