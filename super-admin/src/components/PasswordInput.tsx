import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps {
  id?: string;
  name: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
}

export const PasswordInput = ({
  id = "password",
  name,
  label = "Password",
  placeholder = "Enter your password",
  value,
  onChange,
  onBlur,
  error,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2 mb-5">
      {label && (
        <label className="text-sm text-gray-600" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          id={id}
          name={name}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className="pl-4 pr-10 py-8 bg-gray-100 border-none rounded-xl"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:cursor-pointer flex items-center"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};
