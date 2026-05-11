import { useState, useEffect } from 'react';
import './home.css';
import * as XLSX from 'xlsx';
import Navbar from '../components/navbar';
import { supabase, type Client, type Transaction } from '../lib/supabase';

const Home = () => {

  const [codigoBusca, setCodigoBusca] = useState('');
  const [cliente, setCliente] = useState<Client | null>(null);
  const [valor, setValor] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [historico, setHistorico] = useState<Transaction[]>([]);

  const definirValorRapido = (v: number) => setValor(String(v));

  const buscarHistorico = async (clienteId: string) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Erro ao buscar histórico', error.message);
      setHistorico([]);
      return;
    }
    setHistorico((data ?? []) as Transaction[]);
  };

  const buscarCliente = async () => {
    if (!codigoBusca) {
      alert('Digite o código do crachá');
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('codigo', Number(codigoBusca))
      .maybeSingle();

    if (error) {
      alert('Erro ao buscar cliente');
      return;
    }
    if (!data) {
      alert('Cliente não encontrado');
      setCliente(null);
      setHistorico([]);
      return;
    }

    setCliente(data as Client);
    await buscarHistorico((data as Client).id);
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `cliente_id=eq.${cliente.id}` },
        () => buscarHistorico(cliente.id),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cliente?.id]);

  const recarregar = async () => {
    if (!cliente) return;
    if (!valor || Number(valor) <= 0) {
      alert('Digite um valor válido');
      return;
    }

    const { error } = await supabase.rpc('recarregar_saldo', {
      p_codigo: cliente.codigo,
      p_valor: Number(valor),
    });

    if (error) {
      alert(error.message);
      return;
    }
    setValor('');
  };

  const debitar = async () => {
    if (!cliente) return;
    if (!valor || Number(valor) <= 0) {
      alert('Digite um valor válido');
      return;
    }

    const { error } = await supabase.rpc('debitar_saldo', {
      p_codigo: cliente.codigo,
      p_valor: Number(valor),
    });

    if (error) {
      alert(error.message);
      return;
    }
    setValor('');
  };

  const cadastrarCliente = async () => {
    if (!novoCodigo || !novoNome) {
      alert('Preencha os campos');
      return;
    }

    const { error } = await supabase
      .from('clients')
      .insert({ codigo: Number(novoCodigo), nome: novoNome });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Cliente cadastrado com sucesso!');
    setNovoCodigo('');
    setNovoNome('');
  };

  const exportarExcel = () => {
    if (!historico.length) {
      alert('Sem histórico para exportar');
      return;
    }

    const dadosFormatados = historico.map((item) => ({
      Tipo: item.tipo,
      Valor: item.valor,
      Data: new Date(item.created_at).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(dadosFormatados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
    XLSX.writeFile(wb, `relatorio_cliente_${codigoBusca}.xlsx`);
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

            {historico.length > 0 && (
              <div className="historico">
                <div className="historico-header">
                  <h3>Histórico</h3>
                  <button onClick={exportarExcel}>Exportar Excel</button>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((item) => (
                      <tr key={item.id}>
                        <td>{item.tipo}</td>
                        <td>R$ {Number(item.valor).toFixed(2)}</td>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
