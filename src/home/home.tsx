import { useState, useEffect } from 'react';
import './home.css';
import Navbar from '../components/navbar';
import { supabase, type Client } from '../lib/supabase';
import { useModal } from '../lib/modal';
import { TransactionHistory } from './transaction-history';

const Home = () => {
  const { notify } = useModal();

  const [codigoBusca, setCodigoBusca] = useState('');
  const [cliente, setCliente] = useState<Client | null>(null);
  const [valor, setValor] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');

  const definirValorRapido = (v: number) => setValor(String(v));

  const buscarCliente = async () => {
    if (!codigoBusca) {
      notify({ variant: 'warning', message: 'Digite o código do crachá.' });
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('codigo', Number(codigoBusca))
      .maybeSingle();

    if (error) {
      notify({ variant: 'error', message: 'Erro ao buscar cliente.' });
      return;
    }
    if (!data) {
      notify({ variant: 'warning', message: 'Cliente não encontrado.' });
      setCliente(null);
      return;
    }

    setCliente(data as Client);
  };

  // Realtime: atualiza saldo do cliente em tela ao detectar mudança
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cliente?.id]);

  const recarregar = async () => {
    if (!cliente) return;
    if (!valor || Number(valor) <= 0) {
      notify({ variant: 'warning', message: 'Digite um valor válido.' });
      return;
    }

    const { error } = await supabase.rpc('recarregar_saldo', {
      p_codigo: cliente.codigo,
      p_valor: Number(valor),
    });

    if (error) {
      notify({ variant: 'error', message: error.message });
      return;
    }
    setValor('');
  };

  const debitar = async () => {
    if (!cliente) return;
    if (!valor || Number(valor) <= 0) {
      notify({ variant: 'warning', message: 'Digite um valor válido.' });
      return;
    }

    const { error } = await supabase.rpc('debitar_saldo', {
      p_codigo: cliente.codigo,
      p_valor: Number(valor),
    });

    if (error) {
      notify({ variant: 'error', message: error.message });
      return;
    }
    setValor('');
  };

  const cadastrarCliente = async () => {
    if (!novoCodigo || !novoNome) {
      notify({ variant: 'warning', message: 'Preencha os campos.' });
      return;
    }

    const { error } = await supabase
      .from('clients')
      .insert({ codigo: Number(novoCodigo), nome: novoNome });

    if (error) {
      notify({ variant: 'error', message: error.message });
      return;
    }

    notify({ variant: 'success', message: 'Cliente cadastrado com sucesso!' });
    setNovoCodigo('');
    setNovoNome('');
  };

  return (
    <div className="home-page">

      <Navbar />

      <div className="home-content">

        <h2>Buscar Cliente</h2>

        <div className="box">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Código do crachá"
            value={codigoBusca}
            onChange={(e) => setCodigoBusca(e.target.value)}
          />
          <button onClick={buscarCliente}>Buscar</button>
        </div>

        {cliente && (
          <>
            <div className="cliente-card">
              <h3>{cliente.nome}</h3>

              <p className="saldo">
                Saldo: R$ {Number(cliente.saldo).toFixed(2)}
              </p>

              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="Digite o valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />

              <div className="quick-values">
                <button onClick={() => definirValorRapido(5)}>5</button>
                <button onClick={() => definirValorRapido(10)}>10</button>
                <button onClick={() => definirValorRapido(20)}>20</button>
              </div>

              <div className="actions">
                <button className="btn-green" onClick={recarregar}>Recarregar</button>
                <button className="btn-red" onClick={debitar}>Debitar</button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <TransactionHistory
                clienteId={cliente.id}
                clienteCodigo={cliente.codigo}
              />
            </div>
          </>
        )}

        <h2>Cadastrar Novo Cliente</h2>

        <div className="box">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Código"
            value={novoCodigo}
            onChange={(e) => setNovoCodigo(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nome"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <button onClick={cadastrarCliente}>Cadastrar</button>
        </div>

      </div>
    </div>
  );
};

export default Home;
