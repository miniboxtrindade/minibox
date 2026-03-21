import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const Sale = () => {

  const [codigo, setCodigo] = useState("");
  const [itens, setItens] = useState<any[]>([]);
  const [produto, setProduto] = useState("");
  const [preco, setPreco] = useState("");

  const adicionarItem = () => {
    if (!produto || !preco) return;

    setItens([...itens, {
      nome: produto,
      preco: Number(preco)
    }]);

    setProduto("");
    setPreco("");
  };

  const total = itens.reduce((acc, i) => acc + i.preco, 0);

  const finalizarCompra = async () => {
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
    } else {
      alert(data.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Venda</h2>

      <input
        placeholder="Código do cliente"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />

      <h3>Adicionar produto</h3>

      <input
        placeholder="Nome"
        value={produto}
        onChange={(e) => setProduto(e.target.value)}
      />

      <input
        placeholder="Preço"
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
      />

      <button onClick={adicionarItem}>Adicionar</button>

      <h3>Itens</h3>

      {itens.map((i, index) => (
        <p key={index}>
          {i.nome} - R$ {i.preco}
        </p>
      ))}

      <h2>Total: R$ {total}</h2>

      <button onClick={finalizarCompra}>
        Finalizar Compra
      </button>
    </div>
  );
};

export default Sale;