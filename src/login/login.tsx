import { useState } from 'react';
import './login.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useModal } from '../lib/modal';

export default function Login() {
    const navigate = useNavigate();
    const { notify } = useModal();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const sendRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            notify({ variant: 'warning', message: 'Preencha todos os campos.' });
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            notify({ variant: 'error', message: error.message });
            return;
        }

        navigate('/home');
    };

    return (
        <div id="page">
            <div id="login-container">
                <div id="left-container">
                    <h2>Bem vindo ao nosso Minibox EJC!</h2>

                    <form id="form-login" onSubmit={sendRequest}>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            placeholder="Email"
                            required
                        />

                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            placeholder="Password"
                            required
                        />

                        <button type="submit" disabled={loading}>
                            {loading ? 'Entrando...' : 'Login'}
                        </button>
                    </form>

                    <p style={{ marginTop: 16 }}>
                        Não tem conta? <a href="/signup">Cadastre-se</a>
                    </p>
                </div>

                <div id="right-container">
                    <img src="/logo-ejc.png" alt="Logo Minibox" className="login-logo" />
                </div>
            </div>
        </div>
    );
}
