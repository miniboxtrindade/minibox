import { useState, useEffect } from "react";
import '../home/home.css';
import Navbar from '../components/navbar';
import { supabase, type Product } from '../lib/supabase';

const categorias: Product['categoria'][] = ['ALIMENTO', 'BEBIDA', 'DOCE', 'ARTIGO_RELIGIOSO'];

const labels: Record<Product['categoria'], string> = {
  ALIMENTO: "🍔 Alimento",
  BEBIDA: "🥤 Bebida",
  DOCE: "🍫 Doce",
  ARTIGO_RELIGIOSO: "🙇🏻‍♂️ Artigo Religioso",
};

export default function ProductPage() {

  const [produtos, setProdutos] = useState<Product[]>([]);
  const [novo, setNovo] = useState({
    nome: "",
    preco: "",
    quantidade: "",
    categoria: "ALIMENTO" as Product['categoria'],
  });

  const buscar = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('nome');

    if (error) {
      alert('Erro ao buscar produtos');
      return;
    }
    setProdutos((data ?? []) as Product[]);
  };

  useEffect(() => {
    buscar();

    const channel = supabase
      .channel('admin-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => buscar(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const criarProduto = async () => {
    if (!novo.nome || !novo.preco || !novo.quantidade) {
      alert('Preencha todos os campos');
      return;
    }

    const { error } = await supabase.from('products').insert({
      nome: novo.nome,
      preco: Number(novo.preco),
      quantidade: Number(novo.quantidade),
      categoria: novo.categoria,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNovo({ nome: "", preco: "", quantidade: "", categoria: "ALIMENTO" });
  };

  const atualizar = async (id: string, campo: string, valor: unknown) => {
    const { error } = await supabase
      .from('products')
      .update({ [campo]: valor, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) alert(error.message);
  };

  const deletar = async (id: string) => {
    if (!confirm('Deseja excluir?')) return;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(error.message);
  };

  return (
    <div className="home-page">

      <Navbar />

      <div className="home-content">

        <h2>Produtos</h2>

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
            onChange={(e) => setNovo({ ...novo, categoria: e.target.value as Product['categoria'] })}
          >
            {categorias.map(c => (
              <option key={c} value={c}>{labels[c]}</option>
            ))}
          </select>
          <button className="btn-green" onClick={criarProduto}>Adicionar</button>
        </div>

        <button onClick={buscar}>🔄 Atualizar lista</button>

        {produtos.map((p) => (
          <div key={p.id} className="produto-edit-card">
            <input
              value={p.nome}
              onChange={(e) => atualizar(p.id, 'nome', e.target.value)}
            />
            <input
              type="number"
              value={p.preco}
              onChange={(e) => atualizar(p.id, 'preco', Number(e.target.value))}
            />
            <input
              type="number"
              value={p.quantidade}
              onChange={(e) => atualizar(p.id, 'quantidade', Number(e.target.value))}
            />
            <select
              value={p.categoria}
              onChange={(e) => atualizar(p.id, 'categoria', e.target.value)}
            >
              {categorias.map(c => (
                <option key={c} value={c}>{labels[c]}</option>
              ))}
            </select>
            <button className="btn-red" onClick={() => deletar(p.id)}>Excluir</button>
          </div>
        ))}

      </div>
    </div>
  );
}
