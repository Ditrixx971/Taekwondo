import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
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
  TreeDeciduous
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Composant pour un combat draggable
function SortableCombatRow({ combat, index, heureApprox, onForfait }) {
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
        flex items-center gap-3 p-3 bg-white border rounded-lg mb-2 
        ${isDragging ? "shadow-lg ring-2 ring-blue-400" : "shadow-sm"}
        ${isFinale ? "border-amber-300 bg-amber-50" : "border-slate-200"}
        ${combat.termine ? "opacity-60" : ""}
      `}
    >
      {/* Handle de drag */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded"
      >
        <GripVertical className="h-5 w-5 text-slate-400" />
      </div>

      {/* Numéro et heure */}
      <div className="w-16 text-center">
        <span className="text-lg font-bold text-slate-600">#{index + 1}</span>
        <p className="text-xs text-slate-400 font-mono">{heureApprox}</p>
      </div>

      {/* Tour */}
      <Badge className={
        isFinale ? "bg-amber-500" :
        combat.tour === "demi" ? "bg-blue-500" : "bg-slate-500"
      }>
        {getTourLabel(combat.tour)}
      </Badge>

      {/* Catégorie */}
      <div className="w-40 text-xs font-medium text-slate-600 truncate">
        {combat.categorie?.nom || "-"}
      </div>

      {/* Rouge vs Bleu */}
      <div className="flex-1 flex items-center gap-2">
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

        <span className="text-slate-400 font-bold">VS</span>

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
        <div className="flex gap-1">
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

export default function OrdreCombatsPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  
  const [aires, setAires] = useState([]);
  const [selectedAire, setSelectedAire] = useState("");
  const [combats, setCombats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [heureDebut, setHeureDebut] = useState(competition?.heure_debut || "09:00");
  const [dureeCombat, setDureeCombat] = useState(6);

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
    if (selectedAire) {
      fetchCombats();
    }
  }, [selectedAire]);

  const fetchAires = async () => {
    try {
      const response = await axios.get(
        `${API}/aires-combat?competition_id=${competition.competition_id}`,
        { withCredentials: true }
      );
      setAires(response.data);
      if (response.data.length > 0) {
        setSelectedAire(response.data[0].aire_id);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des aires");
    } finally {
      setLoading(false);
    }
  };

  const fetchCombats = async () => {
    try {
      const response = await axios.get(
        `${API}/combats/ordre/${selectedAire}`,
        { withCredentials: true }
      );
      setCombats(response.data);
      setHasChanges(false);
    } catch (error) {
      toast.error("Erreur lors du chargement des combats");
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setCombats((items) => {
        const oldIndex = items.findIndex(i => i.combat_id === active.id);
        const newIndex = items.findIndex(i => i.combat_id === over.id);
        setHasChanges(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const combatIds = combats.map(c => c.combat_id);
      await axios.put(
        `${API}/combats/reorder/${selectedAire}`,
        { combat_ids: combatIds },
        { withCredentials: true }
      );
      toast.success("Ordre sauvegardé !");
      setHasChanges(false);
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
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleUpdateAireStatus = async (statut) => {
    try {
      await axios.put(
        `${API}/aires-combat/${selectedAire}`,
        { statut },
        { withCredentials: true }
      );
      toast.success(`Aire mise en ${statut === "active" ? "service" : statut}`);
      fetchAires();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const calculateHeureApprox = (index) => {
    const startTime = new Date(`2026-01-01T${heureDebut}:00`);
    const combatTime = new Date(startTime.getTime() + index * dureeCombat * 60000);
    return combatTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePrint = () => {
    window.print();
  };

  const currentAire = aires.find(a => a.aire_id === selectedAire);

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
              <p className="text-slate-500 mt-1">Glissez-déposez pour réorganiser</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {hasChanges && (
              <Button onClick={handleSaveOrder} disabled={saving} className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
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
              <div className="flex flex-wrap items-center gap-4">
                {/* Sélection aire */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Aire :</label>
                  <Select value={selectedAire} onValueChange={setSelectedAire}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aires.map(aire => (
                        <SelectItem key={aire.aire_id} value={aire.aire_id}>
                          <div className="flex items-center gap-2">
                            {aire.nom}
                            {aire.statut === "pause" && <Badge className="bg-amber-500 text-xs">Pause</Badge>}
                            {aire.statut === "hs" && <Badge className="bg-red-500 text-xs">HS</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Statut de l'aire */}
                {isAdmin && currentAire && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={currentAire.statut === "active" ? "default" : "outline"}
                      onClick={() => handleUpdateAireStatus("active")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Active
                    </Button>
                    <Button
                      size="sm"
                      variant={currentAire.statut === "pause" ? "default" : "outline"}
                      className={currentAire.statut === "pause" ? "bg-amber-500" : ""}
                      onClick={() => handleUpdateAireStatus("pause")}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                    <Button
                      size="sm"
                      variant={currentAire.statut === "hs" ? "default" : "outline"}
                      className={currentAire.statut === "hs" ? "bg-red-500" : ""}
                      onClick={() => handleUpdateAireStatus("hs")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      HS
                    </Button>
                  </div>
                )}

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
                  <span className="text-sm text-slate-500">min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avertissement changements non sauvegardés */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="print:hidden"
          >
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-amber-800 font-medium">
                  Vous avez des modifications non sauvegardées
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Titre impression */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black uppercase">{competition?.nom}</h1>
          <h2 className="text-lg font-bold mt-1">
            Ordre des combats - {currentAire?.nom || ""}
          </h2>
          <p className="text-sm text-slate-500">
            Début : {heureDebut} • Durée par combat : {dureeCombat} min
          </p>
        </div>

        {/* Liste des combats avec drag & drop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-slate-200 print:border-0 print:shadow-none">
            <CardContent className="p-4">
              {combats.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <p>Aucun combat sur cette aire</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={combats.map(c => c.combat_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {combats.map((combat, index) => (
                      <SortableCombatRow
                        key={combat.combat_id}
                        combat={combat}
                        index={index}
                        heureApprox={calculateHeureApprox(index)}
                        onForfait={handleForfait}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="print:hidden"
        >
          <div className="flex justify-center gap-8 text-sm text-slate-500">
            <span>Total : <strong>{combats.length}</strong> combat(s)</span>
            <span>Terminés : <strong>{combats.filter(c => c.termine).length}</strong></span>
            <span>À venir : <strong>{combats.filter(c => !c.termine).length}</strong></span>
          </div>
        </motion.div>
      </div>

      {/* Styles impression */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </Layout>
  );
}
