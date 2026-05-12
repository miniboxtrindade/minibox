import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, animate } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Users,
  Activity,
  TrendingUp,
  TriangleAlert,
  Trophy,
  PiggyBank,
  ChevronDown,
  History,
  User as UserIcon,
  RefreshCw,
} from "lucide-react";
import Navbar from "../components/navbar";
import { supabase, type Client, type Transaction } from "../lib/supabase";
import { Badge, Button, Card, CardBody, EmptyState, Input, Skeleton } from "../components/ui";
import { useToast } from "../components/ui/toast";
import { useModal } from "../lib/modal";
import { friendlyError } from "../lib/errors";
import { cn } from "../lib/cn";

interface RecentTransaction extends Transaction {
  cliente?: { codigo: number; nome: string } | null;
  operador?: { nome: string | null } | null;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DashboardData {
  total_recarga: number;
  total_debito: number;
  saldo_minibox: number; // soma dos saldos positivos
  saldo_devedor: number; // soma do |saldo| onde saldo < 0
  clientes: number;
  transacoes: number;
}

interface TopConsumer {
  id: string;
  codigo: number;
  nome: string;
  saldo: number;
  total_gasto: number;
  num_compras: number;
}

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface StatCardProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  icon: ReactNode;
  accent: "green" | "red" | "blue" | "yellow" | "primary";
  delay?: number;
}

const ACCENT: Record<StatCardProps["accent"], { bar: string; iconBg: string; iconColor: string }> = {
  green:   { bar: "from-ejc-green to-ejc-green/60",   iconBg: "bg-ejc-green/12",   iconColor: "text-ejc-green" },
  red:     { bar: "from-ejc-red to-ejc-red/60",       iconBg: "bg-ejc-red/10",     iconColor: "text-ejc-red" },
  blue:    { bar: "from-ejc-blue to-ejc-blue/60",     iconBg: "bg-ejc-blue/10",    iconColor: "text-ejc-blue" },
  yellow:  { bar: "from-ejc-yellow to-ejc-yellow/60", iconBg: "bg-ejc-yellow/20",  iconColor: "text-[#7A5B00]" },
  primary: { bar: "from-ejc-primary to-ejc-primary/60", iconBg: "bg-ejc-primary/10", iconColor: "text-ejc-primary" },
};

function AnimatedNumber({ value, isCurrency }: { value: number; isCurrency?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);
  const safe = Number.isFinite(value) ? value : 0;

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, safe, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, safe]);

  const formatted = isCurrency
    ? display.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : Math.round(display).toLocaleString("pt-BR");

  return <span ref={ref}>{formatted}</span>;
}

function StatCard({ label, value, isCurrency, icon, accent, delay = 0 }: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
        <div className={cn("h-1 w-full bg-gradient-to-r", a.bar)} />
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ejc-muted">
              {label}
            </p>
            <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center", a.iconBg, a.iconColor)}>
              {icon}
            </span>
          </div>
          <p className="font-display text-3xl font-extrabold text-ejc-primary tabular-nums leading-none">
            <AnimatedNumber value={value} isCurrency={isCurrency} />
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

interface NegativeRowProps {
  client: Client;
  onRecharge: (client: Client, valor: number) => Promise<boolean>;
}

function NegativeRow({ client, onRecharge }: NegativeRowProps) {
  const [valor, setValor] = useState("");
  const [busy, setBusy] = useState(false);
  const iniciais =
    client.nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  const submit = async () => {
    const v = Number(valor);
    if (!valor || v <= 0 || !Number.isFinite(v)) return;
    setBusy(true);
    const ok = await onRecharge(client, v);
    setBusy(false);
    if (ok) setValor("");
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-ejc-border/60 last:border-b-0">
      <div className="h-9 w-9 shrink-0 rounded-full bg-ejc-red/10 text-ejc-red flex items-center justify-center font-bold text-[12px]">
        {iniciais}
      </div>
      <div className="flex-1 min-w-[140px]">
        <p className="text-[12px] uppercase tracking-wide text-ejc-muted">#{client.codigo}</p>
        <p className="font-semibold text-ejc-text truncate text-[14px]">{client.nome}</p>
      </div>
      <p className="font-display font-bold tabular-nums text-[15px] text-ejc-red shrink-0">
        R$ {Number(client.saldo).toFixed(2)}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2 items-center w-full sm:w-auto"
      >
        <div className="w-28">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="R$"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          variant="success"
          loading={busy}
          disabled={!valor || Number(valor) <= 0}
        >
          <ArrowDownToLine size={14} /> Recarregar
        </Button>
      </form>
    </li>
  );
}

interface ClientRowProps {
  codigo: number;
  nome: string;
  rightTop: ReactNode;
  rightBottom?: ReactNode;
  leftBadge?: ReactNode;
}

function ClientRow({ codigo, nome, rightTop, rightBottom, leftBadge }: ClientRowProps) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-ejc-border/60 last:border-b-0">
      <div className="h-9 w-9 shrink-0 rounded-full bg-ejc-primary/10 text-ejc-primary flex items-center justify-center font-bold text-[12px]">
        {iniciais}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] uppercase tracking-wide text-ejc-muted">#{codigo}</p>
        <p className="font-semibold text-ejc-text truncate text-[14px]">{nome}</p>
      </div>
      {leftBadge}
      <div className="text-right shrink-0">
        <div className="font-display font-bold tabular-nums text-[15px]">{rightTop}</div>
        {rightBottom && <div className="text-[11px] text-ejc-muted">{rightBottom}</div>}
      </div>
    </li>
  );
}

const Dashboard = () => {
  const toast = useToast();
  const { confirm } = useModal();

  const [dados, setDados] = useState<DashboardData | null>(null);
  const [negativos, setNegativos] = useState<Client[] | null>(null);
  const [topConsumers, setTopConsumers] = useState<TopConsumer[] | null>(null);
  const [positivos, setPositivos] = useState<Client[] | null>(null);
  const [carregandoPositivos, setCarregandoPositivos] = useState(false);
  const [transacoes, setTransacoes] = useState<RecentTransaction[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const buscarDashboard = async () => {
    const { data, error } = await supabase.rpc("get_dashboard");
    if (error) return;
    const row = Array.isArray(data) ? data[0] : data;
    setDados(row as DashboardData);
  };

  const buscarNegativos = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .lt("saldo", 0)
      .order("saldo", { ascending: true });
    if (error) return;
    setNegativos((data ?? []) as Client[]);
  };

  const buscarTopConsumers = async () => {
    const { data, error } = await supabase.rpc("top_consumers", { p_limit: 10 });
    if (error) return;
    setTopConsumers((data ?? []) as TopConsumer[]);
  };

  const buscarTransacoes = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        cliente:clients(codigo, nome),
        operador:profiles(nome)
      `)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return;
    setTransacoes((data ?? []) as RecentTransaction[]);
  };

  const buscarPositivos = async () => {
    setCarregandoPositivos(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .gt("saldo", 0)
      .order("saldo", { ascending: false });
    setCarregandoPositivos(false);
    if (error) return;
    setPositivos((data ?? []) as Client[]);
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      buscarDashboard(),
      buscarNegativos(),
      buscarTopConsumers(),
      buscarTransacoes(),
      positivos !== null ? buscarPositivos() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const recarregarCliente = async (c: Client, valor: number) => {
    const ok = await confirm({
      variant: "success",
      title: "Confirmar recarga",
      message: `Recarregar R$ ${valor.toFixed(2)} no crachá #${c.codigo} (${c.nome})? Saldo atual: R$ ${toNum(c.saldo).toFixed(2)}.`,
      confirmLabel: "Recarregar",
    });
    if (!ok) return false;

    const { error } = await supabase.rpc("recarregar_saldo", {
      p_codigo: c.codigo,
      p_valor: valor,
    });
    if (error) {
      toast.error(friendlyError(error));
      return false;
    }
    toast.success(`Recarga de R$ ${valor.toFixed(2)} efetuada!`);
    return true;
  };

  useEffect(() => {
    buscarDashboard();
    buscarNegativos();
    buscarTopConsumers();
    buscarTransacoes();

    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          buscarDashboard();
          buscarTopConsumers();
          buscarTransacoes();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          buscarDashboard();
          buscarNegativos();
          if (positivos !== null) buscarPositivos();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-ejc-bg">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-[88px] pb-12 md:px-6 lg:pt-[100px]">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ejc-blue">
              Painel administrativo
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ejc-primary mt-1 tracking-tight">
              Visão geral
            </h1>
            <p className="text-ejc-muted text-sm mt-1">
              Indicadores do minibox atualizados em tempo real.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            loading={refreshing}
            className="shrink-0"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </Button>
        </header>

        {!dados ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total recarregado" value={toNum(dados.total_recarga)} isCurrency icon={<ArrowDownToLine size={18} />} accent="green" delay={0} />
            <StatCard label="Total em vendas" value={toNum(dados.total_debito)} isCurrency icon={<ArrowUpFromLine size={18} />} accent="red" delay={0.05} />
            <StatCard label="Saldo nos crachás" value={toNum(dados.saldo_minibox)} isCurrency icon={<Wallet size={18} />} accent="blue" delay={0.1} />
            <StatCard label="A receber" value={toNum(dados.saldo_devedor)} isCurrency icon={<TriangleAlert size={18} />} accent="red" delay={0.12} />
            <StatCard label="Clientes cadastrados" value={toNum(dados.clientes)} icon={<Users size={18} />} accent="yellow" delay={0.15} />
            <StatCard label="Transações" value={toNum(dados.transacoes)} icon={<Activity size={18} />} accent="primary" delay={0.2} />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
            >
              <Card className="h-full bg-gradient-to-br from-ejc-primary to-[#0a0a3d] text-white border-transparent overflow-hidden relative">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-ejc-yellow/15 blur-2xl" aria-hidden />
                <div className="p-5 flex flex-col h-full justify-between min-h-[140px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                      Caixa do minibox
                    </p>
                    <span className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <p className="font-display text-3xl font-extrabold tabular-nums">
                    <AnimatedNumber
                      value={toNum(dados.total_recarga) - toNum(dados.saldo_minibox) + toNum(dados.saldo_devedor)}
                      isCurrency
                    />
                  </p>
                  <p className="text-[11px] text-white/55 mt-1">
                    recargas − saldo nos crachás + a receber
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-ejc-border/60 flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-ejc-red/10 text-ejc-red flex items-center justify-center">
                <TriangleAlert size={16} />
              </span>
              <div className="flex-1">
                <h2 className="font-semibold text-ejc-primary text-[15px]">Saldos negativos</h2>
                <p className="text-[12px] text-ejc-muted">
                  Clientes com saldo abaixo de zero
                </p>
              </div>
              {negativos !== null && (
                <Badge variant="danger" dot>{negativos.length}</Badge>
              )}
            </div>
            {negativos === null ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : negativos.length === 0 ? (
              <EmptyState
                className="m-4"
                title="Nenhum cliente negativado"
                description="Todos os crachás estão com saldo ≥ 0."
              />
            ) : (
              <ul>
                {negativos.map((c) => (
                  <NegativeRow
                    key={c.id}
                    client={c}
                    onRecharge={recarregarCliente}
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-ejc-border/60 flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-ejc-yellow/20 text-[#7A5B00] flex items-center justify-center">
                <Trophy size={16} />
              </span>
              <div className="flex-1">
                <h2 className="font-semibold text-ejc-primary text-[15px]">Top 10 consumidores</h2>
                <p className="text-[12px] text-ejc-muted">
                  Maiores gastos acumulados
                </p>
              </div>
            </div>
            {topConsumers === null ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topConsumers.length === 0 ? (
              <EmptyState
                className="m-4"
                title="Sem dados ainda"
                description="Nenhuma venda foi realizada até agora."
              />
            ) : (
              <ul>
                {topConsumers.map((c, i) => (
                  <ClientRow
                    key={c.id}
                    codigo={c.codigo}
                    nome={c.nome}
                    leftBadge={
                      <Badge variant={i === 0 ? "warning" : "neutral"}>
                        #{i + 1}
                      </Badge>
                    }
                    rightTop={fmtBRL(toNum(c.total_gasto))}
                    rightBottom={`${c.num_compras} ${c.num_compras === 1 ? "compra" : "compras"}`}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="mt-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-ejc-border/60 flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-ejc-primary/10 text-ejc-primary flex items-center justify-center">
              <History size={16} />
            </span>
            <div className="flex-1">
              <h2 className="font-semibold text-ejc-primary text-[15px]">Últimas transações</h2>
              <p className="text-[12px] text-ejc-muted">10 movimentações mais recentes</p>
            </div>
          </div>
          {transacoes === null ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : transacoes.length === 0 ? (
            <EmptyState
              className="m-4"
              title="Sem movimentações"
              description="As vendas, recargas e débitos aparecerão aqui."
            />
          ) : (
            <ul>
              {transacoes.map((t) => {
                const isDebito = t.tipo === "DEBITO";
                const sign = isDebito ? "-" : "+";
                const valor = toNum(t.valor);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-ejc-border/60 last:border-b-0"
                  >
                    <span
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-full flex items-center justify-center",
                        isDebito ? "bg-ejc-red/10 text-ejc-red" : "bg-ejc-green/12 text-ejc-green",
                      )}
                    >
                      {isDebito ? <ArrowUpFromLine size={16} /> : <ArrowDownToLine size={16} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={isDebito ? "danger" : "success"} dot>
                          {isDebito ? "Débito" : "Recarga"}
                        </Badge>
                        <span className="text-[13px] font-semibold text-ejc-text truncate">
                          {t.cliente?.nome ?? "Cliente removido"}
                        </span>
                        {t.cliente?.codigo != null && (
                          <span className="text-[11px] text-ejc-muted">
                            #{t.cliente.codigo}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] text-ejc-muted">
                        <span>{formatRelative(t.created_at)}</span>
                        {t.operador?.nome && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon size={11} />
                            {t.operador.nome}
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className={cn(
                        "font-display font-bold tabular-nums text-[15px]",
                        isDebito ? "text-ejc-red" : "text-ejc-green",
                      )}
                    >
                      {sign}{fmtBRL(valor)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="mt-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-ejc-border/60 flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-ejc-green/12 text-ejc-green flex items-center justify-center">
              <PiggyBank size={16} />
            </span>
            <div className="flex-1">
              <h2 className="font-semibold text-ejc-primary text-[15px]">Saldos positivos</h2>
              <p className="text-[12px] text-ejc-muted">
                Carregue sob demanda — pode haver muitos
              </p>
            </div>
            {positivos !== null ? (
              <Badge variant="success" dot>{positivos.length}</Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={buscarPositivos}
                loading={carregandoPositivos}
              >
                <ChevronDown size={14} /> Mostrar
              </Button>
            )}
          </div>

          {positivos === null ? (
            <div className="p-6 text-center text-sm text-ejc-muted">
              Clique em <strong className="text-ejc-primary">Mostrar</strong> para listar todos os clientes com saldo positivo.
            </div>
          ) : positivos.length === 0 ? (
            <EmptyState
              className="m-4"
              title="Nenhum cliente com saldo positivo"
              description="Todos os crachás estão com saldo ≤ 0."
            />
          ) : (
            <ul>
              {positivos.map((c) => (
                <ClientRow
                  key={c.id}
                  codigo={c.codigo}
                  nome={c.nome}
                  rightTop={
                    <span className="text-ejc-green">
                      {fmtBRL(toNum(c.saldo))}
                    </span>
                  }
                  rightBottom="Saldo"
                />
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
