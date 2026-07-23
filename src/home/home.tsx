import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Minus,
  Plus,
  ShoppingCart,
  Wallet,
  ImageOff,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import Navbar from "../components/navbar";
import {
  supabase,
  type Client,
  type Product,
} from "../lib/supabase";
import { useCategories } from "../lib/use-categories";
import { useToast } from "../components/ui/toast";
import { useModal } from "../lib/modal";
import { friendlyError } from "../lib/errors";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  PageHeading,
  Sheet,
  Skeleton,
} from "../components/ui";
import { cn } from "../lib/cn";

interface CartItem {
  product_id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface VendaResumo {
  cliente: { codigo: number; nome: string; saldoAntes: number; saldoDepois: number };
  itens: CartItem[];
  total: number;
  data: Date;
}

export default function Home() {
  const toast = useToast();
  const { confirm } = useModal();
  const categories = useCategories();

  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState<Client | null>(null);
  const [produtos, setProdutos] = useState<Product[] | null>(null);
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [filtro, setFiltro] = useState<string>("ALL");
  const [busca, setBusca] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [resumoVenda, setResumoVenda] = useState<VendaResumo | null>(null);

  const filtros = useMemo(() => {
    const list: { key: string; label: string; emoji: string }[] = [
      { key: "ALL", label: "Todos", emoji: "✨" },
    ];
    (categories ?? []).forEach((c) =>
      list.push({ key: c.key, label: c.label, emoji: c.emoji }),
    );
    return list;
  }, [categories]);

  const buscarProdutos = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("nome");
    if (error) return;
    setProdutos((data ?? []) as Product[]);
  };

  const buscarCliente = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!codigo) {
      setCliente(null);
      return;
    }
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("codigo", Number(codigo))
      .maybeSingle();
    if (error || !data) {
      toast.warning("Cliente não encontrado.");
      setCliente(null);
      return;
    }
    setCliente(data as Client);
  };

  const handleCodigoChange = (next: string) => {
    setCodigo(next);
    // Qualquer alteração na busca desfaz a seleção do cliente
    if (cliente) setCliente(null);
  };

  useEffect(() => {
    buscarProdutos();
    const channel = supabase
      .channel("home-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => buscarProdutos(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!cliente) return;
    const channel = supabase
      .channel(`home-client-${cliente.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "clients", filter: `id=eq.${cliente.id}` },
        (payload) => setCliente(payload.new as Client),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cliente?.id]);

  const adicionar = (p: Product) => {
    const item = carrinho.find((i) => i.product_id === p.id);
    if (item) {
      if (item.quantidade >= p.quantidade) {
        toast.warning("Quantidade máxima em estoque atingida.");
        return;
      }
      setCarrinho(
        carrinho.map((i) =>
          i.product_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        ),
      );
    } else {
      setCarrinho([
        ...carrinho,
        { product_id: p.id, nome: p.nome, preco: Number(p.preco), quantidade: 1 },
      ]);
    }
  };

  const diminuir = (productId: string) => {
    setCarrinho(
      carrinho
        .map((i) =>
          i.product_id === productId ? { ...i, quantidade: i.quantidade - 1 } : i,
        )
        .filter((i) => i.quantidade > 0),
    );
  };

  const removerItem = (productId: string) => {
    setCarrinho(carrinho.filter((i) => i.product_id !== productId));
  };

  const total = useMemo(
    () => carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0),
    [carrinho],
  );
  const totalItens = useMemo(
    () => carrinho.reduce((acc, i) => acc + i.quantidade, 0),
    [carrinho],
  );

  const produtosVisiveis = useMemo(() => {
    if (!produtos) return [];
    const q = busca.trim().toLowerCase();
    return produtos
      .filter((p) => p.quantidade > 0)
      .filter((p) => (filtro === "ALL" ? true : p.categoria === filtro))
      .filter((p) => (q ? p.nome.toLowerCase().includes(q) : true));
  }, [produtos, filtro, busca]);

  const finalizar = async () => {
    if (!cliente) {
      toast.warning("Busque um cliente antes.");
      return;
    }
    if (!carrinho.length) {
      toast.warning("Carrinho vazio.");
      return;
    }

    const saldoAtual = Number(cliente.saldo);
    const novoSaldo = saldoAtual - total;
    const ficaraNegativo = novoSaldo < 0;

    const ok = await confirm({
      variant: ficaraNegativo ? "error" : "info",
      title: "Finalizar venda",
      message: ficaraNegativo
        ? `Confirmar compra de R$ ${total.toFixed(2)} para ${cliente.nome}? Saldo ficará NEGATIVO em R$ ${novoSaldo.toFixed(2)}.`
        : `Confirmar compra de R$ ${total.toFixed(2)} para ${cliente.nome}? Saldo passará de R$ ${saldoAtual.toFixed(2)} para R$ ${novoSaldo.toFixed(2)}.`,
      confirmLabel: "Finalizar",
    });
    if (!ok) return;

    setFinalizando(true);
    const { error } = await supabase.rpc("realizar_venda", {
      p_codigo: cliente.codigo,
      p_itens: carrinho.map((i) => ({
        product_id: i.product_id,
        quantidade: i.quantidade,
      })),
    });
    setFinalizando(false);

    if (error) {
      toast.error(friendlyError(error));
      return;
    }

    setResumoVenda({
      cliente: {
        codigo: cliente.codigo,
        nome: cliente.nome,
        saldoAntes: saldoAtual,
        saldoDepois: novoSaldo,
      },
      itens: carrinho.map((i) => ({ ...i })),
      total,
      data: new Date(),
    });
    setCarrinho([]);
    setCartOpen(false);
  };

  const finalizarResumo = () => {
    setResumoVenda(null);
    setCliente(null);
    setCodigo("");
  };

  const iniciais = cliente?.nome
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") ?? "?";

  return (
    <div className="min-h-screen bg-ejc-bg">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-[88px] pb-32 md:px-6 lg:pt-[100px] lg:pb-12">
        <header className="mb-5">
          <PageHeading kicker="Início" title="Nova venda" />
        </header>

        <form onSubmit={buscarCliente} className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Código do cliente"
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              leftIcon={<Search size={16} />}
              type="number"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" size="lg">Buscar</Button>
        </form>

        {cliente && (
          <motion.div
            key={cliente.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="overflow-hidden mb-5">
              <div className="h-1 bg-gradient-to-r from-ejc-yellow via-ejc-blue via-ejc-green to-ejc-red" />
              <CardBody className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-ejc-primary/10 text-ejc-primary flex items-center justify-center font-bold">
                  {iniciais}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-ejc-muted">
                    #{cliente.codigo}
                  </p>
                  <h2 className="font-semibold truncate">{cliente.nome}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-ejc-muted flex items-center gap-1 justify-end">
                    <Wallet size={12} /> Saldo
                  </p>
                  <p className={cn(
                    "font-display text-xl font-extrabold tabular-nums",
                    Number(cliente.saldo) < 0 ? "text-ejc-red" : "text-ejc-primary",
                  )}>
                    R$ {Number(cliente.saldo).toFixed(2)}
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        <div className="mb-4">
          <Input
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>

        <nav
          className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4 md:mx-0 md:px-0"
          aria-label="Filtrar por categoria"
        >
          {filtros.map((f) => {
            const active = filtro === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium border transition-all",
                  active
                    ? "bg-ejc-primary text-white border-ejc-primary shadow-sm"
                    : "bg-white text-ejc-text border-ejc-border hover:border-ejc-primary/40 hover:text-ejc-primary",
                )}
              >
                <span aria-hidden>{f.emoji}</span>
                {f.label}
              </button>
            );
          })}
        </nav>

        <section>
          {produtos === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : produtosVisiveis.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={26} />}
              title="Nenhum produto disponível"
              description="Tente outro filtro ou termo de busca."
            />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <AnimatePresence mode="popLayout">
                {produtosVisiveis.map((p) => {
                  const item = carrinho.find((i) => i.product_id === p.id);
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Card className="flex items-center gap-3 p-3 hover:shadow-md transition-shadow">
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-ejc-bg overflow-hidden flex items-center justify-center">
                          {p.imagem_url ? (
                            <img
                              src={p.imagem_url}
                              alt={p.nome}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageOff size={20} className="text-ejc-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ejc-text text-[14px] leading-tight line-clamp-2">
                            {p.nome}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-ejc-primary font-bold tabular-nums">
                              R$ {Number(p.preco).toFixed(2)}
                            </p>
                            <span className="text-[11px] text-ejc-muted">
                              · {p.quantidade} disp.
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => diminuir(p.id)}
                            disabled={!item}
                            aria-label="Diminuir"
                            className="h-8 w-8 rounded-full bg-ejc-bg text-ejc-primary flex items-center justify-center hover:bg-ejc-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center font-semibold tabular-nums">
                            {item?.quantidade ?? 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => adicionar(p)}
                            aria-label="Adicionar"
                            className="h-8 w-8 rounded-full bg-ejc-primary text-white flex items-center justify-center hover:bg-ejc-primary-hover active:scale-95 transition-all"
                          >
                            <Plus size={14} />
                          </button>
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

      <AnimatePresence>
        {carrinho.length > 0 && (
          <motion.button
            type="button"
            onClick={() => setCartOpen(true)}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className={cn(
              "fixed left-4 right-4 bottom-4 z-[900] lg:left-auto lg:right-6 lg:bottom-6 lg:w-[360px]",
              "bg-ejc-primary text-white rounded-2xl shadow-[0_12px_32px_rgba(15,15,80,0.4)]",
              "px-4 py-3 flex items-center gap-3 hover:bg-ejc-primary-hover transition-colors",
            )}
            aria-label="Abrir carrinho"
          >
            <div className="relative h-10 w-10 rounded-full bg-white/15 flex items-center justify-center">
              <ShoppingCart size={18} />
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-ejc-yellow text-[11px] text-ejc-black font-bold flex items-center justify-center">
                {totalItens}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[11px] uppercase tracking-wide text-white/70">
                Carrinho
              </p>
              <p className="font-display text-lg font-bold tabular-nums">
                R$ {total.toFixed(2)}
              </p>
            </div>
            <span className="text-sm font-semibold">Ver</span>
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        side="bottom"
        title="Carrinho"
        description={`${totalItens} ${totalItens === 1 ? "item" : "itens"}`}
      >
        <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {carrinho.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center gap-3 p-3 bg-ejc-bg rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ejc-text leading-tight">
                  {item.nome}
                </p>
                <p className="text-xs text-ejc-muted mt-0.5">
                  R$ {item.preco.toFixed(2)} · un.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => diminuir(item.product_id)}
                  className="h-7 w-7 rounded-full bg-white text-ejc-primary flex items-center justify-center hover:bg-ejc-primary/10"
                  aria-label="Diminuir"
                >
                  <Minus size={12} />
                </button>
                <span className="w-5 text-center font-semibold text-sm tabular-nums">
                  {item.quantidade}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCarrinho(
                      carrinho.map((i) =>
                        i.product_id === item.product_id
                          ? { ...i, quantidade: i.quantidade + 1 }
                          : i,
                      ),
                    )
                  }
                  className="h-7 w-7 rounded-full bg-ejc-primary text-white flex items-center justify-center hover:bg-ejc-primary-hover"
                  aria-label="Adicionar"
                >
                  <Plus size={12} />
                </button>
              </div>
              <p className="font-semibold w-20 text-right tabular-nums text-sm">
                R$ {(item.preco * item.quantidade).toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => removerItem(item.product_id)}
                aria-label="Remover item"
                className="text-ejc-muted hover:text-ejc-red transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-ejc-border/60 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-ejc-muted text-sm">Total</span>
            <Badge variant="primary">
              {totalItens} {totalItens === 1 ? "item" : "itens"}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-ejc-text font-semibold">Você paga</span>
            <span className="font-display text-3xl font-extrabold text-ejc-primary tabular-nums">
              R$ {total.toFixed(2)}
            </span>
          </div>
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={finalizar}
            loading={finalizando}
          >
            Finalizar venda
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={!!resumoVenda}
        onClose={finalizarResumo}
        side="bottom"
        showCloseButton={false}
      >
        {resumoVenda && (
          <div className="p-5">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="h-14 w-14 rounded-full bg-ejc-green/15 text-ejc-green flex items-center justify-center mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="font-display text-xl font-bold text-ejc-primary">
                Venda concluída
              </h2>
              <p className="text-sm text-ejc-muted mt-0.5">
                {resumoVenda.data.toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <Card className="mb-3">
              <CardBody className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-ejc-primary/10 text-ejc-primary flex items-center justify-center font-bold text-sm">
                  {resumoVenda.cliente.nome
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join("") || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-ejc-muted">
                    Cliente · #{resumoVenda.cliente.codigo}
                  </p>
                  <h3 className="font-semibold text-ejc-text truncate">
                    {resumoVenda.cliente.nome}
                  </h3>
                </div>
              </CardBody>
            </Card>

            <div className="mb-3">
              <p className="text-[11px] uppercase tracking-wide text-ejc-muted mb-2">
                Itens ({resumoVenda.itens.reduce((a, i) => a + i.quantidade, 0)})
              </p>
              <ul className="bg-ejc-bg rounded-lg divide-y divide-ejc-border/60 max-h-[35vh] overflow-y-auto">
                {resumoVenda.itens.map((item) => (
                  <li
                    key={item.product_id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-ejc-primary/10 text-ejc-primary font-bold text-[12px]">
                      {item.quantidade}×
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ejc-text leading-tight truncate text-[14px]">
                        {item.nome}
                      </p>
                      <p className="text-[11px] text-ejc-muted">
                        R$ {item.preco.toFixed(2)} cada
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-[14px]">
                      R$ {(item.preco * item.quantidade).toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 mb-4 text-[14px]">
              <div className="flex justify-between text-ejc-muted">
                <span>Saldo anterior</span>
                <span className="tabular-nums">
                  R$ {resumoVenda.cliente.saldoAntes.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-ejc-red">
                <span>Total da compra</span>
                <span className="tabular-nums font-semibold">
                  − R$ {resumoVenda.total.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-ejc-border/60 pt-2 flex justify-between">
                <span className="font-semibold text-ejc-text">Novo saldo</span>
                <span
                  className={cn(
                    "font-display font-extrabold tabular-nums text-lg",
                    resumoVenda.cliente.saldoDepois < 0
                      ? "text-ejc-red"
                      : "text-ejc-primary",
                  )}
                >
                  R$ {resumoVenda.cliente.saldoDepois.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={finalizarResumo}
            >
              Concluir
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
