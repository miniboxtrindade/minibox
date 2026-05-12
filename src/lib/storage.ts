import { supabase } from "./supabase";
import { compressToWebp, inferExtension } from "./image";

const BUCKET = "product-images";

interface UploadedImage {
  imagem_url: string;
  imagem_path: string;
}

/**
 * Comprime a imagem para WebP e faz upload no bucket `product-images`.
 * Retorna a URL pública e o path (necessário para deletar depois).
 */
export async function uploadProductImage(file: File): Promise<UploadedImage> {
  const blob = await compressToWebp(file, { maxWidth: 800, quality: 0.82 });
  const ext = inferExtension(blob);
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: "31536000",
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { imagem_url: data.publicUrl, imagem_path: path };
}

export async function deleteProductImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    // Não bloqueia o fluxo do delete principal; apenas loga
    console.warn("Falha ao remover imagem do storage:", error.message);
  }
}
