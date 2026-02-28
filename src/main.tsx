import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Garante que o elemento root existe e tem o tipo certo
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('❌ Elemento root não encontrado no index.html');
}

console.log('✅ main.tsx carregado');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
