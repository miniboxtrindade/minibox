import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const API_URL = import.meta.env.VITE_API_URL;

interface Produto {
  _id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export default function Sale() {

  const navigate = useNavigate();
  const token = Cookies.get("token");

  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState<any>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<Produto[]>([]);

  /* =========================
     BUSCAR CLIENTE
  ========================= */

  const buscarCliente = async () => {

    const response = await fetch(`${API_URL}/api/client/${codigo}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok) {
      setCliente(data);
      buscarProdutos(); // 🔥 carrega produtos ao buscar cliente
    } else {
      alert("Cliente não encontrado");
      setCliente(null);
    }

  };

  /* =========================
     BUSCAR PRODUTOS
  ========================= */

  const buscarProdutos = async () => {

    const response = await fetch(`${API_URL}/api/product`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok) {
      setProdutos(data);
    }

  };

  /* =========================
     CARRINHO
  ========================= */

  const adicionar = (produto: Produto) => {

    setCarrinho([...carrinho, produto]);

  };

  const remover = (index: number) => {

    setCarrinho(carrinho.filter((_, i) => i !== index));

  };

  const total = carrinho.reduce((acc, item) => acc + item.preco, 0);

  /* =========================
     FINALIZAR
  ========================= */

  const finalizar = async () => {

    const itensFormatados = carrinho.map(i => ({
      id: i._id
    }));

    const response = await fetch(`${API_URL}/api/sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        codigo: Number(codigo),
        itens: itensFormatados
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert("Venda concluída!");
      setCarrinho([]);
      buscarCliente();
      buscarProdutos();
    } else {
      alert(data.message);
    }

  };

  /* ========================= */

  return (

    <div>

      <nav id="home-bar">
        <div id="brand">BODEGA EAC</div>

        <div id="options">
          <button onClick={() => navigate("/home")}>Home</button>
          <button onClick={() => navigate("/sale")}>Venda</button>
          <button onClick={() => navigate("/product")}>Produtos</button>
        </div>
      </nav>

      <div className="home-content">

        <h2>Venda</h2>

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

        {cliente && (
          <div className="cliente-card">
            <h3>{cliente.nome}</h3>
            <p>Saldo: R$ {cliente.saldo}</p>
          </div>
        )}

        {/* PRODUTOS */}
        {produtos.map((p) => (

          <div key={p._id} className="cliente-card">

            <h3>{p.nome}</h3>

            <p>Estoque: {p.quantidade}</p>
            <p>R$ {p.preco}</p>

            <button
              className="btn-green"
              onClick={() => adicionar(p)}
              disabled={p.quantidade <= 0}
            >
              +
            </button>

          </div>

        ))}

        {/* CARRINHO */}
        {carrinho.length > 0 && (

          <div className="cliente-card">

            <h3>Carrinho</h3>

            {carrinho.map((item, i) => (
              <div key={i}>
                {item.nome} - R$ {item.preco}
                <button onClick={() => remover(i)}>X</button>
              </div>
            ))}

            <h2>Total: R$ {total}</h2>

            <button className="btn-green" onClick={finalizar}>
              Finalizar Venda
            </button>

          </div>

        )}

      </div>

    </div>
  );

}