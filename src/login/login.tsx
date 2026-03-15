import { useState } from 'react';
import './login.css';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

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

        try {
            const response = await fetch("https://bodega-back.onrender.com/api/user/login", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, pass: password }),
            });

            const json = await response.json();

            if (response.ok) {
                Cookies.set('token', json.token, { expires: 1 });
                navigate('/home'); 
            } else {
                alert(json.message || 'Login failed');
            }
        } catch (error) {
            alert('Erro ao conectar com servidor');
        } finally {
            setLoading(false);
        }
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
                            type="text"
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
                </div>

                <div id="right-container">
                    <img src="/logo-eac.png" alt="Logo Bodega" className="login-logo" />
                </div>
            </div>
        </div>
    );
}
