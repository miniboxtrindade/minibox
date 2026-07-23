import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { PackagePlus, Pencil, Trash2, ImageOff, Save, Plus, Search } from "lucide-react";
import Navbar from "../components/navbar";
import {
  supabase,
  type Product,
} from "../lib/supabase";
import { useCategories } from "../lib/use-categories";
import { useModal } from "../lib/modal";
import { useToast } from "../components/ui/toast";
import { friendlyError } from "../lib/errors";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
  ImageUploader,
  Input,
  PageHeading,
  Sheet,
  Skeleton,
} from "../components/ui";
import { uploadProductImage, deleteProductImage } from "../lib/storage";
import { cn } from "../lib/cn";

interface FormState {
  nome: string;
  preco: string;
  quantidade: string;
  categoria: string;
}

const EMPTY_FORM: FormState = {
  nome: "",
  preco: "",
  quantidade: "",
  categoria: "ALIMENTO",
};

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stockBadge(qtd: number) {
  if (qtd <= 0) return { variant: "danger" as const, label: "Esgotado" };
  if (qtd <= 5) return { variant: "warning" as const, label: `${qtd} restantes` };
  return { variant: "success" as const, label: `${qtd} em estoque` };
}

export default function ProductPage() {
  const { confirm } = useModal();
  const toast = useToast();
  const categories = useCategories();

  const [produtos, setProdutos] = useState<Product[] | null>(null);
  const [novo, setNovo] = useState<FormState>(EMPTY_FORM);
  const [imagem, setImagem] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("📦");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("ALL");

  const filtros = useMemo(() => {
    const list: { key: string; label: string; emoji: string }[] = [
      { key: "ALL", label: "Todos", emoji: "✨" },
    ];
    (categories ?? []).forEach((c) =>
      list.push({ key: c.key, label: c.label, emoji: c.emoji }),
    );
    return list;
  }, [categories]);

  const produtosVisiveis = useMemo(() => {
    if (!produtos) return null;
    const q = busca.trim().toLowerCase();
    return produtos
      .filter((p) => (filtroCat === "ALL" ? true : p.categoria === filtroCat))
      .filter((p) => (q ? p.nome.toLowerCase().includes(q) : true));
  }, [produtos, busca, filtroCat]);

  const buscar = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("nome");
    if (error) {
      toast.error("Erro ao buscar produtos.");
      return;
    }
    setProdutos((data ?? []) as Product[]);
  };

  useEffect(() => {
    buscar();
    const channel = supabase
      .channel("admin-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => buscar(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Ajusta a categoria default conforme a primeira disponível, caso ALIMENTO seja excluída
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    if (!categories.some((c) => c.key === novo.categoria)) {
      setNovo((s) => ({ ...s, categoria: categories[0].key }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const criarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newCategoryLabel.trim();
    if (!label) {
      toast.warning("Informe o nome da categoria.");
      return;
    }
    const key = slugify(label);
    if (!key) {
      toast.warning("Nome de categoria inválido.");
      return;
    }
    setCreatingCategory(true);
    const { error } = await supabase
      .from("categories")
      .insert({ key, label, emoji: newCategoryEmoji.trim() || "📦" });
    setCreatingCategory(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setNovo((s) => ({ ...s, categoria: key }));
    setNewCategoryLabel("");
    setNewCategoryEmoji("📦");
    setShowNewCategory(false);
    toast.success(`Categoria "${label}" criada!`);
  };

  const criarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novo.nome || !novo.preco || !novo.quantidade) {
      toast.warning("Preencha todos os campos.");
      return;
    }

    setSubmitting(true);
    try {
      let imagem_url: string | null = null;
      let imagem_path: string | null = null;
      if (imagem) {
        const up = await uploadProductImage(imagem);
        imagem_url = up.imagem_url;
        imagem_path = up.imagem_path;
      }
      const { error } = await supabase.from("products").insert({
        nome: novo.nome,
        preco: Number(novo.preco),
        quantidade: Number(novo.quantidade),
        categoria: novo.categoria,
        imagem_url,
        imagem_path,
      });
      if (error) {
        if (imagem_path) await deleteProductImage(imagem_path);
        toast.error(friendlyError(error));
        return;
      }
      setNovo(EMPTY_FORM);
      setImagem(null);
      toast.success("Produto adicionado!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const abrirEdicao = (p: Product) => {
    setEditing(p);
    setEditForm({
      nome: p.nome,
      preco: String(p.preco),
      quantidade: String(p.quantidade),
      categoria: p.categoria,
    });
    setEditImage(null);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.nome || !editForm.preco || !editForm.quantidade) {
      toast.warning("Preencha todos os campos.");
      return;
    }

    setSavingEdit(true);
    try {
      let imagem_url = editing.imagem_url;
      let imagem_path = editing.imagem_path;

      if (editImage) {
        const up = await uploadProductImage(editImage);
        const oldPath = imagem_path;
        imagem_url = up.imagem_url;
        imagem_path = up.imagem_path;
        if (oldPath) await deleteProductImage(oldPath);
      }

      const { error } = await supabase
        .from("products")
        .update({
          nome: editForm.nome,
          preco: Number(editForm.preco),
          quantidade: Number(editForm.quantidade),
          categoria: editForm.categoria,
          imagem_url,
          imagem_path,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);

      if (error) {
        toast.error(friendlyError(error));
        return;
      }
      toast.success("Produto atualizado!");
      setEditing(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha: ${msg}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const deletar = async (p: Product) => {
    const ok = await confirm({
      variant: "warning",
      title: "Excluir produto",
      message: `Deseja realmente excluir "${p.nome}"?`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    await deleteProductImage(p.imagem_path);
    toast.success("Produto excluído.");
  };

  return (
    <div className="min-h-screen bg-ejc-bg">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-[88px] pb-12 md:px-6 lg:pt-[100px]">
        <header className="mb-6">
          <PageHeading kicker="Administração" title="Produtos" />
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus size={18} /> Novo produto
            </CardTitle>
            <CardDescription>
              A imagem é opcional e será otimizada para WebP automaticamente.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <form onSubmit={criarProduto} className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
              <ImageUploader
                value={imagem}
                onChange={setImagem}
                onError={(m) => toast.warning(m)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nome"
                  placeholder="Ex: Coca-Cola lata"
                  value={novo.nome}
                  onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                  containerClassName="sm:col-span-2"
                />
                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={novo.preco}
                  onChange={(e) => setNovo({ ...novo, preco: e.target.value })}
                />
                <Input
                  label="Estoque"
                  type="number"
                  placeholder="0"
                  value={novo.quantidade}
                  onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })}
                />
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[13px] font-medium text-ejc-text">
                    Categoria
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(categories ?? []).map((c) => {
                      const active = novo.categoria === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setNovo({ ...novo, categoria: c.key })}
                          className={cn(
                            "h-11 px-3 rounded-lg border text-sm font-medium inline-flex items-center gap-2 transition-colors",
                            active
                              ? "bg-ejc-primary text-white border-ejc-primary"
                              : "bg-white text-ejc-text border-ejc-border hover:border-ejc-primary/40",
                          )}
                        >
                          <span>{c.emoji}</span>
                          {c.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setShowNewCategory((v) => !v)}
                      className={cn(
                        "h-11 px-3 rounded-lg border-2 border-dashed text-sm font-medium inline-flex items-center gap-2 transition-colors col-span-2",
                        showNewCategory
                          ? "bg-ejc-bg border-ejc-primary text-ejc-primary"
                          : "bg-white border-ejc-border text-ejc-muted hover:border-ejc-primary/50 hover:text-ejc-primary",
                      )}
                    >
                      <Plus size={14} /> {showNewCategory ? "Cancelar nova categoria" : "Criar nova categoria"}
                    </button>
                  </div>

                  {showNewCategory && (
                    <div className="mt-2 grid gap-2 items-end p-3 bg-ejc-bg rounded-lg border border-ejc-border grid-cols-[80px_1fr] sm:grid-cols-[80px_1fr_auto]">
                      <Input
                        label="Emoji"
                        value={newCategoryEmoji}
                        onChange={(e) => setNewCategoryEmoji(e.target.value)}
                        maxLength={4}
                        placeholder="📦"
                      />
                      <Input
                        label="Nome da categoria"
                        value={newCategoryLabel}
                        onChange={(e) => setNewCategoryLabel(e.target.value)}
                        placeholder="Ex: Lanches"
                      />
                      <Button
                        type="button"
                        size="md"
                        variant="success"
                        onClick={criarCategoria}
                        loading={creatingCategory}
                        className="col-span-2 sm:col-span-1"
                      >
                        Criar
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  variant="success"
                  loading={submitting}
                  fullWidth
                  className="sm:col-span-2 mt-1"
                >
                  Adicionar produto
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <section>
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <h2 className="font-display text-lg font-bold text-ejc-primary">
              Cadastrados ({produtosVisiveis?.length ?? 0}
              {produtos && produtosVisiveis && produtosVisiveis.length !== produtos.length && (
                <span className="text-ejc-muted font-normal"> de {produtos.length}</span>
              )}
              )
            </h2>
          </div>

          <div className="mb-3">
            <Input
              placeholder="Buscar produto pelo nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              leftIcon={<Search size={16} />}
              aria-label="Buscar produto"
            />
          </div>

          <nav
            className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4 md:mx-0 md:px-0"
            aria-label="Filtrar por categoria"
          >
            {filtros.map((f) => {
              const active = filtroCat === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFiltroCat(f.key)}
                  aria-pressed={active}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium border transition-all",
                    active
                      ? "bg-ejc-primary text-white border-ejc-primary shadow-sm"
                      : "bg-white text-ejc-text border-ejc-border hover:border-ejc-primary/40 hover:text-ejc-primary",
                  )}
                >
                  <span aria-hidden>{f.emoji}</span>
                  {f.label}
                </button>
              );
            })}
          </nav>

          {produtosVisiveis === null ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : produtosVisiveis.length === 0 ? (
            <EmptyState
              icon={<PackagePlus size={26} />}
              title={
                produtos && produtos.length === 0
                  ? "Nenhum produto cadastrado"
                  : "Nenhum produto encontrado"
              }
              description={
                produtos && produtos.length === 0
                  ? "Use o formulário acima para adicionar o primeiro produto."
                  : "Tente outro termo de busca ou outra categoria."
              }
            />
          ) : (
            <motion.ul layout className="space-y-2">
              {produtosVisiveis.map((p) => {
                const stock = stockBadge(p.quantidade);
                return (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl bg-ejc-bg overflow-hidden flex items-center justify-center">
                          {p.imagem_url ? (
                            <img
                              src={p.imagem_url}
                              alt={p.nome}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageOff size={20} className="text-ejc-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ejc-text leading-tight truncate">
                            {p.nome}
                          </p>
                          <p className="font-display text-base sm:text-lg font-extrabold text-ejc-primary tabular-nums mt-0.5">
                            R$ {Number(p.preco).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label="Editar"
                            onClick={() => abrirEdicao(p)}
                            className="h-9 w-9 rounded-lg bg-ejc-bg text-ejc-primary flex items-center justify-center hover:bg-ejc-primary/10"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Excluir"
                            onClick={() => deletar(p)}
                            className="h-9 w-9 rounded-lg bg-ejc-red/10 text-ejc-red flex items-center justify-center hover:bg-ejc-red/15"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-2 pl-[68px] sm:pl-[76px]">
                        <Badge variant="primary">
                          {categories?.find((c) => c.key === p.categoria)?.emoji ?? "📦"}{" "}
                          {categories?.find((c) => c.key === p.categoria)?.label ?? p.categoria}
                        </Badge>
                        <Badge variant={stock.variant} dot>{stock.label}</Badge>
                      </div>
                    </Card>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </section>
      </main>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        side="right"
        title={editing ? `Editar: ${editing.nome}` : "Editar produto"}
        description="As alterações são salvas no botão abaixo."
      >
        {editing && (
          <form onSubmit={salvarEdicao} className="p-5 flex flex-col gap-4">
            <ImageUploader
              value={editImage}
              onChange={setEditImage}
              existingUrl={editing.imagem_url}
              onError={(m) => toast.warning(m)}
            />

            <Input
              label="Nome"
              value={editForm.nome}
              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
            />
            <Input
              label="Preço (R$)"
              type="number"
              step="0.01"
              value={editForm.preco}
              onChange={(e) => setEditForm({ ...editForm, preco: e.target.value })}
            />
            <Input
              label="Estoque"
              type="number"
              value={editForm.quantidade}
              onChange={(e) => setEditForm({ ...editForm, quantidade: e.target.value })}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ejc-text">Categoria</label>
              <div className="grid grid-cols-2 gap-2">
                {(categories ?? []).map((c) => {
                  const active = editForm.categoria === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, categoria: c.key })}
                      className={cn(
                        "h-11 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors",
                        active
                          ? "bg-ejc-primary text-white border-ejc-primary"
                          : "bg-white text-ejc-text border-ejc-border hover:border-ejc-primary/40",
                      )}
                    >
                      <span>{c.emoji}</span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" size="lg" loading={savingEdit} fullWidth>
              <Save size={16} /> Salvar alterações
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
