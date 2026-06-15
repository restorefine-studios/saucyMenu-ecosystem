import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  errors?: string
}
const InputComponent = React.forwardRef<HTMLInputElement, Props>(
  ({ label, errors, className, ...props }, ref) => {
    return (
      <div className="grid w-full gap-1">
        <label className={'text-sm font-semibold text-gray-600'}>{label}</label>
        <Input
          ref={ref}
          {...props}
          className={cn('py-6 bg-[#EDEDED]', className)}
        />
        {errors && (
          <span className="text-red-500 text-xs font-medium">{errors}</span>
        )}
      </div>
    )
  },
)

InputComponent.displayName = 'InputComponent'

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  errors?: string
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="grid w-full gap-1">
        <label className={'text-sm font-semibold text-gray-600'}>{label}</label>
        <textarea
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  },
)

TextArea.displayName = 'TextArea'

export function ErrorComponent({ errors }: { errors: string }) {
  return <div className="text-red-500 text-xs font-medium">{errors}</div>
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className={'text-sm font-semibold text-gray-600'}>{children}</label>
  )
}

export { Input, InputComponent, TextArea }
