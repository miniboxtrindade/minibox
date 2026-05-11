import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Navbar() {

  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <nav id="home-bar">

      <div id="brand">MINIBOX EJC</div>

      <div className="nav-center">
        <button onClick={() => navigate("/home")}>Home</button>
        {isAdmin && <button onClick={() => navigate("/dashboard")}>Dashboard</button>}
        <button onClick={() => navigate("/sale")}>Venda</button>
        {isAdmin && <button onClick={() => navigate("/product")}>Produtos</button>}
      </div>

      <div className="nav-right">
        <button onClick={handleLogout}>Sair</button>
      </div>

      <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button onClick={() => navigate("/home")}>Home</button>
        {isAdmin && <button onClick={() => navigate("/dashboard")}>Dashboard</button>}
        <button onClick={() => navigate("/sale")}>Venda</button>
        {isAdmin && <button onClick={() => navigate("/product")}>Produtos</button>}
        <button onClick={handleLogout}>Sair</button>
      </div>

    </nav>
  );
}
