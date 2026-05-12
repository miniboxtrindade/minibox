import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Navbar() {

  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <nav id="home-bar">

        <div id="brand">MINIBOX EJC</div>

        <div className="nav-center">
          <button onClick={() => go("/home")}>Home</button>
          <button onClick={() => go("/catalog")}>Catálogo</button>
          {isAdmin && <button onClick={() => go("/dashboard")}>Dashboard</button>}
          <button onClick={() => go("/sale")}>Venda</button>
          {isAdmin && <button onClick={() => go("/product")}>Produtos</button>}
        </div>

        <div className="nav-right">
          <button onClick={handleLogout}>Sair</button>
        </div>

        <button
          className="menu-icon"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className="navbar-stripe" aria-hidden="true">
          <span style={{ background: "var(--ejc-yellow)" }} />
          <span style={{ background: "var(--ejc-blue)" }} />
          <span style={{ background: "var(--ejc-green)" }} />
          <span style={{ background: "var(--ejc-red)" }} />
        </div>

      </nav>

      {menuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button onClick={() => go("/home")}>Home</button>
        <button onClick={() => go("/catalog")}>Catálogo</button>
        {isAdmin && <button onClick={() => go("/dashboard")}>Dashboard</button>}
        <button onClick={() => go("/sale")}>Venda</button>
        {isAdmin && <button onClick={() => go("/product")}>Produtos</button>}
        <button className="logout-mobile" onClick={handleLogout}>Sair</button>
      </div>
    </>
  );
}
