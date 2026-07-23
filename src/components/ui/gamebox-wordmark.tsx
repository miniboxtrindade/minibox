import { cn } from "../../lib/cn";
import { GhostIcon, GHOST_COLORS } from "./ghost-icon";
import { PacmanIcon } from "./pacman-icon";

const ROW_1: { ch: string; color: string }[] = [
  { ch: "G", color: "#FFD400" },
  { ch: "A", color: "#FF8C1A" },
  { ch: "M", color: "#8B2FC9" },
  { ch: "E", color: "#E30613" },
];

const ROW_2: { ch: string; color: string }[] = [
  { ch: "B", color: "#009FE3" },
  { ch: "O", color: "#E30613" },
  { ch: "X", color: "#00A859" },
];

const OUTLINE_SHADOW =
  "-1px -1px 0 #0A0A0A, 1px -1px 0 #0A0A0A, -1px 1px 0 #0A0A0A, 1px 1px 0 #0A0A0A, 2px 2px 0 #0A0A0A";

const SIZES = {
  xs: { text: "text-[11px]", stroke: "0.6px", gap: "mt-[1px]" },
  sm: { text: "text-2xl", stroke: "1px", gap: "mt-1" },
  md: { text: "text-4xl", stroke: "1.5px", gap: "mt-1" },
  lg: { text: "text-6xl", stroke: "2.5px", gap: "mt-1" },
} as const;

interface GameboxWordmarkProps {
  size?: keyof typeof SIZES;
  withMascots?: boolean;
  className?: string;
}

function Letter({ ch, color, stroke }: { ch: string; color: string; stroke: string }) {
  return (
    <span
      style={{
        color,
        WebkitTextStroke: `${stroke} #0A0A0A`,
        textShadow: OUTLINE_SHADOW,
      }}
    >
      {ch}
    </span>
  );
}

export function GameboxWordmark({ size = "md", withMascots = false, className }: GameboxWordmarkProps) {
  const { text, stroke, gap } = SIZES[size];
  const mascotSize = size === "lg" ? 28 : size === "md" ? 22 : size === "sm" ? 16 : 10;

  return (
    <div className={cn("select-none", className)}>
      {withMascots && (
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {GHOST_COLORS.slice(0, 3).map((c, i) => (
            <GhostIcon key={`l-${i}`} color={c} size={mascotSize} />
          ))}
          <PacmanIcon size={mascotSize * 1.3} />
          {GHOST_COLORS.slice(3).map((c, i) => (
            <GhostIcon key={`r-${i}`} color={c} size={mascotSize} />
          ))}
        </div>
      )}
      <div className={cn("font-pixel leading-[1.15]", text)}>
        <div className="flex justify-center gap-[2px]">
          {ROW_1.map((l, i) => (
            <Letter key={i} {...l} stroke={stroke} />
          ))}
        </div>
        <div className={cn("flex justify-center gap-[2px]", gap)}>
          {ROW_2.map((l, i) => (
            <Letter key={i} {...l} stroke={stroke} />
          ))}
        </div>
      </div>
    </div>
  );
}
