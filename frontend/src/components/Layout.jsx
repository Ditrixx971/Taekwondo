import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useCompetition } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  Users,
  Swords,
  Trophy,
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Menu,
  X,
  Scale,
  Grid3X3,
  PlayCircle,
  Home,
  TreeDeciduous,
  List,
  Crown,
  UserCheck,
  Shield,
  Columns
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const navItems = [
  { path: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { path: "/competiteurs", label: "Inscriptions", icon: Users },
  { path: "/pesee", label: "Pesée", icon: Scale },
  { path: "/categories", label: "Catégories", icon: FolderKanban },
  { path: "/aires-combat", label: "Aires de combat", icon: Grid3X3 },
  { path: "/gestion-combats", label: "Gestion combats", icon: Swords },
  { path: "/arbre-combat", label: "Arbre des combats", icon: TreeDeciduous },
  { path: "/ordre-combats", label: "Ordre des combats", icon: List },
  { path: "/resultats", label: "Résultats & Médailles", icon: Trophy },
];

const adminItems = [
  { path: "/coaches-competition", label: "Coachs autorisés", icon: UserCheck },
  { path: "/users", label: "Utilisateurs", icon: Users },
];

export const Layout = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const { competition, clearCompetition } = useCompetition();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      clearCompetition();
      toast.success("Déconnexion réussie");
      navigate("/login", { replace: true });
    } catch (error) {
      navigate("/login", { replace: true });
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          data-testid="mobile-menu-toggle"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="font-bold text-lg tracking-tight">
          <span className="text-red-500">TAE</span>
          <span className="text-blue-500">KWON</span>
          <span className="text-slate-900">DO</span>
        </h1>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.picture} />
          <AvatarFallback className="bg-slate-900 text-white text-xs">
            {getInitials(user?.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <h1 className="font-black text-xl tracking-tight uppercase">
              <span className="text-red-500">TAE</span>
              <span className="text-blue-500">KWON</span>
              <span className="text-slate-900">DO</span>
            </h1>
          </div>

          {/* Competition active */}
          {competition && (
            <div className="p-4 border-b border-slate-100">
              <div className="p-3 bg-gradient-to-r from-red-50 to-blue-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                  Compétition active
                </p>
                <p className="font-bold text-slate-900 truncate mt-1">
                  {competition.nom}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(competition.date).toLocaleDateString('fr-FR')}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-xs"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-3 w-3 mr-1" />
                  Changer
                </Button>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  data-testid={`nav-${item.path.slice(1)}`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Administration
                  </p>
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      data-testid={`nav-${item.path.slice(1)}`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-slate-900 text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                  {user?.role === "master" ? (
                    <><Crown className="h-3 w-3 text-purple-500" /> MASTER</>
                  ) : user?.role === "admin" ? (
                    <><Shield className="h-3 w-3 text-blue-500" /> Administrateur</>
                  ) : (
                    "Coach"
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-2 justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut size={18} className="mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
