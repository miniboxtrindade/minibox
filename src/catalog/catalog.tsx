import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, ImageOff } from "lucide-react";
import Navbar from "../components/navbar";
import {
  supabase,
  type Product,
  type Category,
} from "../lib/supabase";
import { useCategories } from "../lib/use-categories";
import {
  Badge,
  Card,
  EmptyState,
  Input,
  Skeleton,
} from "../components/ui";
import { cn } from "../lib/cn";

function stockVariant(qtd: number): "success" | "warning" | "danger" {
  if (qtd <= 0) return "danger";
  if (qtd <= 5) return "warning";
  return "success";
}

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-1/3 mt-2" />
      </div>
    </Card>
  );
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [produtos, setProdutos] = useState<Product[] | null>(null);
  const [busca, setBusca] = useState("");
  const categories = useCategories();
  const categoryMap = useMemo(() => {
    if (!categories) return null;
    return categories.reduce<Record<string, Category>>((acc, c) => {
      acc[c.key] = c;
      return acc;
    }, {});
  }, [categories]);

  const filtroAtual = searchParams.get("categoria") ?? "ALL";
  const setFiltro = (f: string) => {
    const params = new URLSearchParams(searchParams);
    if (f === "ALL") params.delete("categoria");
    else params.set("categoria", f);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    const fetchProdutos = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("nome");
      if (!mounted) return;
      setProdutos((data ?? []) as Product[]);
    };

    fetchProdutos();

    const channel = supabase
      .channel("catalog-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => fetchProdutos(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const contagemPorCategoria = useMemo(() => {
    const map: Record<string, number> = { ALL: 0 };
    (produtos ?? []).forEach((p) => {
      map.ALL += 1;
      map[p.categoria] = (map[p.categoria] ?? 0) + 1;
    });
    return map;
  }, [produtos]);

  const filtros = useMemo(() => {
    const list: { key: string; label: string; emoji: string }[] = [
      { key: "ALL", label: "Todos", emoji: "✨" },
    ];
    (categories ?? []).forEach((c) =>
      list.push({ key: c.key, label: c.label, emoji: c.emoji }),
    );
    return list;
  }, [categories]);

  const produtosVisiveis = useMemo(() => {
    if (!produtos) return [];
    const q = busca.trim().toLowerCase();
    return produtos
      .filter((p) => (filtroAtual === "ALL" ? true : p.categoria === filtroAtual))
      .filter((p) => (q ? p.nome.toLowerCase().includes(q) : true));
  }, [produtos, filtroAtual, busca]);

  return (
    <div className="min-h-screen bg-ejc-bg">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-[88px] pb-12 md:px-6 lg:pt-[100px]">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ejc-blue">
            Minibox EJC
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ejc-primary mt-1 tracking-tight">
            Catálogo
          </h1>
          <p className="text-ejc-muted text-sm mt-1">
            Explore todos os produtos disponíveis. Filtre por categoria ou busque pelo nome.
          </p>
        </header>

        <div className="mb-5">
          <Input
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>

        <nav
          className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin"
          aria-label="Filtrar por categoria"
        >
          {filtros.map((f) => {
            const active = filtroAtual === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium",
                  "border transition-all duration-150",
                  active
                    ? "bg-ejc-primary text-white border-ejc-primary shadow-sm"
                    : "bg-white text-ejc-text border-ejc-border hover:border-ejc-primary/40 hover:text-ejc-primary",
                )}
              >
                <span aria-hidden>{f.emoji}</span>
                {f.label}
                <span
                  className={cn(
                    "ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-ejc-bg text-ejc-muted",
                  )}
                >
                  {contagemPorCategoria[f.key] ?? 0}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="mt-6">
          {produtos === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : produtosVisiveis.length === 0 ? (
            <EmptyState
              icon={<Package size={26} />}
              title={
                busca
                  ? `Nenhum resultado para "${busca}"`
                  : "Nenhum produto nesta categoria"
              }
              description={
                busca
                  ? "Tente outro termo de busca ou troque o filtro."
                  : "Ainda não há produtos cadastrados nesta categoria."
              }
            />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {produtosVisiveis.map((p) => {
                  const variant = stockVariant(p.quantidade);
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden h-full flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                        <div className="relative aspect-[4/3] bg-ejc-bg flex items-center justify-center overflow-hidden">
                          {p.imagem_url ? (
                            <img
                              src={p.imagem_url}
                              alt={p.nome}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-ejc-muted">
                              <ImageOff size={28} />
                              <span className="text-[11px]">sem foto</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge variant="primary">
                              {categoryMap?.[p.categoria]?.emoji ?? "📦"} {categoryMap?.[p.categoria]?.label ?? p.categoria}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col gap-2">
                          <h3 className="font-semibold text-ejc-text leading-tight line-clamp-2">
                            {p.nome}
                          </h3>
                          <Badge variant={variant} dot>
                            {p.quantidade > 0
                              ? `${p.quantidade} em estoque`
                              : "Esgotado"}
                          </Badge>
                          <div className="mt-auto pt-2 border-t border-ejc-border/60">
                            <p className="font-display text-2xl font-extrabold text-ejc-primary tracking-tight">
                              R$ {Number(p.preco).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
}
