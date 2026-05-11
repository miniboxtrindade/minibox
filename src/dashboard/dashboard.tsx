import { useEffect, useState } from "react";
import "./dashboard.css";
import Navbar from "../components/navbar";
import { supabase } from "../lib/supabase";

interface DashboardData {
  total_recarga: number;
  total_debito: number;
  saldo_bodega: number;
  clientes: number;
  transacoes: number;
}

const Dashboard = () => {

  const [dados, setDados] = useState<DashboardData | null>(null);

  const buscarDashboard = async () => {
    const { data, error } = await supabase.rpc('get_dashboard');
    if (error) {
      console.log('Erro ao carregar dashboard', error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setDados(row as DashboardData);
  };

  useEffect(() => {
    buscarDashboard();

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => buscarDashboard(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => buscarDashboard(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!dados) return <p style={{ padding: 40 }}>Carregando...</p>;

  return (
    <div className="dashboard-page">

      <Navbar />

      <div className="dashboard-content">

        <h2>Dashboard da Bodega</h2>

        <div className="cards">
          <div className="card">
            <h3>Total Recargas</h3>
            <p className="valor verde">R$ {Number(dados.total_recarga).toFixed(2)}</p>
          </div>

          <div className="card">
            <h3>Total Vendas</h3>
            <p className="valor vermelho">R$ {Number(dados.total_debito).toFixed(2)}</p>
          </div>

          <div className="card">
            <h3>Saldo da Bodega</h3>
            <p className="valor azul">R$ {Number(dados.saldo_bodega).toFixed(2)}</p>
          </div>

          <div className="card">
            <h3>Clientes cadastrados</h3>
            <p className="valor">{dados.clientes}</p>
          </div>

          <div className="card">
            <h3>Total transações</h3>
            <p className="valor">{dados.transacoes}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
