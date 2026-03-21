import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './app.css';

import Login from './login/login';
import Home from './home/home';
import Dashboard from './dashboard/dashboard';
import Sale from './sale/sale';
import Product from './product/product';

console.log('✅ App.tsx carregado');

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sale" element={<Sale />} />
        <Route path="/product" element={<Product />} />

        <Route path="*" element={<h1>404 - Página não encontrada</h1>} />
      </Routes>
    </Router>
  );
};

export default App;