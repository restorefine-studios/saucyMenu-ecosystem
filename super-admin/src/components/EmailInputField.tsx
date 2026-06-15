import { Mail } from "lucide-react";
import { Input } from "./ui/input";

// ################reusable input component for emali input################

export const EmailInputField = ({
  field,
  label,
  placeholder,
}: {
  field: any;
  label: string;
  placeholder: string;
}) => (
  <div className="space-y-2">
    <label htmlFor="email" className="block font-inter text-[16px] font-medium">
      {label}
    </label>
    <div className="relative mb-5">
      <Input
        id="email"
        type="email"
        name="email"
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
      />
      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
    </div>
  </div>
);
