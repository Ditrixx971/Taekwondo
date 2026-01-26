import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ResultatsPage() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState("");
  const [combats, setCombats] = useState([]);
  const [medailles, setMedailles] = useState([]);
  const [competiteurs, setCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attribuant, setAttribuant] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategorie) {
      fetchCategorieData();
    }
  }, [selectedCategorie]);

  const fetchInitialData = async () => {
    try {
      const [catRes, compRes] = await Promise.all([
        axios.get(`${API}/categories`, { withCredentials: true }),
        axios.get(`${API}/competiteurs`, { withCredentials: true })
      ]);
      setCategories(catRes.data);
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

  const fetchCategorieData = async () => {
    try {
      const [combatsRes, medaillesRes] = await Promise.all([
        axios.get(`${API}/combats?categorie_id=${selectedCategorie}`, { withCredentials: true }),
        axios.get(`${API}/medailles?categorie_id=${selectedCategorie}`, { withCredentials: true })
      ]);
      setCombats(combatsRes.data);
      setMedailles(medaillesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleAttribuerMedailles = async () => {
    setAttribuant(true);
    try {
      const response = await axios.post(
        `${API}/combats/${selectedCategorie}/attribuer-medailles`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchCategorieData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'attribution");
    } finally {
      setAttribuant(false);
    }
  };

  const getCompetiteur = (id) => {
    return competiteurs.find(c => c.competiteur_id === id);
  };

  const getCompetiteurNom = (id) => {
    const comp = getCompetiteur(id);
    return comp ? `${comp.prenom} ${comp.nom}` : "Inconnu";
  };

  const getCategorieNom = (id) => {
    const cat = categories.find(c => c.categorie_id === id);
    return cat ? cat.nom : "Inconnu";
  };

  const finale = combats.find(c => c.tour === "finale");
  const finaleTerminee = finale?.termine;
  const medaillesAttribuees = medailles.length > 0;

  const getMedailleIcon = (type) => {
    switch (type) {
      case "or":
        return <Trophy className="h-6 w-6" />;
      case "argent":
        return <Medal className="h-6 w-6" />;
      case "bronze":
        return <Award className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const getMedailleStyle = (type) => {
    switch (type) {
      case "or":
        return "gold-bg text-white";
      case "argent":
        return "silver-bg text-white";
      case "bronze":
        return "bronze-bg text-white";
      default:
        return "bg-slate-200";
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
              Résultats & Médailles
            </h1>
            <p className="text-slate-500 mt-1">Podium et classement final</p>
          </div>
        </motion.div>

        {/* Category Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Catégorie</label>
                  <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                    <SelectTrigger data-testid="select-categorie-resultats">
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
                {isAdmin && finaleTerminee && !medaillesAttribuees && (
                  <Button
                    onClick={handleAttribuerMedailles}
                    disabled={attribuant}
                    className="font-semibold uppercase tracking-wide bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                    data-testid="attribuer-medailles-btn"
                  >
                    {attribuant ? (
                      "Attribution..."
                    ) : (
                      <>
                        <Trophy className="mr-2 h-4 w-4" />
                        Attribuer les médailles
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Podium */}
        {medaillesAttribuees && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="text-lg font-bold uppercase tracking-wide flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Podium - {getCategorieNom(selectedCategorie)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex justify-center items-end gap-4 md:gap-8">
                  {/* Argent - 2ème place */}
                  {medailles.filter(m => m.type === "argent").map((m, i) => {
                    const comp = getCompetiteur(m.competiteur_id);
                    return (
                      <motion.div
                        key={m.medaille_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-center"
                      >
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full silver-bg flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <Medal className="h-12 w-12 md:h-16 md:w-16 text-white" />
                        </div>
                        <div className="h-24 w-24 md:w-32 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t-lg flex items-center justify-center">
                          <span className="text-4xl md:text-5xl font-black text-white">2</span>
                        </div>
                        <p className="font-bold mt-3 text-slate-900">{comp?.prenom} {comp?.nom}</p>
                        <p className="text-sm text-slate-500">{comp?.club}</p>
                        <Badge className="mt-2 silver-bg">Argent</Badge>
                      </motion.div>
                    );
                  })}

                  {/* Or - 1ère place */}
                  {medailles.filter(m => m.type === "or").map((m) => {
                    const comp = getCompetiteur(m.competiteur_id);
                    return (
                      <motion.div
                        key={m.medaille_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center -mt-8"
                      >
                        <div className="w-28 h-28 md:w-40 md:h-40 rounded-full gold-bg flex items-center justify-center mx-auto mb-4 shadow-xl ring-4 ring-yellow-300">
                          <Trophy className="h-14 w-14 md:h-20 md:w-20 text-white" />
                        </div>
                        <div className="h-32 w-28 md:w-40 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg flex items-center justify-center">
                          <span className="text-5xl md:text-6xl font-black text-white">1</span>
                        </div>
                        <p className="font-bold mt-3 text-slate-900 text-lg">{comp?.prenom} {comp?.nom}</p>
                        <p className="text-sm text-slate-500">{comp?.club}</p>
                        <Badge className="mt-2 gold-bg">Or</Badge>
                      </motion.div>
                    );
                  })}

                  {/* Bronze - 3ème place */}
                  {medailles.filter(m => m.type === "bronze").slice(0, 1).map((m) => {
                    const comp = getCompetiteur(m.competiteur_id);
                    return (
                      <motion.div
                        key={m.medaille_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-center"
                      >
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bronze-bg flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <Award className="h-12 w-12 md:h-16 md:w-16 text-white" />
                        </div>
                        <div className="h-20 w-24 md:w-32 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg flex items-center justify-center">
                          <span className="text-4xl md:text-5xl font-black text-white">3</span>
                        </div>
                        <p className="font-bold mt-3 text-slate-900">{comp?.prenom} {comp?.nom}</p>
                        <p className="text-sm text-slate-500">{comp?.club}</p>
                        <Badge className="mt-2 bronze-bg">Bronze</Badge>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Additional bronze medals */}
                {medailles.filter(m => m.type === "bronze").length > 1 && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-4 text-center">Autres médailles de bronze</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                      {medailles.filter(m => m.type === "bronze").slice(1).map((m) => {
                        const comp = getCompetiteur(m.competiteur_id);
                        return (
                          <div key={m.medaille_id} className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                            <Award className="h-5 w-5 text-amber-600" />
                            <span className="font-medium">{comp?.prenom} {comp?.nom}</span>
                            <span className="text-sm text-slate-500">({comp?.club})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Combat Results Summary */}
        {combats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                  Résumé des combats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <p className="text-3xl font-black text-slate-900 score-display">
                      {combats.length}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Combats total</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-3xl font-black text-green-600 score-display">
                      {combats.filter(c => c.termine).length}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Terminés</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-3xl font-black text-blue-600 score-display">
                      {combats.filter(c => !c.termine && c.rouge_id && c.bleu_id).length}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">En attente</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-xl text-center">
                    <p className="text-3xl font-black text-yellow-600 score-display">
                      {medailles.length}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Médailles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* No data state */}
        {combats.length === 0 && (
          <Card className="border-slate-200">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-slate-500">
                <Trophy className="h-12 w-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">Aucun résultat</p>
                <p className="text-sm">Générez les combats et saisissez les résultats</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
