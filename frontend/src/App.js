import { useState, useEffect, useRef, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";

// Pages
import LoginPage from "./pages/LoginPage";
import SelectionCompetitionPage from "./pages/SelectionCompetitionPage";
import DashboardPage from "./pages/DashboardPage";
import CompetiteursPage from "./pages/CompetiteursPage";
import PeseePage from "./pages/PeseePage";
import CategoriesPage from "./pages/CategoriesPage";
import AiresCombatPage from "./pages/AiresCombatPage";
import GestionCombatsPage from "./pages/GestionCombatsPage";
import ArbitrePage from "./pages/ArbitrePage";
import ResultatsPage from "./pages/ResultatsPage";
import UsersPage from "./pages/UsersPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============ AUTH CONTEXT ============
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// ============ COMPETITION CONTEXT ============
export const CompetitionContext = createContext(null);

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error("useCompetition must be used within CompetitionProvider");
  }
  return context;
};

// ============ AUTH CALLBACK ============
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
          navigate("/", { state: { user: response.data }, replace: true });
        } catch (error) {
          console.error("Auth error:", error);
          navigate("/login", { replace: true });
        }
      } else {
        navigate("/login", { replace: true });
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Connexion en cours...</p>
      </div>
    </div>
  );
};

// ============ PROTECTED ROUTE WITH CONTEXTS ============
const ProtectedRoute = ({ children, requireCompetition = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [user, setUser] = useState(location.state?.user || null);
  const [competition, setCompetition] = useState(null);
  const [loadingCompetition, setLoadingCompetition] = useState(true);

  // Check auth
  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/login", { replace: true });
      }
    };

    checkAuth();
  }, [location.state, navigate]);

  // Load saved competition
  useEffect(() => {
    const loadCompetition = async () => {
      const savedId = localStorage.getItem('activeCompetitionId');
      if (savedId) {
        try {
          const response = await axios.get(`${API}/competitions/${savedId}`, { withCredentials: true });
          setCompetition(response.data);
        } catch (error) {
          localStorage.removeItem('activeCompetitionId');
        }
      }
      setLoadingCompetition(false);
    };

    if (isAuthenticated) {
      loadCompetition();
    }
  }, [isAuthenticated]);

  const selectCompetition = (comp) => {
    setCompetition(comp);
    localStorage.setItem('activeCompetitionId', comp.competition_id);
  };

  const clearCompetition = () => {
    setCompetition(null);
    localStorage.removeItem('activeCompetitionId');
  };

  if (isAuthenticated === null || loadingCompetition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Redirect to selection if no competition and route requires it
  if (requireCompetition && !competition && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin: user?.role === "admin" }}>
      <CompetitionContext.Provider value={{ competition, selectCompetition, clearCompetition }}>
        {children}
      </CompetitionContext.Provider>
    </AuthContext.Provider>
  );
};

// ============ APP ROUTER ============
function AppRouter() {
  const location = useLocation();

  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Page de sélection de compétition - point d'entrée */}
      <Route path="/" element={
        <ProtectedRoute requireCompetition={false}>
          <SelectionCompetitionPage />
        </ProtectedRoute>
      } />
      
      {/* Pages qui nécessitent une compétition active */}
      <Route path="/tableau-de-bord" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/competiteurs" element={<ProtectedRoute><CompetiteursPage /></ProtectedRoute>} />
      <Route path="/pesee" element={<ProtectedRoute><PeseePage /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
      <Route path="/aires-combat" element={<ProtectedRoute><AiresCombatPage /></ProtectedRoute>} />
      <Route path="/gestion-combats" element={<ProtectedRoute><GestionCombatsPage /></ProtectedRoute>} />
      <Route path="/arbitre/:aireId" element={<ProtectedRoute><ArbitrePage /></ProtectedRoute>} />
      <Route path="/resultats" element={<ProtectedRoute><ResultatsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
