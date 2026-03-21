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
  const [carrinho, setCarrinho] = useState<any[]>([]);

  /* =========================
     BUSCAR CLIENTE
  ========================= */

  const buscarCliente = async () => {

    const response = await fetch(`${API_URL}/api/client/${codigo}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });

    const data = await response.json();

    if (response.ok) {
      setCliente(data);
      buscarProdutos();
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
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });

    const data = await response.json();

    if (response.ok) {
      setProdutos(data);
    }

  };

  /* =========================
     ATUALIZAÇÃO EM TEMPO REAL
  ========================= */

  useEffect(() => {

    const interval = setInterval(() => {
      if (cliente) {
        buscarProdutos();
        buscarCliente();
      }
    }, 3000);

    return () => clearInterval(interval);

  }, [cliente]);

  /* =========================
     CARRINHO
  ========================= */

  const adicionar = (produto: Produto) => {

    const estoqueAtual = produto.quantidade;

    const itemCarrinho = carrinho.find(i => i._id === produto._id);
    const quantidadeNoCarrinho = itemCarrinho ? itemCarrinho.quantidade : 0;

    if (quantidadeNoCarrinho >= estoqueAtual) {
      alert("Sem estoque suficiente");
      return;
    }

    if (itemCarrinho) {

      setCarrinho(carrinho.map(i =>
        i._id === produto._id
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ));

    } else {

      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);

    }

  };

  const diminuir = (produto: any) => {

    const atualizado = carrinho
      .map(i =>
        i._id === produto._id
          ? { ...i, quantidade: i.quantidade - 1 }
          : i
      )
      .filter(i => i.quantidade > 0);

    setCarrinho(atualizado);

  };

  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );

  /* =========================
     FINALIZAR
  ========================= */

  const finalizar = async () => {

    if (!cliente) {
      alert("Busque um cliente");
      return;
    }

    if (total > cliente.saldo) {
      alert("Saldo insuficiente");
      return;
    }

    const itensFormatados = carrinho.flatMap(item =>
      Array(item.quantidade).fill({ id: item._id })
    );

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
            <p>Saldo: R$ {cliente.saldo.toFixed(2)}</p>
          </div>
        )}

        {/* PRODUTOS */}
        {produtos.map((p) => {

          const itemCarrinho = carrinho.find(i => i._id === p._id);

          return (
            <div key={p._id} className="produto-linha">

              <div>
                <strong>{p.nome}</strong>
                <p>Estoque: {p.quantidade}</p>
              </div>

              <div>R$ {p.preco}</div>

              <div className="contador">

                <button onClick={() => diminuir(p)}>-</button>

                <span>{itemCarrinho?.quantidade || 0}</span>

                <button onClick={() => adicionar(p)}>+</button>

              </div>

            </div>
          );
        })}

        {/* CARRINHO */}
        {carrinho.length > 0 && (
          <div className="cliente-card">

            <h3>Carrinho</h3>

            {carrinho.map(item => (
              <div key={item._id} className="carrinho-linha">

                <span>{item.nome}</span>

                <span>{item.quantidade}x</span>

                <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>

              </div>
            ))}

            <h2>Total: R$ {total.toFixed(2)}</h2>

            <button className="btn-green" onClick={finalizar}>
              Finalizar Venda
            </button>

          </div>
        )}

      </div>

    </div>
  );
}
//atualizar