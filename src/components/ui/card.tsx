import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-ejc-surface rounded-xl border-2 border-black shadow-[3px_3px_0_0_#0A0A0A]",
          "transition-shadow duration-200",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn("px-5 pt-5 pb-3 flex flex-col gap-1", className)}
        {...rest}
      />
    );
  },
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...rest }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-[17px] font-semibold text-ejc-primary leading-tight tracking-tight",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...rest }, ref) {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-ejc-muted leading-relaxed", className)}
      {...rest}
    />
  );
});

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, ...rest }, ref) {
    return <div ref={ref} className={cn("px-5 py-4", className)} {...rest} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "px-5 py-4 border-t border-ejc-border/60 flex items-center gap-3",
          className,
        )}
        {...rest}
      />
    );
  },
);
