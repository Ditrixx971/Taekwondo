import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { 
  Printer, 
  Download, 
  ChevronLeft,
  Trophy,
  Users,
  CheckCircle2,
  Plus,
  RefreshCw,
  Edit3,
  Lock,
  Unlock,
  Medal,
  Award
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Labels des tours pour l'affichage
const TOUR_LABELS = {
  seizieme: "16èmes de finale",
  huitieme: "8èmes de finale",
  quart: "Quarts de finale",
  demi: "Demi-finales",
  finale: "FINALE"
};

// Ordre des tours pour l'affichage
const TOUR_ORDER = ["seizieme", "huitieme", "quart", "demi", "finale"];

// Composant pour un combattant dans le bracket
const CombattantBox = ({ combattant, couleur, isWinner }) => {
  const bgColor = couleur === "rouge" 
    ? "bg-gradient-to-r from-red-500 to-red-600" 
    : "bg-gradient-to-r from-blue-500 to-blue-600";
  
  const borderColor = isWinner ? "ring-2 ring-yellow-400 ring-offset-2" : "";
  
  const hasData = combattant && combattant.nom && combattant.nom !== "À déterminer";
  
  return (
    <div 
      className={`${bgColor} ${borderColor} text-white p-3 rounded-lg min-w-[160px] transition-all`}
    >
      <div className="flex items-center justify-between">
        <Badge className={couleur === "rouge" ? "bg-red-700" : "bg-blue-700"}>
          {couleur.toUpperCase()}
        </Badge>
        {isWinner && <Trophy className="h-4 w-4 text-yellow-300" />}
      </div>
      {hasData ? (
        <div className="mt-2">
          <p className="font-bold text-sm leading-tight">{combattant.nom}</p>
          <p className="text-xs opacity-80">{combattant.club}</p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm opacity-60 italic">À déterminer...</p>
        </div>
      )}
    </div>
  );
};

// Composant pour un match dans le bracket
const MatchBox = ({ combat, compact = false }) => {
  const isTermine = combat.termine;
  const rouge = combat.rouge;
  const bleu = combat.bleu;
  
  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl border-2 ${
      isTermine ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"
    } shadow-sm ${compact ? "scale-90" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <Badge variant="outline" className="text-xs">
          {TOUR_LABELS[combat.tour] || combat.tour}
          {combat.position && ` #${combat.position}`}
        </Badge>
        {isTermine && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      </div>
      
      <CombattantBox 
        combattant={bleu} 
        couleur="bleu" 
        isWinner={isTermine && combat.vainqueur_id === combat.bleu_id}
      />
      
      <div className="text-center text-xs font-bold text-slate-400">VS</div>
      
      <CombattantBox 
        combattant={rouge} 
        couleur="rouge" 
        isWinner={isTermine && combat.vainqueur_id === combat.rouge_id}
      />
    </div>
  );
};

// Composant Podium selon règles World Taekwondo
const PodiumDisplay = ({ arbreData, finale }) => {
  if (!finale?.termine || !finale?.vainqueur_id) return null;
  
  // Or : Vainqueur finale
  const goldId = finale.vainqueur_id;
  const goldData = goldId === finale.rouge_id ? finale.rouge : finale.bleu;
  
  // Argent : Perdant finale
  const silverId = goldId === finale.rouge_id ? finale.bleu_id : finale.rouge_id;
  const silverData = silverId === finale.rouge_id ? finale.rouge : finale.bleu;
  
  // Bronze : Perdants des demi-finales (ex-aequo)
  const demis = arbreData?.arbre?.demi || [];
  const bronzeData = [];
  demis.forEach(demi => {
    if (demi.termine && demi.vainqueur_id) {
      const loserId = demi.vainqueur_id === demi.rouge_id ? demi.bleu_id : demi.rouge_id;
      const loserData = loserId === demi.rouge_id ? demi.rouge : demi.bleu;
      if (loserData && loserData.nom !== "À déterminer") {
        bronzeData.push(loserData);
      }
    }
  });
  
  return (
    <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
      <h3 className="text-center text-lg font-bold text-slate-700 mb-6 flex items-center justify-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-500" />
        PODIUM
      </h3>
      
      <div className="flex flex-wrap justify-center items-end gap-4">
        {/* Argent (2ème) */}
        <div className="text-center order-1">
          <div className="p-4 bg-gradient-to-b from-slate-200 to-slate-300 rounded-lg w-40 h-24 flex flex-col justify-end">
            <Medal className="h-8 w-8 text-slate-500 mx-auto" />
            <p className="font-bold text-sm mt-1">{silverData?.nom || "N/A"}</p>
            <p className="text-xs text-slate-600">{silverData?.club}</p>
          </div>
          <Badge className="mt-2 bg-slate-400">🥈 ARGENT</Badge>
        </div>
        
        {/* Or (1er) */}
        <div className="text-center order-0">
          <div className="p-4 bg-gradient-to-b from-yellow-200 to-yellow-400 rounded-lg w-44 h-32 flex flex-col justify-end shadow-lg">
            <Trophy className="h-10 w-10 text-yellow-600 mx-auto" />
            <p className="font-bold text-base mt-1">{goldData?.nom || "N/A"}</p>
            <p className="text-xs text-slate-700">{goldData?.club}</p>
          </div>
          <Badge className="mt-2 bg-yellow-500">🥇 OR - CHAMPION</Badge>
        </div>
        
        {/* Bronze (3ème ex-aequo) */}
        <div className="text-center order-2">
          <div className="flex gap-2">
            {bronzeData.map((bronze, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-b from-orange-200 to-orange-300 rounded-lg w-36 h-20 flex flex-col justify-end">
                <Award className="h-6 w-6 text-orange-600 mx-auto" />
                <p className="font-bold text-xs mt-1">{bronze?.nom || "N/A"}</p>
                <p className="text-xs text-slate-600">{bronze?.club}</p>
              </div>
            ))}
          </div>
          <Badge className="mt-2 bg-orange-400">🥉 BRONZE (ex-aequo)</Badge>
        </div>
      </div>
      
      <p className="text-center text-xs text-slate-500 mt-4 italic">
        Règles World Taekwondo : Pas de combat pour la 3ème place. 
        Les deux perdants des demi-finales reçoivent le bronze.
      </p>
    </div>
  );
};

export default function ArbreCombatPage() {
  const { isAdmin, isMaster } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(searchParams.get("categorie") || "");
  const [arbreData, setArbreData] = useState(null);
  const [allCompetiteurs, setAllCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Gestion des BYEs
  const [byesDialogOpen, setByesDialogOpen] = useState(false);
  const [byesInfo, setByesInfo] = useState(null);
  const [selectedByes, setSelectedByes] = useState([]);
  const [savingByes, setSavingByes] = useState(false);
  
  // Dialogue pour ajouter un combat
  const [addCombatDialogOpen, setAddCombatDialogOpen] = useState(false);
  const [newCombat, setNewCombat] = useState({
    tour: "manuel",
    nom_personnalise: "",
    rouge_id: "",
    bleu_id: ""
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (competition) {
      fetchCategories();
    }
  }, [competition]);

  useEffect(() => {
    if (selectedCategorie) {
      fetchArbre();
    }
  }, [selectedCategorie]);

  const fetchCategories = async () => {
    try {
      const [catRes, combatsRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/combats?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      const catsWithCombats = catRes.data.filter(cat => 
        combatsRes.data.some(c => c.categorie_id === cat.categorie_id)
      );
      
      setCategories(catsWithCombats);
      
      if (catsWithCombats.length > 0 && !selectedCategorie) {
        setSelectedCategorie(catsWithCombats[0].categorie_id);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const fetchArbre = async () => {
    try {
      const [arbreRes, competiteursRes] = await Promise.all([
        axios.get(`${API}/combats/arbre/${selectedCategorie}`, { withCredentials: true }),
        axios.get(`${API}/competiteurs?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      setAllCompetiteurs(competiteursRes.data.filter(c => c.categorie_id === selectedCategorie));
      setArbreData(arbreRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement de l'arbre");
    }
  };

  // Charger les infos des BYEs
  const fetchByesInfo = async () => {
    try {
      const response = await axios.get(`${API}/categories/${selectedCategorie}/byes`, { withCredentials: true });
      setByesInfo(response.data);
      setSelectedByes(response.data.competiteurs_avec_bye || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des BYEs");
    }
  };

  // Ouvrir le dialogue des BYEs
  const handleOpenByesDialog = async () => {
    await fetchByesInfo();
    setByesDialogOpen(true);
  };

  // Sauvegarder les modifications de BYEs
  const handleSaveByes = async () => {
    if (!byesInfo) return;
    
    if (selectedByes.length !== byesInfo.num_byes_disponibles) {
      toast.error(`Vous devez sélectionner exactement ${byesInfo.num_byes_disponibles} compétiteur(s) pour les BYEs`);
      return;
    }
    
    setSavingByes(true);
    try {
      await axios.put(`${API}/categories/${selectedCategorie}/byes`, {
        competiteur_ids_with_bye: selectedByes
      }, { withCredentials: true });
      
      toast.success("BYEs modifiés avec succès");
      setByesDialogOpen(false);
      fetchArbre(); // Recharger l'arbre
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la modification des BYEs");
    } finally {
      setSavingByes(false);
    }
  };

  // Toggle un BYE
  const toggleBye = (competiteurId) => {
    if (selectedByes.includes(competiteurId)) {
      setSelectedByes(selectedByes.filter(id => id !== competiteurId));
    } else {
      if (selectedByes.length < (byesInfo?.num_byes_disponibles || 0)) {
        setSelectedByes([...selectedByes, competiteurId]);
      } else {
        toast.warning(`Maximum ${byesInfo?.num_byes_disponibles} BYE(s) autorisé(s)`);
      }
    }
  };

  // Créer un nouveau combat (MASTER uniquement)
  const handleCreateCombat = async () => {
    if (!isMaster) return;
    setCreating(true);
    try {
      await axios.post(`${API}/combats-manuels`, {
        competition_id: competition.competition_id,
        categorie_id: selectedCategorie,
        tour: newCombat.tour,
        position: 1,
        nom_personnalise: newCombat.nom_personnalise || null,
        rouge_id: newCombat.rouge_id || null,
        bleu_id: newCombat.bleu_id || null
      }, { withCredentials: true });
      
      toast.success("Combat ajouté");
      setAddCombatDialogOpen(false);
      setNewCombat({ tour: "manuel", nom_personnalise: "", rouge_id: "", bleu_id: "" });
      fetchArbre();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handlePrint = () => window.print();

  // Organiser les combats par tour selon l'ordre
  const organizeByTour = useCallback(() => {
    if (!arbreData?.arbre) return {};
    
    const result = {};
    TOUR_ORDER.forEach(tour => {
      if (arbreData.arbre[tour] && arbreData.arbre[tour].length > 0) {
        result[tour] = arbreData.arbre[tour];
      }
    });
    
    // Ajouter les tours personnalisés non standard
    Object.keys(arbreData.arbre).forEach(tour => {
      if (!TOUR_ORDER.includes(tour) && arbreData.arbre[tour].length > 0) {
        result[tour] = arbreData.arbre[tour];
      }
    });
    
    return result;
  }, [arbreData]);

  const combatsByTour = organizeByTour();
  const toursList = Object.keys(combatsByTour);
  const finale = combatsByTour.finale?.[0] || null;
  const categorieNom = categories.find(c => c.categorie_id === selectedCategorie)?.nom || "";

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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/gestion-combats")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                Arbre des combats
              </h1>
              {arbreData && (
                <p className="text-sm text-slate-500 mt-1">
                  Bracket de {arbreData.bracket_size || "?"} • {arbreData.num_byes || 0} BYE(s)
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {isMaster && selectedCategorie && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleOpenByesDialog}
                  data-testid="modify-byes-btn"
                >
                  {arbreData?.byes_locked ? (
                    <Lock className="mr-2 h-4 w-4" />
                  ) : (
                    <Unlock className="mr-2 h-4 w-4" />
                  )}
                  Modifier BYEs
                </Button>
                <Button onClick={() => setAddCombatDialogOpen(true)} data-testid="add-combat-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  Combat
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handlePrint} data-testid="print-arbre-btn">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </motion.div>

        {/* Sélection catégorie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="print:hidden"
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-700">Catégorie :</label>
                <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                  <SelectTrigger className="w-80" data-testid="select-categorie-arbre">
                    <SelectValue placeholder="Sélectionner une catégorie" />
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Titre impression */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-black uppercase">{competition?.nom}</h1>
          <h2 className="text-xl font-bold mt-2">{categorieNom}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(competition?.date).toLocaleDateString('fr-FR', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </p>
        </div>

        {/* Arbre des combats */}
        {!selectedCategorie || categories.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">Aucune catégorie avec des combats générés</p>
              <Button className="mt-4" onClick={() => navigate("/gestion-combats")}>
                Générer les combats
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="overflow-x-auto"
          >
            <div className="min-w-[900px] p-6 bg-white rounded-xl border border-slate-200 print:border-0 print:p-0">
              {/* Titre catégorie */}
              <div className="text-center mb-8 print:hidden">
                <h2 className="text-xl font-bold text-slate-900">{categorieNom}</h2>
                <p className="text-slate-500 text-sm">
                  {arbreData?.total_combats || 0} combat(s) • 
                  {arbreData?.combats_termines || 0} terminé(s)
                </p>
              </div>

              {/* Bracket Structure - Affichage horizontal par tours */}
              <div className="flex items-start justify-center gap-8 overflow-x-auto pb-4">
                {toursList.map((tour, tourIdx) => (
                  <div key={tour} className="flex flex-col gap-4 min-w-[200px]">
                    <h3 className="text-center text-sm font-bold text-slate-500 uppercase sticky top-0 bg-white py-2">
                      {TOUR_LABELS[tour] || tour}
                    </h3>
                    <div className="flex flex-col gap-4" style={{ 
                      marginTop: tourIdx > 0 ? `${Math.pow(2, tourIdx) * 20}px` : 0 
                    }}>
                      {combatsByTour[tour].map((combat) => (
                        <div key={combat.combat_id} className="relative">
                          {tour === "finale" && (
                            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 z-10">
                              <Trophy className="h-3 w-3 mr-1" />
                              FINALE
                            </Badge>
                          )}
                          <MatchBox 
                            combat={combat}
                            compact={toursList.length > 3}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Champion */}
                {finale?.termine && finale.vainqueur_id && (
                  <div className="flex flex-col items-center gap-4 min-w-[180px]">
                    <h3 className="text-center text-sm font-bold text-yellow-600 uppercase">
                      CHAMPION
                    </h3>
                    <div className="flex flex-col items-center">
                      <Trophy className="h-16 w-16 text-yellow-500" />
                      <div className="mt-3 p-4 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-lg border-2 border-yellow-400 text-center">
                        <p className="font-black text-lg text-slate-900">
                          {finale.vainqueur_id === finale.rouge_id 
                            ? finale.rouge?.nom 
                            : finale.bleu?.nom}
                        </p>
                        <p className="text-sm text-slate-600">
                          {finale.vainqueur_id === finale.rouge_id 
                            ? finale.rouge?.club 
                            : finale.bleu?.club}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Podium complet */}
              <PodiumDisplay arbreData={arbreData} finale={finale} />
            </div>
          </motion.div>
        )}

        {/* Bouton ordre des combats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="print:hidden"
        >
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/ordre-combats?categorie=${selectedCategorie}`)}
          >
            Voir la liste ordonnée des combats avec horaires
          </Button>
        </motion.div>
      </div>

      {/* Styles impression */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .overflow-x-auto, .overflow-x-auto * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .min-w-\\[900px\\] { min-width: 100% !important; }
        }
      `}</style>

      {/* Dialogue modification BYEs (MASTER uniquement) */}
      <Dialog open={byesDialogOpen} onOpenChange={setByesDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Modifier les BYEs
            </DialogTitle>
            <DialogDescription>
              {byesInfo?.byes_locked ? (
                <span className="text-red-500 flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  Les BYEs sont verrouillés car un combat a déjà commencé.
                </span>
              ) : (
                <>
                  Sélectionnez {byesInfo?.num_byes_disponibles || 0} compétiteur(s) qui auront un BYE 
                  (exemption du premier tour).
                  <br />
                  <span className="text-slate-500">
                    {byesInfo?.nb_competiteurs || 0} compétiteurs dans un bracket de {byesInfo?.bracket_size || 0}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {byesInfo && !byesInfo.byes_locked ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>BYEs sélectionnés :</span>
                <Badge variant={selectedByes.length === byesInfo.num_byes_disponibles ? "default" : "destructive"}>
                  {selectedByes.length} / {byesInfo.num_byes_disponibles}
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {byesInfo.competiteurs?.map(comp => (
                  <div 
                    key={comp.competiteur_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedByes.includes(comp.competiteur_id) 
                        ? "border-green-400 bg-green-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => toggleBye(comp.competiteur_id)}
                  >
                    <Checkbox 
                      checked={selectedByes.includes(comp.competiteur_id)}
                      onCheckedChange={() => toggleBye(comp.competiteur_id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{comp.prenom} {comp.nom}</p>
                      <p className="text-sm text-slate-500">{comp.club}</p>
                    </div>
                    {selectedByes.includes(comp.competiteur_id) && (
                      <Badge className="bg-green-500">BYE</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : byesInfo?.byes_locked ? (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">
                Les BYEs ne peuvent plus être modifiés une fois la compétition commencée.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setByesDialogOpen(false)}>
              Annuler
            </Button>
            {byesInfo && !byesInfo.byes_locked && (
              <Button 
                onClick={handleSaveByes} 
                disabled={savingByes || selectedByes.length !== byesInfo.num_byes_disponibles}
                data-testid="save-byes-btn"
              >
                {savingByes ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue ajout combat (MASTER uniquement) */}
      <Dialog open={addCombatDialogOpen} onOpenChange={setAddCombatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ajouter un combat
            </DialogTitle>
            <DialogDescription>
              Ajouter un nouveau combat dans la catégorie {categorieNom}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nom personnalisé (optionnel)</Label>
              <Input
                value={newCombat.nom_personnalise}
                onChange={(e) => setNewCombat({ ...newCombat, nom_personnalise: e.target.value })}
                placeholder="Ex: Combat de barrage"
                data-testid="add-combat-nom"
              />
            </div>

            <div>
              <Label>Type de tour</Label>
              <Select 
                value={newCombat.tour} 
                onValueChange={(v) => setNewCombat({ ...newCombat, tour: v })}
              >
                <SelectTrigger data-testid="add-combat-tour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manuel">Manuel</SelectItem>
                  <SelectItem value="seizieme">16ème de finale</SelectItem>
                  <SelectItem value="huitieme">8ème de finale</SelectItem>
                  <SelectItem value="quart">Quart de finale</SelectItem>
                  <SelectItem value="demi">Demi-finale</SelectItem>
                  <SelectItem value="finale">Finale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-blue-600">Combattant Bleu (optionnel)</Label>
              <Select 
                value={newCombat.bleu_id || "none"} 
                onValueChange={(v) => setNewCombat({ ...newCombat, bleu_id: v === "none" ? "" : v })}
              >
                <SelectTrigger data-testid="add-combat-bleu">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Non assigné --</SelectItem>
                  {allCompetiteurs.map(c => (
                    <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                      {c.prenom} {c.nom} ({c.club})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-red-600">Combattant Rouge (optionnel)</Label>
              <Select 
                value={newCombat.rouge_id || "none"} 
                onValueChange={(v) => setNewCombat({ ...newCombat, rouge_id: v === "none" ? "" : v })}
              >
                <SelectTrigger data-testid="add-combat-rouge">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Non assigné --</SelectItem>
                  {allCompetiteurs.map(c => (
                    <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                      {c.prenom} {c.nom} ({c.club})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCombatDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCombat} disabled={creating} data-testid="confirm-add-combat">
              {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
