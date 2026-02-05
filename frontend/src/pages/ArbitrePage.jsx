import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  ArrowLeft, 
  Play, 
  Trophy,
  User,
  CheckCircle2,
  Clock,
  Swords,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ArbitrePage() {
  const { aireId } = useParams();
  const navigate = useNavigate();
  const { competition } = useCompetition();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState({ rouge: 0, bleu: 0 });

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/arbitre/aire/${aireId}`, { withCredentials: true });
      setData(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [aireId]);

  useEffect(() => {
    fetchData();
    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const lancerCombat = async (combatId) => {
    try {
      await axios.post(`${API}/arbitre/lancer/${combatId}`, {}, { withCredentials: true });
      toast.success("Combat lancé !");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const saisirResultat = async (vainqueur) => {
    if (!data?.combat_en_cours) return;
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/arbitre/resultat/${data.combat_en_cours.combat_id}`,
        null,
        { 
          params: {
            vainqueur,
            score_rouge: scores.rouge,
            score_bleu: scores.bleu,
            type_victoire: "normal"
          },
          withCredentials: true 
        }
      );
      toast.success("Résultat enregistré !");
      setScores({ rouge: 0, bleu: 0 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-white">Aire de combat non trouvée</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/aires-combat")}>
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const combatEnCours = data.combat_en_cours;
  const prochainCombat = data.combats_a_venir?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 border-b border-white/10 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10"
            onClick={() => navigate("/aires-combat")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-black text-white uppercase">
              {data.aire?.nom || `Aire ${data.aire?.numero}`}
            </h1>
            <p className="text-slate-400 text-sm">{competition?.nom}</p>
          </div>
          <Badge className={data.finales_restantes > 0 ? "bg-amber-500" : "bg-green-500"}>
            {data.finales_restantes} finale(s) restante(s)
          </Badge>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Combat en cours */}
        <AnimatePresence mode="wait">
          {combatEnCours ? (
            <motion.div
              key="combat-en-cours"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="bg-white/10 backdrop-blur border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-blue-600 p-3">
                  <div className="flex items-center justify-center gap-2 text-white">
                    <Swords className="h-5 w-5" />
                    <span className="font-bold uppercase">Combat en cours</span>
                    <Badge className="bg-white/20">{combatEnCours.tour}</Badge>
                  </div>
                  <p className="text-center text-white/80 text-sm mt-1">
                    {combatEnCours.categorie?.nom}
                  </p>
                </div>
                
                <CardContent className="p-6">
                  <div className="grid grid-cols-5 gap-4 items-center">
                    {/* Rouge */}
                    <div className="col-span-2">
                      <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 text-center">
                        <Badge className="bg-red-500 mb-3">ROUGE</Badge>
                        <h3 className="text-2xl font-black text-white">
                          {combatEnCours.rouge?.prenom} {combatEnCours.rouge?.nom}
                        </h3>
                        <p className="text-red-200 text-sm mt-1">
                          {combatEnCours.rouge?.club}
                        </p>
                        <div className="mt-4">
                          <Label className="text-white/70 text-xs">Score</Label>
                          <Input
                            type="number"
                            min="0"
                            value={scores.rouge}
                            onChange={(e) => setScores({ ...scores, rouge: parseInt(e.target.value) || 0 })}
                            className="text-center text-3xl font-bold bg-white/10 border-red-500/50 text-white h-16"
                          />
                        </div>
                        <Button 
                          className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-6 text-xl"
                          onClick={() => saisirResultat("rouge")}
                          disabled={submitting}
                          data-testid="win-rouge-btn"
                        >
                          <Trophy className="h-6 w-6 mr-2" />
                          VAINQUEUR
                        </Button>
                      </div>
                    </div>

                    {/* VS */}
                    <div className="col-span-1 text-center">
                      <div className="text-5xl font-black text-white/50">VS</div>
                    </div>

                    {/* Bleu */}
                    <div className="col-span-2">
                      <div className="bg-blue-500/20 border-2 border-blue-500 rounded-xl p-6 text-center">
                        <Badge className="bg-blue-500 mb-3">BLEU</Badge>
                        <h3 className="text-2xl font-black text-white">
                          {combatEnCours.bleu?.prenom} {combatEnCours.bleu?.nom}
                        </h3>
                        <p className="text-blue-200 text-sm mt-1">
                          {combatEnCours.bleu?.club}
                        </p>
                        <div className="mt-4">
                          <Label className="text-white/70 text-xs">Score</Label>
                          <Input
                            type="number"
                            min="0"
                            value={scores.bleu}
                            onChange={(e) => setScores({ ...scores, bleu: parseInt(e.target.value) || 0 })}
                            className="text-center text-3xl font-bold bg-white/10 border-blue-500/50 text-white h-16"
                          />
                        </div>
                        <Button 
                          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 text-xl"
                          onClick={() => saisirResultat("bleu")}
                          disabled={submitting}
                          data-testid="win-bleu-btn"
                        >
                          <Trophy className="h-6 w-6 mr-2" />
                          VAINQUEUR
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : prochainCombat ? (
            <motion.div
              key="prochain-combat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Prochain combat
                    </CardTitle>
                    <Badge className={prochainCombat.est_finale ? "bg-amber-500" : "bg-slate-500"}>
                      {prochainCombat.tour}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <p className="text-slate-400 text-sm">{prochainCombat.categorie?.nom}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 items-center mb-6">
                    <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                      <Badge className="bg-red-500 mb-2">ROUGE</Badge>
                      <p className="text-white font-bold">
                        {prochainCombat.rouge ? `${prochainCombat.rouge.prenom} ${prochainCombat.rouge.nom}` : "En attente"}
                      </p>
                      <p className="text-slate-400 text-xs">{prochainCombat.rouge?.club}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl font-black text-white/30">VS</span>
                    </div>
                    <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <Badge className="bg-blue-500 mb-2">BLEU</Badge>
                      <p className="text-white font-bold">
                        {prochainCombat.bleu ? `${prochainCombat.bleu.prenom} ${prochainCombat.bleu.nom}` : "En attente"}
                      </p>
                      <p className="text-slate-400 text-xs">{prochainCombat.bleu?.club}</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 py-6 text-lg font-bold"
                    onClick={() => lancerCombat(prochainCombat.combat_id)}
                    disabled={!prochainCombat.rouge || !prochainCombat.bleu}
                    data-testid="lancer-combat-btn"
                  >
                    <Play className="h-6 w-6 mr-2" />
                    APPELER LES COMBATTANTS
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="pas-de-combat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Tous les combats sont terminés !
                  </h2>
                  <p className="text-slate-400">
                    Plus aucun combat sur cette aire de combat.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-6 border-white/20 text-white hover:bg-white/10"
                    onClick={() => navigate("/resultats")}
                  >
                    Voir les résultats
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File d'attente */}
        {data.combats_a_venir?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  Combats à venir ({data.combats_a_venir.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.combats_a_venir.slice(0, 5).map((combat, index) => (
                    <div 
                      key={combat.combat_id}
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        combat.est_finale ? "bg-amber-500/10 border border-amber-500/30" : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-white border-white/30">
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {combat.rouge?.prenom} {combat.rouge?.nom?.charAt(0)}. 
                            <span className="text-slate-400 mx-2">vs</span>
                            {combat.bleu?.prenom} {combat.bleu?.nom?.charAt(0)}.
                          </p>
                          <p className="text-slate-400 text-xs">
                            {combat.categorie?.nom}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={combat.est_finale ? "bg-amber-500" : "bg-slate-600"}>
                          {combat.tour}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {data.combats_a_venir.length > 5 && (
                    <p className="text-center text-slate-400 text-sm pt-2">
                      + {data.combats_a_venir.length - 5} autre(s) combat(s)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
