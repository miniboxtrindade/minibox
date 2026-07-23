import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PacmanIcon } from "./ui/pacman-icon";
import { GhostIcon, GHOST_COLORS } from "./ui/ghost-icon";

// Os 6 fantasmas da logo, na mesma ordem em que aparecem nela.
const CHASE_GHOSTS = GHOST_COLORS;
// Espaçamento em pixels (não em segundos) — assim o espaço visual entre eles
// não muda quando a velocidade da travessia é ajustada.
const GHOST_GAP_PX = 30; // distância do Pac-Man até o primeiro fantasma
const GHOST_STEP_PX = 26; // espaço entre um fantasma e o próximo

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

// Uma única linha do tempo (0 a 1, fração de `duration`) compartilhada por
// x/opacity/scale — evita qualquer dessincronia entre propriedades animadas
// separadamente. Começa e termina invisível (fade-in, não "aparece do
// nada"; fade-out, "esconde atrás da logo"). Como opacity/scale começam e
// terminam no mesmo valor (0 e 1 respectivamente), a timeline funciona
// igual quando tocada de trás pra frente (repeatType: mirror).
function buildTimeline(path: Path, dotFractions: number[]) {
  const distance = path.end - path.start;
  const hideAt = 0.9;

  const times: number[] = [0, 0.06];
  const opacity: number[] = [0, 1];
  const scale: number[] = [1, 1];

  for (const frac of dotFractions) {
    if (frac <= 0.08 || frac >= hideAt - 0.05) continue;
    const before = Math.max(frac - 0.006, times[times.length - 1] + 0.004);
    const after = Math.min(frac + 0.006, hideAt - 0.02);
    times.push(before, frac, after);
    opacity.push(1, 1, 1);
    scale.push(1, 1.22, 1);
  }

  times.push(hideAt, 1);
  opacity.push(1, 0);
  scale.push(1, 1);

  const x = times.map((t) => path.start + distance * t);
  return { times, x, opacity, scale };
}

function buildDotTimeline(frac: number) {
  const appearAt = 0.02;
  const eatBefore = Math.max(frac - 0.015, appearAt + 0.01);
  const eatAfter = Math.min(frac + 0.02, 0.999);
  return {
    times: [0, appearAt, eatBefore, frac, eatAfter, 1],
    opacity: [0, 1, 1, 1, 0, 0],
    scale: [0.5, 1, 1, 1.7, 0, 0],
  };
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
  const speed = Math.abs(distance) / duration; // px/s

  // Direção do Pac-Man (a arte original olha pra direita). Detectada em
  // tempo real pelo sentido do movimento, pra ficar certa tanto no trecho
  // "de ida" quanto no espelhado (repeatType: mirror faz o Pac-Man
  // atravessar ora direita->esquerda, ora esquerda->direita).
  const facingRef = useRef<"left" | "right">("left");
  const lastXRef = useRef<number | null>(null);
  const [, bumpFacing] = useState(0);

  const handlePacmanUpdate = (latest: { x?: number }) => {
    const x = latest.x;
    if (typeof x !== "number") return;
    if (lastXRef.current !== null) {
      const dx = x - lastXRef.current;
      if (Math.abs(dx) > 0.02) {
        const next = dx < 0 ? "left" : "right";
        if (next !== facingRef.current) {
          facingRef.current = next;
          bumpFacing((n) => n + 1);
        }
      }
    }
    lastXRef.current = x;
  };

  const dots = Array.from({ length: dotCount }, (_, i) => {
    const frac = (i + 1) / (dotCount + 1);
    return { frac, x: path.start + distance * frac };
  });
  const dotFractions = dots.map((d) => d.frac);

  const pacTimeline = buildTimeline(path, dotFractions);
  const ghostTimeline = buildTimeline(path, []);

  return (
    <div className="relative w-full h-full">
      {dots.map((d, i) => {
        const dt = buildDotTimeline(d.frac);
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 h-1.5 w-1.5 rounded-full bg-ejc-yellow"
            style={{ left: d.x, marginTop: -3 }}
            animate={{ opacity: dt.opacity, scale: dt.scale }}
            transition={{
              duration,
              times: dt.times,
              repeat: Infinity,
              repeatDelay: pauseAfter,
              repeatType: "mirror",
              ease: "linear",
            }}
          />
        );
      })}

      {ghostColors.map((color, i) => {
        const delay = (GHOST_GAP_PX + GHOST_STEP_PX * i) / speed;
        return (
          <motion.div
            key={color}
            className="absolute top-1/2 -translate-y-1/2"
            animate={{ x: ghostTimeline.x, opacity: ghostTimeline.opacity }}
            transition={{
              duration,
              delay,
              times: ghostTimeline.times,
              repeat: Infinity,
              repeatDelay: pauseAfter,
              repeatType: "mirror",
              ease: "linear",
            }}
          >
            <GhostIcon size={18} color={color} />
          </motion.div>
        );
      })}

      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        animate={{ x: pacTimeline.x, opacity: pacTimeline.opacity, scale: pacTimeline.scale }}
        onUpdate={handlePacmanUpdate}
        transition={{
          duration,
          times: pacTimeline.times,
          repeat: Infinity,
          repeatDelay: pauseAfter,
          repeatType: "mirror",
          ease: "linear",
        }}
      >
        <div className={facingRef.current === "left" ? "-scale-x-100" : ""}>
          <PacmanIcon size={24} />
        </div>
      </motion.div>
    </div>
  );
}

interface HeaderChaseProps {
  containerRef: RefObject<HTMLElement | null>;
  logoRef: RefObject<HTMLElement | null>;
  startRef: RefObject<HTMLElement | null>;
  mobileStartRef: RefObject<HTMLElement | null>;
}

// Easter egg: o Pac-Man foge dos 6 fantasmas atravessando o header inteiro
// (por trás dos botões — ver z-10 explícito nos elementos de navbar.tsx)
// até se esconder atrás da logo, e no ciclo seguinte faz o caminho inverso
// (repeatType: mirror), saindo de trás da logo. Desktop começa atrás do
// chip do usuário; mobile começa atrás do botão de menu e ainda "come"
// bolinhas clássicas pelo caminho, com o mesmo efeito no desktop.
export function HeaderChase({ containerRef, logoRef, startRef, mobileStartRef }: HeaderChaseProps) {
  const reduceMotion = useReducedMotion();
  const desktopPath = useTravelPath(containerRef, startRef, logoRef);
  const mobilePath = useTravelPath(containerRef, mobileStartRef, logoRef);

  if (reduceMotion) return null;

  return (
    <>
      {desktopPath && (
        <div
          className="hidden lg:block absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <Chase path={desktopPath} duration={5.5} pauseAfter={6.5} ghostColors={CHASE_GHOSTS} dotCount={9} />
        </div>
      )}
      {mobilePath && (
        <div
          className="lg:hidden absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <Chase path={mobilePath} duration={3.8} pauseAfter={7.5} ghostColors={CHASE_GHOSTS} dotCount={9} />
        </div>
      )}
    </>
  );
}
