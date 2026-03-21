import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const categorias = {
  ALIMENTO: "🍔 Alimentos",
  BEBIDA: "🥤 Bebidas",
  DOCE: "🍫 Doces",
  ARTIGO_RELIGIOSO: "🙇🏻‍♂️ Artigos Religiosos"
};

export default function Sale() {

  const navigate = useNavigate();

  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);

  /* =========================
     BUSCAR CLIENTE
  ========================= */
  const buscarCliente = async () => {
    if (!codigo) return;

    const res = await fetch(`${API_URL}/api/client/${codigo}`);
    const data = await res.json();

    if (res.ok) {
      setCliente(data);
      buscarProdutos();
    } else {
      alert("Cliente não encontrado");
      setCliente(null);
    }
  };

  /* =========================
     PRODUTOS
  ========================= */
  const buscarProdutos = async () => {
    const res = await fetch(`${API_URL}/api/product`);
    const data = await res.json();
    setProdutos(data);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (cliente) buscarProdutos();
    }, 3000);

    return () => clearInterval(interval);
  }, [cliente]);

  /* =========================
     CARRINHO
  ========================= */

  const adicionar = (p: any) => {

    const item = carrinho.find(i => i._id === p._id);

    if (item) {
      setCarrinho(carrinho.map(i =>
        i._id === p._id
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ));
    } else {
      setCarrinho([...carrinho, {
        _id: p._id,
        nome: p.nome,
        preco: p.preco,
        quantidade: 1
      }]);
    }
  };

  const diminuir = (p: any) => {
    setCarrinho(
      carrinho
        .map(i =>
          i._id === p._id
            ? { ...i, quantidade: i.quantidade - 1 }
            : i
        )
        .filter(i => i.quantidade > 0)
    );
  };

  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0
  );

  /* =========================
     FINALIZAR
  ========================= */

  const finalizar = async () => {

    if (!carrinho.length) {
      alert("Carrinho vazio");
      return;
    }

    const response = await fetch(`${API_URL}/api/sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        codigo: Number(codigo),
        itens: carrinho
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert("Venda realizada!");
      setCarrinho([]);
      buscarCliente();
    } else {
      alert(data.message);
    }
  };

  return (

    <div className="home-page">

      {/* NAVBAR */}
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

        {/* BUSCA */}
        <div className="box">
          <input
            placeholder="Código do cliente"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <button onClick={buscarCliente}>Buscar</button>
        </div>

        {/* CLIENTE */}
        {cliente && (
          <div className="cliente-card">
            <h3>{cliente.nome}</h3>
            <p className="saldo">
              Saldo: R$ {cliente.saldo.toFixed(2)}
            </p>
          </div>
        )}

        {/* PRODUTOS */}
        {Object.entries(categorias).map(([key, label]) => {

          const lista = produtos.filter(
            p => p.categoria === key && p.quantidade > 0
          );

          if (!lista.length) return null;

          return (
            <div key={key} className="categoria">

              <h3>{label}</h3>

              {lista.map((p) => {

  const item = carrinho.find(i => i._id === p._id);

  return (
    <div key={p._id} className="produto-item">

      <div className="produto-info">
        <span className="produto-nome">{p.nome}</span>

        <span className="produto-estoque">
          {p.quantidade} disponíveis
        </span>
      </div>

      <div className="produto-preco">
        R$ {p.preco.toFixed(2)}
      </div>

      <div className="controle">
        <button onClick={() => diminuir(p)}>-</button>

        <span className="qtd">
          {item?.quantidade || 0}
        </span>

        <button onClick={() => adicionar(p)}>+</button>
      </div>

    </div>
  );
})}

            </div>
          );
        })}

        {/* CARRINHO */}
        {carrinho.length > 0 && (
          <div className="carrinho-fixo">

            <h3>Carrinho</h3>

            {carrinho.map(item => (
              <div key={item._id} className="carrinho-item">
                <span>{item.nome}</span>
                <span>{item.quantidade}x</span>
                <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
              </div>
            ))}

            <div className="total">
              Total: R$ {total.toFixed(2)}
            </div>

            <button className="btn-finalizar" onClick={finalizar}>
              Finalizar Venda
            </button>

          </div>
        )}

      </div>

    </div>
  );
}