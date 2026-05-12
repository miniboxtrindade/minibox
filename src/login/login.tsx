import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/toast';
import { Button, Input } from '../components/ui';
import { friendlyError } from '../lib/errors';

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Informe seu e-mail.';
    if (!password) newErrors.password = 'Informe sua senha.';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    navigate('/home');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[radial-gradient(circle_at_30%_20%,#1F1FA8_0%,#151551_45%,#0a0a3d_100%)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-ejc-yellow/15 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-ejc-blue/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-ejc-red/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 sm:px-10 py-10 sm:py-12 flex flex-col justify-center">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-ejc-blue">
            Minibox EJC
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ejc-primary mt-2 leading-tight tracking-tight">
            Bem-vindo de volta
          </h1>
          <p className="text-ejc-muted text-sm mt-2">
            Entre com sua conta para acessar o painel.
          </p>

          <form onSubmit={sendRequest} className="mt-8 flex flex-col gap-4" noValidate>
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              error={errors.password}
              required
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="h-8 w-8 flex items-center justify-center text-ejc-muted hover:text-ejc-primary transition-colors rounded"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Button
              type="submit"
              size="lg"
              loading={loading}
              fullWidth
              className="mt-2"
            >
              {loading ? 'Entrando...' : (
                <>
                  Entrar
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ejc-muted text-center">
            Não tem conta?{' '}
            <Link
              to="/signup"
              className="text-ejc-primary font-semibold hover:text-ejc-primary-hover"
            >
              Cadastre-se
            </Link>
          </p>
        </div>

        <div className="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-ejc-primary to-[#0a0a3d] p-10 overflow-hidden">
          <div className="absolute top-8 left-8 flex gap-1.5" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-ejc-yellow" />
            <span className="h-2 w-2 rounded-full bg-ejc-blue" />
            <span className="h-2 w-2 rounded-full bg-ejc-green" />
            <span className="h-2 w-2 rounded-full bg-ejc-red" />
          </div>
          <motion.img
            src="/logo-ejc1.png"
            alt="Logo EJC"
            className="relative max-w-[280px] w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
          <p className="absolute bottom-8 left-8 right-8 text-white/70 text-xs tracking-wide leading-relaxed">
            Encontro de Jovens com Cristo — Trindade.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
