import { useState } from 'react';
import './login.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const sendRequest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            alert('Preencha todos os campos');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        navigate('/home');
    };

    return (
        <div id="page">
            <div id="login-container">
                <div id="left-container">
                    <h2>Bem vindo a nossa Bodega EAC!</h2>

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
                    <img src="/logo-eac.png" alt="Logo Bodega" className="login-logo" />
                </div>
            </div>
        </div>
    );
}
