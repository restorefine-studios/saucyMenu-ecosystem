import * as React from "react";
import type { AnyFieldApi } from "@tanstack/react-form";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground    disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errors?: string;
}
const InputComponent = React.forwardRef<HTMLInputElement, Props>(
  ({ label, errors, className, ...props }, ref) => {
    return (
      <div className="grid w-full gap-1">
        <label className={"text-sm font-semibold text-gray-600 capitalize"}>
          {label}
        </label>
        <Input
          ref={ref}
          {...props}
          className={cn(" py-6 bg-[#EDEDED]", className)}
        />
        {errors && (
          <span className="text-red-500 text-xs font-medium">{errors}</span>
        )}
      </div>
    );
  }
);

InputComponent.displayName = "InputComponent";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  errors?: string;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="grid w-full gap-1">
        <label className={"text-sm font-semibold text-gray-600"}>{label}</label>
        <textarea
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export function ErrorComponent({ errors }: { errors: string }) {
  return <div className="text-red-500 text-xs font-medium">{errors}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className={"text-sm font-semibold text-gray-600"}>{children}</label>
  );
}

export function FieldInfo({ field }: { field: AnyFieldApi }) {
  const { isTouched, isValidating, errors } = field.state.meta;

  const errorMessages = errors.map((err) => {
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
    return JSON.stringify(err);
  });

  return (
    <div className="text-sm text-red-500 mt-1">
      {isTouched && errorMessages.length > 0 && (
        <em>{errorMessages.join(", ")}</em>
      )}
      {isValidating && (
        <span className="text-gray-500 ml-2">Validating...</span>
      )}
    </div>
  );
}
export { Input, InputComponent, TextArea };
