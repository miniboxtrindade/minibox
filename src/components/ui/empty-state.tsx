import { type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { GhostIcon } from "./ghost-icon";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-2 px-6 py-12",
        "bg-ejc-surface border border-dashed border-ejc-border rounded-2xl",
        className,
      )}
    >
      <div className="h-14 w-14 rounded-full bg-ejc-bg flex items-center justify-center text-ejc-primary mb-2">
        {icon ?? <GhostIcon size={28} color="#8B2FC9" />}
      </div>
      <h3 className="text-base font-semibold text-ejc-primary">{title}</h3>
      {description && (
        <p className="text-sm text-ejc-muted max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
