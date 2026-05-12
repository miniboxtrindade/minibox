import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './app.css';

import { AuthProvider, PrivateRoute } from './lib/auth';
import { ModalProvider } from './lib/modal';
import { ToastProvider } from './components/ui/toast';
import Login from './login/login';
import SignUp from './sign-up/signup';
import Home from './home/home';
import Dashboard from './dashboard/dashboard';
import Sale from './sale/sale';
import Product from './product/product';

const App = () => {
  return (
    <ToastProvider>
      <ModalProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/sale" element={<PrivateRoute><Sale /></PrivateRoute>} />
              <Route
                path="/dashboard"
                element={<PrivateRoute requireRole="admin"><Dashboard /></PrivateRoute>}
              />
              <Route
                path="/product"
                element={<PrivateRoute requireRole="admin"><Product /></PrivateRoute>}
              />

              <Route path="*" element={<h1>404 - Página não encontrada</h1>} />
            </Routes>
          </Router>
        </AuthProvider>
      </ModalProvider>
    </ToastProvider>
  );
};

export default App;
