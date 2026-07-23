import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingBag,
  LayoutDashboard,
  PackageSearch,
  UserSearch,
  Boxes,
  UsersRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";
import { PacmanIcon } from "./ui/pacman-icon";
import { GameboxWordmark } from "./ui/gamebox-wordmark";
import { HeaderChase } from "./header-chase";

interface NavItem {
  path: string;
  label: string;
  icon: typeof ShoppingBag;
  admin?: boolean;
}

const ITEMS: NavItem[] = [
  { path: "/home", label: "Home", icon: ShoppingBag },
  { path: "/cliente", label: "Cliente", icon: UserSearch },
  { path: "/catalog", label: "Catálogo", icon: PackageSearch },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: true },
  { path: "/product", label: "Produtos", icon: Boxes },
  { path: "/usuarios", label: "Usuários", icon: UsersRound, admin: true },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLButtonElement>(null);
  const userChipRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
      <nav className="fixed top-0 inset-x-0 z-[1000] bg-ejc-primary text-white border-b border-white/10 shadow-lg shadow-ejc-primary/20">
        <div
          ref={rowRef}
          className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 lg:h-[72px] grid items-center gap-3 grid-cols-[auto_1fr_auto]"
        >
          <HeaderChase
            containerRef={rowRef}
            logoRef={logoRef}
            startRef={userChipRef}
            mobileStartRef={menuButtonRef}
          />

          <button
            ref={logoRef}
            type="button"
            onClick={() => navigate("/home")}
            className="relative z-10 flex items-center gap-2.5 shrink-0 text-white"
          >
            <span className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white flex items-center justify-center overflow-hidden ring-1 ring-white/30 border-2 border-black shrink-0">
              <PacmanIcon size={22} />
            </span>
            <GameboxWordmark className="h-8 sm:h-9" />
          </button>

          <div className="relative z-10 hidden lg:flex items-center justify-center">
            {/* Fundo opaco (mesma cor do header) do tamanho exato do grupo de
                botões — impede que a animação do header (HeaderChase) fique
                visível "por cima": ela fica de fato invisível atrás deste
                painel, só reaparecendo nos espaços vazios ao redor dele. */}
            <div className="relative bg-ejc-primary flex items-center gap-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "relative inline-flex items-center gap-2 px-3 h-10 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                        isActive
                          ? "text-white bg-white/15"
                          : "text-white hover:bg-white/10",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={15} className="shrink-0" />
                        <span>{item.label}</span>
                        {isActive && (
                          <motion.span
                            layoutId="nav-indicator"
                            className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-ejc-yellow"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 hidden lg:flex items-center gap-3 justify-end bg-ejc-primary">
            <div className="flex items-center gap-2 text-white">
              <div
                ref={userChipRef}
                className="relative z-10 h-9 w-9 rounded-full bg-white/15 flex items-center justify-center font-bold text-[12px] text-white"
              >
                {iniciais}
              </div>
              <div className="leading-tight">
                <p className="text-[12px] font-semibold text-white">{profile?.nome ?? "—"}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/75">
                  {profile?.role ?? "—"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-white border border-white/30 hover:bg-white hover:text-ejc-primary transition-colors"
            >
              <LogOut size={14} /> Sair
            </button>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            className="relative z-10 lg:hidden col-start-3 justify-self-end h-10 w-10 rounded-lg text-white inline-flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[3px] flex" aria-hidden>
          <span className="flex-1 bg-ejc-yellow" />
          <span className="flex-1 bg-ejc-orange" />
          <span className="flex-1 bg-ejc-purple" />
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
              className="lg:hidden fixed inset-0 top-[64px] bg-black/55 z-[990]"
              aria-label="Fechar menu"
            />
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="lg:hidden fixed top-[64px] inset-x-0 bg-ejc-primary text-white z-[995] shadow-2xl flex flex-col max-h-[calc(100vh-64px)] overflow-y-auto"
            >
              <div className="px-4 py-4 border-b border-white/15 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-white/15 text-white flex items-center justify-center font-bold text-sm">
                  {iniciais}
                </div>
                <div className="flex-1 leading-tight min-w-0">
                  <p className="text-white text-[15px] font-semibold truncate">
                    {profile?.nome ?? "—"}
                  </p>
                  <p className="text-white/75 text-[11px] uppercase tracking-wide">
                    {profile?.role ?? "—"}
                  </p>
                </div>
              </div>

              <ul className="flex flex-col py-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-4 py-3.5 text-[15px] font-semibold transition-colors border-l-4",
                            isActive
                              ? "text-white bg-white/12 border-ejc-yellow"
                              : "text-white hover:bg-white/8 border-transparent",
                          )
                        }
                      >
                        <Icon size={18} className="shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto p-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-ejc-red text-white font-semibold hover:brightness-110 transition-all"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
