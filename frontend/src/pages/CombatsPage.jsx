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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Swords, Play, CheckCircle, XCircle, AlertTriangle, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CombatsPage() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [tatamis, setTatamis] = useState([]);
  const [combats, setCombats] = useState([]);
  const [competiteurs, setCompetiteurs] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState("");
  const [selectedTatami, setSelectedTatami] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resultatDialog, setResultatDialog] = useState(false);
  const [selectedCombat, setSelectedCombat] = useState(null);
  const [resultatForm, setResultatForm] = useState({
    vainqueur_id: "",
    score_rouge: 0,
    score_bleu: 0,
    type_victoire: "normal"
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategorie) {
      fetchCombats();
    }
  }, [selectedCategorie, selectedTatami]);

  const fetchInitialData = async () => {
    try {
      const [catRes, tatRes, compRes] = await Promise.all([
        axios.get(`${API}/categories`, { withCredentials: true }),
        axios.get(`${API}/tatamis`, { withCredentials: true }),
        axios.get(`${API}/competiteurs`, { withCredentials: true })
      ]);
      setCategories(catRes.data);
      setTatamis(tatRes.data);
      setCompetiteurs(compRes.data);
      
      if (catRes.data.length > 0) {
        setSelectedCategorie(catRes.data[0].categorie_id);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const fetchCombats = async () => {
    try {
      let url = `${API}/combats?categorie_id=${selectedCategorie}`;
      if (selectedTatami !== "all") {
        url += `&tatami_id=${selectedTatami}`;
      }
      const response = await axios.get(url, { withCredentials: true });
      setCombats(response.data);
    } catch (error) {
      console.error("Error fetching combats:", error);
    }
  };

  const handleGenererTableau = async () => {
    if (!selectedCategorie) {
      toast.error("Sélectionnez une catégorie");
      return;
    }
    
    setGenerating(true);
    try {
      let url = `${API}/combats/generer/${selectedCategorie}`;
      if (selectedTatami !== "all") {
        url += `?tatami_id=${selectedTatami}`;
      }
      const response = await axios.post(url, {}, { withCredentials: true });
      toast.success(response.data.message);
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const getCompetiteurNom = (id) => {
    if (!id) return "À déterminer";
    const comp = competiteurs.find(c => c.competiteur_id === id);
    return comp ? `${comp.prenom} ${comp.nom}` : "Inconnu";
  };

  const openResultatDialog = (combat) => {
    setSelectedCombat(combat);
    setResultatForm({
      vainqueur_id: combat.vainqueur_id || "",
      score_rouge: combat.score_rouge || 0,
      score_bleu: combat.score_bleu || 0,
      type_victoire: combat.type_victoire || "normal"
    });
    setResultatDialog(true);
  };

  const handleSaisirResultat = async () => {
    if (!resultatForm.vainqueur_id) {
      toast.error("Sélectionnez un vainqueur");
      return;
    }

    try {
      await axios.put(
        `${API}/combats/${selectedCombat.combat_id}/resultat`,
        resultatForm,
        { withCredentials: true }
      );
      toast.success("Résultat enregistré");
      setResultatDialog(false);
      fetchCombats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    }
  };

  const getTourLabel = (tour) => {
    const labels = {
      quart: "Quart de finale",
      demi: "Demi-finale",
      finale: "Finale",
      bronze: "Match Bronze"
    };
    return labels[tour] || tour;
  };

  const getTourColor = (tour) => {
    const colors = {
      quart: "bg-slate-100 text-slate-700",
      demi: "bg-blue-100 text-blue-700",
      finale: "bg-yellow-100 text-yellow-700",
      bronze: "bg-amber-100 text-amber-700"
    };
    return colors[tour] || "bg-slate-100 text-slate-700";
  };

  const groupedCombats = combats.reduce((acc, combat) => {
    if (!acc[combat.tour]) acc[combat.tour] = [];
    acc[combat.tour].push(combat);
    return acc;
  }, {});

  const tourOrder = ["quart", "demi", "bronze", "finale"];

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
              Combats
            </h1>
            <p className="text-slate-500 mt-1">Gestion des combats et résultats</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                    <SelectTrigger data-testid="select-categorie">
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
                <div className="flex-1 space-y-2">
                  <Label>Tatami</Label>
                  <Select value={selectedTatami} onValueChange={setSelectedTatami}>
                    <SelectTrigger data-testid="select-tatami">
                      <SelectValue placeholder="Tous les tatamis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les tatamis</SelectItem>
                      {tatamis.map(tat => (
                        <SelectItem key={tat.tatami_id} value={tat.tatami_id}>
                          {tat.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isAdmin && (
                  <Button
                    onClick={handleGenererTableau}
                    disabled={generating || !selectedCategorie}
                    className="font-semibold uppercase tracking-wide"
                    data-testid="generer-tableau-btn"
                  >
                    {generating ? (
                      <>Génération...</>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Générer tableau
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Combats by tour */}
        {combats.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-slate-200">
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <Swords className="h-12 w-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Aucun combat</p>
                  <p className="text-sm">Générez le tableau pour créer les combats</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {tourOrder.map((tour, tourIndex) => {
              const tourCombats = groupedCombats[tour];
              if (!tourCombats || tourCombats.length === 0) return null;
              
              return (
                <motion.div
                  key={tour}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + tourIndex * 0.1 }}
                >
                  <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-100">
                      <CardTitle className="flex items-center gap-3">
                        <Badge className={getTourColor(tour)}>
                          {getTourLabel(tour)}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {tourCombats.length} combat(s)
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {tourCombats.map((combat) => (
                          <CombatCard
                            key={combat.combat_id}
                            combat={combat}
                            getCompetiteurNom={getCompetiteurNom}
                            isAdmin={isAdmin}
                            onSaisirResultat={() => openResultatDialog(combat)}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Resultat Dialog */}
        <Dialog open={resultatDialog} onOpenChange={setResultatDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                Saisir le résultat
              </DialogTitle>
            </DialogHeader>
            {selectedCombat && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="text-center flex-1">
                    <div className="w-8 h-8 rounded-full hong-bg mx-auto mb-2"></div>
                    <p className="font-semibold text-sm">{getCompetiteurNom(selectedCombat.rouge_id)}</p>
                    <p className="text-xs text-slate-500">Rouge (Hong)</p>
                  </div>
                  <div className="px-4 text-2xl font-black text-slate-300">VS</div>
                  <div className="text-center flex-1">
                    <div className="w-8 h-8 rounded-full chung-bg mx-auto mb-2"></div>
                    <p className="font-semibold text-sm">{getCompetiteurNom(selectedCombat.bleu_id)}</p>
                    <p className="text-xs text-slate-500">Bleu (Chung)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vainqueur</Label>
                  <Select
                    value={resultatForm.vainqueur_id}
                    onValueChange={(val) => setResultatForm({ ...resultatForm, vainqueur_id: val })}
                  >
                    <SelectTrigger data-testid="select-vainqueur">
                      <SelectValue placeholder="Sélectionner le vainqueur" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCombat.rouge_id && (
                        <SelectItem value={selectedCombat.rouge_id}>
                          🔴 {getCompetiteurNom(selectedCombat.rouge_id)}
                        </SelectItem>
                      )}
                      {selectedCombat.bleu_id && (
                        <SelectItem value={selectedCombat.bleu_id}>
                          🔵 {getCompetiteurNom(selectedCombat.bleu_id)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Score Rouge</Label>
                    <Input
                      type="number"
                      min="0"
                      value={resultatForm.score_rouge}
                      onChange={(e) => setResultatForm({ ...resultatForm, score_rouge: parseInt(e.target.value) || 0 })}
                      data-testid="score-rouge-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Score Bleu</Label>
                    <Input
                      type="number"
                      min="0"
                      value={resultatForm.score_bleu}
                      onChange={(e) => setResultatForm({ ...resultatForm, score_bleu: parseInt(e.target.value) || 0 })}
                      data-testid="score-bleu-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Type de victoire</Label>
                  <Select
                    value={resultatForm.type_victoire}
                    onValueChange={(val) => setResultatForm({ ...resultatForm, type_victoire: val })}
                  >
                    <SelectTrigger data-testid="select-type-victoire">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Victoire normale</SelectItem>
                      <SelectItem value="forfait">Forfait</SelectItem>
                      <SelectItem value="abandon">Abandon</SelectItem>
                      <SelectItem value="disqualification">Disqualification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setResultatDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSaisirResultat} data-testid="submit-resultat-btn">
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

const CombatCard = ({ combat, getCompetiteurNom, isAdmin, onSaisirResultat }) => {
  const isReady = combat.rouge_id && combat.bleu_id;
  
  return (
    <div className={`p-4 rounded-xl border ${combat.termine ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Combat #{combat.position}
        </span>
        {combat.termine ? (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        ) : isReady ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Prêt
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-slate-100 text-slate-500">
            En attente
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Rouge */}
        <div className={`flex-1 p-3 rounded-lg ${combat.vainqueur_id === combat.rouge_id ? 'bg-red-100 ring-2 ring-red-500' : 'bg-red-50'}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="font-semibold text-sm truncate">
              {getCompetiteurNom(combat.rouge_id)}
            </span>
          </div>
          {combat.termine && (
            <p className="text-2xl font-black text-red-600 mt-2 score-display">
              {combat.score_rouge}
            </p>
          )}
        </div>
        
        <div className="text-slate-300 font-black">VS</div>
        
        {/* Bleu */}
        <div className={`flex-1 p-3 rounded-lg ${combat.vainqueur_id === combat.bleu_id ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-blue-50'}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="font-semibold text-sm truncate">
              {getCompetiteurNom(combat.bleu_id)}
            </span>
          </div>
          {combat.termine && (
            <p className="text-2xl font-black text-blue-600 mt-2 score-display">
              {combat.score_bleu}
            </p>
          )}
        </div>
      </div>

      {combat.termine && combat.type_victoire && combat.type_victoire !== "normal" && (
        <div className="mt-3 p-2 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Victoire par {combat.type_victoire}
          </p>
        </div>
      )}

      {isAdmin && isReady && !combat.termine && (
        <Button
          className="w-full mt-4 font-semibold"
          onClick={onSaisirResultat}
          data-testid={`saisir-resultat-${combat.combat_id}`}
        >
          Saisir le résultat
        </Button>
      )}

      {isAdmin && combat.termine && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={onSaisirResultat}
          data-testid={`modifier-resultat-${combat.combat_id}`}
        >
          Modifier le résultat
        </Button>
      )}
    </div>
  );
};
