import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, UserCog, UsersRound, KeyRound, Trash2 } from "lucide-react";
import Navbar from "../components/navbar";
import { supabase, type Profile, type UserRole } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/ui/toast";
import { useModal } from "../lib/modal";
import { friendlyError } from "../lib/errors";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Skeleton,
} from "../components/ui";

export default function Usuarios() {
  const toast = useToast();
  const { confirm } = useModal();
  const { profile: currentProfile } = useAuth();

  const [usuarios, setUsuarios] = useState<Profile[] | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const buscar = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("nome", { nullsFirst: false });
    if (error) {
      toast.error("Erro ao carregar usuários.");
      return;
    }
    setUsuarios((data ?? []) as Profile[]);
  };

  useEffect(() => {
    buscar();
    const channel = supabase
      .channel("admin-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => buscar(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const setRole = async (user: Profile, role: UserRole) => {
    const isSelf = user.id === currentProfile?.id;
    if (isSelf && role !== "admin") {
      toast.warning("Você não pode remover seu próprio acesso admin.");
      return;
    }

    const ok = await confirm({
      variant: role === "admin" ? "success" : "warning",
      title: role === "admin" ? "Promover a admin" : "Rebaixar a caixa",
      message:
        role === "admin"
          ? `Promover ${user.nome ?? "este usuário"} a administrador? Ele poderá gerenciar produtos, vendas e outros admins.`
          : `Rebaixar ${user.nome ?? "este usuário"} a caixa? Ele perderá acesso administrativo.`,
      confirmLabel: role === "admin" ? "Promover" : "Rebaixar",
    });
    if (!ok) return;

    setWorking(user.id);
    const { error } = await supabase.rpc("set_user_role", {
      p_user_id: user.id,
      p_role: role,
    });
    setWorking(null);

    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(
      role === "admin" ? "Usuário promovido a admin!" : "Usuário rebaixado a caixa.",
    );
  };

  const excluirUsuario = async (u: Profile) => {
    if (u.id === currentProfile?.id) {
      toast.warning("Você não pode excluir o próprio usuário.");
      return;
    }
    const ok = await confirm({
      variant: "error",
      title: "Excluir usuário",
      message: `Excluir ${u.nome ?? "este usuário"}? O acesso ao sistema será bloqueado imediatamente. Esta ação pode ser revertida no banco se necessário.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;

    setDeleting(u.id);
    const { error } = await supabase.rpc("set_user_active", {
      p_user_id: u.id,
      p_ativo: false,
    });
    setDeleting(null);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Usuário excluído.");
  };

  const resetarSenha = async (u: Profile) => {
    if (!u.email) {
      toast.warning("E-mail deste usuário não está disponível.");
      return;
    }
    const ok = await confirm({
      variant: "info",
      title: "Enviar reset de senha",
      message: `Enviar um link de redefinição de senha para ${u.email}? O usuário poderá clicar no link recebido por e-mail e escolher uma nova senha.`,
      confirmLabel: "Enviar link",
    });
    if (!ok) return;

    setSendingReset(u.id);
    const { error } = await supabase.auth.resetPasswordForEmail(u.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setSendingReset(null);

    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(`Link de reset enviado para ${u.email}.`);
  };

  const iniciaisDe = (nome: string | null) =>
    (nome ?? "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="min-h-screen bg-ejc-bg">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 pt-[88px] pb-12 md:px-6 lg:pt-[100px]">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ejc-blue">
            Administração
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ejc-primary mt-1 tracking-tight">
            Usuários
          </h1>
          <p className="text-ejc-muted text-sm mt-1">
            Promova outros usuários a administrador ou rebaixe a operador de caixa.
          </p>
        </header>

        {usuarios === null ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <EmptyState
            icon={<UsersRound size={26} />}
            title="Nenhum usuário"
            description="Ainda não existem perfis cadastrados."
          />
        ) : (
          <motion.ul layout className="space-y-2">
            {usuarios.map((u) => {
              const isSelf = u.id === currentProfile?.id;
              const isAdmin = u.role === "admin";
              const isBusy = working === u.id;
              return (
                <motion.li
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardBody>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-full bg-ejc-primary/10 text-ejc-primary flex items-center justify-center font-bold text-sm">
                          {iniciaisDe(u.nome)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-ejc-text truncate">
                              {u.nome ?? "(sem nome)"}
                            </p>
                            {isSelf && <Badge variant="info">você</Badge>}
                          </div>
                          {u.email && (
                            <p className="text-[12px] text-ejc-muted truncate">
                              {u.email}
                            </p>
                          )}
                        </div>
                        <Badge variant={isAdmin ? "primary" : "neutral"} dot className="shrink-0">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck size={12} /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <UserCog size={12} /> Caixa
                            </span>
                          )}
                        </Badge>
                      </div>

                      <div className="flex gap-2 flex-wrap justify-end mt-3 pt-3 border-t border-ejc-border/60">
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={sendingReset === u.id}
                          onClick={() => resetarSenha(u)}
                          disabled={!u.email}
                          title={u.email ? `Enviar link para ${u.email}` : "Sem e-mail cadastrado"}
                        >
                          <KeyRound size={14} /> Resetar senha
                        </Button>
                        {isAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            loading={isBusy}
                            onClick={() => setRole(u, "caixa")}
                            title={isSelf ? "Você não pode rebaixar a si mesmo" : "Rebaixar a caixa"}
                          >
                            Rebaixar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            loading={isBusy}
                            onClick={() => setRole(u, "admin")}
                          >
                            <ShieldCheck size={14} /> Promover
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf}
                          loading={deleting === u.id}
                          onClick={() => excluirUsuario(u)}
                          title={isSelf ? "Você não pode excluir o próprio usuário" : "Excluir usuário"}
                          className="text-ejc-red hover:bg-ejc-red/5"
                        >
                          <Trash2 size={14} /> Excluir
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </main>
    </div>
  );
}
