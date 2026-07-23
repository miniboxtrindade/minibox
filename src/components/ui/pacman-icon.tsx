import { cn } from "../../lib/cn";

interface PacmanIconProps {
  size?: number;
  className?: string;
}

// Recorte exato do Pac-Man em /public/logo-minibox.jpeg (fundo removido).
export function PacmanIcon({ size = 24, className }: PacmanIconProps) {
  return (
    <img
      src="/pacman.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("select-none object-contain", className)}
    />
  );
}

export function PacmanSpinner({ className }: { className?: string }) {
  return <span className={cn("pacman-spinner text-ejc-yellow", className)} aria-hidden />;
}
