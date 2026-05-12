import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode } from 'react';
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
import Catalog from './catalog/catalog';

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><SignUp /></PageTransition>} />
        <Route
          path="/home"
          element={<PrivateRoute><PageTransition><Home /></PageTransition></PrivateRoute>}
        />
        <Route
          path="/catalog"
          element={<PrivateRoute><PageTransition><Catalog /></PageTransition></PrivateRoute>}
        />
        <Route
          path="/sale"
          element={<PrivateRoute><PageTransition><Sale /></PageTransition></PrivateRoute>}
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute requireRole="admin">
              <PageTransition><Dashboard /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/product"
          element={
            <PrivateRoute requireRole="admin">
              <PageTransition><Product /></PageTransition>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<h1 className="p-8 text-center text-ejc-primary">404 - Página não encontrada</h1>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => {
  return (
    <ToastProvider>
      <ModalProvider>
        <AuthProvider>
          <Router>
            <AnimatedRoutes />
          </Router>
        </AuthProvider>
      </ModalProvider>
    </ToastProvider>
  );
};

export default App;
