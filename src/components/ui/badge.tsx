import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  neutral: "bg-ejc-bg text-ejc-text border-ejc-border",
  info: "bg-ejc-blue/10 text-ejc-blue border-ejc-blue/20",
  success: "bg-ejc-green/12 text-ejc-green border-ejc-green/25",
  warning: "bg-ejc-yellow/20 text-[#7A5B00] border-ejc-yellow/40",
  danger: "bg-ejc-red/10 text-ejc-red border-ejc-red/25",
  primary: "bg-ejc-primary/10 text-ejc-primary border-ejc-primary/20",
};

const DOT_COLOR: Record<Variant, string> = {
  neutral: "bg-ejc-muted",
  info: "bg-ejc-blue",
  success: "bg-ejc-green",
  warning: "bg-ejc-yellow",
  danger: "bg-ejc-red",
  primary: "bg-ejc-primary",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = "neutral", dot, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-[1.5px] border-black/80 text-[12px] font-medium leading-none whitespace-nowrap",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", DOT_COLOR[variant])}
        />
      )}
      {children}
    </span>
  );
});
