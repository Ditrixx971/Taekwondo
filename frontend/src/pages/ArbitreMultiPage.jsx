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
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  Trophy,
  User,
  CheckCircle2,
  Clock,
  Swords,
  AlertCircle,
  ChevronRight,
  Pause,
  XCircle,
  RefreshCw,
  Columns,
  AlertTriangle,
  Minus,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Composant pour un round individuel
function RoundScoring({ 
  roundNumber, 
  scoreRouge, 
  scoreBleu, 
  onScoreChange, 
  penaliteRouge, 
  penaliteBleu,
  onPenaliteChange,
  disabled 
}) {
  const gagnantRouge = scoreRouge > scoreBleu || penaliteBleu;
  const gagnantBleu = scoreBleu > scoreRouge || penaliteRouge;
  
  return (
    <div className="border rounded-lg p-2 bg-white">
      <div className="text-center text-xs font-bold text-slate-500 mb-2">
        Round {roundNumber}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* Rouge */}
        <div className={`text-center p-2 rounded-lg transition-all ${
          gagnantRouge ? 'bg-red-200 ring-2 ring-red-500 shadow-md' : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 hover:bg-red-200"
              onClick={() => onScoreChange('rouge', Math.max(0, scoreRouge - 1))}
              disabled={disabled}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min="0"
              max="99"
              value={scoreRouge}
              onChange={(e) => onScoreChange('rouge', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 h-8 text-center font-bold text-lg p-0 border-red-300"
              disabled={disabled}
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 hover:bg-red-200"
              onClick={() => onScoreChange('rouge', scoreRouge + 1)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center justify-center gap-1 text-xs cursor-pointer">
            <Checkbox 
              checked={penaliteRouge} 
              onCheckedChange={(checked) => onPenaliteChange('rouge', checked)}
              disabled={disabled}
              className="h-3 w-3"
            />
            <span className="text-red-600">Pénalité</span>
          </label>
          {gagnantRouge && (
            <div className="text-xs font-bold text-red-600 mt-1">
              {penaliteBleu ? '⚠ Bleu pénalisé' : '✓ Round'}
            </div>
          )}
        </div>
        
        {/* Bleu */}
        <div className={`text-center p-2 rounded-lg transition-all ${
          gagnantBleu ? 'bg-blue-200 ring-2 ring-blue-500 shadow-md' : 'bg-blue-50'
        }`}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 hover:bg-blue-200"
              onClick={() => onScoreChange('bleu', Math.max(0, scoreBleu - 1))}
              disabled={disabled}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min="0"
              max="99"
              value={scoreBleu}
              onChange={(e) => onScoreChange('bleu', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 h-8 text-center font-bold text-lg p-0 border-blue-300"
              disabled={disabled}
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 hover:bg-blue-200"
              onClick={() => onScoreChange('bleu', scoreBleu + 1)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center justify-center gap-1 text-xs cursor-pointer">
            <Checkbox 
              checked={penaliteBleu} 
              onCheckedChange={(checked) => onPenaliteChange('bleu', checked)}
              disabled={disabled}
              className="h-3 w-3"
            />
            <span className="text-blue-600">Pénalité</span>
          </label>
          {gagnantBleu && (
            <div className="text-xs font-bold text-blue-600 mt-1">
              {penaliteRouge ? '⚠ Rouge pénalisé' : '✓ Round'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant pour une aire de combat compacte
function AireCard({ aire, data, onLancer, onResultat, onRefresh }) {
  const [rounds, setRounds] = useState([
    { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false },
    { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false },
    { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const combatEnCours = data?.combat_en_cours;
  const prochainCombat = data?.combats_a_venir?.[0];

  // Reset rounds when combat changes
  useEffect(() => {
    if (combatEnCours) {
      setRounds([
        { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false },
        { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false },
        { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false }
      ]);
    }
  }, [combatEnCours?.combat_id]);

  const handleScoreChange = (roundIndex, couleur, value) => {
    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[roundIndex] = { ...newRounds[roundIndex], [couleur]: value };
      return newRounds;
    });
  };

  const handlePenaliteChange = (roundIndex, couleur, checked) => {
    const field = couleur === 'rouge' ? 'penaliteRouge' : 'penaliteBleu';
    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[roundIndex] = { ...newRounds[roundIndex], [field]: checked };
      return newRounds;
    });
  };

  // Calculer le vainqueur basé sur les rounds
  const calculateWinner = () => {
    let roundsRouge = 0;
    let roundsBleu = 0;
    let totalRouge = 0;
    let totalBleu = 0;

    rounds.forEach(round => {
      totalRouge += round.rouge;
      totalBleu += round.bleu;
      
      // Déterminer le gagnant du round
      if (round.penaliteRouge) {
        roundsBleu++;
      } else if (round.penaliteBleu) {
        roundsRouge++;
      } else if (round.rouge > round.bleu) {
        roundsRouge++;
      } else if (round.bleu > round.rouge) {
        roundsBleu++;
      }
    });

    return { roundsRouge, roundsBleu, totalRouge, totalBleu };
  };

  const { roundsRouge, roundsBleu, totalRouge, totalBleu } = calculateWinner();

  const handleResultat = async (vainqueur) => {
    if (!combatEnCours) return;
    setSubmitting(true);
    try {
      // Déterminer le type de victoire
      const hasPenalite = rounds.some(r => r.penaliteRouge || r.penaliteBleu);
      const typeVictoire = hasPenalite ? "penalite" : "normal";
      
      await onResultat(combatEnCours.combat_id, vainqueur, { rouge: totalRouge, bleu: totalBleu }, typeVictoire);
      setRounds([
        { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false },
        { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false },
        { rouge: 0, bleu: 0, penaliteRouge: false, penaliteBleu: false }
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatutBadge = () => {
    if (aire.statut === "pause") return <Badge className="bg-amber-500">Pause</Badge>;
    if (aire.statut === "hs") return <Badge className="bg-red-500">HS</Badge>;
    return <Badge className="bg-green-500">Active</Badge>;
  };

  return (
    <Card className={`flex-1 min-w-[400px] border-2 ${
      combatEnCours ? "border-blue-500" : "border-slate-200"
    }`}>
      {/* Header de l'aire */}
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {aire.nom}
            {getStatutBadge()}
          </CardTitle>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-white hover:bg-white/10"
            onClick={() => onRefresh(aire.aire_id)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {data && (
          <div className="flex gap-4 text-sm text-slate-300 mt-1">
            <span>{data.combats_a_venir?.length || 0} à venir</span>
            <span>{data.finales_restantes || 0} finale(s)</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Combat en cours */}
        {combatEnCours ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Swords className="h-4 w-4 text-blue-500" />
              <span className="font-bold text-blue-700 uppercase">Combat en cours</span>
              <Badge variant="outline">{combatEnCours.tour}</Badge>
            </div>
            
            {/* Catégorie en évidence */}
            <div className="text-center">
              <Badge className="bg-slate-700 text-white">
                {combatEnCours.categorie?.nom}
              </Badge>
            </div>

            {/* Combattants avec noms complets */}
            <div className="grid grid-cols-2 gap-3">
              {/* Rouge */}
              <div className={`border-2 rounded-lg p-3 text-center transition-all ${
                roundsRouge > roundsBleu ? 'bg-red-100 border-red-500 ring-2 ring-red-300' : 'bg-red-50 border-red-200'
              }`}>
                <Badge className="bg-red-500 mb-2">ROUGE</Badge>
                <p className="font-bold text-red-700 text-base">
                  {combatEnCours.rouge?.prenom}
                </p>
                <p className="font-bold text-red-700 text-base">
                  {combatEnCours.rouge?.nom}
                </p>
                <p className="text-xs text-red-500 mt-1">{combatEnCours.rouge?.club}</p>
                
                {/* Score total rounds */}
                <div className="mt-2 pt-2 border-t border-red-200">
                  <p className="text-xs text-slate-500">Rounds gagnés</p>
                  <p className="text-2xl font-black text-red-600">{roundsRouge}</p>
                  <p className="text-xs text-slate-500">Points: {totalRouge}</p>
                </div>
              </div>

              {/* Bleu */}
              <div className={`border-2 rounded-lg p-3 text-center transition-all ${
                roundsBleu > roundsRouge ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300' : 'bg-blue-50 border-blue-200'
              }`}>
                <Badge className="bg-blue-500 mb-2">BLEU</Badge>
                <p className="font-bold text-blue-700 text-base">
                  {combatEnCours.bleu?.prenom}
                </p>
                <p className="font-bold text-blue-700 text-base">
                  {combatEnCours.bleu?.nom}
                </p>
                <p className="text-xs text-blue-500 mt-1">{combatEnCours.bleu?.club}</p>
                
                {/* Score total rounds */}
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs text-slate-500">Rounds gagnés</p>
                  <p className="text-2xl font-black text-blue-600">{roundsBleu}</p>
                  <p className="text-xs text-slate-500">Points: {totalBleu}</p>
                </div>
              </div>
            </div>

            {/* 3 Rounds de scoring */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-center text-slate-600 uppercase">Scoring par Round</p>
              <div className="grid grid-cols-3 gap-2">
                {rounds.map((round, index) => (
                  <RoundScoring
                    key={index}
                    roundNumber={index + 1}
                    scoreRouge={round.rouge}
                    scoreBleu={round.bleu}
                    penaliteRouge={round.penaliteRouge}
                    penaliteBleu={round.penaliteBleu}
                    onScoreChange={(couleur, value) => handleScoreChange(index, couleur, value)}
                    onPenaliteChange={(couleur, checked) => handlePenaliteChange(index, couleur, checked)}
                    disabled={submitting}
                  />
                ))}
              </div>
            </div>

            {/* Boutons de victoire */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button 
                className="bg-red-500 hover:bg-red-600"
                onClick={() => handleResultat("rouge")}
                disabled={submitting}
              >
                <Trophy className="h-4 w-4 mr-1" />
                ROUGE GAGNE
              </Button>
              <Button 
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() => handleResultat("bleu")}
                disabled={submitting}
              >
                <Trophy className="h-4 w-4 mr-1" />
                BLEU GAGNE
              </Button>
            </div>
          </div>
        ) : prochainCombat ? (
          /* Prochain combat */
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-600">Prochain combat</span>
              <Badge variant="outline">{prochainCombat.tour}</Badge>
            </div>

            {/* Catégorie */}
            <div className="text-center">
              <Badge className="bg-slate-600 text-white">
                {prochainCombat.categorie?.nom}
              </Badge>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4">
              <div className="text-center flex-1">
                <p className="font-bold text-red-600">
                  {prochainCombat.rouge?.prenom}
                </p>
                <p className="font-bold text-red-600">
                  {prochainCombat.rouge?.nom}
                </p>
                <p className="text-xs text-slate-500 mt-1">{prochainCombat.rouge?.club}</p>
              </div>
              <span className="font-black text-2xl text-slate-300 px-4">VS</span>
              <div className="text-center flex-1">
                <p className="font-bold text-blue-600">
                  {prochainCombat.bleu?.prenom}
                </p>
                <p className="font-bold text-blue-600">
                  {prochainCombat.bleu?.nom}
                </p>
                <p className="text-xs text-slate-500 mt-1">{prochainCombat.bleu?.club}</p>
              </div>
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => onLancer(prochainCombat.combat_id)}
            >
              <Play className="h-4 w-4 mr-2" />
              Lancer le combat
            </Button>
          </div>
        ) : (
          /* Aucun combat */
          <div className="text-center py-8 text-slate-500">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p className="font-medium">Tous les combats terminés</p>
            <p className="text-sm">sur cette aire</p>
          </div>
        )}

        {/* Liste des combats à venir */}
        {data?.combats_a_venir?.length > 1 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Combats suivants ({data.combats_a_venir.length - 1})
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.combats_a_venir.slice(1, 5).map((combat, i) => (
                <div 
                  key={combat.combat_id}
                  className="bg-slate-50 rounded-lg p-2 text-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs flex-shrink-0">{combat.tour}</Badge>
                    <Badge className="bg-slate-600 text-white text-xs flex-shrink-0">
                      {combat.categorie?.nom || "Catégorie"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-medium truncate flex-1">
                      {combat.rouge?.prenom} {combat.rouge?.nom}
                    </span>
                    <span className="text-slate-400 flex-shrink-0">vs</span>
                    <span className="text-blue-600 font-medium truncate flex-1 text-right">
                      {combat.bleu?.prenom} {combat.bleu?.nom}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ArbitreMultiPage() {
  const navigate = useNavigate();
  const { competition } = useCompetition();
  
  const [aires, setAires] = useState([]);
  const [selectedAires, setSelectedAires] = useState([]);
  const [dataByAire, setDataByAire] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (competition) {
      fetchAires();
    }
  }, [competition]);

  useEffect(() => {
    if (selectedAires.length > 0) {
      fetchAllData();
      // Rafraîchir toutes les 5 secondes
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
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

  const fetchAllData = async () => {
    try {
      const results = {};
      await Promise.all(
        selectedAires.map(async (aireId) => {
          try {
            const response = await axios.get(
              `${API}/arbitre/aire/${aireId}`,
              { withCredentials: true }
            );
            results[aireId] = response.data;
          } catch (error) {
            console.error(`Erreur pour aire ${aireId}:`, error);
          }
        })
      );
      setDataByAire(results);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  };

  const fetchAireData = async (aireId) => {
    try {
      const response = await axios.get(
        `${API}/arbitre/aire/${aireId}`,
        { withCredentials: true }
      );
      setDataByAire(prev => ({
        ...prev,
        [aireId]: response.data
      }));
    } catch (error) {
      toast.error("Erreur lors du rafraîchissement");
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

  const lancerCombat = async (combatId) => {
    try {
      await axios.post(`${API}/arbitre/lancer/${combatId}`, {}, { withCredentials: true });
      toast.success("Combat lancé !");
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const saisirResultat = async (combatId, vainqueur, scores, typeVictoire = "normal") => {
    try {
      await axios.post(
        `${API}/arbitre/resultat/${combatId}`,
        null,
        { 
          params: {
            vainqueur,
            score_rouge: scores.rouge,
            score_bleu: scores.bleu,
            type_victoire: typeVictoire
          },
          withCredentials: true 
        }
      );
      toast.success("Résultat enregistré !");
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
      throw error;
    }
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

  // Calculer les stats globales
  const totalCombatsEnCours = Object.values(dataByAire).filter(d => d?.combat_en_cours).length;
  const totalCombatsAVenir = Object.values(dataByAire).reduce((sum, d) => sum + (d?.combats_a_venir?.length || 0), 0);
  const totalFinales = Object.values(dataByAire).reduce((sum, d) => sum + (d?.finales_restantes || 0), 0);

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/aires-combat")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                Arbitrage Multi-Aires
              </h1>
              <p className="text-slate-500 mt-1">
                {selectedAires.length} aire(s) affichée(s) • Vue consolidée
              </p>
            </div>
          </div>
          
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser tout
          </Button>
        </motion.div>

        {/* Sélection des aires */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-6">
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

                {/* Stats rapides */}
                <div className="flex gap-6 ml-auto text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{totalCombatsEnCours}</p>
                    <p className="text-xs text-slate-500">En cours</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-600">{totalCombatsAVenir}</p>
                    <p className="text-xs text-slate-500">À venir</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{totalFinales}</p>
                    <p className="text-xs text-slate-500">Finales</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Grille des aires */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-4"
        >
          {selectedAires.map(aireId => {
            const aire = aires.find(a => a.aire_id === aireId);
            if (!aire) return null;
            return (
              <AireCard
                key={aireId}
                aire={aire}
                data={dataByAire[aireId]}
                onLancer={lancerCombat}
                onResultat={saisirResultat}
                onRefresh={fetchAireData}
              />
            );
          })}
        </motion.div>

        {/* Lien vers vue individuelle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 mb-2">
                <strong>Conseil :</strong> Pour une vue plein écran dédiée à une seule aire (idéale pour l&apos;arbitre), 
                accédez à la page individuelle depuis &quot;Aires de combat&quot;.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/aires-combat")}>
                <Columns className="h-4 w-4 mr-2" />
                Voir les aires individuelles
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
