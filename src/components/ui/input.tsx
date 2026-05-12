import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    id,
    className,
    containerClassName,
    leftIcon,
    rightSlot,
    type = "text",
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const hasError = Boolean(error);

  return (
    <div className={cn("w-full flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-ejc-text"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "relative flex items-center bg-white border rounded-lg transition-[border-color,box-shadow] duration-150",
          "focus-within:ring-2 focus-within:ring-offset-0",
          hasError
            ? "border-ejc-red/60 focus-within:border-ejc-red focus-within:ring-ejc-red/15"
            : "border-ejc-border focus-within:border-ejc-primary focus-within:ring-ejc-primary/15",
        )}
      >
        {leftIcon && (
          <span className="pl-3 text-ejc-muted flex items-center" aria-hidden>
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={hasError || undefined}
          aria-describedby={
            hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            "flex-1 bg-transparent outline-none text-[15px] text-ejc-text placeholder:text-ejc-muted",
            "px-3 py-3 min-h-11 disabled:opacity-60 disabled:cursor-not-allowed",
            leftIcon && "pl-2",
            rightSlot && "pr-2",
            className,
          )}
          {...rest}
        />

        {rightSlot && <span className="pr-2 flex items-center">{rightSlot}</span>}
      </div>

      {hasError ? (
        <p
          id={`${inputId}-error`}
          className="text-[12.5px] text-ejc-red flex items-center gap-1"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[12.5px] text-ejc-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
