import { useState, useEffect } from "react";
import Navbar from '../components/navbar';
import { supabase, type Client, type Product } from '../lib/supabase';

const categorias: Record<Product['categoria'], string> = {
  ALIMENTO: "🍔 Alimentos",
  BEBIDA: "🥤 Bebidas",
  DOCE: "🍫 Doces",
  ARTIGO_RELIGIOSO: "🙇🏻‍♂️ Artigos Religiosos",
};

interface CartItem {
  product_id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export default function Sale() {

  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState<Client | null>(null);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);

  const buscarProdutos = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('nome');

    if (error) {
      console.log('Erro ao buscar produtos', error.message);
      return;
    }
    setProdutos((data ?? []) as Product[]);
  };

  const buscarCliente = async () => {
    if (!codigo) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('codigo', Number(codigo))
      .maybeSingle();

    if (error || !data) {
      alert('Cliente não encontrado');
      setCliente(null);
      return;
    }

    setCliente(data as Client);
    buscarProdutos();
  };

  // Realtime: produtos e cliente atualizam sozinhos
  useEffect(() => {
    buscarProdutos();

    const channel = supabase
      .channel('sale-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => buscarProdutos(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!cliente) return;
    const channel = supabase
      .channel(`sale-client-${cliente.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clients', filter: `id=eq.${cliente.id}` },
        (payload) => setCliente(payload.new as Client),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cliente?.id]);

  const adicionar = (p: Product) => {
    const item = carrinho.find(i => i.product_id === p.id);
    if (item) {
      setCarrinho(carrinho.map(i =>
        i.product_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setCarrinho([...carrinho, { product_id: p.id, nome: p.nome, preco: Number(p.preco), quantidade: 1 }]);
    }
  };

  const diminuir = (p: Product) => {
    setCarrinho(
      carrinho
        .map(i => i.product_id === p.id ? { ...i, quantidade: i.quantidade - 1 } : i)
        .filter(i => i.quantidade > 0)
    );
  };

  const total = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  const finalizar = async () => {
    if (!cliente) {
      alert('Busque um cliente antes');
      return;
    }
    if (!carrinho.length) {
      alert('Carrinho vazio');
      return;
    }

    const { error } = await supabase.rpc('realizar_venda', {
      p_codigo: cliente.codigo,
      p_itens: carrinho.map(i => ({ product_id: i.product_id, quantidade: i.quantidade })),
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Venda realizada!');
    setCarrinho([]);
  };

  return (
    <div className="home-page">

      <Navbar />

      <div className="home-content">

        <h2>Venda</h2>

        <div className="box">
          <input
            placeholder="Código do cliente"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <button onClick={buscarCliente}>Buscar</button>
        </div>

        {cliente && (
          <div className="cliente-card">
            <h3>{cliente.nome}</h3>
            <p className="saldo">
              Saldo: R$ {Number(cliente.saldo).toFixed(2)}
            </p>
          </div>
        )}

        {Object.entries(categorias).map(([key, label]) => {
          const lista = produtos.filter(p => p.categoria === key && p.quantidade > 0);
          if (!lista.length) return null;

          return (
            <div key={key} className="categoria">
              <h3>{label}</h3>

              {lista.map((p) => {
                const item = carrinho.find(i => i.product_id === p.id);
                return (
                  <div key={p.id} className="produto-linha">
                    <div className="produto-nome">{p.nome}</div>
                    <div className="produto-estoque">{p.quantidade} disp</div>
                    <div className="produto-preco">R$ {Number(p.preco).toFixed(2)}</div>
                    <div className="controle">
                      <button onClick={() => diminuir(p)}>-</button>
                      <span className="qtd">{item?.quantidade || 0}</span>
                      <button onClick={() => adicionar(p)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {carrinho.length > 0 && (
          <div className="carrinho-fixo">
            <h3>Carrinho</h3>

            {carrinho.map(item => (
              <div key={item.product_id} className="carrinho-item">
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
