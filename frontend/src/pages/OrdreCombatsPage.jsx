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
  Pause,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  TreeDeciduous,
  Columns,
  LayoutGrid
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  const getTourLabel = (tour) => {
    switch(tour) {
      case "quart": return "1/4";
      case "demi": return "1/2";
      case "finale": return "Finale";
      case "bronze": return "Bronze";
      default: return tour;
    }
  };

  const isFinale = combat.tour === "finale" || combat.tour === "bronze";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${isDragging ? "shadow-lg bg-white" : "bg-slate-50 hover:bg-slate-100"}
        ${isFinale ? "border-amber-300 bg-amber-50" : "border-slate-200"}
        print:border print:shadow-none print:p-2
      `}
      data-testid={`combat-row-${combat.combat_id}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing print:hidden"
      >
        <GripVertical className="h-5 w-5 text-slate-400" />
      </div>

      {/* Numéro d'ordre */}
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm">
        {index + 1}
      </div>

      {/* Heure approximative */}
      <div className="w-16 text-center">
        <span className="text-sm font-medium text-slate-600">{heureApprox}</span>
      </div>

      {/* Aire (si multi-aires) */}
      {showAire && (
        <Badge variant="outline" className="w-20 justify-center">
          {aireNom}
        </Badge>
      )}

      {/* Tour */}
      <Badge className={isFinale ? "bg-amber-500" : "bg-slate-500"}>
        {getTourLabel(combat.tour)}
      </Badge>

      {/* Catégorie */}
      <div className="text-xs text-slate-500 w-32 truncate">
        {combat.categorie_nom || "Catégorie"}
      </div>

      {/* Combattants */}
      <div className="flex-1 flex gap-2 items-center">
        <div className={`flex-1 p-2 rounded text-center ${
          combat.vainqueur_id === combat.rouge_id ? "bg-red-100 ring-2 ring-red-400" : "bg-red-50"
        }`}>
          <span className="font-bold text-red-700">
            {combat.rouge ? `${combat.rouge.prenom} ${combat.rouge.nom}` : "En attente"}
          </span>
          {combat.rouge?.club && (
            <span className="text-xs text-red-500 block">{combat.rouge.club}</span>
          )}
        </div>

        <span className="font-black text-slate-400">VS</span>

        <div className={`flex-1 p-2 rounded text-center ${
          combat.vainqueur_id === combat.bleu_id ? "bg-blue-100 ring-2 ring-blue-400" : "bg-blue-50"
        }`}>
          <span className="font-bold text-blue-700">
            {combat.bleu ? `${combat.bleu.prenom} ${combat.bleu.nom}` : "En attente"}
          </span>
          {combat.bleu?.club && (
            <span className="text-xs text-blue-500 block">{combat.bleu.club}</span>
          )}
        </div>
      </div>

      {/* Statut */}
      <div className="w-24 text-center">
        {combat.termine ? (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        ) : combat.statut === "en_cours" ? (
          <Badge className="bg-blue-500">En cours</Badge>
        ) : (
          <Badge variant="outline">À venir</Badge>
        )}
      </div>

      {/* Actions forfait */}
      {!combat.termine && (
        <div className="flex gap-1 print:hidden">
          {combat.rouge_id && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:bg-red-50 p-1"
              onClick={() => onForfait(combat, combat.rouge_id, "rouge")}
              title="Forfait Rouge"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {combat.bleu_id && (
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-500 hover:bg-blue-50 p-1"
              onClick={() => onForfait(combat, combat.bleu_id, "bleu")}
              title="Forfait Bleu"
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

  return (
    <Card className="border-slate-200 flex-1 min-w-[400px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {aire.nom}
            {aire.statut === "pause" && <Badge className="bg-amber-500">Pause</Badge>}
            {aire.statut === "hs" && <Badge className="bg-red-500">HS</Badge>}
          </CardTitle>
          <Badge variant="outline">{combats.length} combats</Badge>
        </div>
        {isAdmin && (
          <div className="flex gap-1 mt-2">
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
      <CardContent className="p-3 max-h-[600px] overflow-y-auto">
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
  const [viewMode, setViewMode] = useState("multi"); // "single" ou "multi"

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    if (competition) {
      fetchAires();
    }
  }, [competition]);

  useEffect(() => {
    if (selectedAires.length > 0) {
      fetchAllCombats();
    }
  }, [selectedAires]);

  const fetchAires = async () => {
    try {
      const response = await axios.get(
        `${API}/aires-combat?competition_id=${competition.competition_id}`,
        { withCredentials: true }
      );
      setAires(response.data);
      // Sélectionner toutes les aires par défaut
      setSelectedAires(response.data.map(a => a.aire_id));
    } catch (error) {
      toast.error("Erreur lors du chargement des aires");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCombats = async () => {
    try {
      const results = {};
      await Promise.all(
        selectedAires.map(async (aireId) => {
          const response = await axios.get(
            `${API}/combats/ordre/${aireId}`,
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
  };

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

  const handlePrint = () => {
    window.print();
  };

  const totalChanges = Object.values(hasChanges).filter(Boolean).length;

  // Fusionner tous les combats pour la vue unifiée
  const getAllCombatsSorted = () => {
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
    // Trier par heure approximative
    allCombats.sort((a, b) => a.heureApprox - b.heureApprox);
    return allCombats;
  };

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
                Ordre des combats
              </h1>
              <p className="text-slate-500 mt-1">
                {selectedAires.length} aire(s) sélectionnée(s) • Glissez-déposez pour réorganiser
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {totalChanges > 0 && (
              <Button onClick={handleSaveAll} disabled={saving} className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Sauvegarde..." : `Sauvegarder (${totalChanges})`}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/arbre-combat`)}>
              <TreeDeciduous className="mr-2 h-4 w-4" />
              Voir arbre
            </Button>
            <Button variant="outline" onClick={handlePrint}>
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
                  <Label className="text-sm font-medium text-slate-700">Aires à afficher :</Label>
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
                    onChange={(e) => setDureeCombat(parseInt(e.target.value))}
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

        {/* Titre impression */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black uppercase">{competition?.nom}</h1>
          <h2 className="text-lg font-bold mt-1">
            Ordre des combats - {selectedAires.length} aire(s)
          </h2>
          <p className="text-sm text-slate-500">
            Début : {heureDebut} • Durée par combat : {dureeCombat} min
          </p>
        </div>

        {/* Vue multi-aires (colonnes côte à côte) */}
        {viewMode === "multi" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4 overflow-x-auto pb-4"
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
              <CardHeader>
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
                    {getAllCombatsSorted().map((combat, index) => (
                      <div
                        key={combat.combat_id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border transition-all
                          ${combat.tour === "finale" || combat.tour === "bronze" 
                            ? "border-amber-300 bg-amber-50" 
                            : "border-slate-200 bg-slate-50"}
                        `}
                      >
                        {/* Numéro */}
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>

                        {/* Heure */}
                        <div className="w-16 text-center">
                          <span className="text-sm font-medium text-slate-600">
                            {combat.heureApprox.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Aire */}
                        <Badge variant="outline" className="w-20 justify-center">
                          {combat.aireNom}
                        </Badge>

                        {/* Tour */}
                        <Badge className={combat.tour === "finale" || combat.tour === "bronze" ? "bg-amber-500" : "bg-slate-500"}>
                          {combat.tour === "quart" ? "1/4" : combat.tour === "demi" ? "1/2" : combat.tour === "finale" ? "Finale" : combat.tour === "bronze" ? "Bronze" : combat.tour}
                        </Badge>

                        {/* Catégorie */}
                        <div className="text-xs text-slate-500 w-32 truncate">
                          {combat.categorie_nom || "Catégorie"}
                        </div>

                        {/* Combattants */}
                        <div className="flex-1 flex gap-2 items-center">
                          <div className={`flex-1 p-2 rounded text-center ${
                            combat.vainqueur_id === combat.rouge_id ? "bg-red-100 ring-2 ring-red-400" : "bg-red-50"
                          }`}>
                            <span className="font-bold text-red-700">
                              {combat.rouge ? `${combat.rouge.prenom} ${combat.rouge.nom}` : "En attente"}
                            </span>
                          </div>
                          <span className="font-black text-slate-400">VS</span>
                          <div className={`flex-1 p-2 rounded text-center ${
                            combat.vainqueur_id === combat.bleu_id ? "bg-blue-100 ring-2 ring-blue-400" : "bg-blue-50"
                          }`}>
                            <span className="font-bold text-blue-700">
                              {combat.bleu ? `${combat.bleu.prenom} ${combat.bleu.nom}` : "En attente"}
                            </span>
                          </div>
                        </div>

                        {/* Statut */}
                        <div className="w-24 text-center">
                          {combat.termine ? (
                            <Badge className="bg-green-500">Terminé</Badge>
                          ) : combat.statut === "en_cours" ? (
                            <Badge className="bg-blue-500">En cours</Badge>
                          ) : (
                            <Badge variant="outline">À venir</Badge>
                          )}
                        </div>
                      </div>
                    ))}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {Object.values(combatsByAire).flat().length}
                  </p>
                  <p className="text-sm text-slate-500">Total combats</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {Object.values(combatsByAire).flat().filter(c => c.termine).length}
                  </p>
                  <p className="text-sm text-slate-500">Terminés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Object.values(combatsByAire).flat().filter(c => c.statut === "en_cours").length}
                  </p>
                  <p className="text-sm text-slate-500">En cours</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">
                    {Object.values(combatsByAire).flat().filter(c => c.tour === "finale" || c.tour === "bronze").length}
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
