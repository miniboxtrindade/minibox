import { useEffect, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../lib/cn";
import { PacmanIcon } from "./ui/pacman-icon";
import { GhostIcon, GHOST_COLORS } from "./ui/ghost-icon";

// Os 6 fantasmas da logo, na mesma ordem em que aparecem nela.
const CHASE_GHOSTS = GHOST_COLORS;
// Espaçamento em pixels (não em segundos) — o espaço visual entre eles não
// muda quando a velocidade da travessia é ajustada.
const GHOST_GAP_PX = 34; // distância do Pac-Man até o primeiro fantasma
const GHOST_STEP_PX = 30; // espaço entre um fantasma e o próximo

// Velocidade e pausa compartilhadas entre mobile e desktop — a duração de
// cada travessia é derivada da distância real (path), então os dois
// breakpoints têm exatamente a mesma sensação de ritmo.
const TRAVEL_SPEED_PX_S = 70;
const PAUSE_AFTER_S = 7;

const PACMAN_SIZE = 30;
const GHOST_SIZE = 22;
const DOT_SIZE = 9;
const DOT_COLOR_CLASS = "bg-yellow-100";

const APPEAR_AT = 0.06;
const HIDE_AT = 0.9;

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

// Timeline de uma travessia (sempre "de -> até", nunca invertida pelo
// Framer): fade-in ao sair do ponto de partida, "mordidas" nas frações
// informadas, fade-out ao se aproximar do destino.
function buildMainTimeline(from: number, to: number, biteFractions: number[]) {
  const distance = to - from;
  const times: number[] = [0, APPEAR_AT];
  const opacity: number[] = [0, 1];
  const scale: number[] = [1, 1];

  for (const frac of biteFractions) {
    if (frac <= APPEAR_AT + 0.02 || frac >= HIDE_AT - 0.05) continue;
    const before = Math.max(frac - 0.006, times[times.length - 1] + 0.004);
    const after = Math.min(frac + 0.006, HIDE_AT - 0.02);
    times.push(before, frac, after);
    opacity.push(1, 1, 1);
    scale.push(1, 1.22, 1);
  }

  times.push(HIDE_AT, 1);
  opacity.push(1, 0);
  scale.push(1, 1);

  const x = times.map((t) => from + distance * t);
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
  ghostColors: string[];
  dotCount: number;
}

// Cada travessia ("lap") é montada do zero com um sentido explícito
// (par = ida, ímpar = volta), nunca reaproveitando/invertendo a timeline
// anterior. Isso garante, em qualquer direção: mesma velocidade, mesma
// ordem de "mordida" nas bolinhas e mesmo espaçamento dos fantasmas —
// problemas que o `repeatType: "mirror"` do Framer não resolve de forma
// confiável quando a timeline tem eventos assimétricos no tempo (uma
// bolinha comida fica invisível para sempre depois, o que não é
// simetricamente reversível).
function Chase({ path, ghostColors, dotCount }: ChaseProps) {
  const [cycle, setCycle] = useState(0);
  const forward = cycle % 2 === 0;
  const from = forward ? path.start : path.end;
  const to = forward ? path.end : path.start;
  const distance = to - from;
  const duration = Math.max(Math.abs(distance) / TRAVEL_SPEED_PX_S, 0.5);
  const facingLeft = distance < 0; // a arte original olha para a direita

  const maxGhostDelay = ghostColors.length
    ? (GHOST_GAP_PX + GHOST_STEP_PX * (ghostColors.length - 1)) / TRAVEL_SPEED_PX_S
    : 0;
  const totalCycleTime = duration + maxGhostDelay + PAUSE_AFTER_S;

  useEffect(() => {
    const timeout = window.setTimeout(() => setCycle((c) => c + 1), totalCycleTime * 1000);
    return () => window.clearTimeout(timeout);
  }, [cycle, totalCycleTime]);

  const dots = Array.from({ length: dotCount }, (_, i) => {
    const frac = (i + 1) / (dotCount + 1);
    return { frac, x: from + distance * frac };
  });
  const biteFractions = dots.map((d) => d.frac);
  const mainTimeline = buildMainTimeline(from, to, biteFractions);
  const ghostTimeline = buildMainTimeline(from, to, []);

  return (
    <div className="relative w-full h-full">
      {dots.map((d, i) => {
        const dt = buildDotTimeline(d.frac);
        return (
          <motion.span
            key={`${cycle}-${i}`}
            className={cn("absolute top-1/2 rounded-full", DOT_COLOR_CLASS)}
            style={{
              left: d.x - DOT_SIZE / 2,
              width: DOT_SIZE,
              height: DOT_SIZE,
              marginTop: -DOT_SIZE / 2,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: dt.opacity, scale: dt.scale }}
            transition={{ duration, times: dt.times, ease: "linear" }}
          />
        );
      })}

      {ghostColors.map((color, i) => {
        const delay = (GHOST_GAP_PX + GHOST_STEP_PX * i) / TRAVEL_SPEED_PX_S;
        return (
          <motion.div
            key={`${cycle}-${color}`}
            className="absolute"
            // `left`/`marginTop` fixam o centro do ícone na origem (0,0) local;
            // o `x` do Framer (translateX) então desloca esse centro para a
            // posição real. Não usar utilitário `-translate-x/y-1/2` aqui: o
            // Framer assume o controle total de `transform` assim que `x` é
            // animado, e sobrescreveria uma classe de transform estática.
            style={{ top: "50%", left: -GHOST_SIZE / 2, marginTop: -GHOST_SIZE / 2 }}
            initial={{ x: from, opacity: 0 }}
            animate={{ x: ghostTimeline.x, opacity: ghostTimeline.opacity }}
            transition={{ duration, delay, times: ghostTimeline.times, ease: "linear" }}
          >
            <GhostIcon size={GHOST_SIZE} color={color} />
          </motion.div>
        );
      })}

      <motion.div
        key={`${cycle}-pacman`}
        className="absolute"
        style={{ top: "50%", left: -PACMAN_SIZE / 2, marginTop: -PACMAN_SIZE / 2 }}
        initial={{ x: from, opacity: 0, scale: 1 }}
        animate={{ x: mainTimeline.x, opacity: mainTimeline.opacity, scale: mainTimeline.scale }}
        transition={{ duration, times: mainTimeline.times, ease: "linear" }}
      >
        <div className={facingLeft ? "-scale-x-100" : ""}>
          <PacmanIcon size={PACMAN_SIZE} />
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
// até se esconder atrás da logo, depois refaz o caminho ao contrário saindo
// de trás dela. No desktop ele passa por trás dos botões de navegação e do
// bloco do usuário (que têm um fundo opaco — ver navbar.tsx — só ficando
// visível nos espaços vazios entre eles); no mobile atravessa livremente,
// comendo bolinhas clássicas pelo caminho, mesmo efeito usado no desktop.
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
          <Chase path={desktopPath} ghostColors={CHASE_GHOSTS} dotCount={9} />
        </div>
      )}
      {mobilePath && (
        <div
          className="lg:hidden absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <Chase path={mobilePath} ghostColors={CHASE_GHOSTS} dotCount={9} />
        </div>
      )}
    </>
  );
}
