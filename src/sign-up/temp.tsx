import { useState } from 'react';
import './signup.css';
import { useNavigate } from 'react-router-dom';

export default function SignUp() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !cpf) {
      alert('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, pass: password, cpf }),
      });

      const json = await response.json();

      if (response.ok) {
        alert('Usuário cadastrado com sucesso!');
        navigate('/login');
      } else {
        alert(json.message || 'Erro ao registrar');
      }
    } catch (error) {
      alert('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">

        {/* LADO ESQUERDO */}
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

            <input
              className="signup-input"
              type="text"
              placeholder="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              required
            />

            <button className="signup-btn" type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
        </div>

        {/* LADO DIREITO */}
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
