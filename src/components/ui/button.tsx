import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { PacmanSpinner } from "./pacman-icon";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

// Bordas duras + sombra offset em preto: tratamento "botão de fliperama" (tema
// GAMEBOX). Ghost/outline ficam de fora de propósito — servem para ações
// terciárias que não devem competir visualmente com os botões "sólidos".
const PIXEL = "border-2 border-black shadow-[3px_3px_0_0_#0A0A0A] active:shadow-[1px_1px_0_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px]";

const VARIANTS: Record<Variant, string> = {
  primary:
    cn("bg-ejc-primary text-white hover:bg-ejc-primary-hover", PIXEL),
  secondary:
    "bg-ejc-bg text-ejc-primary border border-ejc-border hover:bg-white hover:border-ejc-primary/30",
  ghost:
    "bg-transparent text-ejc-primary hover:bg-ejc-primary/10",
  outline:
    "bg-transparent text-ejc-primary border border-ejc-primary/40 hover:bg-ejc-primary hover:text-white",
  danger:
    cn("bg-ejc-red text-white hover:brightness-110", PIXEL),
  success:
    cn("bg-ejc-green text-white hover:brightness-110", PIXEL),
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
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <PacmanSpinner className="text-[1.1em]" />}
      {children}
    </button>
  );
});
