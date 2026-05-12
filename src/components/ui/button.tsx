import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ejc-primary text-white shadow-sm hover:bg-ejc-primary-hover active:scale-[0.98]",
  secondary:
    "bg-ejc-bg text-ejc-primary border border-ejc-border hover:bg-white hover:border-ejc-primary/30",
  ghost:
    "bg-transparent text-ejc-primary hover:bg-ejc-primary/10",
  outline:
    "bg-transparent text-ejc-primary border border-ejc-primary/40 hover:bg-ejc-primary hover:text-white",
  danger:
    "bg-ejc-red text-white shadow-sm hover:brightness-110 active:scale-[0.98]",
  success:
    "bg-ejc-green text-white shadow-sm hover:brightness-110 active:scale-[0.98]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-md gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-lg gap-2",
  lg: "h-12 px-5 text-base rounded-lg gap-2",
  icon: "h-10 w-10 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    disabled,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold whitespace-nowrap select-none",
        "transition-[background-color,color,transform,box-shadow,filter] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ejc-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ejc-bg",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
