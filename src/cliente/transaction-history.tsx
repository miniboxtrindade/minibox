import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  User,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase, type Transaction, type TransactionItem } from "../lib/supabase";
import { Badge, Card, EmptyState, Skeleton } from "../components/ui";
import { useToast } from "../components/ui/toast";
import { cn } from "../lib/cn";

interface TransactionWithExtras extends Transaction {
  operador?: { nome: string | null } | null;
  itens?: TransactionItem[];
}

interface Props {
  clienteId: string;
  clienteCodigo: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionHistory({ clienteId, clienteCodigo }: Props) {
  const toast = useToast();
  const [transacoes, setTransacoes] = useState<TransactionWithExtras[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const buscar = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          operador:profiles(nome),
          itens:transaction_items(*)
        `)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.warn("Erro ao buscar histórico:", error.message);
        setTransacoes([]);
        return;
      }
      setTransacoes((data ?? []) as TransactionWithExtras[]);
    };

    buscar();

    const channel = supabase
      .channel(`tx-history-${clienteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `cliente_id=eq.${clienteId}`,
        },
        () => buscar(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [clienteId]);

  const exportarExcel = () => {
    if (!transacoes || !transacoes.length) {
      toast.info("Sem histórico para exportar.");
      return;
    }

    const linhas = transacoes.flatMap((t) => {
      const base = {
        Data: formatDate(t.created_at),
        Tipo: t.tipo,
        Valor: Number(t.valor),
        Operador: t.operador?.nome ?? "—",
        Descrição: t.descricao ?? "",
      };
      if (!t.itens || t.itens.length === 0) return [base];
      return t.itens.map((it) => ({
        ...base,
        Produto: it.produto_nome,
        Qtd: it.quantidade,
        Unitário: Number(it.preco_unitario),
        Subtotal: Number(it.subtotal),
      }));
    });

    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `historico_cliente_${clienteCodigo}.xlsx`);
  };

  if (transacoes === null) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-5 w-1/3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (transacoes.length === 0) {
    return (
      <EmptyState
        title="Sem movimentações ainda"
        description="As recargas e compras deste cliente aparecerão aqui."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-ejc-border/60">
        <h3 className="font-semibold text-ejc-primary text-[15px]">Histórico</h3>
        <button
          type="button"
          onClick={exportarExcel}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ejc-primary hover:text-ejc-primary-hover"
        >
          <Download size={14} /> Exportar Excel
        </button>
      </div>

      <ul className="divide-y divide-ejc-border/60">
        {transacoes.map((t) => {
          const isDebito = t.tipo === "DEBITO";
          const hasItens = (t.itens?.length ?? 0) > 0;
          const expanded = expandedId === t.id;
          const Icon = isDebito ? ArrowDownCircle : ArrowUpCircle;

          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => hasItens && setExpandedId(expanded ? null : t.id)}
                aria-expanded={expanded}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  hasItens ? "hover:bg-ejc-bg/60 cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                    isDebito
                      ? "bg-ejc-red/10 text-ejc-red"
                      : "bg-ejc-green/12 text-ejc-green",
                  )}
                  aria-hidden
                >
                  <Icon size={18} />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={isDebito ? "danger" : "success"} dot>
                      {isDebito ? "Débito" : "Recarga"}
                    </Badge>
                    {hasItens && (
                      <span className="text-[11px] text-ejc-muted">
                        {t.itens!.length} {t.itens!.length === 1 ? "item" : "itens"}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[12px] text-ejc-muted">
                    <span>{formatDate(t.created_at)}</span>
                    {t.operador?.nome && (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} />
                        {t.operador.nome}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={cn(
                      "font-display font-bold text-[15px] tabular-nums",
                      isDebito ? "text-ejc-red" : "text-ejc-green",
                    )}
                  >
                    {isDebito ? "-" : "+"}R$ {Number(t.valor).toFixed(2)}
                  </p>
                </div>

                {hasItens && (
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-ejc-muted transition-transform",
                      expanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                )}
              </button>

              <AnimatePresence initial={false}>
                {expanded && hasItens && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-ejc-bg/40"
                  >
                    <div className="px-4 py-3">
                      <ul className="space-y-1.5">
                        {t.itens!.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between text-[13px]"
                          >
                            <span className="text-ejc-text">
                              <span className="text-ejc-primary font-semibold mr-1">
                                {item.quantidade}×
                              </span>
                              {item.produto_nome}
                            </span>
                            <span className="text-ejc-muted tabular-nums">
                              R$ {Number(item.subtotal).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
