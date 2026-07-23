import { cn } from "../../lib/cn";

interface PacmanIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export function PacmanIcon({ size = 24, className, color = "#FFD400" }: PacmanIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <path d="M16 16 L28.99 8.5 A15 15 0 1 0 28.99 23.5 Z" fill={color} />
      <circle cx="19" cy="9.5" r="1.9" fill="#1B1B2A" />
    </svg>
  );
}

export function PacmanSpinner({ className }: { className?: string }) {
  return <span className={cn("pacman-spinner text-ejc-yellow", className)} aria-hidden />;
}
