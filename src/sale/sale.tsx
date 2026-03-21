import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const API_URL = import.meta.env.VITE_API_URL;

interface Item {
  nome: string;
  preco: number;
}

interface Cliente {
  nome: string;
  saldo: number;
}

export default function Sale() {

  const navigate = useNavigate();
  const token = Cookies.get("token");

  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [produto, setProduto] = useState("");
  const [preco, setPreco] = useState("");
  const [itens, setItens] = useState<Item[]>([]);

  /* =========================
     BUSCAR CLIENTE
  ========================= */

  const buscarCliente = async () => {

    if (!codigo) return;

    const response = await fetch(`${API_URL}/api/client/${codigo}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok) {
      setCliente(data);
    } else {
      alert("Cliente não encontrado");
      setCliente(null);
    }

  };

  /* =========================
     ADICIONAR ITEM
  ========================= */

  const adicionarItem = () => {

    if (!produto || !preco) return;

    setItens([...itens, {
      nome: produto,
      preco: Number(preco)
    }]);

    setProduto("");
    setPreco("");
  };

  const removerItem = (index: number) => {
    const novos = itens.filter((_, i) => i !== index);
    setItens(novos);
  };

  const total = itens.reduce((acc, i) => acc + i.preco, 0);

  /* =========================
     FINALIZAR VENDA
  ========================= */

  const finalizarCompra = async () => {

    if (!cliente) {
      alert("Busque um cliente primeiro");
      return;
    }

    if (!itens.length) {
      alert("Adicione itens");
      return;
    }

    const response = await fetch(`${API_URL}/api/sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        codigo: Number(codigo),
        itens
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert("Compra realizada!");

      setItens([]);
      buscarCliente(); // atualiza saldo
    } else {
      alert(data.message);
    }

  };

  /* =========================
     LOGOUT
  ========================= */

  const handleLogout = () => {
    Cookies.remove("token");
    navigate("/login");
  };

  return (

    <div>

      {/* NAVBAR */}
      <nav id="home-bar">

        <div id="brand">BODEGA EAC</div>

        <div id="options">
          <button onClick={() => navigate("/home")}>Home</button>
          <button onClick={() => navigate("/sale")}>Venda</button>
          <button onClick={() => navigate("/product")}>Produtos</button>
          <button onClick={handleLogout}>Sair</button>
        </div>

      </nav>

      <div className="home-content">

        <h2>Venda</h2>

        {/* BUSCA CLIENTE */}
        <div className="box">

          <input
            placeholder="Código do cliente"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />

          <button onClick={buscarCliente}>
            Buscar
          </button>

        </div>

        {/* CLIENTE */}
        {cliente && (
          <div className="cliente-card">
            <h3>{cliente.nome}</h3>
            <p>Saldo: R$ {cliente.saldo.toFixed(2)}</p>
          </div>
        )}

        {/* ADICIONAR PRODUTO */}
        <h3>Adicionar item</h3>

        <div className="box">

          <input
            placeholder="Produto"
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
          />

          <input
            placeholder="Preço"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />

          <button onClick={adicionarItem}>
            Adicionar
          </button>

        </div>

        {/* LISTA DE ITENS */}
        {itens.length > 0 && (

          <div className="cliente-card">

            <h3>Carrinho</h3>

            {itens.map((item, index) => (
              <div key={index} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{item.nome} - R$ {item.preco}</span>
                <button onClick={() => removerItem(index)}>X</button>
              </div>
            ))}

            <h2>Total: R$ {total.toFixed(2)}</h2>

            <button className="btn-green" onClick={finalizarCompra}>
              Finalizar Compra
            </button>

          </div>

        )}

      </div>

    </div>
  );

}