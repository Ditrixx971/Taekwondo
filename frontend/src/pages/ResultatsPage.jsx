import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "../components/ui/collapsible";
import { 
  Trophy, 
  Medal, 
  Award, 
  Printer,
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Composant Podium pour une catégorie
const PodiumCategorie = ({ categorie, medailles, competiteurs, isOpen, onToggle, onAttribuerMedailles, isAdmin }) => {
  const getCompetiteur = (id) => competiteurs.find(c => c.competiteur_id === id);
  
  const or = medailles.find(m => m.type === "or");
  const argent = medailles.find(m => m.type === "argent");
  const bronzes = medailles.filter(m => m.type === "bronze");
  
  const orComp = or ? getCompetiteur(or.competiteur_id) : null;
  const argentComp = argent ? getCompetiteur(argent.competiteur_id) : null;
  const bronzeComps = bronzes.map(b => getCompetiteur(b.competiteur_id)).filter(Boolean);

  const hasMedailles = medailles.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={`border-2 ${hasMedailles ? "border-yellow-200" : "border-slate-200"}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className={`cursor-pointer hover:bg-slate-50 transition-colors ${
            hasMedailles ? "bg-gradient-to-r from-yellow-50 to-amber-50" : ""
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasMedailles && <Trophy className="h-5 w-5 text-yellow-500" />}
                <CardTitle className="text-base font-bold">
                  {categorie.nom}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {categorie.nb_competiteurs || 0} compétiteurs
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {hasMedailles ? (
                  <Badge className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Terminé
                  </Badge>
                ) : isAdmin && categorie.finale_terminee ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttribuerMedailles(categorie.categorie_id);
                    }}
                  >
                    Attribuer médailles
                  </Button>
                ) : (
                  <Badge variant="outline">En cours</Badge>
                )}
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6">
            {hasMedailles ? (
              <div className="flex justify-center items-end gap-6 py-6">
                {/* 2ème - Argent */}
                {argentComp && (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Medal className="h-10 w-10 text-white" />
                    </div>
                    <div className="h-16 w-20 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-lg flex items-center justify-center">
                      <span className="text-3xl font-black text-white">2</span>
                    </div>
                    <p className="font-bold mt-2 text-sm">{argentComp.prenom} {argentComp.nom}</p>
                    <p className="text-xs text-slate-500">{argentComp.club}</p>
                  </div>
                )}

                {/* 1er - Or */}
                {orComp && (
                  <div className="text-center -mt-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-3 shadow-xl ring-4 ring-yellow-300">
                      <Trophy className="h-12 w-12 text-white" />
                    </div>
                    <div className="h-20 w-24 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg flex items-center justify-center">
                      <span className="text-4xl font-black text-white">1</span>
                    </div>
                    <p className="font-bold mt-2">{orComp.prenom} {orComp.nom}</p>
                    <p className="text-xs text-slate-500">{orComp.club}</p>
                  </div>
                )}

                {/* 3ème - Bronze */}
                {bronzeComps.length > 0 && (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Award className="h-10 w-10 text-white" />
                    </div>
                    <div className="h-14 w-20 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-lg flex items-center justify-center">
                      <span className="text-3xl font-black text-white">3</span>
                    </div>
                    <p className="font-bold mt-2 text-sm">{bronzeComps[0].prenom} {bronzeComps[0].nom}</p>
                    <p className="text-xs text-slate-500">{bronzeComps[0].club}</p>
                    {bronzeComps.length > 1 && (
                      <p className="text-xs text-amber-600 mt-1">
                        + {bronzeComps[1].prenom} {bronzeComps[1].nom}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Pas encore de médailles attribuées</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default function ResultatsPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const [categories, setCategories] = useState([]);
  const [medaillesParCategorie, setMedaillesParCategorie] = useState({});
  const [competiteurs, setCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState({});
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    if (competition) {
      fetchData();
    }
  }, [competition]);

  const fetchData = async () => {
    try {
      const [catRes, compRes, medRes, combatsRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/competiteurs?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/medailles?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/combats?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      // Compter les compétiteurs par catégorie et vérifier si finale terminée
      const catsWithInfo = catRes.data.map(cat => {
        const catCompetiteurs = compRes.data.filter(c => c.categorie_id === cat.categorie_id);
        const catCombats = combatsRes.data.filter(c => c.categorie_id === cat.categorie_id);
        const finale = catCombats.find(c => c.tour === "finale");
        return {
          ...cat,
          nb_competiteurs: catCompetiteurs.length,
          finale_terminee: finale?.termine || false
        };
      });
      
      // Trier par âge puis par poids (du plus petit au plus grand)
      const sortedCats = catsWithInfo
        .filter(c => c.nb_competiteurs >= 2)
        .sort((a, b) => {
          if (a.age_min !== b.age_min) return a.age_min - b.age_min;
          if (a.sexe !== b.sexe) return a.sexe.localeCompare(b.sexe);
          return a.poids_min - b.poids_min;
        });
      
      setCategories(sortedCats);
      setCompetiteurs(compRes.data);
      
      // Grouper les médailles par catégorie
      const medParCat = {};
      medRes.data.forEach(m => {
        if (!medParCat[m.categorie_id]) medParCat[m.categorie_id] = [];
        medParCat[m.categorie_id].push(m);
      });
      setMedaillesParCategorie(medParCat);
      
      // Ouvrir automatiquement les catégories avec médailles
      const openState = {};
      sortedCats.forEach(cat => {
        openState[cat.categorie_id] = medParCat[cat.categorie_id]?.length > 0;
      });
      setOpenCategories(openState);
      
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleAttribuerMedailles = async (categorieId) => {
    try {
      const response = await axios.post(
        `${API}/combats/${categorieId}/attribuer-medailles`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'attribution");
    }
  };

  const toggleCategorie = (categorieId) => {
    setOpenCategories(prev => ({
      ...prev,
      [categorieId]: !prev[categorieId]
    }));
  };

  const toggleAll = () => {
    const newState = !showAll;
    setShowAll(newState);
    const openState = {};
    categories.forEach(cat => {
      openState[cat.categorie_id] = newState;
    });
    setOpenCategories(openState);
  };

  const handlePrint = () => {
    window.print();
  };

  // Stats globales
  const totalMedailles = Object.values(medaillesParCategorie).flat().length;
  const categoriesTerminees = categories.filter(c => medaillesParCategorie[c.categorie_id]?.length > 0).length;

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
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
              Résultats & Podiums
            </h1>
            <p className="text-slate-500 mt-1">Vue d'ensemble des médailles</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleAll}>
              {showAll ? "Tout réduire" : "Tout déplier"}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </motion.div>

        {/* Stats globales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="print:hidden"
        >
          <Card className="border-slate-200 bg-gradient-to-r from-yellow-50 via-slate-50 to-amber-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-4xl font-black text-yellow-600">{categoriesTerminees}</p>
                  <p className="text-sm text-slate-500">Catégories terminées</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-slate-700">{categories.length}</p>
                  <p className="text-sm text-slate-500">Catégories totales</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-amber-600">{totalMedailles}</p>
                  <p className="text-sm text-slate-500">Médailles attribuées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Titre impression */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black uppercase">{competition?.nom}</h1>
          <h2 className="text-lg font-bold mt-1">Résultats et Podiums</h2>
          <p className="text-sm text-slate-500">
            {new Date(competition?.date).toLocaleDateString('fr-FR', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </p>
        </div>

        {/* Liste des catégories avec podiums */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {categories.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Aucune catégorie avec des compétiteurs</p>
              </CardContent>
            </Card>
          ) : (
            categories.map((categorie, index) => (
              <motion.div
                key={categorie.categorie_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.03 }}
              >
                <PodiumCategorie
                  categorie={categorie}
                  medailles={medaillesParCategorie[categorie.categorie_id] || []}
                  competiteurs={competiteurs}
                  isOpen={openCategories[categorie.categorie_id]}
                  onToggle={() => toggleCategorie(categorie.categorie_id)}
                  onAttribuerMedailles={handleAttribuerMedailles}
                  isAdmin={isAdmin}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* Styles impression */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          [data-state="closed"] > [data-radix-collapsible-content] {
            display: block !important;
            height: auto !important;
          }
        }
      `}</style>
    </Layout>
  );
}
