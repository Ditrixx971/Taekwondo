import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Swords,
  Trophy,
  LogOut,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SelectionCompetitionPage() {
  const { user, isAdmin } = useAuth();
  const { competition, selectCompetition, clearCompetition } = useCompetition();
  const navigate = useNavigate();
  
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    date: "",
    lieu: "",
    heure_debut: "09:00"
  });

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const response = await axios.get(`${API}/competitions?statut=active`, { withCredentials: true });
      setCompetitions(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompetition = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/competitions`, form, { withCredentials: true });
      toast.success("Compétition créée !");
      setDialogOpen(false);
      setForm({ nom: "", date: "", lieu: "", heure_debut: "09:00" });
      fetchCompetitions();
      
      // Sélectionner automatiquement la nouvelle compétition
      selectCompetition(response.data);
      navigate("/tableau-de-bord");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleSelectCompetition = async (comp) => {
    try {
      // Récupérer les détails complets
      const response = await axios.get(`${API}/competitions/${comp.competition_id}`, { withCredentials: true });
      selectCompetition(response.data);
      navigate("/tableau-de-bord");
    } catch (error) {
      toast.error("Erreur lors de la sélection");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      clearCompetition();
      navigate("/login", { replace: true });
    } catch (error) {
      navigate("/login", { replace: true });
    }
  };

  // Si une compétition est déjà sélectionnée, afficher un résumé
  if (competition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              <span className="text-red-500">TAE</span>
              <span className="text-blue-500">KWON</span>
              <span className="text-white">DO</span>
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-slate-400">{user?.name}</span>
              <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Compétition active */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                  <CardTitle className="text-white">Compétition active</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{competition.nom}</h2>
                  <div className="flex items-center gap-4 mt-2 text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(competition.date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {competition.lieu}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Users className="h-6 w-6 mx-auto text-blue-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{competition.nb_competiteurs || 0}</p>
                    <p className="text-xs text-slate-400">Compétiteurs</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Swords className="h-6 w-6 mx-auto text-red-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{competition.nb_combats || 0}</p>
                    <p className="text-xs text-slate-400">Combats</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Trophy className="h-6 w-6 mx-auto text-yellow-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{competition.nb_combats_termines || 0}</p>
                    <p className="text-xs text-slate-400">Terminés</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    onClick={() => navigate("/tableau-de-bord")}
                    data-testid="continue-competition-btn"
                  >
                    Continuer
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={clearCompetition}
                  >
                    Changer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Page de sélection
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            <span className="text-red-500">TAE</span>
            <span className="text-blue-500">KWON</span>
            <span className="text-white">DO</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">{user?.name}</span>
            <Badge className={user?.role === "admin" ? "bg-red-500" : "bg-blue-500"}>
              {user?.role === "admin" ? "Admin" : "Coach"}
            </Badge>
            <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Titre */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-2">
            Sélectionner une compétition
          </h2>
          <p className="text-slate-400">
            Choisissez la compétition sur laquelle vous souhaitez travailler
          </p>
        </motion.div>

        {/* Liste des compétitions */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {competitions.map((comp, index) => (
                <motion.div
                  key={comp.competition_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/15 transition-all cursor-pointer group"
                    onClick={() => handleSelectCompetition(comp)}
                    data-testid={`select-comp-${comp.competition_id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                            {comp.nom}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(comp.date).toLocaleDateString('fr-FR')}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {comp.lieu}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-6 w-6 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {competitions.length === 0 && !isAdmin && (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-12 text-center">
                    <Trophy className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">Aucune compétition disponible</p>
                    <p className="text-sm text-slate-500">Contactez un administrateur</p>
                  </CardContent>
                </Card>
              )}

              {/* Bouton créer (admin only) */}
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: competitions.length * 0.1 }}
                >
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Card 
                        className="bg-gradient-to-r from-red-500/20 to-blue-500/20 border-dashed border-2 border-white/30 hover:border-white/50 transition-all cursor-pointer"
                        data-testid="create-competition-btn"
                      >
                        <CardContent className="py-8 text-center">
                          <Plus className="h-10 w-10 mx-auto text-white mb-2" />
                          <p className="text-white font-semibold">Créer une nouvelle compétition</p>
                        </CardContent>
                      </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-bold uppercase tracking-wide">
                          Nouvelle compétition
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateCompetition} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="nom">Nom de la compétition</Label>
                          <Input
                            id="nom"
                            placeholder="Ex: Open de Paris 2026"
                            value={form.nom}
                            onChange={(e) => setForm({ ...form, nom: e.target.value })}
                            required
                            data-testid="comp-nom-input"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                              id="date"
                              type="date"
                              value={form.date}
                              onChange={(e) => setForm({ ...form, date: e.target.value })}
                              required
                              data-testid="comp-date-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="heure">Heure de début</Label>
                            <Input
                              id="heure"
                              type="time"
                              value={form.heure_debut}
                              onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lieu">Lieu</Label>
                          <Input
                            id="lieu"
                            placeholder="Ex: Gymnase Municipal"
                            value={form.lieu}
                            onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                            required
                            data-testid="comp-lieu-input"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            Annuler
                          </Button>
                          <Button type="submit" data-testid="comp-submit-btn">
                            Créer et commencer
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
