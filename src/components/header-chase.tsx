import { useEffect, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PacmanIcon } from "./ui/pacman-icon";
import { GhostIcon, GHOST_COLORS } from "./ui/ghost-icon";

const CHASE_GHOSTS = [GHOST_COLORS[2], GHOST_COLORS[0], GHOST_COLORS[1]];

interface Path {
  start: number;
  end: number;
}

// Mede, em coordenadas locais ao `container`, a posição horizontal de `from`
// e `to`. Reage a resize do container (menu admin muda a largura da nav,
// breakpoints mudam o layout).
function useTravelPath(
  containerRef: RefObject<HTMLElement | null>,
  fromRef: RefObject<HTMLElement | null>,
  toRef: RefObject<HTMLElement | null>,
): Path | null {
  const [path, setPath] = useState<Path | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!container || !from || !to) return;

    const measure = () => {
      const containerBox = container.getBoundingClientRect();
      const fromBox = from.getBoundingClientRect();
      const toBox = to.getBoundingClientRect();
      setPath({
        start: fromBox.left + fromBox.width / 2 - containerBox.left,
        end: toBox.left + toBox.width / 2 - containerBox.left,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, fromRef, toRef]);

  return path;
}

interface ChaseProps {
  path: Path;
  duration: number;
  pauseAfter: number;
  ghostColors: string[];
  dotCount: number;
}

function Chase({ path, duration, pauseAfter, ghostColors, dotCount }: ChaseProps) {
  const distance = path.end - path.start;
  const totalCycle = duration + pauseAfter;

  const dots = Array.from({ length: dotCount }, (_, i) => {
    const frac = (i + 1) / (dotCount + 1);
    return { x: path.start + distance * frac, eatenAt: (duration * frac) / totalCycle };
  });

  return (
    <div className="relative w-full h-full">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 h-1.5 w-1.5 rounded-full bg-ejc-yellow"
          style={{ left: d.x, marginTop: -3 }}
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{
            duration: totalCycle,
            times: [0, Math.max(d.eatenAt - 0.015, 0), d.eatenAt, 1],
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {ghostColors.map((color, i) => {
        const offset = (i + 1) * 20;
        return (
          <motion.div
            key={color}
            className="absolute top-1/2 -translate-y-1/2"
            animate={{
              x: [path.start - offset, path.end - offset],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration,
              delay: 0.12 * (i + 1),
              times: [0, 0.85, 1],
              repeat: Infinity,
              repeatDelay: pauseAfter,
              ease: "easeInOut",
            }}
          >
            <GhostIcon size={18} color={color} />
          </motion.div>
        );
      })}

      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        animate={{ x: [path.start, path.end], opacity: [1, 1, 0] }}
        transition={{
          duration,
          times: [0, 0.9, 1],
          repeat: Infinity,
          repeatDelay: pauseAfter,
          ease: "linear",
        }}
      >
        <PacmanIcon size={24} />
      </motion.div>
    </div>
  );
}

interface HeaderChaseProps {
  containerRef: RefObject<HTMLElement | null>;
  logoRef: RefObject<HTMLElement | null>;
  homeRef: RefObject<HTMLElement | null>;
  menuButtonRef: RefObject<HTMLElement | null>;
}

// Easter egg: o Pac-Man foge dos fantasmas atravessando o header e se
// escondendo atrás da logo. Em telas grandes ele sai de trás do botão
// "Home" da navegação, perseguido pelos fantasmas; no mobile atravessa o
// header inteiro comendo as bolinhas clássicas (sem fantasmas, não há
// referência de onde eles viriam).
export function HeaderChase({ containerRef, logoRef, homeRef, menuButtonRef }: HeaderChaseProps) {
  const reduceMotion = useReducedMotion();
  const desktopPath = useTravelPath(containerRef, homeRef, logoRef);
  const mobilePath = useTravelPath(containerRef, menuButtonRef, logoRef);

  if (reduceMotion) return null;

  return (
    <>
      {desktopPath && (
        <div
          className="hidden lg:block absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <Chase path={desktopPath} duration={2.2} pauseAfter={8.5} ghostColors={CHASE_GHOSTS} dotCount={0} />
        </div>
      )}
      {mobilePath && (
        <div
          className="lg:hidden absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <Chase path={mobilePath} duration={2.8} pauseAfter={9} ghostColors={[]} dotCount={9} />
        </div>
      )}
    </>
  );
}
