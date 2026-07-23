interface GhostIconProps {
  size?: number;
  className?: string;
  color?: string;
}

export function GhostIcon({ size = 24, className, color = "#00CFFF" }: GhostIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <path
        d="M4 30 V16 C4 8.8 9.4 3 16 3 C22.6 3 28 8.8 28 16 V30 L24.5 26.5 L21 30 L17.5 26.5 L14 30 L10.5 26.5 L7 30 Z"
        fill={color}
      />
      <circle cx="12" cy="15" r="3.2" fill="#fff" />
      <circle cx="21" cy="15" r="3.2" fill="#fff" />
      <circle cx="13" cy="15.6" r="1.5" fill="#1B1B2A" />
      <circle cx="22" cy="15.6" r="1.5" fill="#1B1B2A" />
    </svg>
  );
}

export const GHOST_COLORS = ["#00CFFF", "#FF8C1A", "#E4231D", "#8B2FC9", "#5FD068", "#FF9FD6"];
