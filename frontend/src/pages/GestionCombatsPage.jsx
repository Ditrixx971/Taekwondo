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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  Swords, 
  Play, 
  RefreshCw, 
  Users,
  Grid3X3,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Shuffle,
  Edit3,
  X,
  ChevronRight,
  Eye,
  TreeDeciduous,
  ArrowUpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function GestionCombatsPage() {
  const { isAdmin, isMaster } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [combats, setCombats] = useState([]);
  const [aires, setAires] = useState([]);
  const [allCompetiteurs, setAllCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [repartissant, setRepartissant] = useState(false);
  
  // État pour la catégorie sélectionnée
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [categorieCompetiteurs, setCategorieCompetiteurs] = useState([]);
  const [arbreData, setArbreData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (competition) {
      fetchData();
    }
  }, [competition]);

  const fetchData = async () => {
    try {
      const [catRes, combatsRes, airesRes, competiteursRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/combats?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/aires-combat?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/competiteurs?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      const allCompetiteursData = competiteursRes.data;
      const allCombats = combatsRes.data;
      
      setAllCompetiteurs(allCompetiteursData);
      
      // Helper : un compétiteur appartient à une catégorie si :
      //  - sa cat origine = catégorie ET il n'est pas en surclasse_uniquement
      //  - OU sa cat de surclassement = catégorie
      const competiteursInCategorie = (cat) => allCompetiteursData.filter(c => 
        (c.categorie_id === cat.categorie_id && !c.surclasse_uniquement) ||
        c.categorie_surclasse_id === cat.categorie_id
      );
      
      // Pour chaque catégorie, compter les compétiteurs (sans requête supplémentaire)
      const catsWithCounts = catRes.data.map((cat) => {
        const competiteurs = competiteursInCategorie(cat);
        const catCombats = allCombats.filter(c => c.categorie_id === cat.categorie_id);
        return {
          ...cat,
          nb_competiteurs: competiteurs.length,
          nb_combats: catCombats.length,
          combats_termines: catCombats.filter(c => c.termine).length
        };
      });
      
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

  // Charger les détails d'une catégorie (compétiteurs + arbre)
  const handleSelectCategorie = async (cat) => {
    setSelectedCategorie(cat);
    setLoadingDetails(true);
    
    try {
      // Filtrer les compétiteurs de cette catégorie (incluant surclassés)
      const competiteurs = allCompetiteurs.filter(c => 
        (c.categorie_id === cat.categorie_id && !c.surclasse_uniquement) ||
        c.categorie_surclasse_id === cat.categorie_id
      );
      setCategorieCompetiteurs(competiteurs);
      
      // Charger l'arbre de combat si des combats existent
      if (cat.nb_combats > 0) {
        const arbreRes = await axios.get(
          `${API}/combats/arbre/${cat.categorie_id}`,
          { withCredentials: true }
        );
        setArbreData(arbreRes.data);
      } else {
        setArbreData(null);
      }
    } catch (error) {
      console.error("Erreur chargement détails:", error);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedCategorie(null);
    setCategorieCompetiteurs([]);
    setArbreData(null);
  };

  // Composant mini arbre de combat
  const MiniCombatNode = ({ combat }) => {
    const getRougeNom = () => {
      if (combat.rouge?.nom) return combat.rouge.nom;
      if (!combat.rouge_id) return "À déterminer";
      const comp = allCompetiteurs.find(c => c.competiteur_id === combat.rouge_id);
      return comp ? `${comp.prenom} ${comp.nom.charAt(0)}.` : "?";
    };
    
    const getBleuNom = () => {
      if (combat.bleu?.nom) return combat.bleu.nom;
      if (!combat.bleu_id) return "À déterminer";
      const comp = allCompetiteurs.find(c => c.competiteur_id === combat.bleu_id);
      return comp ? `${comp.prenom} ${comp.nom.charAt(0)}.` : "?";
    };
    
    return (
      <div className="relative">
        <div className={`
          border rounded-lg p-2 text-xs min-w-[160px]
          ${combat.termine ? 'bg-green-50 border-green-300' : 
            combat.statut === 'en_cours' ? 'bg-blue-50 border-blue-300' : 
            'bg-white border-slate-200'}
        `}>
          {/* Nom du combat si personnalisé */}
          {combat.nom_personnalise && (
            <div className="text-[10px] text-slate-500 text-center mb-1 truncate">
              {combat.nom_personnalise}
            </div>
          )}
          <div className={`flex items-center gap-1 p-1 rounded ${combat.vainqueur_id === combat.rouge_id ? 'bg-green-100 font-bold' : ''}`}>
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="truncate flex-1">{getRougeNom()}</span>
            {combat.termine && <span className="ml-auto font-bold">{combat.score_rouge}</span>}
          </div>
          <div className={`flex items-center gap-1 p-1 rounded ${combat.vainqueur_id === combat.bleu_id ? 'bg-green-100 font-bold' : ''}`}>
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="truncate flex-1">{getBleuNom()}</span>
            {combat.termine && <span className="ml-auto font-bold">{combat.score_bleu}</span>}
          </div>
        </div>
      </div>
    );
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
                  
                  {isMaster && (
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/combats-manuel")}
                      data-testid="editeur-manuel-btn"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Éditeur manuel
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
                    <Card 
                      className="border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
                      onClick={() => handleSelectCategorie(cat)}
                      data-testid={`categorie-card-${cat.categorie_id}`}
                    >
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
                          <div className="flex items-center gap-1">
                            {catProgress === 100 && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                        
                        {cat.nb_combats > 0 ? (
                          <Progress value={catProgress} className="h-1.5" />
                        ) : (
                          isAdmin && (
                            <Button 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                genererTableauCategorie(cat.categorie_id);
                              }}
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

        {/* Panneau de détails de la catégorie */}
        <Dialog open={!!selectedCategorie} onOpenChange={(open) => !open && closeDetails()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                {selectedCategorie?.nom}
              </DialogTitle>
            </DialogHeader>
            
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Liste des compétiteurs */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Compétiteurs ({categorieCompetiteurs.length})
                  </h3>
                  
                  {categorieCompetiteurs.length === 0 ? (
                    <p className="text-slate-500 text-sm">Aucun compétiteur dans cette catégorie</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Club</TableHead>
                            <TableHead>Poids</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categorieCompetiteurs.map((comp) => {
                            const isSurclasse = comp.surclasse && comp.categorie_surclasse_id === selectedCategorie.categorie_id;
                            return (
                            <TableRow key={comp.competiteur_id} data-testid={`gestion-comp-row-${comp.competiteur_id}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{comp.prenom} {comp.nom}</span>
                                  {isSurclasse && (
                                    <Badge className="bg-blue-100 text-blue-700 text-xs" data-testid={`gestion-surclasse-badge-${comp.competiteur_id}`}>
                                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                                      Surclassé
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{comp.club}</TableCell>
                              <TableCell>
                                {comp.poids_officiel ? (
                                  <span className="text-green-600 font-bold">{comp.poids_officiel} kg</span>
                                ) : (
                                  <span className="text-slate-400">{comp.poids_declare} kg</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {comp.disqualifie ? (
                                  <Badge variant="destructive">Disqualifié</Badge>
                                ) : comp.pese ? (
                                  <Badge className="bg-green-100 text-green-700">Pesé</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700">À peser</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                
                {/* Arbre de combat */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <TreeDeciduous className="h-4 w-4" />
                      Arbre des combats
                    </h3>
                    {arbreData && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          closeDetails();
                          navigate(`/arbre-combat?categorie=${selectedCategorie.categorie_id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Vue complète
                      </Button>
                    )}
                  </div>
                  
                  {!arbreData ? (
                    <div className="bg-slate-50 rounded-lg p-6 text-center">
                      <Swords className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-500">Aucun combat généré</p>
                      {isAdmin && (
                        <Button 
                          className="mt-3"
                          onClick={() => {
                            genererTableauCategorie(selectedCategorie.categorie_id);
                            closeDetails();
                          }}
                          disabled={generating}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Générer le tableau
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-4 overflow-x-auto">
                      <div className="flex gap-8 items-start justify-center min-w-max">
                        {/* Quarts de finale */}
                        {arbreData.arbre?.quart?.length > 0 && (
                          <div className="flex flex-col gap-4">
                            <h4 className="text-xs font-bold text-slate-500 text-center uppercase">
                              Quarts
                            </h4>
                            {arbreData.arbre.quart.map((combat) => (
                              <MiniCombatNode key={combat.combat_id} combat={combat} />
                            ))}
                          </div>
                        )}
                        
                        {/* Demi-finales */}
                        {arbreData.arbre?.demi?.length > 0 && (
                          <div className="flex flex-col gap-6 justify-center">
                            <h4 className="text-xs font-bold text-slate-500 text-center uppercase">
                              Demi-finales
                            </h4>
                            {arbreData.arbre.demi.map((combat) => (
                              <MiniCombatNode key={combat.combat_id} combat={combat} />
                            ))}
                          </div>
                        )}
                        
                        {/* Finale & Bronze */}
                        {(arbreData.arbre?.finale?.length > 0 || arbreData.arbre?.bronze?.length > 0) && (
                          <div className="flex flex-col gap-4 justify-center">
                            {arbreData.arbre?.finale?.length > 0 && (
                              <>
                                <h4 className="text-xs font-bold text-slate-500 text-center uppercase">
                                  Finale
                                </h4>
                                {arbreData.arbre.finale.map((combat) => (
                                  <MiniCombatNode key={combat.combat_id} combat={combat} />
                                ))}
                              </>
                            )}
                            
                            {/* Bronze */}
                            {arbreData.arbre?.bronze?.length > 0 && (
                              <>
                                <h4 className="text-xs font-bold text-slate-500 text-center uppercase mt-4">
                                  Petite finale
                                </h4>
                                {arbreData.arbre.bronze.map((combat) => (
                                  <MiniCombatNode key={combat.combat_id} combat={combat} />
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Statistiques */}
                      <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-200">
                        <div className="text-center">
                          <p className="text-lg font-bold text-slate-900">
                            {arbreData.total_combats || 0}
                          </p>
                          <p className="text-xs text-slate-500">Combats</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">
                            {arbreData.combats_termines || 0}
                          </p>
                          <p className="text-xs text-slate-500">Terminés</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">
                            {(arbreData.total_combats || 0) - (arbreData.combats_termines || 0)}
                          </p>
                          <p className="text-xs text-slate-500">Restants</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
