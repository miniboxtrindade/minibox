interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  type?: "image/webp" | "image/jpeg";
}

const supportsWebp = (() => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

export async function compressToWebp(
  file: File,
  opts: CompressOptions = {},
): Promise<Blob> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.82,
    type = supportsWebp ? "image/webp" : "image/jpeg",
  } = opts;

  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo selecionado não é uma imagem.");
  }

  const bitmap = await createImageBitmap(file);

  const scale = Math.min(
    1,
    maxWidth / bitmap.width,
    maxHeight / bitmap.height,
  );
  const targetW = Math.round(bitmap.width * scale);
  const targetH = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Não foi possível criar contexto de canvas.");
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao comprimir imagem."));
      },
      type,
      quality,
    );
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferExtension(blob: Blob): string {
  if (blob.type === "image/webp") return "webp";
  if (blob.type === "image/jpeg") return "jpg";
  if (blob.type === "image/png") return "png";
  return "bin";
}
