import { cn } from "../../lib/cn";

const LETTER_COLORS = [
  "var(--color-ejc-yellow)",
  "var(--color-ejc-orange)",
  "var(--color-ejc-purple)",
  "var(--color-ejc-blue)",
  "var(--color-ejc-green)",
  "var(--color-ejc-red)",
];

const OUTLINE_SHADOW =
  "-1px -1px 0 #0A0A0A, 1px -1px 0 #0A0A0A, -1px 1px 0 #0A0A0A, 1px 1px 0 #0A0A0A";

interface PageHeadingProps {
  kicker?: string;
  title: string;
  className?: string;
}

export function PageHeading({ kicker, title, className }: PageHeadingProps) {
  let letterIndex = 0;
  return (
    <div className={cn("flex flex-col", className)}>
      {kicker && (
        <p className="font-pixel-mono text-sm font-semibold uppercase tracking-[0.2em] text-ejc-blue">
          {kicker}
        </p>
      )}
      <h1 className="font-pixel text-lg sm:text-xl mt-2 leading-[1.4] tracking-tight">
        {title.split("").map((ch, i) => {
          if (ch === " ") return <span key={i}> </span>;
          const color = LETTER_COLORS[letterIndex % LETTER_COLORS.length];
          letterIndex += 1;
          return (
            <span
              key={i}
              style={{ color, WebkitTextStroke: "1px #0A0A0A", textShadow: OUTLINE_SHADOW }}
            >
              {ch}
            </span>
          );
        })}
      </h1>
    </div>
  );
}
