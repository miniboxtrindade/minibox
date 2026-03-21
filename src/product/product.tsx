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

export default function Product() {

  const navigate = useNavigate();
  const token = Cookies.get("token");

  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");

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

  useEffect(() => {
    buscarProdutos();
  }, []);

  /* =========================
     CADASTRAR PRODUTO
  ========================= */

  const cadastrarProduto = async () => {

    if (!nome || !preco || !quantidade) {
      alert("Preencha todos os campos");
      return;
    }

    const response = await fetch(`${API_URL}/api/product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        nome,
        preco: Number(preco),
        quantidade: Number(quantidade)
      })
    });

    if (response.ok) {
      alert("Produto cadastrado!");
      setNome("");
      setPreco("");
      setQuantidade("");
      buscarProdutos();
    }

  };

  /* =========================
     ATUALIZAR PRODUTO
  ========================= */

  const atualizarProduto = async (id: string, novoPreco: number, novaQtd: number) => {

    const response = await fetch(`${API_URL}/api/product/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        preco: novoPreco,
        quantidade: novaQtd
      })
    });

    if (response.ok) {
      alert("Produto atualizado!");
      buscarProdutos();
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

        <h2>Produtos</h2>

        {/* CADASTRO */}
        <div className="box">

          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            placeholder="Preço"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />

          <input
            placeholder="Quantidade"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />

          <button onClick={cadastrarProduto}>
            Cadastrar
          </button>

        </div>

        {/* LISTA */}
        {produtos.map((p) => (

          <div key={p._id} className="cliente-card">

            <h3>{p.nome}</h3>

            <p>Preço: R$ {p.preco}</p>
            <p>Quantidade: {p.quantidade}</p>

            <div className="actions">

              <button
                className="btn-green"
                onClick={() => {
                  const novoPreco = Number(prompt("Novo preço:", String(p.preco)));
                  const novaQtd = Number(prompt("Nova quantidade:", String(p.quantidade)));

                  atualizarProduto(p._id, novoPreco, novaQtd);
                }}
              >
                Editar
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );

}