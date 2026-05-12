import { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home as HomeIcon,
  LayoutDashboard,
  PackageSearch,
  ShoppingBag,
  Boxes,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";

interface NavItem {
  path: string;
  label: string;
  icon: typeof HomeIcon;
  admin?: boolean;
}

const ITEMS: NavItem[] = [
  { path: "/home", label: "Home", icon: HomeIcon },
  { path: "/catalog", label: "Catálogo", icon: PackageSearch },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: true },
  { path: "/sale", label: "Venda", icon: ShoppingBag },
  { path: "/product", label: "Produtos", icon: Boxes, admin: true },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";
  const items = ITEMS.filter((i) => !i.admin || isAdmin);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/login");
  };

  const iniciais = profile?.nome
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") ?? "?";

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 inset-x-0 z-[1000]",
          "bg-ejc-primary/95 backdrop-blur supports-[backdrop-filter]:bg-ejc-primary/80",
          "border-b border-white/10",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 lg:h-[72px] flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 shrink-0 text-white"
          >
            <span className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden">
              <img src="/logo-ejc.png" alt="" className="w-7 h-7 object-contain" />
            </span>
            <span className="font-display font-bold text-[15px] tracking-tight hidden sm:inline">
              Minibox EJC
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-1 ml-4 flex-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "relative inline-flex items-center gap-2 px-3 h-10 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "text-white bg-white/10"
                        : "text-white/70 hover:text-white hover:bg-white/5",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={15} />
                      {item.label}
                      {isActive && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-ejc-yellow"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 text-white/85">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-[12px]">
                {iniciais}
              </div>
              <div className="leading-tight">
                <p className="text-[12px] font-medium">{profile?.nome ?? "—"}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/55">
                  {profile?.role ?? "—"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-white/85 hover:text-white border border-white/20 hover:bg-white/10 transition-colors"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            className="lg:hidden ml-auto h-10 w-10 rounded-lg text-white inline-flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[3px] flex">
          <span className="flex-1 bg-ejc-yellow" />
          <span className="flex-1 bg-ejc-blue" />
          <span className="flex-1 bg-ejc-green" />
          <span className="flex-1 bg-ejc-red" />
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              key="backdrop"
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="lg:hidden fixed inset-0 top-[64px] bg-black/45 backdrop-blur-[1px] z-[990]"
              aria-label="Fechar menu"
            />
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="lg:hidden fixed top-[64px] inset-x-0 bg-ejc-primary z-[995] shadow-xl flex flex-col"
            >
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/15 text-white flex items-center justify-center font-bold">
                  {iniciais}
                </div>
                <div className="flex-1 leading-tight">
                  <p className="text-white text-sm font-semibold">
                    {profile?.nome ?? "—"}
                  </p>
                  <p className="text-white/55 text-[11px] uppercase tracking-wide">
                    {profile?.role ?? "—"}
                  </p>
                </div>
              </div>

              <ul className="flex flex-col py-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-4 py-3 text-[15px] font-medium transition-colors",
                            isActive
                              ? "text-white bg-white/10 border-l-4 border-ejc-yellow"
                              : "text-white/85 hover:bg-white/5 border-l-4 border-transparent",
                          )
                        }
                      >
                        <Icon size={18} />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={handleLogout}
                className="mx-3 my-3 inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-ejc-red/20 hover:bg-ejc-red text-white font-semibold transition-colors"
              >
                <LogOut size={16} /> Sair
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
