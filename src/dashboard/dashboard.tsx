import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, animate } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Users,
  Activity,
  TrendingUp,
} from "lucide-react";
import Navbar from "../components/navbar";
import { supabase } from "../lib/supabase";
import { Card, Skeleton } from "../components/ui";
import { cn } from "../lib/cn";

interface DashboardData {
  total_recarga: number;
  total_debito: number;
  saldo_minibox: number;
  clientes: number;
  transacoes: number;
}

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

function AnimatedNumber({
  value,
  isCurrency,
}: {
  value: number;
  isCurrency?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  const formatted = isCurrency
    ? display.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
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
            <span
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center",
                a.iconBg,
                a.iconColor,
              )}
            >
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

const Dashboard = () => {
  const [dados, setDados] = useState<DashboardData | null>(null);

  const buscarDashboard = async () => {
    const { data, error } = await supabase.rpc("get_dashboard");
    if (error) {
      console.warn("Dashboard:", error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setDados(row as DashboardData);
  };

  useEffect(() => {
    buscarDashboard();

    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => buscarDashboard(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => buscarDashboard(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-ejc-bg">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-[88px] pb-12 md:px-6 lg:pt-[100px]">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ejc-blue">
            Painel administrativo
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ejc-primary mt-1 tracking-tight">
            Visão geral
          </h1>
          <p className="text-ejc-muted text-sm mt-1">
            Indicadores do minibox atualizados em tempo real.
          </p>
        </header>

        {!dados ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Total recarregado"
              value={Number(dados.total_recarga)}
              isCurrency
              icon={<ArrowDownToLine size={18} />}
              accent="green"
              delay={0}
            />
            <StatCard
              label="Total em vendas"
              value={Number(dados.total_debito)}
              isCurrency
              icon={<ArrowUpFromLine size={18} />}
              accent="red"
              delay={0.05}
            />
            <StatCard
              label="Saldo dos clientes"
              value={Number(dados.saldo_minibox)}
              isCurrency
              icon={<Wallet size={18} />}
              accent="blue"
              delay={0.1}
            />
            <StatCard
              label="Clientes cadastrados"
              value={Number(dados.clientes)}
              icon={<Users size={18} />}
              accent="yellow"
              delay={0.15}
            />
            <StatCard
              label="Transações"
              value={Number(dados.transacoes)}
              icon={<Activity size={18} />}
              accent="primary"
              delay={0.2}
            />
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
                      Lucro bruto
                    </p>
                    <span className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <p className="font-display text-3xl font-extrabold tabular-nums">
                    <AnimatedNumber
                      value={Number(dados.total_debito) - Number(dados.total_recarga) + Number(dados.saldo_minibox)}
                      isCurrency
                    />
                  </p>
                  <p className="text-[11px] text-white/55 mt-1">
                    vendas + saldo em circulação − recargas
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
