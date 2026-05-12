import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

type Side = "left" | "right" | "bottom" | "top";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: Side;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  className?: string;
  children: ReactNode;
}

const SIDE_CLASSES: Record<Side, string> = {
  left: "left-0 top-0 bottom-0 w-[85vw] max-w-sm",
  right: "right-0 top-0 bottom-0 w-[85vw] max-w-sm",
  bottom: "left-0 right-0 bottom-0 max-h-[80vh] rounded-t-2xl",
  top: "left-0 right-0 top-0 max-h-[80vh] rounded-b-2xl",
};

const SIDE_INITIAL: Record<Side, object> = {
  left: { x: "-100%" },
  right: { x: "100%" },
  bottom: { y: "100%" },
  top: { y: "-100%" },
};

const SIDE_ANIMATE: Record<Side, object> = {
  left: { x: 0 },
  right: { x: 0 },
  bottom: { y: 0 },
  top: { y: 0 },
};

export function Sheet({
  open,
  onClose,
  side = "right",
  title,
  description,
  showCloseButton = true,
  className,
  children,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[1100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            className={cn(
              "fixed bg-ejc-surface shadow-2xl z-[1101] flex flex-col",
              SIDE_CLASSES[side],
              className,
            )}
            initial={SIDE_INITIAL[side]}
            animate={SIDE_ANIMATE[side]}
            exit={SIDE_INITIAL[side]}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {(title || description || showCloseButton) && (
              <header className="px-5 py-4 border-b border-ejc-border/60 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  {title && (
                    <h2 className="text-base font-semibold text-ejc-primary">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-ejc-muted">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-8 w-8 rounded-md flex items-center justify-center text-ejc-muted hover:bg-ejc-bg hover:text-ejc-primary transition-colors"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                )}
              </header>
            )}

            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
