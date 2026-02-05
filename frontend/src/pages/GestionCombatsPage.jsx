import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { 
  Swords, 
  Play, 
  RefreshCw, 
  Users,
  Grid3X3,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Shuffle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function GestionCombatsPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [combats, setCombats] = useState([]);
  const [aires, setAires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [repartissant, setRepartissant] = useState(false);

  useEffect(() => {
    if (competition) {
      fetchData();
    }
  }, [competition]);

  const fetchData = async () => {
    try {
      const [catRes, combatsRes, airesRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/combats?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/aires-combat?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      // Pour chaque catégorie, compter les compétiteurs
      const catsWithCounts = await Promise.all(catRes.data.map(async (cat) => {
        const compRes = await axios.get(
          `${API}/competiteurs?competition_id=${competition.competition_id}`,
          { withCredentials: true }
        );
        const competiteurs = compRes.data.filter(c => c.categorie_id === cat.categorie_id);
        const catCombats = combatsRes.data.filter(c => c.categorie_id === cat.categorie_id);
        return {
          ...cat,
          nb_competiteurs: competiteurs.length,
          nb_combats: catCombats.length,
          combats_termines: catCombats.filter(c => c.termine).length
        };
      }));
      
      // Filtrer les catégories avec au moins 2 compétiteurs
      const validCats = catsWithCounts.filter(c => c.nb_competiteurs >= 2);
      
      setCategories(validCats);
      setCombats(combatsRes.data);
      setAires(airesRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const genererTableauCategorie = async (categorieId) => {
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/combats/generer/${categorieId}`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const genererTousTableaux = async () => {
    setGenerating(true);
    try {
      let generated = 0;
      for (const cat of categories) {
        if (cat.nb_combats === 0 && cat.nb_competiteurs >= 2) {
          await axios.post(`${API}/combats/generer/${cat.categorie_id}`, {}, { withCredentials: true });
          generated++;
        }
      }
      toast.success(`${generated} tableau(x) généré(s)`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const repartirCombats = async () => {
    if (aires.length === 0) {
      toast.error("Veuillez d'abord créer des aires de combat");
      return;
    }
    
    setRepartissant(true);
    try {
      const response = await axios.post(
        `${API}/aires-combat/repartir/${competition.competition_id}`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la répartition");
    } finally {
      setRepartissant(false);
    }
  };

  const stats = {
    totalCombats: combats.length,
    combatsTermines: combats.filter(c => c.termine).length,
    combatsEnCours: combats.filter(c => c.statut === "en_cours").length,
    finales: combats.filter(c => c.est_finale).length,
    finalesTerminees: combats.filter(c => c.est_finale && c.termine).length
  };

  const progress = stats.totalCombats > 0 
    ? Math.round((stats.combatsTermines / stats.totalCombats) * 100) 
    : 0;

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
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
              Gestion des Combats
            </h1>
            <p className="text-slate-500 mt-1">
              {stats.totalCombats} combat(s) • {stats.combatsTermines} terminé(s)
            </p>
          </div>
        </motion.div>

        {/* Stats globales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-900">Progression globale</h2>
                  <p className="text-slate-500 text-sm">
                    {stats.combatsTermines}/{stats.totalCombats} combats terminés
                  </p>
                </div>
                <span className="text-3xl font-black text-slate-900">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{stats.totalCombats}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.combatsTermines}</p>
                  <p className="text-xs text-slate-500">Terminés</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.combatsEnCours}</p>
                  <p className="text-xs text-slate-500">En cours</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{stats.finalesTerminees}/{stats.finales}</p>
                  <p className="text-xs text-slate-500">Finales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions principales */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {categories.filter(c => c.nb_combats === 0).length > 0 && (
                    <Button 
                      onClick={genererTousTableaux}
                      disabled={generating}
                      data-testid="generer-tous-btn"
                    >
                      {generating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Swords className="h-4 w-4 mr-2" />
                      )}
                      Générer tous les tableaux
                    </Button>
                  )}
                  
                  {combats.length > 0 && (
                    <Button 
                      variant="outline"
                      onClick={repartirCombats}
                      disabled={repartissant || aires.length === 0}
                      data-testid="repartir-btn"
                    >
                      {repartissant ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Shuffle className="h-4 w-4 mr-2" />
                      )}
                      Répartir sur les aires ({aires.length})
                    </Button>
                  )}
                  
                  {aires.length === 0 && (
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/aires-combat")}
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Configurer les aires
                    </Button>
                  )}
                </div>
                
                {aires.length === 0 && combats.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-800 text-sm">
                      Vous devez créer des aires de combat avant de pouvoir répartir les combats.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Liste des catégories avec combats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-slate-900 mb-4">Catégories</h2>
          
          {categories.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-500">Aucune catégorie avec assez de compétiteurs</p>
                <p className="text-sm text-slate-400 mt-1">
                  Il faut au moins 2 compétiteurs par catégorie
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat, index) => {
                const catProgress = cat.nb_combats > 0 
                  ? Math.round((cat.combats_termines / cat.nb_combats) * 100)
                  : 0;
                
                return (
                  <motion.div
                    key={cat.categorie_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <Card className="border-slate-200 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-tight">
                              {cat.nom}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {cat.nb_competiteurs}
                              </Badge>
                              {cat.nb_combats > 0 && (
                                <Badge className={
                                  catProgress === 100 ? "bg-green-500" :
                                  catProgress > 0 ? "bg-blue-500" : "bg-slate-500"
                                }>
                                  {cat.combats_termines}/{cat.nb_combats}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {catProgress === 100 && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        
                        {cat.nb_combats > 0 ? (
                          <Progress value={catProgress} className="h-1.5" />
                        ) : (
                          isAdmin && (
                            <Button 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => genererTableauCategorie(cat.categorie_id)}
                              disabled={generating}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Générer tableau
                            </Button>
                          )
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
