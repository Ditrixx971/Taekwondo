import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth } from "../App";
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
  Clock, 
  Users, 
  Swords,
  Trophy,
  Settings,
  Trash2,
  Eye,
  CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const initialForm = {
  nom: "",
  date: "",
  lieu: "",
  heure_debut: "09:00",
  duree_estimee_heures: 8,
  coaches_autorises: []
};

export default function CompetitionsPage() {
  const { isAdmin, user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState("all"); // all, active, terminee

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const compRes = await axios.get(`${API}/competitions`, { withCredentials: true });
      setCompetitions(compRes.data);
      
      if (isAdmin) {
        const coachesRes = await axios.get(`${API}/coaches`, { withCredentials: true });
        setCoaches(coachesRes.data);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/competitions`, form, { withCredentials: true });
      toast.success("Compétition créée avec succès");
      setDialogOpen(false);
      setForm(initialForm);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleChangeStatut = async (competitionId, newStatut) => {
    try {
      await axios.put(`${API}/competitions/${competitionId}/statut?statut=${newStatut}`, {}, { withCredentials: true });
      toast.success(`Statut mis à jour: ${newStatut}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleDelete = async (competitionId) => {
    if (!window.confirm("Êtes-vous sûr ? Cette action supprimera tous les combats, compétiteurs et résultats de cette compétition.")) return;
    
    try {
      await axios.delete(`${API}/competitions/${competitionId}`, { withCredentials: true });
      toast.success("Compétition supprimée");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleCoachToggle = (coachId) => {
    setForm(prev => ({
      ...prev,
      coaches_autorises: prev.coaches_autorises.includes(coachId)
        ? prev.coaches_autorises.filter(id => id !== coachId)
        : [...prev.coaches_autorises, coachId]
    }));
  };

  const getStatutBadge = (statut) => {
    const styles = {
      active: "bg-green-100 text-green-700",
      terminee: "bg-blue-100 text-blue-700",
      annulee: "bg-red-100 text-red-700"
    };
    const labels = {
      active: "Active",
      terminee: "Terminée",
      annulee: "Annulée"
    };
    return <Badge className={styles[statut]}>{labels[statut]}</Badge>;
  };

  const filteredCompetitions = competitions.filter(c => {
    if (filter === "all") return true;
    return c.statut === filter;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Compétitions
            </h1>
            <p className="text-slate-500 mt-1">{competitions.length} compétition(s)</p>
          </div>
          
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setForm(initialForm);
            }}>
              <DialogTrigger asChild>
                <Button className="font-semibold uppercase tracking-wide" data-testid="create-competition-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle compétition
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                    Créer une compétition
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom de la compétition</Label>
                    <Input
                      id="nom"
                      placeholder="Ex: Open de Paris 2026"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      required
                      data-testid="competition-nom-input"
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
                        data-testid="competition-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heure_debut">Heure de début</Label>
                      <Input
                        id="heure_debut"
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
                      placeholder="Ex: Gymnase Municipal, Paris"
                      value={form.lieu}
                      onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                      required
                      data-testid="competition-lieu-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duree">Durée estimée (heures)</Label>
                    <Input
                      id="duree"
                      type="number"
                      min="1"
                      max="12"
                      value={form.duree_estimee_heures}
                      onChange={(e) => setForm({ ...form, duree_estimee_heures: parseInt(e.target.value) })}
                    />
                  </div>
                  
                  {coaches.length > 0 && (
                    <div className="space-y-2">
                      <Label>Coachs autorisés</Label>
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2">
                        {coaches.map(coach => (
                          <label key={coach.user_id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.coaches_autorises.includes(coach.user_id)}
                              onChange={() => handleCoachToggle(coach.user_id)}
                              className="accent-slate-900"
                            />
                            <span className="text-sm">{coach.name} ({coach.email})</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">
                        {form.coaches_autorises.length} coach(s) sélectionné(s)
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" data-testid="competition-submit-btn">
                      Créer
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2"
        >
          {["all", "active", "terminee"].map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Toutes" : f === "active" ? "Actives" : "Terminées"}
            </Button>
          ))}
        </motion.div>

        {/* Liste des compétitions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCompetitions.map((comp, index) => (
            <motion.div
              key={comp.competition_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card className={`border-slate-200 hover:shadow-lg transition-shadow ${comp.statut === "active" ? "ring-2 ring-green-500/20" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{comp.nom}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(comp.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {comp.lieu}
                        </span>
                      </div>
                    </div>
                    {getStatutBadge(comp.statut)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                      <p className="text-2xl font-bold">{comp.nb_competiteurs || 0}</p>
                      <p className="text-xs text-slate-500">Compétiteurs</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <Swords className="h-5 w-5 mx-auto text-red-500 mb-1" />
                      <p className="text-2xl font-bold">{comp.nb_combats || 0}</p>
                      <p className="text-xs text-slate-500">Combats</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
                      <p className="text-2xl font-bold">{comp.nb_combats_termines || 0}</p>
                      <p className="text-xs text-slate-500">Terminés</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        localStorage.setItem('selectedCompetition', comp.competition_id);
                        window.location.href = '/combats-suivre';
                      }}
                      data-testid={`view-${comp.competition_id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Accéder
                    </Button>
                    
                    {isAdmin && (
                      <>
                        {comp.statut === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeStatut(comp.competition_id, "terminee")}
                          >
                            <Trophy className="h-4 w-4 mr-1" />
                            Terminer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleDelete(comp.competition_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredCompetitions.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-slate-500">
                <Trophy className="h-12 w-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">Aucune compétition</p>
                <p className="text-sm">
                  {isAdmin ? "Créez votre première compétition pour commencer" : "Aucune compétition disponible"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
