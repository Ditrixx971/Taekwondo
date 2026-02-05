import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { 
  Printer, 
  Download, 
  ChevronLeft,
  Clock,
  Users,
  GripVertical,
  TreeDeciduous
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function OrdreCombatsPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState(searchParams.get("categorie") || "all");
  const [combats, setCombats] = useState([]);
  const [competiteurs, setCompetiteurs] = useState({});
  const [categoriesMap, setCategoriesMap] = useState({});
  const [aires, setAires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heureDebut, setHeureDebut] = useState(competition?.heure_debut || "09:00");
  const [dureeCombat, setDureeCombat] = useState(6); // minutes par combat

  useEffect(() => {
    if (competition) {
      fetchData();
    }
  }, [competition]);

  const fetchData = async () => {
    try {
      const [catRes, combatsRes, competiteursRes, airesRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/combats?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/competiteurs?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/aires-combat?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      // Catégories avec combats
      const catsWithCombats = catRes.data.filter(cat => 
        combatsRes.data.some(c => c.categorie_id === cat.categorie_id)
      );
      setCategories(catsWithCombats);
      
      // Map des catégories
      const catMap = {};
      catRes.data.forEach(c => catMap[c.categorie_id] = c);
      setCategoriesMap(catMap);
      
      // Map des compétiteurs
      const compMap = {};
      competiteursRes.data.forEach(c => compMap[c.competiteur_id] = c);
      setCompetiteurs(compMap);
      
      // Trier les combats par ordre puis par tour
      const tourOrdre = { quart: 1, demi: 2, bronze: 3, finale: 4 };
      const sortedCombats = combatsRes.data.sort((a, b) => {
        if (a.ordre !== b.ordre) return a.ordre - b.ordre;
        return tourOrdre[a.tour] - tourOrdre[b.tour];
      });
      
      setCombats(sortedCombats);
      setAires(airesRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  // Calculer l'heure approximative de chaque combat
  const calculateHeures = () => {
    const filteredCombats = selectedCategorie === "all" 
      ? combats.filter(c => !c.termine)
      : combats.filter(c => c.categorie_id === selectedCategorie && !c.termine);
    
    // Grouper par aire
    const combatsByAire = {};
    aires.forEach(a => combatsByAire[a.aire_id] = []);
    
    filteredCombats.forEach(combat => {
      if (combat.aire_id && combatsByAire[combat.aire_id]) {
        combatsByAire[combat.aire_id].push(combat);
      }
    });
    
    // Calculer les heures
    const combatsWithHeure = [];
    const startTime = new Date(`2026-01-01T${heureDebut}:00`);
    
    Object.keys(combatsByAire).forEach(aireId => {
      const aireCombats = combatsByAire[aireId];
      aireCombats.forEach((combat, index) => {
        const combatTime = new Date(startTime.getTime() + index * dureeCombat * 60000);
        combatsWithHeure.push({
          ...combat,
          heureApprox: combatTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          aireNom: aires.find(a => a.aire_id === aireId)?.nom || `Aire ${index + 1}`
        });
      });
    });
    
    // Trier par heure puis par ordre
    return combatsWithHeure.sort((a, b) => {
      if (a.heureApprox !== b.heureApprox) return a.heureApprox.localeCompare(b.heureApprox);
      return a.ordre - b.ordre;
    });
  };

  const combatsAvecHeure = calculateHeures();
  
  // Tous les combats pour affichage simple (sans calcul d'heure)
  const allCombatsFiltered = selectedCategorie === "all"
    ? combats
    : combats.filter(c => c.categorie_id === selectedCategorie);

  const handlePrint = () => {
    window.print();
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
                Ordre des combats
              </h1>
              <p className="text-slate-500 mt-1">Liste imprimable avec horaires</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/arbre-combat?categorie=${selectedCategorie}`)}>
              <TreeDeciduous className="mr-2 h-4 w-4" />
              Voir l'arbre
            </Button>
            <Button variant="outline" onClick={handlePrint} data-testid="print-ordre-btn">
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </motion.div>

        {/* Filtres - caché à l'impression */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="print:hidden"
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Catégorie :</label>
                  <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.categorie_id} value={cat.categorie_id}>
                          {cat.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <label className="text-sm font-medium text-slate-700">Début :</label>
                  <Input
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className="w-28"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Durée/combat :</label>
                  <Input
                    type="number"
                    min="3"
                    max="15"
                    value={dureeCombat}
                    onChange={(e) => setDureeCombat(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-slate-500">min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Titre pour impression */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black uppercase">{competition?.nom}</h1>
          <h2 className="text-lg font-bold mt-1">
            {selectedCategorie === "all" 
              ? "Ordre des combats - Toutes catégories" 
              : `Ordre des combats - ${categoriesMap[selectedCategorie]?.nom}`
            }
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(competition?.date).toLocaleDateString('fr-FR', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })} • Début : {heureDebut}
          </p>
        </div>

        {/* Table des combats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-slate-200 print:border-0 print:shadow-none">
            <CardContent className="p-0">
              {allCombatsFiltered.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-500">Aucun combat généré</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 print:bg-white">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead className="w-20 text-center">Heure</TableHead>
                        <TableHead className="w-24">Aire</TableHead>
                        <TableHead className="w-16">Tour</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-red-600">Rouge</TableHead>
                        <TableHead className="text-center w-12">VS</TableHead>
                        <TableHead className="text-blue-600">Bleu</TableHead>
                        <TableHead className="w-20 text-center print:hidden">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allCombatsFiltered.map((combat, index) => {
                        const rouge = competiteurs[combat.rouge_id];
                        const bleu = competiteurs[combat.bleu_id];
                        const categorie = categoriesMap[combat.categorie_id];
                        const aireNom = aires.find(a => a.aire_id === combat.aire_id)?.nom || "-";
                        
                        // Calcul heure approximative
                        const startTime = new Date(`2026-01-01T${heureDebut}:00`);
                        const combatTime = new Date(startTime.getTime() + index * dureeCombat * 60000);
                        const heureApprox = combatTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        
                        const isFinale = combat.tour === "finale" || combat.tour === "bronze";
                        
                        return (
                          <TableRow 
                            key={combat.combat_id}
                            className={`
                              ${combat.termine ? "bg-green-50" : ""}
                              ${isFinale ? "bg-amber-50 print:bg-amber-50" : ""}
                            `}
                          >
                            <TableCell className="text-center font-mono text-sm">
                              {index + 1}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold">
                              {heureApprox}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {aireNom}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  isFinale ? "bg-amber-500" :
                                  combat.tour === "demi" ? "bg-blue-500" :
                                  "bg-slate-500"
                                }
                              >
                                {getTourLabel(combat.tour)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {categorie?.nom}
                            </TableCell>
                            <TableCell>
                              <div className={`p-2 rounded ${combat.vainqueur_id === combat.rouge_id ? "bg-red-100 ring-2 ring-red-400" : ""}`}>
                                {rouge ? (
                                  <>
                                    <span className="font-bold">{rouge.prenom} {rouge.nom}</span>
                                    <span className="text-xs text-slate-500 block">{rouge.club}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">En attente</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-400">
                              VS
                            </TableCell>
                            <TableCell>
                              <div className={`p-2 rounded ${combat.vainqueur_id === combat.bleu_id ? "bg-blue-100 ring-2 ring-blue-400" : ""}`}>
                                {bleu ? (
                                  <>
                                    <span className="font-bold">{bleu.prenom} {bleu.nom}</span>
                                    <span className="text-xs text-slate-500 block">{bleu.club}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">En attente</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center print:hidden">
                              {combat.termine ? (
                                <Badge className="bg-green-500">Terminé</Badge>
                              ) : combat.statut === "en_cours" ? (
                                <Badge className="bg-blue-500">En cours</Badge>
                              ) : (
                                <Badge variant="outline">À venir</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Légende pour impression */}
        <div className="hidden print:flex justify-center gap-8 mt-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-200 rounded"></span> Finale / Bronze
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-200 rounded"></span> Vainqueur Rouge
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-200 rounded"></span> Vainqueur Bleu
          </span>
        </div>

        {/* Footer impression */}
        <div className="hidden print:block text-center mt-8 text-xs text-slate-400">
          Imprimé le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Styles pour l'impression */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body {
            font-size: 10pt;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:flex {
            display: flex !important;
          }
          table {
            font-size: 9pt;
          }
          th, td {
            padding: 4px 8px !important;
          }
        }
      `}</style>
    </Layout>
  );
}
