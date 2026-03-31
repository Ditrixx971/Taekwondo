import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { 
  Printer, 
  FileDown,
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
import jsPDF from "jspdf";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Labels des tours
const TOUR_LABELS = {
  seizieme: "16èmes",
  huitieme: "8èmes",
  quart: "Quarts",
  demi: "Demi-finales",
  finale: "Finale"
};

const TOUR_ORDER = ["seizieme", "huitieme", "quart", "demi", "finale"];

// Composant Match Compact - Une ligne par combat
const MatchCompact = ({ combat, isLast = false }) => {
  const isTermine = combat.termine;
  const hasRouge = combat.rouge && combat.rouge.nom !== "À déterminer";
  const hasBleu = combat.bleu && combat.bleu.nom !== "À déterminer";
  const rougeWon = isTermine && combat.vainqueur_id === combat.rouge_id;
  const bleuWon = isTermine && combat.vainqueur_id === combat.bleu_id;
  
  const rougeNom = hasRouge ? combat.rouge.nom : "À déterminer";
  const bleuNom = hasBleu ? combat.bleu.nom : "À déterminer";
  const rougeClub = hasRouge ? combat.rouge.club : "";
  const bleuClub = hasBleu ? combat.bleu.club : "";

  return (
    <div 
      className={`
        relative bg-white border rounded-lg shadow-sm p-2 min-w-[280px] max-w-[320px]
        ${isTermine ? "border-green-300" : "border-slate-200"}
        hover:shadow-md transition-shadow
        print:shadow-none print:border-slate-300
      `}
      data-testid={`match-${combat.combat_id}`}
    >
      {/* Ligne de connexion sortante */}
      {!isLast && (
        <div className="absolute right-0 top-1/2 w-4 h-px bg-slate-300 translate-x-full print:bg-slate-400" />
      )}
      
      {/* Header compact */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-slate-400 uppercase">
          {TOUR_LABELS[combat.tour] || combat.tour} #{combat.position || 1}
        </span>
        {isTermine && (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        )}
      </div>

      {/* Combattant BLEU (haut) */}
      <div className={`
        flex items-center gap-2 py-1 px-2 rounded text-xs
        ${bleuWon ? "bg-blue-100 border-l-2 border-blue-500" : "bg-slate-50"}
      `}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
        <span className={`flex-1 truncate ${hasBleu ? "text-slate-800" : "text-slate-400 italic"}`}>
          {bleuNom}
        </span>
        {bleuClub && (
          <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
            ({bleuClub})
          </span>
        )}
        {bleuWon && <Trophy className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
      </div>

      {/* Séparateur VS */}
      <div className="text-center text-[9px] text-slate-300 font-bold py-0.5">VS</div>

      {/* Combattant ROUGE (bas) */}
      <div className={`
        flex items-center gap-2 py-1 px-2 rounded text-xs
        ${rougeWon ? "bg-red-100 border-l-2 border-red-500" : "bg-slate-50"}
      `}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
        <span className={`flex-1 truncate ${hasRouge ? "text-slate-800" : "text-slate-400 italic"}`}>
          {rougeNom}
        </span>
        {rougeClub && (
          <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
            ({rougeClub})
          </span>
        )}
        {rougeWon && <Trophy className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
      </div>
    </div>
  );
};

// Composant Champion
const ChampionBox = ({ finale }) => {
  if (!finale?.termine || !finale?.vainqueur_id) return null;
  
  const isRouge = finale.vainqueur_id === finale.rouge_id;
  const champion = isRouge ? finale.rouge : finale.bleu;
  
  return (
    <div className="flex flex-col items-center justify-center min-w-[140px]">
      <Trophy className="h-8 w-8 text-yellow-500 mb-2" />
      <div className="bg-gradient-to-b from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-lg p-3 text-center shadow-sm">
        <p className="text-[10px] text-yellow-600 font-bold uppercase mb-1">Champion</p>
        <p className="font-bold text-sm text-slate-900">{champion?.nom || "?"}</p>
        <p className="text-[10px] text-slate-500">{champion?.club || ""}</p>
      </div>
    </div>
  );
};

// Composant Podium Compact
const PodiumCompact = ({ arbreData, finale }) => {
  if (!finale?.termine || !finale?.vainqueur_id) return null;
  
  const goldData = finale.vainqueur_id === finale.rouge_id ? finale.rouge : finale.bleu;
  const silverData = finale.vainqueur_id === finale.rouge_id ? finale.bleu : finale.rouge;
  
  const demis = arbreData?.arbre?.demi || [];
  const bronzeData = [];
  demis.forEach(demi => {
    if (demi.termine && demi.vainqueur_id) {
      const loserData = demi.vainqueur_id === demi.rouge_id ? demi.bleu : demi.rouge;
      if (loserData && loserData.nom !== "À déterminer") {
        bronzeData.push(loserData);
      }
    }
  });
  
  return (
    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 print:bg-white">
      <h3 className="text-center text-sm font-bold text-slate-600 mb-4 flex items-center justify-center gap-2">
        <Medal className="h-4 w-4" />
        PODIUM
      </h3>
      
      <div className="flex justify-center items-end gap-3 text-center">
        {/* Argent */}
        <div className="w-28">
          <div className="h-12 bg-gradient-to-b from-slate-100 to-slate-200 rounded-t-lg flex items-center justify-center">
            <span className="text-lg">🥈</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-b-lg p-2">
            <p className="font-semibold text-xs truncate">{silverData?.nom || "N/A"}</p>
            <p className="text-[10px] text-slate-500 truncate">{silverData?.club}</p>
          </div>
        </div>
        
        {/* Or */}
        <div className="w-32 -mt-4">
          <div className="h-16 bg-gradient-to-b from-yellow-100 to-yellow-200 rounded-t-lg flex items-center justify-center">
            <span className="text-2xl">🥇</span>
          </div>
          <div className="bg-white border-2 border-yellow-400 rounded-b-lg p-2">
            <p className="font-bold text-sm truncate">{goldData?.nom || "N/A"}</p>
            <p className="text-[10px] text-slate-500 truncate">{goldData?.club}</p>
          </div>
        </div>
        
        {/* Bronze (ex-aequo) */}
        <div className="w-28">
          <div className="h-10 bg-gradient-to-b from-orange-100 to-orange-200 rounded-t-lg flex items-center justify-center">
            <span className="text-lg">🥉</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-b-lg p-2">
            {bronzeData.map((b, i) => (
              <div key={i} className={i > 0 ? "mt-1 pt-1 border-t border-slate-100" : ""}>
                <p className="font-semibold text-xs truncate">{b?.nom || "N/A"}</p>
                <p className="text-[10px] text-slate-500 truncate">{b?.club}</p>
              </div>
            ))}
            {bronzeData.length === 0 && <p className="text-xs text-slate-400">-</p>}
          </div>
        </div>
      </div>
      
      <p className="text-center text-[10px] text-slate-400 mt-3 italic print:hidden">
        Règles World Taekwondo : 2 médailles de bronze (ex-aequo)
      </p>
    </div>
  );
};

export default function ArbreCombatPage() {
  const { isAdmin, isMaster } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const arbreRef = useRef(null);
  
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(searchParams.get("categorie") || "");
  const [arbreData, setArbreData] = useState(null);
  const [allCompetiteurs, setAllCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogues
  const [byesDialogOpen, setByesDialogOpen] = useState(false);
  const [byesInfo, setByesInfo] = useState(null);
  const [selectedByes, setSelectedByes] = useState([]);
  const [savingByes, setSavingByes] = useState(false);
  const [addCombatDialogOpen, setAddCombatDialogOpen] = useState(false);
  const [newCombat, setNewCombat] = useState({ tour: "manuel", nom_personnalise: "", rouge_id: "", bleu_id: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (competition) fetchCategories();
  }, [competition]);

  useEffect(() => {
    if (selectedCategorie) fetchArbre();
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
      toast.error("Erreur lors du chargement de l'arbre");
    }
  };

  const fetchByesInfo = async () => {
    try {
      const response = await axios.get(`${API}/categories/${selectedCategorie}/byes`, { withCredentials: true });
      setByesInfo(response.data);
      setSelectedByes(response.data.competiteurs_avec_bye || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des BYEs");
    }
  };

  const handleOpenByesDialog = async () => {
    await fetchByesInfo();
    setByesDialogOpen(true);
  };

  const handleSaveByes = async () => {
    if (!byesInfo || selectedByes.length !== byesInfo.num_byes_disponibles) {
      toast.error(`Vous devez sélectionner exactement ${byesInfo?.num_byes_disponibles || 0} BYE(s)`);
      return;
    }
    
    setSavingByes(true);
    try {
      await axios.put(`${API}/categories/${selectedCategorie}/byes`, {
        competiteur_ids_with_bye: selectedByes
      }, { withCredentials: true });
      
      toast.success("BYEs modifiés");
      setByesDialogOpen(false);
      fetchArbre();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    } finally {
      setSavingByes(false);
    }
  };

  const toggleBye = (competiteurId) => {
    if (selectedByes.includes(competiteurId)) {
      setSelectedByes(selectedByes.filter(id => id !== competiteurId));
    } else if (selectedByes.length < (byesInfo?.num_byes_disponibles || 0)) {
      setSelectedByes([...selectedByes, competiteurId]);
    } else {
      toast.warning(`Maximum ${byesInfo?.num_byes_disponibles} BYE(s)`);
    }
  };

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
      toast.error(error.response?.data?.detail || "Erreur");
    } finally {
      setCreating(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!arbreData) return;
    
    const categorieNom = categories.find(c => c.categorie_id === selectedCategorie)?.nom || "Catégorie";
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Déterminer la taille du PDF
    const totalCombats = arbreData.total_combats || 0;
    const format = totalCombats > 15 ? 'a3' : 'a4';
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: format
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    
    // En-tête
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(competition?.nom || "Compétition", pageWidth / 2, margin + 5, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(categorieNom, pageWidth / 2, margin + 12, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const compDate = competition?.date ? new Date(competition.date).toLocaleDateString('fr-FR') : "";
    doc.text(`Date: ${compDate}`, pageWidth / 2, margin + 18, { align: "center" });
    
    // Organiser les combats
    const combatsByTour = {};
    TOUR_ORDER.forEach(tour => {
      if (arbreData.arbre?.[tour]?.length > 0) {
        combatsByTour[tour] = arbreData.arbre[tour];
      }
    });
    
    const tours = Object.keys(combatsByTour);
    const numTours = tours.length;
    
    if (numTours === 0) {
      doc.text("Aucun combat généré", pageWidth / 2, pageHeight / 2, { align: "center" });
      doc.save(`arbre_${categorieNom.replace(/\s+/g, '_')}.pdf`);
      return;
    }
    
    // Calculer les dimensions
    const drawAreaWidth = pageWidth - margin * 2;
    const drawAreaHeight = pageHeight - margin * 2 - 30; // Espace pour header/footer
    const tourWidth = drawAreaWidth / (numTours + 1); // +1 pour le champion
    const startY = margin + 25;
    
    // Dessiner chaque tour
    tours.forEach((tour, tourIdx) => {
      const combats = combatsByTour[tour];
      const x = margin + tourIdx * tourWidth;
      const combatHeight = Math.min(25, drawAreaHeight / (combats.length + 1));
      
      // Titre du tour
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(TOUR_LABELS[tour] || tour, x + tourWidth / 2, startY, { align: "center" });
      
      // Dessiner les combats
      combats.forEach((combat, combatIdx) => {
        const y = startY + 8 + combatIdx * (combatHeight + 5);
        const boxWidth = tourWidth - 10;
        const boxHeight = combatHeight;
        
        // Box du combat
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x + 5, y, boxWidth, boxHeight, 2, 2, 'FD');
        
        // Bordure verte si terminé
        if (combat.termine) {
          doc.setDrawColor(100, 200, 100);
          doc.roundedRect(x + 5, y, boxWidth, boxHeight, 2, 2, 'S');
        }
        
        // Combattant Bleu
        const bleuNom = combat.bleu?.nom || "À déterminer";
        const bleuClub = combat.bleu?.club ? ` (${combat.bleu.club})` : "";
        doc.setFontSize(7);
        doc.setFont("helvetica", combat.vainqueur_id === combat.bleu_id ? "bold" : "normal");
        doc.setTextColor(0, 0, 150);
        doc.text(`B: ${bleuNom}${bleuClub}`.substring(0, 35), x + 7, y + boxHeight / 3);
        
        // Combattant Rouge
        const rougeNom = combat.rouge?.nom || "À déterminer";
        const rougeClub = combat.rouge?.club ? ` (${combat.rouge.club})` : "";
        doc.setFont("helvetica", combat.vainqueur_id === combat.rouge_id ? "bold" : "normal");
        doc.setTextColor(150, 0, 0);
        doc.text(`R: ${rougeNom}${rougeClub}`.substring(0, 35), x + 7, y + boxHeight * 2 / 3);
        
        doc.setTextColor(0, 0, 0);
        
        // Ligne de connexion vers le tour suivant
        if (tourIdx < numTours - 1) {
          const nextX = x + tourWidth;
          const nextY = y + boxHeight / 2;
          doc.setDrawColor(180, 180, 180);
          doc.line(x + 5 + boxWidth, y + boxHeight / 2, nextX, nextY);
        }
      });
    });
    
    // Champion
    const finale = combatsByTour.finale?.[0];
    if (finale?.termine && finale.vainqueur_id) {
      const championX = margin + numTours * tourWidth;
      const championY = startY + drawAreaHeight / 3;
      const champion = finale.vainqueur_id === finale.rouge_id ? finale.rouge : finale.bleu;
      
      doc.setFillColor(255, 250, 200);
      doc.setDrawColor(200, 180, 0);
      doc.roundedRect(championX, championY, tourWidth - 10, 25, 3, 3, 'FD');
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("🏆 CHAMPION", championX + (tourWidth - 10) / 2, championY + 8, { align: "center" });
      
      doc.setFontSize(10);
      doc.text(champion?.nom || "?", championX + (tourWidth - 10) / 2, championY + 16, { align: "center" });
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(champion?.club || "", championX + (tourWidth - 10) / 2, championY + 22, { align: "center" });
    }
    
    // Pied de page
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Imprimé le ${dateStr} à ${timeStr}`, margin, pageHeight - 5);
    doc.text(`Page 1/1`, pageWidth - margin, pageHeight - 5, { align: "right" });
    
    doc.save(`arbre_${categorieNom.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`);
    toast.success("PDF exporté !");
  };

  // Impression
  const handlePrint = () => window.print();

  // Organiser les combats par tour
  const combatsByTour = useCallback(() => {
    if (!arbreData?.arbre) return {};
    const result = {};
    TOUR_ORDER.forEach(tour => {
      if (arbreData.arbre[tour]?.length > 0) {
        result[tour] = arbreData.arbre[tour].sort((a, b) => (a.position || 0) - (b.position || 0));
      }
    });
    // Tours personnalisés
    Object.keys(arbreData.arbre).forEach(tour => {
      if (!TOUR_ORDER.includes(tour) && arbreData.arbre[tour]?.length > 0) {
        result[tour] = arbreData.arbre[tour];
      }
    });
    return result;
  }, [arbreData])();

  const toursList = Object.keys(combatsByTour);
  const finale = combatsByTour.finale?.[0] || null;
  const categorieNom = categories.find(c => c.categorie_id === selectedCategorie)?.nom || "";
  const bracketSize = arbreData?.bracket_size || arbreData?.total_combats + 1 || 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* CSS Print optimisé */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          #arbre-container, #arbre-container * { visibility: visible; }
          #arbre-container { 
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>

      <div className="space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/gestion-combats")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                Arbre des combats
              </h1>
              <p className="text-xs text-slate-500">
                {bracketSize > 0 ? `Bracket ${bracketSize}` : ""} • {arbreData?.num_byes || 0} BYE(s) • {arbreData?.total_combats || 0} combats
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {isMaster && selectedCategorie && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleOpenByesDialog}
                  data-testid="modify-byes-btn"
                >
                  {arbreData?.byes_locked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                  BYEs
                </Button>
                <Button size="sm" onClick={() => setAddCombatDialogOpen(true)} data-testid="add-combat-btn">
                  <Plus className="h-3 w-3 mr-1" />
                  Combat
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="export-pdf-btn">
              <FileDown className="h-3 w-3 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="print-btn">
              <Printer className="h-3 w-3 mr-1" />
              Imprimer
            </Button>
          </div>
        </motion.div>

        {/* Sélection catégorie */}
        <Card className="border-slate-200 print:hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-slate-600">Catégorie :</Label>
              <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                <SelectTrigger className="w-72" data-testid="select-categorie-arbre">
                  <SelectValue placeholder="Sélectionner..." />
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

        {/* Conteneur Arbre */}
        <div 
          id="arbre-container" 
          ref={arbreRef}
          className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto print:border-0 print:p-2"
        >
          {/* En-tête impression */}
          <div className="hidden print:block text-center mb-4">
            <h1 className="text-lg font-black uppercase">{competition?.nom}</h1>
            <h2 className="text-base font-bold">{categorieNom}</h2>
            <p className="text-xs text-slate-500">
              {competition?.date ? new Date(competition.date).toLocaleDateString('fr-FR') : ""}
            </p>
          </div>

          {!selectedCategorie || categories.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm">Aucune catégorie avec des combats</p>
              <Button className="mt-4" size="sm" onClick={() => navigate("/gestion-combats")}>
                Générer les combats
              </Button>
            </div>
          ) : (
            <>
              {/* Titre catégorie */}
              <div className="text-center mb-4 print:hidden">
                <h2 className="text-lg font-bold text-slate-800">{categorieNom}</h2>
                <p className="text-xs text-slate-500">
                  {arbreData?.combats_termines || 0}/{arbreData?.total_combats || 0} terminés
                </p>
              </div>

              {/* Arbre horizontal */}
              <div className="flex items-center justify-start gap-4 min-w-max pb-2">
                {toursList.map((tour, tourIdx) => {
                  const combats = combatsByTour[tour];
                  const isLastTour = tourIdx === toursList.length - 1 && tour === "finale";
                  
                  return (
                    <div key={tour} className="flex flex-col items-center gap-2">
                      {/* Label du tour */}
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 sticky top-0 bg-white">
                        {TOUR_LABELS[tour] || tour}
                      </div>
                      
                      {/* Combats du tour */}
                      <div 
                        className="flex flex-col gap-3"
                        style={{
                          marginTop: tourIdx > 0 ? `${Math.pow(2, tourIdx - 1) * 15}px` : 0
                        }}
                      >
                        {combats.map((combat, idx) => (
                          <div 
                            key={combat.combat_id}
                            className="relative"
                            style={{
                              marginTop: idx > 0 && tourIdx > 0 ? `${Math.pow(2, tourIdx) * 10}px` : 0
                            }}
                          >
                            <MatchCompact 
                              combat={combat}
                              isLast={isLastTour}
                            />
                            
                            {/* Ligne de connexion entrante */}
                            {tourIdx > 0 && (
                              <div className="absolute left-0 top-1/2 w-4 h-px bg-slate-300 -translate-x-full print:bg-slate-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Champion */}
                <ChampionBox finale={finale} />
              </div>

              {/* Podium */}
              <PodiumCompact arbreData={arbreData} finale={finale} />
            </>
          )}

          {/* Footer impression */}
          <div className="hidden print:flex justify-between text-xs text-slate-400 mt-6 pt-2 border-t">
            <span>Imprimé le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Page 1/1</span>
          </div>
        </div>

        {/* Lien ordre des combats */}
        <Button 
          variant="outline" 
          className="w-full print:hidden"
          onClick={() => navigate(`/ordre-combats?categorie=${selectedCategorie}`)}
        >
          Voir l'ordre de passage des combats
        </Button>
      </div>

      {/* Dialogue BYEs */}
      <Dialog open={byesDialogOpen} onOpenChange={setByesDialogOpen}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit3 className="h-4 w-4" />
              Modifier les BYEs
            </DialogTitle>
            <DialogDescription className="text-xs">
              {byesInfo?.byes_locked ? (
                <span className="text-red-500 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Verrouillés (combat déjà commencé)
                </span>
              ) : (
                `Sélectionnez ${byesInfo?.num_byes_disponibles || 0} compétiteur(s) pour les BYEs`
              )}
            </DialogDescription>
          </DialogHeader>
          
          {byesInfo && !byesInfo.byes_locked && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span>Sélectionnés :</span>
                <Badge variant={selectedByes.length === byesInfo.num_byes_disponibles ? "default" : "destructive"} className="text-xs">
                  {selectedByes.length}/{byesInfo.num_byes_disponibles}
                </Badge>
              </div>
              
              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {byesInfo.competiteurs?.map(comp => (
                  <div 
                    key={comp.competiteur_id}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all text-sm ${
                      selectedByes.includes(comp.competiteur_id) 
                        ? "border-green-400 bg-green-50" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => toggleBye(comp.competiteur_id)}
                  >
                    <Checkbox checked={selectedByes.includes(comp.competiteur_id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{comp.prenom} {comp.nom}</p>
                      <p className="text-xs text-slate-500 truncate">{comp.club}</p>
                    </div>
                    {selectedByes.includes(comp.competiteur_id) && (
                      <Badge className="bg-green-500 text-xs">BYE</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {byesInfo?.byes_locked && (
            <div className="text-center py-6">
              <Lock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Les BYEs ne peuvent plus être modifiés.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setByesDialogOpen(false)}>
              Annuler
            </Button>
            {byesInfo && !byesInfo.byes_locked && (
              <Button 
                size="sm"
                onClick={handleSaveByes} 
                disabled={savingByes || selectedByes.length !== byesInfo.num_byes_disponibles}
              >
                {savingByes && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
                Confirmer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue ajout combat */}
      <Dialog open={addCombatDialogOpen} onOpenChange={setAddCombatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau combat
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tour</Label>
              <Select value={newCombat.tour} onValueChange={(v) => setNewCombat({ ...newCombat, tour: v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manuel">Manuel</SelectItem>
                  <SelectItem value="seizieme">16ème</SelectItem>
                  <SelectItem value="huitieme">8ème</SelectItem>
                  <SelectItem value="quart">Quart</SelectItem>
                  <SelectItem value="demi">Demi</SelectItem>
                  <SelectItem value="finale">Finale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-blue-600">Bleu</Label>
              <Select value={newCombat.bleu_id || "none"} onValueChange={(v) => setNewCombat({ ...newCombat, bleu_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Non assigné --</SelectItem>
                  {allCompetiteurs.map(c => (
                    <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                      {c.prenom} {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-red-600">Rouge</Label>
              <Select value={newCombat.rouge_id || "none"} onValueChange={(v) => setNewCombat({ ...newCombat, rouge_id: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Non assigné --</SelectItem>
                  {allCompetiteurs.map(c => (
                    <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                      {c.prenom} {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddCombatDialogOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleCreateCombat} disabled={creating}>
              {creating && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
