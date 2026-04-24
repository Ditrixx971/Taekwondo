import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Printer, 
  GripVertical, 
  Clock, 
  Save,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  TreeDeciduous,
  Columns,
  LayoutGrid,
  FileDown,
  HelpCircle
} from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Fonction utilitaire pour formater le nom complet avec catégorie et club
const formatCombattantComplet = (combattant, categorie) => {
  if (!combattant) {
    return { nom: "À déterminer", club: "", categorie: categorie || "" };
  }
  return {
    nom: `${combattant.prenom || ""} ${combattant.nom || ""}`.trim(),
    club: combattant.club || "",
    categorie: categorie || ""
  };
};

// Fonction utilitaire pour le label du tour
const getTourLabel = (tour) => {
  switch(tour) {
    case "quart": return "1/4";
    case "demi": return "1/2";
    case "finale": return "Finale";
    case "bronze": return "Bronze";
    case "poule": return "Poule";
    default: return tour || "Tour";
  }
};

// Composant pour un combat draggable
function SortableCombatRow({ combat, index, heureApprox, onForfait, aireNom, showAire }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: combat.combat_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };

  const isFinale = combat.tour === "finale" || combat.tour === "bronze";
  const categorieNom = combat.categorie?.nom || combat.categorie_nom || "Catégorie";
  
  const bleuInfo = formatCombattantComplet(combat.bleu, categorieNom);
  const rougeInfo = formatCombattantComplet(combat.rouge, categorieNom);
  const isADeterminer = !combat.bleu_id || !combat.rouge_id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-lg border transition-all
        ${isDragging ? "shadow-lg bg-white" : "bg-slate-50 hover:bg-slate-100"}
        ${isFinale ? "border-amber-300 bg-amber-50" : "border-slate-200"}
        ${isADeterminer ? "border-dashed border-slate-400 bg-slate-100" : ""}
        print:border print:shadow-none print:p-2 print:bg-white
      `}
      data-testid={`combat-row-${combat.combat_id}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing print:hidden flex-shrink-0"
      >
        <GripVertical className="h-5 w-5 text-slate-400" />
      </div>

      {/* Numéro d'ordre */}
      <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 print:bg-black">
        {index + 1}
      </div>

      {/* Heure approximative */}
      <div className="w-14 text-center flex-shrink-0">
        <span className="text-xs font-semibold text-slate-600">{heureApprox}</span>
      </div>

      {/* Aire (si multi-aires) */}
      {showAire && (
        <Badge variant="outline" className="w-16 justify-center text-xs flex-shrink-0">
          {aireNom}
        </Badge>
      )}

      {/* Tour */}
      <Badge className={`${isFinale ? "bg-amber-500" : "bg-slate-600"} text-xs flex-shrink-0`}>
        {getTourLabel(combat.tour)}
      </Badge>

      {/* Catégorie */}
      <div className="w-28 flex-shrink-0">
        <span className="text-xs font-medium text-slate-700 truncate block">
          {categorieNom}
        </span>
      </div>

      {/* Combattants - BLEU à gauche */}
      <div className="flex-1 flex gap-2 items-center min-w-0">
        <div className={`flex-1 p-2 rounded text-center min-w-0 ${
          combat.vainqueur_id === combat.bleu_id ? "bg-blue-200 ring-2 ring-blue-500" : "bg-blue-50"
        } ${!combat.bleu_id ? "bg-slate-200 border-dashed border border-slate-400" : ""}`}>
          <span className={`font-bold block truncate ${combat.bleu_id ? "text-blue-800" : "text-slate-500 italic"}`}>
            {bleuInfo.nom}
          </span>
          {bleuInfo.club && (
            <span className="text-xs text-blue-600 block truncate">{bleuInfo.club}</span>
          )}
        </div>

        <span className="font-black text-slate-400 text-sm flex-shrink-0">VS</span>

        {/* ROUGE à droite */}
        <div className={`flex-1 p-2 rounded text-center min-w-0 ${
          combat.vainqueur_id === combat.rouge_id ? "bg-red-200 ring-2 ring-red-500" : "bg-red-50"
        } ${!combat.rouge_id ? "bg-slate-200 border-dashed border border-slate-400" : ""}`}>
          <span className={`font-bold block truncate ${combat.rouge_id ? "text-red-800" : "text-slate-500 italic"}`}>
            {rougeInfo.nom}
          </span>
          {rougeInfo.club && (
            <span className="text-xs text-red-600 block truncate">{rougeInfo.club}</span>
          )}
        </div>
      </div>

      {/* Indicateur "À déterminer" - plus discret */}
      {isADeterminer && (
        <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs flex-shrink-0 print:hidden">
          <HelpCircle className="h-3 w-3" />
        </Badge>
      )}

      {/* Statut */}
      <div className="w-20 text-center flex-shrink-0">
        {combat.termine ? (
          <Badge className="bg-green-500 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        ) : combat.statut === "en_cours" ? (
          <Badge className="bg-blue-500 text-xs">En cours</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-slate-500">À venir</Badge>
        )}
      </div>

      {/* Actions forfait */}
      {!combat.termine && (
        <div className="flex gap-1 print:hidden flex-shrink-0">
          {combat.bleu_id && (
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-500 hover:bg-blue-50 p-1 h-7 w-7"
              onClick={() => onForfait(combat, combat.bleu_id, "bleu")}
              title="Forfait Bleu"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {combat.rouge_id && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:bg-red-50 p-1 h-7 w-7"
              onClick={() => onForfait(combat, combat.rouge_id, "rouge")}
              title="Forfait Rouge"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Composant pour une colonne d'aire (vue multi-aires)
function AireColumn({ aire, combats, heureDebut, dureeCombat, onForfait, onStatusChange, onReorder, isAdmin }) {
  const calculateHeureApprox = (index) => {
    const startTime = new Date(`2026-01-01T${heureDebut}:00`);
    const combatTime = new Date(startTime.getTime() + index * dureeCombat * 60000);
    return combatTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = combats.findIndex(i => i.combat_id === active.id);
      const newIndex = combats.findIndex(i => i.combat_id === over.id);
      onReorder(aire.aire_id, arrayMove(combats, oldIndex, newIndex));
    }
  };

  const combatsADeterminer = combats.filter(c => !c.bleu_id || !c.rouge_id).length;

  return (
    <Card className="border-slate-200 flex-1 min-w-[450px] print:min-w-0 print:break-inside-avoid">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {aire.nom}
            {aire.statut === "pause" && <Badge className="bg-amber-500">Pause</Badge>}
            {aire.statut === "hs" && <Badge className="bg-red-500">HS</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {combatsADeterminer > 0 && (
              <Badge variant="outline" className="border-amber-400 text-amber-600">
                {combatsADeterminer} TBD
              </Badge>
            )}
            <Badge variant="outline">{combats.length} combats</Badge>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1 mt-2 print:hidden">
            <Button
              size="sm"
              variant={aire.statut === "active" ? "default" : "outline"}
              onClick={() => onStatusChange(aire.aire_id, "active")}
              className="text-xs"
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={aire.statut === "pause" ? "default" : "outline"}
              className={`text-xs ${aire.statut === "pause" ? "bg-amber-500" : ""}`}
              onClick={() => onStatusChange(aire.aire_id, "pause")}
            >
              Pause
            </Button>
            <Button
              size="sm"
              variant={aire.statut === "hs" ? "default" : "outline"}
              className={`text-xs ${aire.statut === "hs" ? "bg-red-500" : ""}`}
              onClick={() => onStatusChange(aire.aire_id, "hs")}
            >
              HS
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 max-h-[600px] overflow-y-auto print:max-h-none print:overflow-visible">
        {combats.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Aucun combat sur cette aire</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={combats.map(c => c.combat_id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {combats.map((combat, index) => (
                  <SortableCombatRow
                    key={combat.combat_id}
                    combat={combat}
                    index={index}
                    heureApprox={calculateHeureApprox(index)}
                    onForfait={onForfait}
                    showAire={false}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrdreCombatsPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  
  const [aires, setAires] = useState([]);
  const [selectedAires, setSelectedAires] = useState([]);
  const [combatsByAire, setCombatsByAire] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState({});
  const [heureDebut, setHeureDebut] = useState(competition?.heure_debut || "09:00");
  const [dureeCombat, setDureeCombat] = useState(6);
  const [viewMode, setViewMode] = useState("multi");
  const [showTermines, setShowTermines] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const fetchAires = useCallback(async () => {
    if (!competition) return;
    try {
      const response = await axios.get(
        `${API}/aires-combat?competition_id=${competition.competition_id}`,
        { withCredentials: true }
      );
      setAires(response.data);
      setSelectedAires(response.data.map(a => a.aire_id));
    } catch (error) {
      toast.error("Erreur lors du chargement des aires");
    } finally {
      setLoading(false);
    }
  }, [competition]);

  const fetchAllCombats = useCallback(async () => {
    if (selectedAires.length === 0) return;
    try {
      const results = {};
      await Promise.all(
        selectedAires.map(async (aireId) => {
          // Récupérer tous les combats (inclut les combats sans combattants)
          const response = await axios.get(
            `${API}/combats/ordre/${aireId}${showTermines ? '?include_termines=true' : ''}`,
            { withCredentials: true }
          );
          results[aireId] = response.data;
        })
      );
      setCombatsByAire(results);
      setHasChanges({});
    } catch (error) {
      toast.error("Erreur lors du chargement des combats");
    }
  }, [selectedAires, showTermines]);

  useEffect(() => {
    fetchAires();
  }, [fetchAires]);

  useEffect(() => {
    if (selectedAires.length > 0) {
      fetchAllCombats();
    }
  }, [selectedAires, fetchAllCombats]);

  const handleAireToggle = (aireId) => {
    setSelectedAires(prev => {
      if (prev.includes(aireId)) {
        return prev.filter(id => id !== aireId);
      } else {
        return [...prev, aireId];
      }
    });
  };

  const handleReorder = (aireId, newCombats) => {
    setCombatsByAire(prev => ({
      ...prev,
      [aireId]: newCombats
    }));
    setHasChanges(prev => ({
      ...prev,
      [aireId]: true
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const airesWithChanges = Object.keys(hasChanges).filter(k => hasChanges[k]);
      await Promise.all(
        airesWithChanges.map(async (aireId) => {
          const combatIds = combatsByAire[aireId].map(c => c.combat_id);
          await axios.put(
            `${API}/combats/reorder/${aireId}`,
            { combat_ids: combatIds },
            { withCredentials: true }
          );
        })
      );
      toast.success(`${airesWithChanges.length} aire(s) sauvegardée(s) !`);
      setHasChanges({});
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleForfait = async (combat, competiteurId, couleur) => {
    const competiteur = couleur === "rouge" ? combat.rouge : combat.bleu;
    const nom = competiteur ? `${competiteur.prenom} ${competiteur.nom}` : "ce compétiteur";
    
    if (!window.confirm(`Déclarer forfait pour ${nom} (${couleur}) ?`)) return;
    
    try {
      await axios.post(
        `${API}/combats/${combat.combat_id}/forfait`,
        { competiteur_id: competiteurId, raison: "forfait" },
        { withCredentials: true }
      );
      toast.success("Forfait enregistré");
      fetchAllCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleUpdateAireStatus = async (aireId, statut) => {
    try {
      await axios.put(
        `${API}/aires-combat/${aireId}`,
        { statut },
        { withCredentials: true }
      );
      toast.success(`Aire mise en ${statut === "active" ? "service" : statut}`);
      fetchAires();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Export PDF avec jsPDF
  const handleExportPDF = () => {
    const allCombats = getAllCombatsSorted();
    if (allCombats.length === 0) {
      toast.error("Aucun combat à exporter");
      return;
    }

    // Créer le PDF en format paysage A4
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(competition?.nom || "Compétition", pageWidth / 2, margin + 5, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("ORDRE DE PASSAGE DES COMBATS", pageWidth / 2, margin + 12, { align: "center" });
    
    doc.setFontSize(9);
    doc.text(`Début: ${heureDebut} | Durée/combat: ${dureeCombat} min | ${selectedAires.length} aire(s)`, pageWidth / 2, margin + 18, { align: "center" });

    // Préparer les données pour le tableau
    const tableData = allCombats.map((combat, index) => {
      const categorieNom = combat.categorie?.nom || combat.categorie_nom || "";
      const bleuNom = combat.bleu ? `${combat.bleu.prenom} ${combat.bleu.nom}` : "À déterminer";
      const bleuClub = combat.bleu?.club || "";
      const rougeNom = combat.rouge ? `${combat.rouge.prenom} ${combat.rouge.nom}` : "À déterminer";
      const rougeClub = combat.rouge?.club || "";
      const heureApprox = combat.heureApprox.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      return [
        index + 1,
        heureApprox,
        combat.aireNom,
        getTourLabel(combat.tour),
        categorieNom,
        bleuNom + (bleuClub ? `\n(${bleuClub})` : ""),
        "",  // Colonne vide pour scores BLEU (R1 R2 R3)
        rougeNom + (rougeClub ? `\n(${rougeClub})` : ""),
        "",  // Colonne vide pour scores ROUGE (R1 R2 R3)
        ""   // Colonne vide pour le vainqueur
      ];
    });

    // Créer le tableau avec colonnes de scores
    autoTable(doc, {
      startY: margin + 22,
      head: [["#", "Heure", "Aire", "Tour", "Catégorie", "BLEU", "Score\nR1 | R2 | R3", "ROUGE", "Score\nR1 | R2 | R3", "Vainqueur"]],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "center",
        valign: "middle"
      },
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 7, halign: "center" },   // #
        1: { cellWidth: 12, halign: "center" },  // Heure
        2: { cellWidth: 15, halign: "center" },  // Aire
        3: { cellWidth: 15, halign: "center" },  // Tour
        4: { cellWidth: 30, halign: "left" },    // Catégorie
        5: { cellWidth: 45, halign: "left", textColor: [0, 0, 150] },   // BLEU
        6: { cellWidth: 25, halign: "center", fillColor: [230, 240, 255] },  // Score BLEU
        7: { cellWidth: 45, halign: "left", textColor: [150, 0, 0] },   // ROUGE
        8: { cellWidth: 25, halign: "center", fillColor: [255, 230, 230] },  // Score ROUGE
        9: { cellWidth: 25, halign: "center" }   // Vainqueur
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: margin, right: margin },
      didDrawPage: function(data) {
        // Footer sur chaque page
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Généré le ${dateStr} à ${timeStr}`,
          margin,
          pageHeight - 5
        );
        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
          pageWidth - margin,
          pageHeight - 5,
          { align: "right" }
        );
      }
    });

    // Télécharger le PDF
    const fileName = `ordre_combats_${competition?.nom?.replace(/\s+/g, '_') || 'competition'}_${dateStr.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    toast.success("PDF exporté avec succès !");
  };

  // Impression optimisée
  const handlePrint = () => {
    window.print();
  };

  const totalChanges = Object.values(hasChanges).filter(Boolean).length;

  // Fusionner tous les combats pour la vue unifiée
  const getAllCombatsSorted = useCallback(() => {
    const allCombats = [];
    selectedAires.forEach(aireId => {
      const aire = aires.find(a => a.aire_id === aireId);
      (combatsByAire[aireId] || []).forEach((combat, index) => {
        const startTime = new Date(`2026-01-01T${heureDebut}:00`);
        const combatTime = new Date(startTime.getTime() + index * dureeCombat * 60000);
        allCombats.push({
          ...combat,
          aireId,
          aireNom: aire?.nom || "",
          heureApprox: combatTime
        });
      });
    });
    allCombats.sort((a, b) => a.heureApprox - b.heureApprox);
    return allCombats;
  }, [selectedAires, aires, combatsByAire, heureDebut, dureeCombat]);

  // Statistiques
  const allCombats = Object.values(combatsByAire).flat();
  const combatsADeterminer = allCombats.filter(c => !c.bleu_id || !c.rouge_id).length;

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
      {/* Styles d'impression optimisés */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Masquer la sidebar et les éléments non imprimables */
          nav, aside, .print\\:hidden, [data-print-hide="true"] {
            display: none !important;
          }
          
          /* Styles spécifiques impression */
          .print-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Forcer fond blanc */
          .print\\:bg-white {
            background-color: white !important;
          }
          
          /* Réduire les tailles de texte pour l'impression */
          .print\\:text-xs {
            font-size: 10px !important;
          }
          
          /* Éviter les coupures de page au milieu d'un combat */
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="space-y-6 print-container">
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
                Ordre des combats
              </h1>
              <p className="text-slate-500 mt-1">
                {selectedAires.length} aire(s) • {allCombats.length} combats
                {combatsADeterminer > 0 && (
                  <span className="text-amber-600 ml-2">({combatsADeterminer} à déterminer)</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {totalChanges > 0 && (
              <Button onClick={handleSaveAll} disabled={saving} className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Sauvegarde..." : `Sauvegarder (${totalChanges})`}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/arbre-combat`)}>
              <TreeDeciduous className="mr-2 h-4 w-4" />
              Arbre
            </Button>
            <Button variant="outline" onClick={handleExportPDF} data-testid="export-pdf-btn">
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handlePrint} data-testid="print-btn">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </motion.div>

        {/* Contrôles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="print:hidden"
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Sélection des aires */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Aires :</Label>
                  <div className="flex flex-wrap gap-3">
                    {aires.map(aire => (
                      <div key={aire.aire_id} className="flex items-center gap-2">
                        <Checkbox
                          id={`aire-${aire.aire_id}`}
                          checked={selectedAires.includes(aire.aire_id)}
                          onCheckedChange={() => handleAireToggle(aire.aire_id)}
                        />
                        <Label htmlFor={`aire-${aire.aire_id}`} className="text-sm cursor-pointer flex items-center gap-1">
                          {aire.nom}
                          {aire.statut === "pause" && <Badge className="bg-amber-500 text-xs">P</Badge>}
                          {aire.statut === "hs" && <Badge className="bg-red-500 text-xs">HS</Badge>}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mode de vue */}
                <div className="flex items-center gap-2 border-l pl-4">
                  <Button
                    size="sm"
                    variant={viewMode === "multi" ? "default" : "outline"}
                    onClick={() => setViewMode("multi")}
                  >
                    <Columns className="h-4 w-4 mr-1" />
                    Colonnes
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "single" ? "default" : "outline"}
                    onClick={() => setViewMode("single")}
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Unifié
                  </Button>
                </div>

                {/* Paramètres horaires */}
                <div className="flex items-center gap-2 ml-auto">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <Input
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className="w-28"
                  />
                  <Input
                    type="number"
                    min="3"
                    max="15"
                    value={dureeCombat}
                    onChange={(e) => setDureeCombat(parseInt(e.target.value) || 6)}
                    className="w-16"
                  />
                  <span className="text-sm text-slate-500">min/combat</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avertissement changements non sauvegardés */}
        {totalChanges > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="print:hidden"
          >
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-amber-800 font-medium">
                  Vous avez des modifications non sauvegardées sur {totalChanges} aire(s)
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Titre impression - Visible uniquement à l'impression */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black uppercase">{competition?.nom}</h1>
          <h2 className="text-xl font-bold mt-1">
            ORDRE DE PASSAGE DES COMBATS
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Début : {heureDebut} | Durée par combat : {dureeCombat} min | {selectedAires.length} aire(s) | {allCombats.length} combats
            {combatsADeterminer > 0 && ` (dont ${combatsADeterminer} à déterminer)`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Imprimé le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Vue multi-aires (colonnes côte à côte) */}
        {viewMode === "multi" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4 overflow-x-auto pb-4 print:flex-col print:overflow-visible"
          >
            {selectedAires.map(aireId => {
              const aire = aires.find(a => a.aire_id === aireId);
              if (!aire) return null;
              return (
                <AireColumn
                  key={aireId}
                  aire={aire}
                  combats={combatsByAire[aireId] || []}
                  heureDebut={heureDebut}
                  dureeCombat={dureeCombat}
                  onForfait={handleForfait}
                  onStatusChange={handleUpdateAireStatus}
                  onReorder={handleReorder}
                  isAdmin={isAdmin}
                />
              );
            })}
          </motion.div>
        )}

        {/* Vue unifiée (tous les combats triés par heure) */}
        {viewMode === "single" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-slate-200">
              <CardHeader className="print:hidden">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tous les combats par ordre chronologique
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {getAllCombatsSorted().length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucun combat programmé</p>
                ) : (
                  <div className="space-y-2">
                    {getAllCombatsSorted().map((combat, index) => {
                      const categorieNom = combat.categorie?.nom || combat.categorie_nom || "";
                      const bleuInfo = formatCombattantComplet(combat.bleu, categorieNom);
                      const rougeInfo = formatCombattantComplet(combat.rouge, categorieNom);
                      const isADeterminer = !combat.bleu_id || !combat.rouge_id;
                      const isFinale = combat.tour === "finale" || combat.tour === "bronze";

                      return (
                        <div
                          key={combat.combat_id}
                          data-testid={`unified-combat-${combat.combat_id}`}
                          className={`
                            flex items-center gap-2 p-3 rounded-lg border transition-all print:break-inside-avoid
                            ${isFinale ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}
                            ${isADeterminer ? "border-dashed border-slate-400" : ""}
                            print:bg-white print:border-solid
                          `}
                        >
                          {/* Numéro */}
                          <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {index + 1}
                          </div>

                          {/* Heure */}
                          <div className="w-14 text-center flex-shrink-0">
                            <span className="text-xs font-semibold text-slate-600">
                              {combat.heureApprox.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Aire */}
                          <Badge variant="outline" className="w-16 justify-center text-xs flex-shrink-0">
                            {combat.aireNom}
                          </Badge>

                          {/* Tour */}
                          <Badge className={`${isFinale ? "bg-amber-500" : "bg-slate-600"} text-xs flex-shrink-0`}>
                            {getTourLabel(combat.tour)}
                          </Badge>

                          {/* Catégorie */}
                          <div className="w-28 flex-shrink-0">
                            <span className="text-xs font-medium text-slate-700 truncate block">
                              {categorieNom}
                            </span>
                          </div>

                          {/* Combattants */}
                          <div className="flex-1 flex gap-2 items-center min-w-0">
                            <div className={`flex-1 p-2 rounded text-center min-w-0 ${
                              combat.vainqueur_id === combat.bleu_id ? "bg-blue-200 ring-2 ring-blue-500" : "bg-blue-50"
                            } ${!combat.bleu_id ? "bg-slate-200 border-dashed border border-slate-400" : ""}`}>
                              <span className={`font-bold block truncate ${combat.bleu_id ? "text-blue-800" : "text-slate-500 italic"}`}>
                                {bleuInfo.nom}
                              </span>
                              {bleuInfo.club && (
                                <span className="text-xs text-blue-600 block truncate">{bleuInfo.club}</span>
                              )}
                            </div>
                            <span className="font-black text-slate-400 text-sm flex-shrink-0">VS</span>
                            <div className={`flex-1 p-2 rounded text-center min-w-0 ${
                              combat.vainqueur_id === combat.rouge_id ? "bg-red-200 ring-2 ring-red-500" : "bg-red-50"
                            } ${!combat.rouge_id ? "bg-slate-200 border-dashed border border-slate-400" : ""}`}>
                              <span className={`font-bold block truncate ${combat.rouge_id ? "text-red-800" : "text-slate-500 italic"}`}>
                                {rougeInfo.nom}
                              </span>
                              {rougeInfo.club && (
                                <span className="text-xs text-red-600 block truncate">{rougeInfo.club}</span>
                              )}
                            </div>
                          </div>

                          {/* Indicateur TBD - juste l'icône */}
                          {isADeterminer && (
                            <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs flex-shrink-0">
                              <HelpCircle className="h-3 w-3" />
                            </Badge>
                          )}

                          {/* Statut */}
                          <div className="w-20 text-center flex-shrink-0">
                            {combat.termine ? (
                              <Badge className="bg-green-500 text-xs">Terminé</Badge>
                            ) : combat.statut === "en_cours" ? (
                              <Badge className="bg-blue-500 text-xs">En cours</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-slate-500">À venir</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Statistiques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="print:hidden"
        >
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {allCombats.length}
                  </p>
                  <p className="text-sm text-slate-500">Total combats</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {allCombats.filter(c => c.termine).length}
                  </p>
                  <p className="text-sm text-slate-500">Terminés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {allCombats.filter(c => c.statut === "en_cours").length}
                  </p>
                  <p className="text-sm text-slate-500">En cours</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">
                    {combatsADeterminer}
                  </p>
                  <p className="text-sm text-slate-500">À déterminer</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {allCombats.filter(c => c.tour === "finale" || c.tour === "bronze").length}
                  </p>
                  <p className="text-sm text-slate-500">Finales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
