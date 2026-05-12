import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/toast';
import { useModal } from '../lib/modal';
import { Button, Input } from '../components/ui';

export default function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const { notify } = useModal();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!name) newErrors.name = 'Informe seu nome.';
    if (!email) newErrors.email = 'Informe seu e-mail.';
    if (!password) newErrors.password = 'Crie uma senha.';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres.';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome: name } },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    notify({
      variant: 'success',
      title: 'Cadastro realizado',
      message: 'Verifique seu e-mail se a confirmação estiver ativada.',
      onConfirm: () => navigate('/login'),
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[radial-gradient(circle_at_70%_20%,#1F1FA8_0%,#151551_45%,#0a0a3d_100%)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 right-0 w-72 h-72 rounded-full bg-ejc-green/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-96 h-96 rounded-full bg-ejc-yellow/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-ejc-red/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-5xl grid lg:grid-cols-[1fr_1.05fr] bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="relative hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-ejc-primary to-[#0a0a3d] p-10 overflow-hidden">
          <div className="absolute top-8 left-8 flex gap-1.5" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-ejc-yellow" />
            <span className="h-2 w-2 rounded-full bg-ejc-blue" />
            <span className="h-2 w-2 rounded-full bg-ejc-green" />
            <span className="h-2 w-2 rounded-full bg-ejc-red" />
          </div>
          <motion.img
            src="/logo-ejc.png"
            alt="Logo EJC"
            className="max-w-[240px] w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
          <div className="mt-8 text-white text-center">
            <p className="text-white/60 text-xs tracking-[0.18em] uppercase">Já é cadastrado?</p>
            <Link
              to="/login"
              className="mt-3 inline-flex items-center gap-1.5 text-white font-semibold border border-white/30 rounded-lg px-4 py-2 hover:bg-white hover:text-ejc-primary transition-colors"
            >
              Voltar ao login
            </Link>
          </div>
        </div>

        <div className="px-6 sm:px-10 py-10 sm:py-12 flex flex-col justify-center">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-ejc-green">
            Crie sua conta
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ejc-primary mt-2 leading-tight tracking-tight">
            Vamos começar
          </h1>
          <p className="text-ejc-muted text-sm mt-2">
            Preencha os dados abaixo para acessar o sistema.
          </p>

          <form onSubmit={sendRequest} className="mt-8 flex flex-col gap-4" noValidate>
            <Input
              label="Nome completo"
              autoComplete="name"
              placeholder="João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User size={16} />}
              error={errors.name}
              required
            />
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
              error={errors.email}
              required
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              error={errors.password}
              hint={!errors.password ? 'Pelo menos 6 caracteres' : undefined}
              required
            />

            <Button type="submit" size="lg" loading={loading} fullWidth className="mt-2">
              {loading ? 'Registrando...' : (
                <>
                  Criar conta
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ejc-muted text-center lg:hidden">
            Já tem conta?{' '}
            <Link
              to="/login"
              className="text-ejc-primary font-semibold hover:text-ejc-primary-hover"
            >
              Entrar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
