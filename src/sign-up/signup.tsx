import { useState } from 'react';
import './signup.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useModal } from '../lib/modal';

export default function SignUp() {
  const navigate = useNavigate();
  const { notify } = useModal();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      notify({ variant: 'warning', message: 'Preencha todos os campos.' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: name },
      },
    });

    setLoading(false);

    if (error) {
      notify({ variant: 'error', message: error.message });
      return;
    }

    notify({
      variant: 'success',
      message: 'Cadastro realizado. Verifique seu email se a confirmação estiver ativada.',
      onConfirm: () => navigate('/login'),
    });
  };

  return (
    <div className="signup-container">
      <div className="signup-card">

        <div className="signup-left">
          <h1>Crie sua conta!</h1>

          <form onSubmit={sendRequest}>
            <input
              className="signup-input"
              type="text"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              className="signup-input"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="signup-input"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="signup-btn" type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
        </div>

        <div className="signup-right">
          <p>Já possui conta?</p>
          <button className="login-btn" onClick={() => navigate('/login')}>
            Voltar ao Login
          </button>
        </div>

      </div>
    </div>
  );
}
