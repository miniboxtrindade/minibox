import { useEffect, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PacmanIcon } from "./ui/pacman-icon";
import { GhostIcon, GHOST_COLORS } from "./ui/ghost-icon";

// Os 6 fantasmas da logo, na mesma ordem em que aparecem nela.
const CHASE_GHOSTS = GHOST_COLORS;
// Atraso do primeiro fantasma (mantém distância visível do Pac-Man) +
// incremento entre eles (mantém o grupo coeso, sem esticar pelo header todo).
const GHOST_GAP = 0.6;
const GHOST_STEP = 0.15;

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

// Fade-in no começo do ciclo (não "aparece do nada") e fade-out perto do fim
// (some atrás da logo). Tudo normalizado em fração de `duration`.
function fadeKeyframes(hideAt: number) {
  return { times: [0, 0.06, hideAt, 1], values: [0, 1, 1, 0] };
}

// Um "pulso" de escala no instante exato em que o Pac-Man alcança cada
// bolinha — é a única forma de simular a mordida com um sprite estático.
function bitePulseKeyframes(eatFractions: number[]) {
  if (eatFractions.length === 0) return { times: [0, 1], values: [1, 1] };
  const half = 0.006;
  const times: number[] = [0];
  const values: number[] = [1];
  for (const f of eatFractions) {
    const before = Math.max(f - half, times[times.length - 1] + 0.001);
    times.push(before, f);
    values.push(1, 1.22);
  }
  times.push(Math.min(eatFractions[eatFractions.length - 1] + half, 0.999), 1);
  values.push(1, 1);
  return { times, values };
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
  const dots = Array.from({ length: dotCount }, (_, i) => {
    const frac = (i + 1) / (dotCount + 1);
    return { x: path.start + distance * frac, frac };
  });
  const eatFractions = dots.map((d) => d.frac);
  const pacFade = fadeKeyframes(0.88);
  const pacBite = bitePulseKeyframes(eatFractions);

  return (
    <div className="relative w-full h-full">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 h-1.5 w-1.5 rounded-full bg-ejc-yellow"
          style={{ left: d.x, marginTop: -3 }}
          animate={{ opacity: [1, 1, 1, 0, 0], scale: [1, 1, 1.7, 0, 0] }}
          transition={{
            duration,
            times: [0, Math.max(d.frac - 0.01, 0), d.frac, Math.min(d.frac + 0.02, 0.999), 1],
            repeat: Infinity,
            repeatDelay: pauseAfter,
            ease: "linear",
          }}
        />
      ))}

      {ghostColors.map((color, i) => {
        const fade = fadeKeyframes(0.82);
        const delay = GHOST_GAP + GHOST_STEP * i;
        return (
          <motion.div
            key={color}
            className="absolute top-1/2 -translate-y-1/2"
            animate={{ x: [path.start, path.end], opacity: fade.values }}
            transition={{
              x: { duration, delay, repeat: Infinity, repeatDelay: pauseAfter, ease: "linear" },
              opacity: { duration, delay, times: fade.times, repeat: Infinity, repeatDelay: pauseAfter, ease: "linear" },
            }}
          >
            <GhostIcon size={18} color={color} />
          </motion.div>
        );
      })}

      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        animate={{ x: [path.start, path.end], opacity: pacFade.values, scale: pacBite.values }}
        transition={{
          x: { duration, repeat: Infinity, repeatDelay: pauseAfter, ease: "linear" },
          opacity: { duration, times: pacFade.times, repeat: Infinity, repeatDelay: pauseAfter, ease: "linear" },
          scale: { duration, times: pacBite.times, repeat: Infinity, repeatDelay: pauseAfter, ease: "easeOut" },
        }}
      >
        {/* a arte original olha para a direita; a travessia é da direita
            para a esquerda, então espelhamos pra ele "olhar" pra onde anda */}
        <div className="-scale-x-100">
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

// Easter egg: o Pac-Man foge dos 3 fantasmas atravessando o header inteiro
// (por trás dos botões, que ficam na frente por ordem de DOM) até se
// esconder atrás da logo. Desktop começa atrás do chip do usuário; mobile
// começa atrás do botão de menu e ainda "come" bolinhas pelo caminho.
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
          <Chase path={desktopPath} duration={5.5} pauseAfter={6.5} ghostColors={CHASE_GHOSTS} dotCount={0} />
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
