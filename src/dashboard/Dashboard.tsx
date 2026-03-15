import React, { useEffect, useState } from "react";
import "./dashboard.css";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

interface DashboardData {
  totalRecarga: number;
  totalDebito: number;
  saldoBodega: number;
  clientes: number;
  transacoes: number;
}

const Dashboard = () => {

  const navigate = useNavigate();
  const token = Cookies.get("token");

  const [dados, setDados] = useState<DashboardData | null>(null);

  const handleLogout = () => {
    Cookies.remove("token");
    navigate("/login");
  };

  const buscarDashboard = async () => {

    try {

      const response = await fetch(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setDados(data);
      }

    } catch (error) {

      console.log("Erro ao carregar dashboard");

    }

  };

  useEffect(() => {

    buscarDashboard();

  }, []);

  if (!dados) return <p style={{ padding: 40 }}>Carregando...</p>;

  return (

    <div className="dashboard-page">

      <nav id="home-bar">

        <div id="brand">BODEGA EAC</div>

        <div id="options">

          <button onClick={() => navigate("/home")}>
            Home
          </button>

          <button onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>

          <button onClick={handleLogout}>
            Sair
          </button>

        </div>

      </nav>

      <div className="dashboard-content">

        <h2>Dashboard da Bodega</h2>

        <div className="cards">

          <div className="card">

            <h3>Total Recargas</h3>

            <p className="valor verde">
              R$ {dados.totalRecarga.toFixed(2)}
            </p>

          </div>

          <div className="card">

            <h3>Total Vendas</h3>

            <p className="valor vermelho">
              R$ {dados.totalDebito.toFixed(2)}
            </p>

          </div>

          <div className="card">

            <h3>Saldo da Bodega</h3>

            <p className="valor azul">
              R$ {dados.saldoBodega.toFixed(2)}
            </p>

          </div>

          <div className="card">

            <h3>Clientes cadastrados</h3>

            <p className="valor">
              {dados.clientes}
            </p>

          </div>

          <div className="card">

            <h3>Total transações</h3>

            <p className="valor">
              {dados.transacoes}
            </p>

          </div>

        </div>

      </div>

    </div>

  );
};

export default Dashboard;