import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type ModalVariant = "info" | "success" | "error" | "warning";

interface ModalOptions {
  title?: string;
  message: string;
  variant?: ModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
}

interface ModalState extends ModalOptions {
  open: boolean;
  isConfirm: boolean;
}

interface ModalContextValue {
  notify: (opts: ModalOptions) => void;
  confirm: (opts: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

const ICONS: Record<ModalVariant, string> = {
  info: "ℹ",
  success: "✓",
  error: "✕",
  warning: "!",
};

const TITLES: Record<ModalVariant, string> = {
  info: "Aviso",
  success: "Sucesso",
  error: "Erro",
  warning: "Atenção",
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({
    open: false,
    message: "",
    isConfirm: false,
  });
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setState((s) => ({ ...s, open: false }));
    if (resolver) {
      resolver(result);
      setResolver(null);
    }
  }, [resolver]);

  const notify = useCallback((opts: ModalOptions) => {
    setState({
      open: true,
      isConfirm: false,
      variant: "info",
      ...opts,
    });
  }, []);

  const confirm = useCallback((opts: ModalOptions) => {
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
      setState({
        open: true,
        isConfirm: true,
        variant: "warning",
        confirmLabel: "Confirmar",
        cancelLabel: "Cancelar",
        ...opts,
      });
    });
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [state.open, close]);

  const variant = state.variant ?? "info";
  const title = state.title ?? TITLES[variant];

  const handleConfirm = async () => {
    if (state.onConfirm) await state.onConfirm();
    close(true);
  };

  return (
    <ModalContext.Provider value={{ notify, confirm }}>
      {children}

      {state.open && (
        <div
          className="ejc-modal-backdrop"
          onClick={() => close(false)}
          role="presentation"
        >
          <div
            className={`ejc-modal ejc-modal--${variant}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ejc-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ejc-modal__icon" aria-hidden="true">
              {ICONS[variant]}
            </div>

            <h3 id="ejc-modal-title" className="ejc-modal__title">{title}</h3>

            <p className="ejc-modal__message">{state.message}</p>

            <div className="ejc-modal__actions">
              {state.isConfirm && (
                <button
                  type="button"
                  className="ejc-modal__btn ejc-modal__btn--ghost"
                  onClick={() => close(false)}
                >
                  {state.cancelLabel ?? "Cancelar"}
                </button>
              )}
              <button
                type="button"
                className={`ejc-modal__btn ejc-modal__btn--primary ejc-modal__btn--${variant}`}
                onClick={handleConfirm}
                autoFocus
              >
                {state.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal precisa estar dentro de <ModalProvider>");
  return ctx;
}
