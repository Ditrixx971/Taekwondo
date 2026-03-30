import { useState, useEffect, useCallback, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { 
  Plus, 
  Link2, 
  Unlink, 
  Trash2, 
  Edit, 
  Save,
  ChevronLeft,
  Play,
  Shuffle,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Grid3X3,
  Swords,
  RefreshCw,
  Settings,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============ COMPOSANT NODE COMBAT ============
const CombatNode = ({ 
  combat, 
  isSelected, 
  onSelect, 
  onConnect, 
  connectingFrom, 
  connexions 
}) => {
  const isSource = connectingFrom?.combat_id === combat.combat_id;
  const isConnectedDestination = connexions.some(c => c.destination_id === combat.combat_id);
  
  const statusColor = combat.termine 
    ? "border-green-400 bg-green-50" 
    : combat.pret 
      ? "border-blue-400 bg-blue-50" 
      : "border-slate-300 bg-white";
  
  const selectBorder = isSelected 
    ? "ring-2 ring-indigo-500 ring-offset-2" 
    : isSource 
      ? "ring-2 ring-orange-500 ring-offset-2"
      : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative p-3 rounded-xl border-2 shadow-sm cursor-pointer
        transition-all hover:shadow-md min-w-[220px]
        ${statusColor} ${selectBorder}
      `}
      onClick={() => onSelect(combat)}
      data-testid={`combat-node-${combat.combat_id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          {combat.nom_personnalise || combat.tour}
        </Badge>
        <div className="flex items-center gap-1">
          {combat.pret && !combat.termine && (
            <Badge className="bg-blue-500 text-xs">Prêt</Badge>
          )}
          {combat.termine && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {combat.mode_creation === "manuel" && (
            <Badge variant="secondary" className="text-xs">Manuel</Badge>
          )}
        </div>
      </div>

      {/* Combattant Rouge */}
      <div className="flex items-center gap-2 p-2 bg-red-100 rounded-lg mb-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="flex-1 min-w-0">
          {combat.rouge ? (
            <p className="text-xs font-medium text-slate-800 truncate">
              {combat.rouge.prenom} {combat.rouge.nom}
            </p>
          ) : combat.combat_source_rouge_id ? (
            <p className="text-xs text-slate-500 italic">← Vainqueur combat</p>
          ) : (
            <p className="text-xs text-slate-400 italic">Non assigné</p>
          )}
        </div>
        {/* Point de connexion Rouge */}
        {!combat.rouge && !combat.combat_source_rouge_id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnect(combat, "rouge");
            }}
            className="w-5 h-5 rounded-full bg-red-200 hover:bg-red-300 flex items-center justify-center"
            title="Connecter un combat source"
            data-testid={`connect-rouge-${combat.combat_id}`}
          >
            <Link2 className="h-3 w-3 text-red-600" />
          </button>
        )}
      </div>

      {/* VS */}
      <div className="text-center text-xs font-bold text-slate-400 py-0.5">VS</div>

      {/* Combattant Bleu */}
      <div className="flex items-center gap-2 p-2 bg-blue-100 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <div className="flex-1 min-w-0">
          {combat.bleu ? (
            <p className="text-xs font-medium text-slate-800 truncate">
              {combat.bleu.prenom} {combat.bleu.nom}
            </p>
          ) : combat.combat_source_bleu_id ? (
            <p className="text-xs text-slate-500 italic">← Vainqueur combat</p>
          ) : (
            <p className="text-xs text-slate-400 italic">Non assigné</p>
          )}
        </div>
        {/* Point de connexion Bleu */}
        {!combat.bleu && !combat.combat_source_bleu_id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnect(combat, "bleu");
            }}
            className="w-5 h-5 rounded-full bg-blue-200 hover:bg-blue-300 flex items-center justify-center"
            title="Connecter un combat source"
            data-testid={`connect-bleu-${combat.combat_id}`}
          >
            <Link2 className="h-3 w-3 text-blue-600" />
          </button>
        )}
      </div>

      {/* Indicateur de sortie vers combat suivant */}
      {combat.combat_suivant_id && (
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-white" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ============ PANNEAU DE DÉTAILS/ÉDITION ============
const CombatDetailPanel = ({ 
  combat, 
  competiteurs, 
  onUpdate, 
  onDelete,
  onClose,
  isAdmin 
}) => {
  const [formData, setFormData] = useState({
    tour: combat?.tour || "manuel",
    nom_personnalise: combat?.nom_personnalise || "",
    rouge_id: combat?.rouge_id || "",
    bleu_id: combat?.bleu_id || ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (combat) {
      setFormData({
        tour: combat.tour || "manuel",
        nom_personnalise: combat.nom_personnalise || "",
        rouge_id: combat.rouge_id || "",
        bleu_id: combat.bleu_id || ""
      });
    }
  }, [combat]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(combat.combat_id, formData);
      toast.success("Combat mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  if (!combat) return null;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Détails du combat</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Infos */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-slate-500">ID:</div>
          <div className="font-mono text-xs">{combat.combat_id}</div>
          <div className="text-slate-500">Mode:</div>
          <div>
            <Badge variant={combat.mode_creation === "manuel" ? "default" : "secondary"}>
              {combat.mode_creation}
            </Badge>
          </div>
          <div className="text-slate-500">Statut:</div>
          <div>
            <Badge className={combat.termine ? "bg-green-500" : combat.pret ? "bg-blue-500" : "bg-slate-400"}>
              {combat.termine ? "Terminé" : combat.pret ? "Prêt" : "En attente"}
            </Badge>
          </div>
        </div>

        {isAdmin && !combat.termine && (
          <>
            <div className="border-t pt-4">
              <Label className="text-sm">Nom personnalisé</Label>
              <Input
                value={formData.nom_personnalise}
                onChange={(e) => setFormData({ ...formData, nom_personnalise: e.target.value })}
                placeholder="Ex: Finale consolante"
                className="mt-1"
                data-testid="input-nom-personnalise"
              />
            </div>

            <div>
              <Label className="text-sm">Tour</Label>
              <Select 
                value={formData.tour} 
                onValueChange={(v) => setFormData({ ...formData, tour: v })}
              >
                <SelectTrigger className="mt-1" data-testid="select-tour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manuel">Manuel</SelectItem>
                  <SelectItem value="quart">Quart de finale</SelectItem>
                  <SelectItem value="demi">Demi-finale</SelectItem>
                  <SelectItem value="finale">Finale</SelectItem>
                  <SelectItem value="bronze">Petite finale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sélection combattants (si pas de source connectée) */}
            {!combat.combat_source_rouge_id && (
              <div>
                <Label className="text-sm text-red-600">Combattant Rouge</Label>
                <Select 
                  value={formData.rouge_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, rouge_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-rouge">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Aucun --</SelectItem>
                    {competiteurs.map(c => (
                      <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                        {c.prenom} {c.nom} ({c.club})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!combat.combat_source_bleu_id && (
              <div>
                <Label className="text-sm text-blue-600">Combattant Bleu</Label>
                <Select 
                  value={formData.bleu_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, bleu_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-bleu">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Aucun --</SelectItem>
                    {competiteurs.map(c => (
                      <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                        {c.prenom} {c.nom} ({c.club})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1" data-testid="save-combat-btn">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
              <Button variant="destructive" onClick={() => onDelete(combat.combat_id)} data-testid="delete-combat-btn">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Connexions */}
        {(combat.combat_suivant_id || combat.combat_source_rouge_id || combat.combat_source_bleu_id) && (
          <div className="border-t pt-4">
            <Label className="text-sm font-medium">Connexions</Label>
            <div className="mt-2 space-y-2 text-xs">
              {combat.combat_source_rouge_id && (
                <div className="flex items-center gap-2 text-red-600">
                  <ArrowRight className="h-3 w-3 rotate-180" />
                  <span>Rouge ← Combat source</span>
                </div>
              )}
              {combat.combat_source_bleu_id && (
                <div className="flex items-center gap-2 text-blue-600">
                  <ArrowRight className="h-3 w-3 rotate-180" />
                  <span>Bleu ← Combat source</span>
                </div>
              )}
              {combat.combat_suivant_id && (
                <div className="flex items-center gap-2 text-indigo-600">
                  <ArrowRight className="h-3 w-3" />
                  <span>Vainqueur → Combat suivant ({combat.combat_suivant_slot})</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============ DIALOGUE CRÉATION COMBAT ============
const CreateCombatDialog = ({ open, onOpenChange, categorie, competiteurs, onCreate }) => {
  const [formData, setFormData] = useState({
    tour: "manuel",
    nom_personnalise: "",
    rouge_id: "",
    bleu_id: ""
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreate(formData);
      setFormData({ tour: "manuel", nom_personnalise: "", rouge_id: "", bleu_id: "" });
      onOpenChange(false);
      toast.success("Combat créé");
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau combat manuel</DialogTitle>
          <DialogDescription>
            Créez un nouveau combat dans la catégorie {categorie?.nom}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Nom personnalisé (optionnel)</Label>
            <Input
              value={formData.nom_personnalise}
              onChange={(e) => setFormData({ ...formData, nom_personnalise: e.target.value })}
              placeholder="Ex: Combat de barrage"
              data-testid="create-nom-personnalise"
            />
          </div>

          <div>
            <Label>Type de tour</Label>
            <Select 
              value={formData.tour} 
              onValueChange={(v) => setFormData({ ...formData, tour: v })}
            >
              <SelectTrigger data-testid="create-tour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manuel">Manuel</SelectItem>
                <SelectItem value="quart">Quart de finale</SelectItem>
                <SelectItem value="demi">Demi-finale</SelectItem>
                <SelectItem value="finale">Finale</SelectItem>
                <SelectItem value="bronze">Petite finale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-red-600">Combattant Rouge (optionnel)</Label>
            <Select 
              value={formData.rouge_id || "none"} 
              onValueChange={(v) => setFormData({ ...formData, rouge_id: v === "none" ? "" : v })}
            >
              <SelectTrigger data-testid="create-rouge">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Non assigné --</SelectItem>
                {competiteurs.map(c => (
                  <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                    {c.prenom} {c.nom} ({c.club})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-blue-600">Combattant Bleu (optionnel)</Label>
            <Select 
              value={formData.bleu_id || "none"} 
              onValueChange={(v) => setFormData({ ...formData, bleu_id: v === "none" ? "" : v })}
            >
              <SelectTrigger data-testid="create-bleu">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Non assigné --</SelectItem>
                {competiteurs.map(c => (
                  <SelectItem key={c.competiteur_id} value={c.competiteur_id}>
                    {c.prenom} {c.nom} ({c.club})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={creating} data-testid="confirm-create-combat">
            {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ DIALOGUE CONNEXION ============
const ConnectDialog = ({ 
  open, 
  onOpenChange, 
  combats, 
  destinationCombat, 
  destinationSlot,
  onConnect 
}) => {
  const [selectedSource, setSelectedSource] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Filtrer les combats disponibles comme source
  const availableSources = combats.filter(c => 
    c.combat_id !== destinationCombat?.combat_id && 
    !c.combat_suivant_id &&
    !c.termine
  );

  const handleConnect = async () => {
    if (!selectedSource) return;
    setConnecting(true);
    try {
      await onConnect(selectedSource, destinationCombat.combat_id, destinationSlot);
      setSelectedSource("");
      onOpenChange(false);
      toast.success("Combats connectés");
    } catch (error) {
      toast.error("Erreur lors de la connexion");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connecter un combat source</DialogTitle>
          <DialogDescription>
            Le vainqueur du combat sélectionné sera placé en position 
            <Badge className={destinationSlot === "rouge" ? "bg-red-500 mx-1" : "bg-blue-500 mx-1"}>
              {destinationSlot}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Combat source</Label>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger data-testid="select-source-combat">
                <SelectValue placeholder="Sélectionner un combat..." />
              </SelectTrigger>
              <SelectContent>
                {availableSources.length === 0 ? (
                  <SelectItem value="" disabled>Aucun combat disponible</SelectItem>
                ) : (
                  availableSources.map(c => (
                    <SelectItem key={c.combat_id} value={c.combat_id}>
                      {c.nom_personnalise || c.tour} - 
                      {c.rouge ? ` ${c.rouge.prenom}` : " ?"} vs 
                      {c.bleu ? ` ${c.bleu.prenom}` : " ?"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={connecting || !selectedSource}
            data-testid="confirm-connect"
          >
            {connecting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
            Connecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ PAGE PRINCIPALE ============
export default function CombatsManuelPage() {
  const { isAdmin, isMaster } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(searchParams.get("categorie") || "");
  const [arbreData, setArbreData] = useState(null);
  const [competiteurs, setCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCombat, setSelectedCombat] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectDestination, setConnectDestination] = useState({ combat: null, slot: null });
  
  const [distributing, setDistributing] = useState(false);

  // Vérifier accès MASTER
  useEffect(() => {
    if (!isMaster) {
      toast.error("Accès réservé aux comptes MASTER");
      navigate("/gestion-combats");
    }
  }, [isMaster, navigate]);

  useEffect(() => {
    if (competition && isMaster) {
      fetchCategories();
    }
  }, [competition, isMaster]);

  useEffect(() => {
    if (selectedCategorie) {
      fetchArbre();
      fetchCompetiteurs();
    }
  }, [selectedCategorie]);

  const fetchCategories = async () => {
    try {
      const catRes = await axios.get(
        `${API}/categories?competition_id=${competition.competition_id}`, 
        { withCredentials: true }
      );
      setCategories(catRes.data);
      
      if (catRes.data.length > 0 && !selectedCategorie) {
        setSelectedCategorie(catRes.data[0].categorie_id);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des catégories");
    } finally {
      setLoading(false);
    }
  };

  const fetchArbre = async () => {
    try {
      const response = await axios.get(
        `${API}/combats-manuels/arbre/${selectedCategorie}`, 
        { withCredentials: true }
      );
      setArbreData(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement de l'arbre");
    }
  };

  const fetchCompetiteurs = async () => {
    try {
      const response = await axios.get(
        `${API}/competiteurs?categorie_id=${selectedCategorie}`, 
        { withCredentials: true }
      );
      setCompetiteurs(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateCombat = async (formData) => {
    const payload = {
      competition_id: competition.competition_id,
      categorie_id: selectedCategorie,
      tour: formData.tour,
      position: 1,
      nom_personnalise: formData.nom_personnalise || null,
      rouge_id: formData.rouge_id || null,
      bleu_id: formData.bleu_id || null
    };
    
    await axios.post(`${API}/combats-manuels`, payload, { withCredentials: true });
    fetchArbre();
  };

  const handleUpdateCombat = async (combatId, formData) => {
    const payload = {};
    if (formData.tour !== undefined) payload.tour = formData.tour;
    if (formData.nom_personnalise !== undefined) payload.nom_personnalise = formData.nom_personnalise;
    if (formData.rouge_id !== undefined) payload.rouge_id = formData.rouge_id || "";
    if (formData.bleu_id !== undefined) payload.bleu_id = formData.bleu_id || "";
    
    await axios.put(`${API}/combats-manuels/${combatId}`, payload, { withCredentials: true });
    fetchArbre();
  };

  const handleDeleteCombat = async (combatId) => {
    if (!confirm("Supprimer ce combat ?")) return;
    try {
      await axios.delete(`${API}/combats-manuels/${combatId}`, { withCredentials: true });
      setSelectedCombat(null);
      toast.success("Combat supprimé");
      fetchArbre();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const handleConnect = async (sourceId, destinationId, slot) => {
    await axios.post(`${API}/combats-manuels/connecter`, {
      combat_source_id: sourceId,
      combat_destination_id: destinationId,
      slot_destination: slot
    }, { withCredentials: true });
    fetchArbre();
  };

  const handleOpenConnectDialog = (combat, slot) => {
    setConnectDestination({ combat, slot });
    setConnectDialogOpen(true);
  };

  const handleDistributeAuto = async () => {
    setDistributing(true);
    try {
      const response = await axios.post(
        `${API}/combats-manuels/distribution-auto/${competition.competition_id}`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchArbre();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la distribution");
    } finally {
      setDistributing(false);
    }
  };

  // Organiser les combats par tour
  const organizedCombats = arbreData?.arbre || {};
  const allCombats = Object.values(organizedCombats).flat();
  const connexions = arbreData?.connexions || [];

  // Stats
  const stats = {
    total: arbreData?.total_combats || 0,
    termines: arbreData?.combats_termines || 0,
    prets: arbreData?.combats_prets || 0
  };

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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/gestion-combats")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                Éditeur de Combats
              </h1>
              <p className="text-slate-500 text-sm">Mode manuel - Drag & Drop</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="create-combat-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau combat
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDistributeAuto}
                  disabled={distributing}
                  data-testid="distribute-btn"
                >
                  {distributing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shuffle className="h-4 w-4 mr-2" />
                  )}
                  Distribuer sur aires
                </Button>
              </>
            )}
            <Button 
              variant="outline"
              onClick={() => navigate(`/arbre-combat?categorie=${selectedCategorie}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Vue arbre
            </Button>
          </div>
        </motion.div>

        {/* Sélection catégorie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Catégorie :</label>
                  <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                    <SelectTrigger className="w-72" data-testid="select-categorie">
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
                
                {/* Stats */}
                <div className="flex gap-4 ml-auto">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                    <p className="text-xs text-slate-500">Combats</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.prets}</p>
                    <p className="text-xs text-slate-500">Prêts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.termines}</p>
                    <p className="text-xs text-slate-500">Terminés</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Zone principale: Arbre + Détails */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Arbre des combats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  {categorieNom || "Sélectionnez une catégorie"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedCategorie || categories.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">Sélectionnez une catégorie pour commencer</p>
                  </div>
                ) : allCombats.length === 0 ? (
                  <div className="py-12 text-center">
                    <Swords className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">Aucun combat dans cette catégorie</p>
                    {isAdmin && (
                      <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer le premier combat
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px] p-4">
                      {/* Affichage par colonnes de tour */}
                      <div className="flex gap-8 items-start justify-center">
                        {/* Quarts */}
                        {organizedCombats.quart?.length > 0 && (
                          <div className="flex flex-col gap-4">
                            <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                              Quarts
                            </h3>
                            {organizedCombats.quart.map(combat => (
                              <CombatNode
                                key={combat.combat_id}
                                combat={combat}
                                isSelected={selectedCombat?.combat_id === combat.combat_id}
                                onSelect={setSelectedCombat}
                                onConnect={handleOpenConnectDialog}
                                connexions={connexions}
                              />
                            ))}
                          </div>
                        )}

                        {/* Demis */}
                        {organizedCombats.demi?.length > 0 && (
                          <div className="flex flex-col gap-6">
                            <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                              Demi-finales
                            </h3>
                            {organizedCombats.demi.map(combat => (
                              <CombatNode
                                key={combat.combat_id}
                                combat={combat}
                                isSelected={selectedCombat?.combat_id === combat.combat_id}
                                onSelect={setSelectedCombat}
                                onConnect={handleOpenConnectDialog}
                                connexions={connexions}
                              />
                            ))}
                          </div>
                        )}

                        {/* Finale & Bronze */}
                        {(organizedCombats.finale?.length > 0 || organizedCombats.bronze?.length > 0) && (
                          <div className="flex flex-col gap-6">
                            <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                              Finales
                            </h3>
                            {organizedCombats.finale?.map(combat => (
                              <CombatNode
                                key={combat.combat_id}
                                combat={combat}
                                isSelected={selectedCombat?.combat_id === combat.combat_id}
                                onSelect={setSelectedCombat}
                                onConnect={handleOpenConnectDialog}
                                connexions={connexions}
                              />
                            ))}
                            {organizedCombats.bronze?.map(combat => (
                              <CombatNode
                                key={combat.combat_id}
                                combat={combat}
                                isSelected={selectedCombat?.combat_id === combat.combat_id}
                                onSelect={setSelectedCombat}
                                onConnect={handleOpenConnectDialog}
                                connexions={connexions}
                              />
                            ))}
                          </div>
                        )}

                        {/* Combats manuels / autres */}
                        {organizedCombats.manuel?.length > 0 && (
                          <div className="flex flex-col gap-4">
                            <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                              Manuel
                            </h3>
                            {organizedCombats.manuel.map(combat => (
                              <CombatNode
                                key={combat.combat_id}
                                combat={combat}
                                isSelected={selectedCombat?.combat_id === combat.combat_id}
                                onSelect={setSelectedCombat}
                                onConnect={handleOpenConnectDialog}
                                connexions={connexions}
                              />
                            ))}
                          </div>
                        )}

                        {/* Autres tours non standards */}
                        {Object.entries(organizedCombats)
                          .filter(([tour]) => !["quart", "demi", "finale", "bronze", "manuel"].includes(tour))
                          .map(([tour, combats]) => (
                            <div key={tour} className="flex flex-col gap-4">
                              <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                                {tour}
                              </h3>
                              {combats.map(combat => (
                                <CombatNode
                                  key={combat.combat_id}
                                  combat={combat}
                                  isSelected={selectedCombat?.combat_id === combat.combat_id}
                                  onSelect={setSelectedCombat}
                                  onConnect={handleOpenConnectDialog}
                                  connexions={connexions}
                                />
                              ))}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Panneau détails */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            {selectedCombat ? (
              <CombatDetailPanel
                combat={selectedCombat}
                competiteurs={competiteurs}
                onUpdate={handleUpdateCombat}
                onDelete={handleDeleteCombat}
                onClose={() => setSelectedCombat(null)}
                isAdmin={isAdmin}
              />
            ) : (
              <Card className="border-slate-200 border-dashed">
                <CardContent className="py-12 text-center">
                  <Settings className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400 text-sm">
                    Cliquez sur un combat pour voir ses détails
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Aide rapide */}
            <Card className="border-slate-200 mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Aide</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 space-y-2">
                <div className="flex items-center gap-1">
                  <Badge className="bg-blue-500">Prêt</Badge>
                  <span>Combat avec 2 combattants assignés</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className="bg-green-500">✓</Badge>
                  <span>Combat terminé</span>
                </div>
                <div className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  <span>Cliquez pour connecter un combat source</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Dialogues */}
        <CreateCombatDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          categorie={categories.find(c => c.categorie_id === selectedCategorie)}
          competiteurs={competiteurs}
          onCreate={handleCreateCombat}
        />

        <ConnectDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          combats={allCombats}
          destinationCombat={connectDestination.combat}
          destinationSlot={connectDestination.slot}
          onConnect={handleConnect}
        />
      </div>
    </Layout>
  );
}
