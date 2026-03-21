import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

export default function Navbar() {

  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    Cookies.remove("token");
    navigate("/login");
  };

  return (

    <nav id="home-bar">

      <div id="brand">BODEGA EAC</div>

      {/* MENU ICON MOBILE */}
      <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>

      {/* MENU */}
      <div className={`nav-center ${menuOpen ? "open" : ""}`}>

        <button onClick={() => navigate("/home")}>Home</button>
        <button onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button onClick={() => navigate("/sale")}>Venda</button>
        <button onClick={() => navigate("/product")}>Produtos</button>

        <button onClick={handleLogout}>Sair</button>

      </div>

    </nav>
  );
}