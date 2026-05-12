import { type HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-ejc-border/45",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/55 before:to-transparent",
        className,
      )}
      {...rest}
    />
  );
}
