import { useState, useEffect } from "react";
import '../home/home.css';
import Navbar from '../components/navbar';
import {
  supabase,
  type Product,
  PRODUCT_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_EMOJI,
} from '../lib/supabase';
import { useModal } from '../lib/modal';
import { useToast } from '../components/ui/toast';
import { ImageUploader } from '../components/ui/image-uploader';
import { uploadProductImage, deleteProductImage } from '../lib/storage';

export default function ProductPage() {
  const { confirm } = useModal();
  const toast = useToast();

  const [produtos, setProdutos] = useState<Product[]>([]);
  const [novo, setNovo] = useState({
    nome: "",
    preco: "",
    quantidade: "",
    categoria: "ALIMENTO" as Product['categoria'],
  });
  const [imagem, setImagem] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const buscar = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('nome');

    if (error) {
      toast.error('Erro ao buscar produtos.');
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
      toast.warning('Preencha todos os campos.');
      return;
    }

    setSubmitting(true);
    try {
      let imagem_url: string | null = null;
      let imagem_path: string | null = null;

      if (imagem) {
        const uploaded = await uploadProductImage(imagem);
        imagem_url = uploaded.imagem_url;
        imagem_path = uploaded.imagem_path;
      }

      const { error } = await supabase.from('products').insert({
        nome: novo.nome,
        preco: Number(novo.preco),
        quantidade: Number(novo.quantidade),
        categoria: novo.categoria,
        imagem_url,
        imagem_path,
      });

      if (error) {
        if (imagem_path) await deleteProductImage(imagem_path);
        toast.error(error.message);
        return;
      }

      setNovo({ nome: "", preco: "", quantidade: "", categoria: "ALIMENTO" });
      setImagem(null);
      toast.success('Produto adicionado!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha no upload: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const atualizar = async (id: string, campo: string, valor: unknown) => {
    const { error } = await supabase
      .from('products')
      .update({ [campo]: valor, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) toast.error(error.message);
  };

  const deletar = async (p: Product) => {
    const ok = await confirm({
      variant: 'warning',
      title: 'Excluir produto',
      message: `Deseja realmente excluir "${p.nome}"?`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;

    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await deleteProductImage(p.imagem_path);
  };

  return (
    <div className="home-page">

      <Navbar />

      <div className="home-content">

        <h2>Produtos</h2>

        <div className="produto-edit-card">
          <div style={{ gridColumn: '1 / -1' }}>
            <ImageUploader
              value={imagem}
              onChange={setImagem}
              onError={(m) => toast.warning(m)}
            />
          </div>
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
            {PRODUCT_CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <button
            className="btn-green"
            onClick={criarProduto}
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>

        {produtos.map((p) => (
          <div key={p.id} className="produto-edit-card">
            {p.imagem_url && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={p.imagem_url}
                  alt={p.nome}
                  style={{
                    height: 80,
                    width: 80,
                    objectFit: 'cover',
                    borderRadius: 10,
                    border: '1px solid var(--ejc-border)',
                  }}
                />
              </div>
            )}
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
              {PRODUCT_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <button className="btn-red" onClick={() => deletar(p)}>Excluir</button>
          </div>
        ))}

        {produtos.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">📦</div>
            <h3>Nenhum produto cadastrado</h3>
            <p>Use o formulário acima para adicionar o primeiro produto.</p>
          </div>
        )}

      </div>
    </div>
  );
}
