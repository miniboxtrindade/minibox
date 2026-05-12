import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "info" | "success" | "warning" | "error";

interface Toast {
  id: number;
  message: string;
  variant: Variant;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: { message: string; variant?: Variant; duration?: number }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<Variant, { icon: ReactNode; ring: string; iconColor: string }> = {
  info: {
    icon: <Info size={18} />,
    ring: "border-l-ejc-blue",
    iconColor: "text-ejc-blue",
  },
  success: {
    icon: <CheckCircle2 size={18} />,
    ring: "border-l-ejc-green",
    iconColor: "text-ejc-green",
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    ring: "border-l-ejc-yellow",
    iconColor: "text-[#7A5B00]",
  },
  error: {
    icon: <XCircle size={18} />,
    ring: "border-l-ejc-red",
    iconColor: "text-ejc-red",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      message,
      variant = "info",
      duration = 3500,
    }: {
      message: string;
      variant?: Variant;
      duration?: number;
    }) => {
      const id = ++idRef.current;
      setToasts((arr) => [...arr, { id, message, variant, duration }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    toast,
    success: (message) => toast({ message, variant: "success" }),
    error: (message) => toast({ message, variant: "error" }),
    info: (message) => toast({ message, variant: "info" }),
    warning: (message) => toast({ message, variant: "warning" }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="fixed z-[1200] bottom-4 left-1/2 -translate-x-1/2 w-[min(94vw,380px)] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const style = VARIANT_STYLES[t.variant];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 px-4 py-3",
                  "bg-white rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.18)] border border-ejc-border/70",
                  "border-l-4",
                  style.ring,
                )}
                role={t.variant === "error" ? "alert" : "status"}
              >
                <span className={cn("mt-0.5 shrink-0", style.iconColor)}>
                  {style.icon}
                </span>
                <p className="flex-1 text-sm text-ejc-text leading-snug">
                  {t.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Fechar notificação"
                  className="text-ejc-muted hover:text-ejc-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}
