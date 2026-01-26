import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Play, 
  Clock, 
  Users, 
  ChevronRight, 
  Filter,
  Calendar,
  Pause,
  SkipForward,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CombatsSuivrePage() {
  const { isAdmin } = useAuth();
  const [combats, setCombats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tatamis, setTatamis] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [filterCategorie, setFilterCategorie] = useState("all");
  const [filterTatami, setFilterTatami] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterTour, setFilterTour] = useState("all");
  
  // Planification
  const [planificationDialog, setPlanificationDialog] = useState(false);
  const [planificationCategorie, setPlanificationCategorie] = useState("");
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [dureeCombat, setDureeCombat] = useState(6);
  const [pauses, setPauses] = useState([]);

  useEffect(() => {
    fetchData();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchCombats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchCombats();
  }, [filterCategorie, filterTatami, filterStatut, filterTour]);

  const fetchData = async () => {
    try {
      const [catRes, tatRes] = await Promise.all([
        axios.get(`${API}/categories`, { withCredentials: true }),
        axios.get(`${API}/tatamis`, { withCredentials: true })
      ]);
      setCategories(catRes.data);
      setTatamis(tatRes.data);
      await fetchCombats();
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const fetchCombats = async () => {
    try {
      let url = `${API}/combats/suivre?`;
      if (filterCategorie !== "all") url += `categorie_id=${filterCategorie}&`;
      if (filterTatami !== "all") url += `tatami_id=${filterTatami}&`;
      if (filterStatut !== "all") url += `statut=${filterStatut}&`;
      if (filterTour !== "all") url += `tour=${filterTour}&`;
      
      const response = await axios.get(url, { withCredentials: true });
      setCombats(response.data);
    } catch (error) {
      console.error("Error fetching combats:", error);
    }
  };

  const handleLancerCategorie = async (categorieId, mode) => {
    try {
      const response = await axios.post(
        `${API}/combats/lancer-categorie/${categorieId}?mode=${mode}`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleLancerFinales = async () => {
    try {
      const response = await axios.post(`${API}/combats/lancer-finales`, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleChangerStatut = async (combatId, nouveauStatut) => {
    try {
      await axios.put(`${API}/combats/${combatId}/statut?statut=${nouveauStatut}`, {}, { withCredentials: true });
      toast.success("Statut mis à jour");
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handlePasserSuivant = async (combatId) => {
    try {
      const response = await axios.post(`${API}/combats/${combatId}/suivant`, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handlePlanifier = async () => {
    if (!planificationCategorie) {
      toast.error("Sélectionnez une catégorie");
      return;
    }
    try {
      const response = await axios.post(
        `${API}/combats/planifier/${planificationCategorie}`,
        {
          heure_debut_competition: heureDebut,
          duree_combat_minutes: dureeCombat,
          pauses: pauses
        },
        { withCredentials: true }
      );
      toast.success(`${response.data.message} - Fin estimée: ${response.data.heure_fin_estimee}`);
      setPlanificationDialog(false);
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur de planification");
    }
  };

  const getStatutBadge = (statut) => {
    const styles = {
      a_venir: "bg-slate-100 text-slate-700",
      en_cours: "bg-green-100 text-green-700 animate-pulse",
      termine: "bg-blue-100 text-blue-700",
      non_dispute: "bg-amber-100 text-amber-700"
    };
    const labels = {
      a_venir: "À venir",
      en_cours: "En cours",
      termine: "Terminé",
      non_dispute: "Non disputé"
    };
    return <Badge className={styles[statut] || styles.a_venir}>{labels[statut] || statut}</Badge>;
  };

  const getTourBadge = (tour) => {
    const styles = {
      quart: "bg-slate-200 text-slate-800",
      demi: "bg-blue-200 text-blue-800",
      bronze: "bg-amber-200 text-amber-800",
      finale: "bg-yellow-200 text-yellow-800"
    };
    const labels = {
      quart: "Quart",
      demi: "Demi",
      bronze: "Bronze",
      finale: "Finale"
    };
    return <Badge className={styles[tour] || "bg-slate-100"}>{labels[tour] || tour}</Badge>;
  };

  // Grouper par statut
  const combatsEnCours = combats.filter(c => c.statut === "en_cours");
  const combatsAVenir = combats.filter(c => c.statut === "a_venir");

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
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Combats à Suivre
            </h1>
            <p className="text-slate-500 mt-1">
              {combatsEnCours.length} en cours • {combatsAVenir.length} à venir
            </p>
          </div>
          
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Dialog open={planificationDialog} onOpenChange={setPlanificationDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="planification-btn">
                    <Calendar className="mr-2 h-4 w-4" />
                    Planifier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Planifier les horaires</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Select value={planificationCategorie} onValueChange={setPlanificationCategorie}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.categorie_id} value={cat.categorie_id}>
                              {cat.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Heure de début</Label>
                        <Input
                          type="time"
                          value={heureDebut}
                          onChange={(e) => setHeureDebut(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Durée/combat (min)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={dureeCombat}
                          onChange={(e) => setDureeCombat(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    <Button onClick={handlePlanifier} className="w-full">
                      Planifier les combats
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={handleLancerFinales} data-testid="lancer-finales-btn">
                <Play className="mr-2 h-4 w-4" />
                Lancer les finales
              </Button>
            </div>
          )}
        </motion.div>

        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500">Filtres</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={filterCategorie} onValueChange={setFilterCategorie}>
                  <SelectTrigger data-testid="filter-categorie">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes catégories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.categorie_id} value={cat.categorie_id}>
                        {cat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterTatami} onValueChange={setFilterTatami}>
                  <SelectTrigger data-testid="filter-tatami">
                    <SelectValue placeholder="Tatami" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous tatamis</SelectItem>
                    {tatamis.map(tat => (
                      <SelectItem key={tat.tatami_id} value={tat.tatami_id}>
                        {tat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterTour} onValueChange={setFilterTour}>
                  <SelectTrigger data-testid="filter-tour">
                    <SelectValue placeholder="Tour" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les tours</SelectItem>
                    <SelectItem value="quart">Quarts de finale</SelectItem>
                    <SelectItem value="demi">Demi-finales</SelectItem>
                    <SelectItem value="bronze">Match bronze</SelectItem>
                    <SelectItem value="finale">Finales</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger data-testid="filter-statut">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="a_venir">À venir</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Combats en cours */}
        {combatsEnCours.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="border-b border-green-100">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  En cours ({combatsEnCours.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {combatsEnCours.map((combat) => (
                    <CombatCard 
                      key={combat.combat_id} 
                      combat={combat} 
                      isAdmin={isAdmin}
                      onStatutChange={handleChangerStatut}
                      onPasserSuivant={handlePasserSuivant}
                      getTourBadge={getTourBadge}
                      getStatutBadge={getStatutBadge}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Combats à venir */}
        {combatsAVenir.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-500" />
                  À venir ({combatsAVenir.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {combatsAVenir.map((combat) => (
                    <CombatCard 
                      key={combat.combat_id} 
                      combat={combat} 
                      isAdmin={isAdmin}
                      onStatutChange={handleChangerStatut}
                      onPasserSuivant={handlePasserSuivant}
                      getTourBadge={getTourBadge}
                      getStatutBadge={getStatutBadge}
                      compact
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Aucun combat */}
        {combats.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-slate-500">
                <Eye className="h-12 w-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">Aucun combat à afficher</p>
                <p className="text-sm">Modifiez les filtres ou générez des combats</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions rapides par catégorie */}
        {isAdmin && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                  Lancement par catégorie
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map(cat => (
                    <div key={cat.categorie_id} className="p-4 bg-slate-50 rounded-xl">
                      <p className="font-semibold text-slate-900 mb-3">{cat.nom}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLancerCategorie(cat.categorie_id, "complet")}
                          data-testid={`lancer-complet-${cat.categorie_id}`}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Complet
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLancerCategorie(cat.categorie_id, "finales_fin")}
                          data-testid={`lancer-finales-fin-${cat.categorie_id}`}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Finales à la fin
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

const CombatCard = ({ combat, isAdmin, onStatutChange, onPasserSuivant, getTourBadge, getStatutBadge, compact }) => {
  return (
    <div className={`p-4 bg-white rounded-xl border ${combat.statut === "en_cours" ? "border-green-300 shadow-md" : "border-slate-200"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getTourBadge(combat.tour)}
          {getStatutBadge(combat.statut)}
        </div>
        {combat.heure_debut && (
          <span className="text-sm font-mono text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {combat.heure_debut}
          </span>
        )}
      </div>
      
      <p className="text-xs text-slate-500 mb-2">{combat.categorie_nom} • {combat.tatami_nom}</p>
      
      <div className="flex items-center gap-3">
        {/* Rouge */}
        <div className={`flex-1 p-2 rounded-lg ${compact ? "bg-red-50" : "bg-red-100"}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="font-semibold text-sm truncate">{combat.rouge_nom}</span>
          </div>
          {!compact && combat.rouge_club && (
            <p className="text-xs text-slate-500 mt-1 truncate">{combat.rouge_club}</p>
          )}
        </div>
        
        <span className="text-slate-300 font-bold text-xs">VS</span>
        
        {/* Bleu */}
        <div className={`flex-1 p-2 rounded-lg ${compact ? "bg-blue-50" : "bg-blue-100"}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="font-semibold text-sm truncate">{combat.bleu_nom}</span>
          </div>
          {!compact && combat.bleu_club && (
            <p className="text-xs text-slate-500 mt-1 truncate">{combat.bleu_club}</p>
          )}
        </div>
      </div>
      
      {isAdmin && combat.statut === "en_cours" && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onPasserSuivant(combat.combat_id)}
            data-testid={`suivant-${combat.combat_id}`}
          >
            <SkipForward className="h-3 w-3 mr-1" />
            Combat suivant
          </Button>
        </div>
      )}
      
      {isAdmin && combat.statut === "a_venir" && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full mt-3 text-green-600 hover:bg-green-50"
          onClick={() => onStatutChange(combat.combat_id, "en_cours")}
          data-testid={`lancer-${combat.combat_id}`}
        >
          <Play className="h-3 w-3 mr-1" />
          Lancer
        </Button>
      )}
    </div>
  );
};
