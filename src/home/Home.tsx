import React, { useState } from 'react';
import './home.css';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import * as XLSX from 'xlsx';

interface Cliente {
  codigo: number;
  nome: string;
  saldo: number;
}

interface Transacao {
  tipo: string;
  valor: number;
  data: string;
}

const Home = () => {
  const navigate = useNavigate();
  const token = Cookies.get('token');

  const [codigoBusca, setCodigoBusca] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [valor, setValor] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [historico, setHistorico] = useState<Transacao[]>([]);

  const handleLogout = () => {
    Cookies.remove('token');
    navigate('/login');
  };

  const buscarHistorico = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/client/${codigoBusca}/history`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setHistorico(data);
      }
    } catch {
      console.log('Erro ao buscar histórico');
    }
  };

  const buscarCliente = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/client/${codigoBusca}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setCliente(data);
        buscarHistorico();
      } else {
        alert(data.message);
        setCliente(null);
        setHistorico([]);
      }
    } catch {
      alert('Erro ao buscar cliente');
    }
  };

  const recarregar = async () => {
    await fetch(
      `http://localhost:3000/api/client/${codigoBusca}/recharge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ valor: Number(valor) })
      }
    );

    setValor('');
    buscarCliente();
  };

  const debitar = async () => {
    await fetch(
      `http://localhost:3000/api/client/${codigoBusca}/debit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ valor: Number(valor) })
      }
    );

    setValor('');
    buscarCliente();
  };

  const cadastrarCliente = async () => {
    const response = await fetch('http://localhost:3000/api/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        codigo: Number(novoCodigo),
        nome: novoNome
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Cliente cadastrado com sucesso!');
      setNovoCodigo('');
      setNovoNome('');
    } else {
      alert(data.message);
    }
  };

  const exportarExcel = () => {
    if (!historico.length) {
      alert('Sem histórico para exportar');
      return;
    }

    const dadosFormatados = historico.map((item) => ({
      Tipo: item.tipo,
      Valor: item.valor,
      Data: new Date(item.data).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(dadosFormatados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');

    XLSX.writeFile(wb, `relatorio_cliente_${codigoBusca}.xlsx`);
  };

  return (
    <div className="home-page">
      <nav id="home-bar">
        <div id="brand">BODEGA EAC</div>
        <div id="options">
          <button onClick={handleLogout}>SAIR</button>
        </div>
      </nav>

      <div className="home-content">
        <h2>Buscar Cliente</h2>
        <div className="box">
          <input
            type="number"
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
              <p>Saldo: R$ {cliente.saldo.toFixed(2)}</p>

              <input
                type="number"
                placeholder="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />

              <div className="actions">
                <button className="btn-green" onClick={recarregar}>
                  Recarregar
                </button>
                <button className="btn-red" onClick={debitar}>
                  Debitar
                </button>
              </div>
            </div>

            {historico.length > 0 && (
              <div className="historico">
                <div className="historico-header">
                  <h3>Histórico</h3>
                  <button onClick={exportarExcel}>
                    Exportar Excel
                  </button>
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
                    {historico.map((item, index) => (
                      <tr key={index}>
                        <td>{item.tipo}</td>
                        <td>R$ {item.valor.toFixed(2)}</td>
                        <td>
                          {new Date(item.data).toLocaleString()}
                        </td>
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