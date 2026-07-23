import { cn } from "../../lib/cn";

interface GameboxWordmarkProps {
  /** Inclui a fileira de fantasmas + Pac-Man acima do wordmark, como na arte original. */
  withMascots?: boolean;
  className?: string;
}

// Recortes exatos de /public/logo-minibox.jpeg (fundo removido), não uma
// recriação em fonte — a identidade visual precisa ficar pixel-a-pixel
// igual à arte fornecida.
export function GameboxWordmark({ withMascots = false, className }: GameboxWordmarkProps) {
  return (
    <img
      src={withMascots ? "/gamebox-lockup.png" : "/gamebox-wordmark.png"}
      alt="Gamebox"
      draggable={false}
      className={cn("w-auto select-none", className)}
    />
  );
}
