import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { 
  Printer, 
  Download, 
  ChevronLeft,
  Trophy,
  Users,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Composant pour un combattant dans le bracket
const CombattantBox = ({ combattant, couleur, isWinner, onClick }) => {
  const bgColor = couleur === "rouge" 
    ? "bg-gradient-to-r from-red-500 to-red-600" 
    : "bg-gradient-to-r from-blue-500 to-blue-600";
  
  const borderColor = isWinner ? "ring-2 ring-yellow-400 ring-offset-2" : "";
  
  return (
    <div 
      className={`${bgColor} ${borderColor} text-white p-3 rounded-lg min-w-[180px] cursor-pointer hover:shadow-lg transition-all`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <Badge className={couleur === "rouge" ? "bg-red-700" : "bg-blue-700"}>
          {couleur.toUpperCase()}
        </Badge>
        {isWinner && <Trophy className="h-4 w-4 text-yellow-300" />}
      </div>
      {combattant ? (
        <div className="mt-2">
          <p className="font-bold text-sm leading-tight">
            {combattant.prenom} {combattant.nom}
          </p>
          <p className="text-xs opacity-80">{combattant.club}</p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm opacity-60 italic">En attente...</p>
        </div>
      )}
    </div>
  );
};

// Composant pour un match dans le bracket
const MatchBox = ({ combat, rouge, bleu, onSelectWinner, categorie }) => {
  const isTermine = combat.termine;
  
  return (
    <div className="relative">
      {/* Ligne de connexion vers la droite */}
      <div className="absolute right-0 top-1/2 w-8 h-0.5 bg-slate-300 transform translate-x-full" />
      
      <div className={`flex flex-col gap-2 p-4 rounded-xl border-2 ${
        isTermine ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"
      } shadow-sm`}>
        {/* Header du match */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {combat.tour === "quart" && "Quart de finale"}
            {combat.tour === "demi" && "Demi-finale"}
            {combat.tour === "finale" && "FINALE"}
            {combat.tour === "bronze" && "Petite finale"}
          </Badge>
          {isTermine && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
        
        {/* Combattants */}
        <CombattantBox 
          combattant={rouge} 
          couleur="rouge" 
          isWinner={isTermine && combat.vainqueur_id === rouge?.competiteur_id}
          onClick={() => !isTermine && onSelectWinner && onSelectWinner(combat, "rouge")}
        />
        
        <div className="text-center text-xs font-bold text-slate-400 py-1">VS</div>
        
        <CombattantBox 
          combattant={bleu} 
          couleur="bleu" 
          isWinner={isTermine && combat.vainqueur_id === bleu?.competiteur_id}
          onClick={() => !isTermine && onSelectWinner && onSelectWinner(combat, "bleu")}
        />
      </div>
    </div>
  );
};

export default function ArbreCombatPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(searchParams.get("categorie") || "");
  const [arbreData, setArbreData] = useState(null);
  const [competiteurs, setCompetiteurs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (competition) {
      fetchCategories();
    }
  }, [competition]);

  useEffect(() => {
    if (selectedCategorie) {
      fetchArbre();
    }
  }, [selectedCategorie]);

  const fetchCategories = async () => {
    try {
      // Récupérer les catégories qui ont des combats
      const [catRes, combatsRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/combats?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      // Filtrer pour ne garder que les catégories avec des combats
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
      
      // Créer un dictionnaire des compétiteurs
      const compDict = {};
      competiteursRes.data.forEach(c => {
        compDict[c.competiteur_id] = c;
      });
      
      setCompetiteurs(compDict);
      setArbreData(arbreRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement de l'arbre");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Utiliser la fonction print du navigateur pour générer un PDF
    window.print();
  };

  // Organiser les combats par tour - l'API retourne un objet {arbre: {quart, demi, finale, bronze}}
  const organizeByTour = useCallback(() => {
    if (!arbreData?.arbre) return { quarts: [], demis: [], finale: null, bronze: null };
    
    const arbre = arbreData.arbre;
    return {
      quarts: arbre.quart || [],
      demis: arbre.demi || [],
      finale: arbre.finale?.[0] || null,
      bronze: arbre.bronze?.[0] || null
    };
  }, [arbreData]);

  const { quarts, demis, finale, bronze } = organizeByTour();
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
        {/* Header - caché à l'impression */}
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
                Arbre des combats
              </h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} data-testid="print-arbre-btn">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </motion.div>

        {/* Sélection catégorie - caché à l'impression */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="print:hidden"
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-700">Catégorie :</label>
                <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                  <SelectTrigger className="w-80" data-testid="select-categorie-arbre">
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Titre pour impression */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-2xl font-black uppercase">{competition?.nom}</h1>
          <h2 className="text-xl font-bold mt-2">{categorieNom}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(competition?.date).toLocaleDateString('fr-FR', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </p>
        </div>

        {/* Arbre des combats */}
        {!selectedCategorie || categories.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">Aucune catégorie avec des combats générés</p>
              <Button className="mt-4" onClick={() => navigate("/gestion-combats")}>
                Générer les combats
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="overflow-x-auto"
          >
            <div className="min-w-[900px] p-6 bg-white rounded-xl border border-slate-200 print:border-0 print:p-0">
              {/* Titre de la catégorie (visible seulement sur écran) */}
              <div className="text-center mb-8 print:hidden">
                <h2 className="text-xl font-bold text-slate-900">{categorieNom}</h2>
                <p className="text-slate-500 text-sm">
                  {arbreData?.combats?.length || 0} combat(s) • 
                  {arbreData?.combats?.filter(c => c.termine).length || 0} terminé(s)
                </p>
              </div>

              {/* Bracket Structure */}
              <div className="flex items-center justify-center gap-12">
                {/* Quarts de finale */}
                {quarts.length > 0 && (
                  <div className="flex flex-col gap-8">
                    <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                      Quarts de finale
                    </h3>
                    {quarts.map(combat => (
                      <MatchBox 
                        key={combat.combat_id}
                        combat={combat}
                        rouge={competiteurs[combat.rouge_id]}
                        bleu={competiteurs[combat.bleu_id]}
                        categorie={categorieNom}
                      />
                    ))}
                  </div>
                )}

                {/* Lignes de connexion */}
                {quarts.length > 0 && demis.length > 0 && (
                  <div className="w-8 flex flex-col justify-around h-full">
                    <div className="h-0.5 bg-slate-300" />
                    <div className="h-0.5 bg-slate-300" />
                  </div>
                )}

                {/* Demi-finales */}
                {demis.length > 0 && (
                  <div className="flex flex-col gap-16">
                    <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                      Demi-finales
                    </h3>
                    {demis.map(combat => (
                      <MatchBox 
                        key={combat.combat_id}
                        combat={combat}
                        rouge={competiteurs[combat.rouge_id]}
                        bleu={competiteurs[combat.bleu_id]}
                        categorie={categorieNom}
                      />
                    ))}
                  </div>
                )}

                {/* Lignes de connexion */}
                {demis.length > 0 && finale && (
                  <div className="w-8">
                    <div className="h-0.5 bg-slate-300" />
                  </div>
                )}

                {/* Finale et Bronze */}
                {(finale || bronze) && (
                  <div className="flex flex-col gap-8">
                    <h3 className="text-center text-sm font-bold text-slate-500 uppercase">
                      Finales
                    </h3>
                    {finale && (
                      <div className="relative">
                        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500">
                          <Trophy className="h-3 w-3 mr-1" />
                          FINALE
                        </Badge>
                        <MatchBox 
                          combat={finale}
                          rouge={competiteurs[finale.rouge_id]}
                          bleu={competiteurs[finale.bleu_id]}
                          categorie={categorieNom}
                        />
                      </div>
                    )}
                    {bronze && (
                      <div className="relative">
                        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-400">
                          3ème place
                        </Badge>
                        <MatchBox 
                          combat={bronze}
                          rouge={competiteurs[bronze.rouge_id]}
                          bleu={competiteurs[bronze.bleu_id]}
                          categorie={categorieNom}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Vainqueur */}
                {finale?.termine && finale.vainqueur_id && (
                  <div className="flex flex-col items-center gap-4 ml-8">
                    <Trophy className="h-12 w-12 text-yellow-500" />
                    <div className="text-center">
                      <Badge className="bg-yellow-500 text-lg px-4 py-2">
                        CHAMPION
                      </Badge>
                      <div className="mt-3 p-4 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-lg border-2 border-yellow-400">
                        <p className="font-black text-lg text-slate-900">
                          {competiteurs[finale.vainqueur_id]?.prenom} {competiteurs[finale.vainqueur_id]?.nom}
                        </p>
                        <p className="text-sm text-slate-600">
                          {competiteurs[finale.vainqueur_id]?.club}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Bouton vers liste ordonnée */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="print:hidden"
        >
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/ordre-combats?categorie=${selectedCategorie}`)}
          >
            Voir la liste ordonnée des combats avec horaires
          </Button>
        </motion.div>
      </div>

      {/* Styles pour l'impression */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .overflow-x-auto, .overflow-x-auto * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .min-w-\\[900px\\] {
            min-width: 100% !important;
          }
        }
      `}</style>
    </Layout>
  );
}
