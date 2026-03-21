import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function Product() {

  const navigate = useNavigate();

  const [produtos, setProdutos] = useState<any[]>([]);

  const [novo, setNovo] = useState({
    nome: "",
    preco: "",
    quantidade: "",
    categoria: "ALIMENTO"
  });

  /* =========================
     BUSCAR PRODUTOS
  ========================= */
  const buscar = async () => {
    try {
      const res = await fetch(`${API_URL}/api/product`);
      const data = await res.json();
      setProdutos(data);
    } catch {
      alert("Erro ao buscar produtos");
    }
  };

  useEffect(() => {
    buscar();
  }, []);

  /* =========================
     CRIAR PRODUTO
  ========================= */
  const criarProduto = async () => {

    if (!novo.nome || !novo.preco || !novo.quantidade) {
      alert("Preencha todos os campos");
      return;
    }

    try {
      await fetch(`${API_URL}/api/product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome: novo.nome,
          preco: Number(novo.preco),
          quantidade: Number(novo.quantidade),
          categoria: novo.categoria
        })
      });

      setNovo({
        nome: "",
        preco: "",
        quantidade: "",
        categoria: "ALIMENTO"
      });

      buscar();

    } catch {
      alert("Erro ao criar produto");
    }
  };

  /* =========================
     ATUALIZAR
  ========================= */
  const atualizar = async (id: string, campo: string, valor: any) => {

    try {
      await fetch(`${API_URL}/api/product/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor })
      });

      buscar();
    } catch {
      alert("Erro ao atualizar produto");
    }
  };

  /* =========================
     DELETAR
  ========================= */
  const deletar = async (id: string) => {

    if (!confirm("Deseja excluir?")) return;

    try {
      await fetch(`${API_URL}/api/product/${id}`, {
        method: "DELETE"
      });

      buscar();
    } catch {
      alert("Erro ao deletar produto");
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

        <h2>Produtos</h2>

        {/* 🔥 FORM CRIAR PRODUTO */}
        <div className="produto-edit-card">

          <input
            placeholder="Nome"
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          />

          <input
            type="number"
            placeholder="Preço"
            value={novo.preco}
            onChange={(e) => setNovo({ ...novo, preco: e.target.value })}
          />

          <input
            type="number"
            placeholder="Estoque"
            value={novo.quantidade}
            onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })}
          />

          <select
            value={novo.categoria}
            onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}
          >
            <option value="ALIMENTO">🍔 Alimento</option>
            <option value="BEBIDA">🥤 Bebida</option>
            <option value="DOCE">🍫 Doce</option>
            <option value="ARTIGO_RELIGIOSO">🙇🏻‍♂️ Artigo Religioso</option>
          </select>

          <button className="btn-green" onClick={criarProduto}>
            Adicionar
          </button>

        </div>

        {/* BOTÃO ATUALIZAR */}
        <button onClick={buscar}>
          🔄 Atualizar lista
        </button>

        {/* LISTA */}
        {produtos.map((p: any) => (

          <div key={p._id} className="produto-edit-card">

            <input
              value={p.nome}
              onChange={(e) => atualizar(p._id, "nome", e.target.value)}
            />

            <input
              type="number"
              value={p.preco}
              onChange={(e) => atualizar(p._id, "preco", Number(e.target.value))}
            />

            <input
              type="number"
              value={p.quantidade}
              onChange={(e) => atualizar(p._id, "quantidade", Number(e.target.value))}
            />

            <select
              value={p.categoria || "ALIMENTO"}
              onChange={(e) => atualizar(p._id, "categoria", e.target.value)}
            >
              <option value="ALIMENTO">🍔 Alimento</option>
              <option value="BEBIDA">🥤 Bebida</option>
              <option value="DOCE">🍫 Doce</option>
              <option value="ARTIGO_RELIGIOSO">🙇🏻‍♂️ Artigo Religioso</option>
            </select>

            <button className="btn-red" onClick={() => deletar(p._id)}>
              Excluir
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}