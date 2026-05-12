import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import Navbar from '../components/navbar';
import { supabase, type Client } from '../lib/supabase';
import { useToast } from '../components/ui/toast';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
} from '../components/ui';
import { TransactionHistory } from './transaction-history';
import { cn } from '../lib/cn';

const QUICK_VALUES = [5, 10, 20, 50];

const Home = () => {
  const toast = useToast();

  const [codigoBusca, setCodigoBusca] = useState('');
  const [cliente, setCliente] = useState<Client | null>(null);
  const [valor, setValor] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [busy, setBusy] = useState(false);

  const buscarCliente = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!codigoBusca) {
      toast.warning('Digite o código do crachá.');
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('codigo', Number(codigoBusca))
      .maybeSingle();

    if (error) {
      toast.error('Erro ao buscar cliente.');
      return;
    }
    if (!data) {
      toast.warning('Cliente não encontrado.');
      setCliente(null);
      return;
    }
    setCliente(data as Client);
  };

  useEffect(() => {
    if (!cliente) return;
    const channel = supabase
      .channel(`client-${cliente.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clients', filter: `id=eq.${cliente.id}` },
        (payload) => setCliente(payload.new as Client),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cliente?.id]);

  const operar = async (tipo: 'RECARGA' | 'DEBITO') => {
    if (!cliente) return;
    if (!valor || Number(valor) <= 0) {
      toast.warning('Digite um valor válido.');
      return;
    }
    setBusy(true);
    const rpc = tipo === 'RECARGA' ? 'recarregar_saldo' : 'debitar_saldo';
    const { error } = await supabase.rpc(rpc, {
      p_codigo: cliente.codigo,
      p_valor: Number(valor),
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setValor('');
    toast.success(tipo === 'RECARGA' ? 'Saldo recarregado!' : 'Saldo debitado.');
  };

  const cadastrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCodigo || !novoNome) {
      toast.warning('Preencha os campos.');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('clients')
      .insert({ codigo: Number(novoCodigo), nome: novoNome });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Cliente cadastrado com sucesso!');
    setNovoCodigo('');
    setNovoNome('');
  };

  const iniciais = cliente?.nome
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') ?? '?';

  return (
    <div className="min-h-screen bg-ejc-bg">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-[88px] pb-12 md:px-6 lg:pt-[100px]">

        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ejc-blue">
            Caixa
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ejc-primary mt-1 tracking-tight">
            Buscar cliente
          </h1>
          <p className="text-ejc-muted text-sm mt-1">
            Informe o código do crachá para ver saldo, recarregar ou debitar.
          </p>
        </header>

        <form onSubmit={buscarCliente} className="flex gap-2 mb-6">
          <div className="flex-1">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Código do crachá"
              value={codigoBusca}
              onChange={(e) => setCodigoBusca(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
          <Button type="submit" size="lg">Buscar</Button>
        </form>

        {cliente && (
          <motion.div
            key={cliente.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 mb-6"
          >
            <Card className="overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-ejc-yellow via-ejc-blue via-ejc-green to-ejc-red" />
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-ejc-primary/10 text-ejc-primary flex items-center justify-center font-display font-bold text-lg">
                    {iniciais}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] uppercase tracking-wide text-ejc-muted">
                      Código #{cliente.codigo}
                    </p>
                    <h2 className="font-semibold text-ejc-text text-lg truncate">
                      {cliente.nome}
                    </h2>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[12px] uppercase tracking-wide text-ejc-muted flex items-center gap-1 sm:justify-end">
                    <Wallet size={12} /> Saldo
                  </p>
                  <p className="font-display text-3xl font-extrabold text-ejc-primary tabular-nums">
                    R$ {Number(cliente.saldo).toFixed(2)}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-4">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  label="Valor da operação"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />

                <div>
                  <p className="text-[12px] uppercase tracking-wide text-ejc-muted mb-2">
                    Valores rápidos
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_VALUES.map((v) => {
                      const active = valor === String(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setValor(String(v))}
                          className={cn(
                            "h-11 rounded-lg font-semibold text-sm border transition-colors",
                            active
                              ? "bg-ejc-primary text-white border-ejc-primary"
                              : "bg-white text-ejc-primary border-ejc-border hover:border-ejc-primary/50",
                          )}
                        >
                          R$ {v}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={() => operar('RECARGA')}
                    loading={busy}
                  >
                    <ArrowDownToLine size={16} /> Recarregar
                  </Button>
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={() => operar('DEBITO')}
                    loading={busy}
                  >
                    <ArrowUpFromLine size={16} /> Debitar
                  </Button>
                </div>
              </CardBody>
            </Card>

            <TransactionHistory
              clienteId={cliente.id}
              clienteCodigo={cliente.codigo}
            />
          </motion.div>
        )}

        <Card className="mt-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus size={18} /> Cadastrar novo cliente
            </CardTitle>
            <CardDescription>
              Crie um novo crachá com saldo inicial zero.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <form
              onSubmit={cadastrarCliente}
              className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2"
            >
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Código"
                value={novoCodigo}
                onChange={(e) => setNovoCodigo(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Nome completo"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
              <Button type="submit" size="lg" loading={busy}>Cadastrar</Button>
            </form>
          </CardBody>
        </Card>

      </main>
    </div>
  );
};

export default Home;
