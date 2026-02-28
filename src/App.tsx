  import React from 'react';
  import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
  import './App.css';

  import Login from './login/Login';
  import Home from './home/Home';
  import SignUp from './sign-up/SignUp';

  console.log('✅ App.tsx carregado');

  const App: React.FC = () => {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/sign-up" element={<SignUp />} />

          <Route path="*" element={<h1>404 - Página não encontrada</h1>} />
        </Routes>
      </Router>
    );
  };

  export default App;
