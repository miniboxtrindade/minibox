import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function Product() {

  const [produtos, setProdutos] = useState([]);

  const buscar = async () => {
    const res = await fetch(`${API_URL}/api/product`);
    const data = await res.json();
    setProdutos(data);
  };

  useEffect(() => {
    buscar();
  }, []);

  const atualizar = async (id: string, campo: string, valor: any) => {

    await fetch(`${API_URL}/api/product/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor })
    });

    buscar();
  };

  const deletar = async (id: string) => {

    if (!confirm("Deseja excluir?")) return;

    await fetch(`${API_URL}/api/product/${id}`, {
      method: "DELETE"
    });

    buscar();
  };

  return (

    <div className="home-content">

      <h2>Produtos</h2>

      {produtos.map((p: any) => (

        <div key={p._id} className="produto-edit">

          <input
            value={p.nome}
            onChange={(e) => atualizar(p._id, "nome", e.target.value)}
          />

          <input
            type="number"
            value={p.preco}
            onChange={(e) => atualizar(p._id, "preco", e.target.value)}
          />

          <input
            type="number"
            value={p.quantidade}
            onChange={(e) => atualizar(p._id, "quantidade", e.target.value)}
          />

          <select
            value={p.categoria}
            onChange={(e) => atualizar(p._id, "categoria", e.target.value)}
          >
            <option value="ALIMENTO">Alimento</option>
            <option value="BEBIDA">Bebida</option>
            <option value="DOCE">Doce</option>
          </select>

          <button className="btn-red" onClick={() => deletar(p._id)}>
            Excluir
          </button>

        </div>

      ))}

    </div>
  );
}