import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { cn } from "../../lib/cn";

interface ImageUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  className?: string;
  disabled?: boolean;
  /** Accepted mime types (default: image/*) */
  accept?: string;
  /** Max file size in MB (default 5) */
  maxSizeMB?: number;
  onError?: (msg: string) => void;
}

export function ImageUploader({
  value,
  onChange,
  existingUrl,
  className,
  disabled = false,
  accept = "image/*",
  maxSizeMB = 5,
  onError,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const displayUrl = previewUrl ?? existingUrl ?? null;

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        onError?.("Selecione um arquivo de imagem.");
        return;
      }
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        onError?.(`Imagem muito grande (${sizeMB.toFixed(1)}MB). Máximo ${maxSizeMB}MB.`);
        return;
      }
      onChange(file);
    },
    [maxSizeMB, onChange, onError],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const remove = () => {
    onChange(null);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border-2 border-dashed transition-colors cursor-pointer",
          "flex items-center justify-center text-center",
          "min-h-[160px]",
          dragOver
            ? "border-ejc-primary bg-ejc-primary/5"
            : "border-ejc-border bg-ejc-bg/40 hover:border-ejc-primary/50 hover:bg-ejc-bg",
          disabled && "opacity-60 pointer-events-none",
        )}
        role="button"
        tabIndex={0}
        aria-label="Selecionar imagem"
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Pré-visualização"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="h-8 px-3 rounded-md bg-white/95 text-ejc-primary text-xs font-medium inline-flex items-center gap-1 shadow hover:bg-white"
              >
                <Upload size={13} /> Trocar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove();
                }}
                className="h-8 px-3 rounded-md bg-ejc-red/95 text-white text-xs font-medium inline-flex items-center gap-1 shadow hover:bg-ejc-red"
              >
                <Trash2 size={13} /> Remover
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-ejc-muted">
            <div className="h-12 w-12 rounded-full bg-ejc-primary/10 text-ejc-primary flex items-center justify-center">
              <ImagePlus size={22} />
            </div>
            <p className="text-sm font-medium text-ejc-text">
              Clique ou arraste uma imagem
            </p>
            <p className="text-xs">
              PNG, JPG, WebP — até {maxSizeMB}MB. Será otimizada automaticamente.
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
