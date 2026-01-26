import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { 
  Download, 
  Printer, 
  Trophy,
  ChevronRight,
  RefreshCw,
  Users
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ArbreCombatsPage() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [selectedCategorie, setSelectedCategorie] = useState("");
  const [arbreData, setArbreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const arbreRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategorie) {
      fetchArbre();
    }
  }, [selectedCategorie]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, { withCredentials: true });
      setCategories(response.data);
      if (response.data.length > 0) {
        setSelectedCategorie(response.data[0].categorie_id);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des catégories");
    } finally {
      setLoading(false);
    }
  };

  const fetchArbre = async () => {
    try {
      const response = await axios.get(`${API}/combats/arbre/${selectedCategorie}`, { withCredentials: true });
      setArbreData(response.data);
    } catch (error) {
      console.error("Error fetching arbre:", error);
    }
  };

  const handleExportPDF = () => {
    if (!arbreRef.current) return;
    
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    const categorie = arbreData?.categorie;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Arbre des combats - ${categorie?.nom || 'Catégorie'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Chivo:wght@400;700&family=Manrope:wght@400;500;600&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Manrope', sans-serif; 
            padding: 20px;
            background: white;
          }
          h1 { 
            font-family: 'Chivo', sans-serif; 
            font-size: 24px; 
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          .meta { color: #64748b; font-size: 14px; }
          .bracket { display: flex; gap: 40px; justify-content: center; flex-wrap: wrap; }
          .round { min-width: 200px; }
          .round-title { 
            font-weight: bold; 
            text-transform: uppercase; 
            font-size: 12px;
            color: #64748b;
            margin-bottom: 15px;
            text-align: center;
          }
          .match { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 12px;
            margin-bottom: 10px;
          }
          .match-header {
            font-size: 10px;
            color: #94a3b8;
            margin-bottom: 8px;
          }
          .fighter { 
            display: flex; 
            align-items: center; 
            gap: 8px;
            padding: 6px 0;
          }
          .fighter.rouge { border-left: 3px solid #ef4444; padding-left: 8px; }
          .fighter.bleu { border-left: 3px solid #3b82f6; padding-left: 8px; }
          .fighter.winner { background: #f0fdf4; font-weight: bold; }
          .score { 
            font-family: 'JetBrains Mono', monospace;
            font-size: 18px;
            font-weight: bold;
          }
          .vs { 
            text-align: center; 
            color: #cbd5e1; 
            font-size: 10px;
            margin: 4px 0;
          }
          .result { 
            font-size: 11px; 
            color: #64748b; 
            text-align: center;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #e2e8f0;
          }
          @media print {
            body { padding: 10px; }
            .bracket { gap: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🥋 Arbre des Combats</h1>
          <p class="meta">${categorie?.nom || 'Catégorie'}</p>
          <p class="meta">${arbreData?.combats_termines || 0}/${arbreData?.total_combats || 0} combats terminés</p>
        </div>
        
        <div class="bracket">
          ${renderRoundHTML(arbreData?.arbre?.quart, "Quarts de finale")}
          ${renderRoundHTML(arbreData?.arbre?.demi, "Demi-finales")}
          ${renderRoundHTML(arbreData?.arbre?.bronze, "Match Bronze")}
          ${renderRoundHTML(arbreData?.arbre?.finale, "Finale")}
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const renderRoundHTML = (combats, title) => {
    if (!combats || combats.length === 0) return '';
    
    return `
      <div class="round">
        <div class="round-title">${title}</div>
        ${combats.map(c => `
          <div class="match">
            <div class="match-header">Combat #${c.position} ${c.heure_debut ? `• ${c.heure_debut}` : ''}</div>
            <div class="fighter rouge ${c.vainqueur_id === c.rouge_id ? 'winner' : ''}">
              <span>${c.rouge?.nom || 'À déterminer'}</span>
              ${c.termine ? `<span class="score">${c.score_rouge}</span>` : ''}
            </div>
            <div class="vs">VS</div>
            <div class="fighter bleu ${c.vainqueur_id === c.bleu_id ? 'winner' : ''}">
              <span>${c.bleu?.nom || 'À déterminer'}</span>
              ${c.termine ? `<span class="score">${c.score_bleu}</span>` : ''}
            </div>
            ${c.termine && c.type_victoire && c.type_victoire !== 'normal' ? `
              <div class="result">Victoire par ${c.type_victoire}</div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  const getTourLabel = (tour) => {
    const labels = {
      quart: "Quarts de finale",
      demi: "Demi-finales",
      bronze: "Match Bronze",
      finale: "Finale"
    };
    return labels[tour] || tour;
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
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Arbre des Combats
            </h1>
            <p className="text-slate-500 mt-1">Visualisation et export PDF</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchArbre} data-testid="refresh-arbre">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button onClick={handleExportPDF} data-testid="export-pdf-btn">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </motion.div>

        {/* Sélecteur de catégorie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <Select value={selectedCategorie} onValueChange={setSelectedCategorie}>
                    <SelectTrigger data-testid="select-categorie-arbre">
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
                {arbreData && (
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {arbreData.total_combats} combats
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {arbreData.combats_termines} terminés
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Arbre des combats */}
        {arbreData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            ref={arbreRef}
          >
            <Card className="border-slate-200 overflow-x-auto">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {arbreData.categorie?.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-8 min-w-max">
                  {/* Quarts */}
                  {arbreData.arbre.quart.length > 0 && (
                    <RoundColumn 
                      title="Quarts de finale" 
                      combats={arbreData.arbre.quart}
                      color="slate"
                    />
                  )}
                  
                  {/* Demi */}
                  {arbreData.arbre.demi.length > 0 && (
                    <RoundColumn 
                      title="Demi-finales" 
                      combats={arbreData.arbre.demi}
                      color="blue"
                    />
                  )}
                  
                  {/* Bronze */}
                  {arbreData.arbre.bronze.length > 0 && (
                    <RoundColumn 
                      title="Match Bronze" 
                      combats={arbreData.arbre.bronze}
                      color="amber"
                    />
                  )}
                  
                  {/* Finale */}
                  {arbreData.arbre.finale.length > 0 && (
                    <RoundColumn 
                      title="Finale" 
                      combats={arbreData.arbre.finale}
                      color="yellow"
                      isFinal
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Aucune donnée */}
        {!arbreData && selectedCategorie && (
          <Card className="border-slate-200">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-slate-500">
                <Trophy className="h-12 w-12 mb-4 text-slate-300" />
                <p className="text-lg font-medium">Aucun combat</p>
                <p className="text-sm">Générez d'abord les combats pour cette catégorie</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

const RoundColumn = ({ title, combats, color, isFinal }) => {
  const colorClasses = {
    slate: "bg-slate-100 border-slate-200",
    blue: "bg-blue-50 border-blue-200",
    amber: "bg-amber-50 border-amber-200",
    yellow: "bg-yellow-50 border-yellow-200"
  };

  return (
    <div className="flex flex-col gap-4 min-w-[280px]">
      <div className={`text-center py-2 px-4 rounded-lg ${colorClasses[color]}`}>
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">
          {title}
        </h3>
      </div>
      
      <div className="space-y-4">
        {combats.map((combat) => (
          <MatchCard key={combat.combat_id} combat={combat} isFinal={isFinal} />
        ))}
      </div>
    </div>
  );
};

const MatchCard = ({ combat, isFinal }) => {
  const isTermine = combat.termine;
  const hasWinner = combat.vainqueur_id;
  
  return (
    <div className={`p-4 rounded-xl border ${isFinal ? 'border-yellow-300 bg-yellow-50/50' : 'border-slate-200 bg-white'} ${isTermine ? 'opacity-90' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500">
          Combat #{combat.position}
        </span>
        {combat.heure_debut && (
          <span className="text-xs font-mono text-slate-400">
            {combat.heure_debut}
          </span>
        )}
        {isTermine && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
            Terminé
          </Badge>
        )}
      </div>
      
      {/* Rouge */}
      <div className={`p-3 rounded-lg mb-2 ${
        hasWinner && combat.vainqueur_id === combat.rouge_id 
          ? 'bg-red-100 ring-2 ring-red-500' 
          : 'bg-red-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div>
              <span className="font-semibold text-sm">{combat.rouge?.nom}</span>
              {combat.rouge?.club && (
                <p className="text-xs text-slate-500">{combat.rouge.club}</p>
              )}
            </div>
          </div>
          {isTermine && (
            <span className="text-2xl font-black text-red-600 score-display">
              {combat.score_rouge}
            </span>
          )}
        </div>
      </div>
      
      <div className="text-center text-slate-300 text-xs font-bold my-1">VS</div>
      
      {/* Bleu */}
      <div className={`p-3 rounded-lg ${
        hasWinner && combat.vainqueur_id === combat.bleu_id 
          ? 'bg-blue-100 ring-2 ring-blue-500' 
          : 'bg-blue-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <div>
              <span className="font-semibold text-sm">{combat.bleu?.nom}</span>
              {combat.bleu?.club && (
                <p className="text-xs text-slate-500">{combat.bleu.club}</p>
              )}
            </div>
          </div>
          {isTermine && (
            <span className="text-2xl font-black text-blue-600 score-display">
              {combat.score_bleu}
            </span>
          )}
        </div>
      </div>
      
      {/* Type de victoire */}
      {isTermine && combat.type_victoire && combat.type_victoire !== "normal" && (
        <div className="mt-2 text-center">
          <Badge variant="outline" className="text-xs">
            Victoire par {combat.type_victoire}
          </Badge>
        </div>
      )}
      
      {/* Vainqueur */}
      {hasWinner && combat.vainqueur_nom && isFinal && (
        <div className="mt-3 pt-3 border-t border-yellow-200 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Champion</p>
          <p className="font-bold text-lg text-yellow-700 flex items-center justify-center gap-1">
            <Trophy className="h-4 w-4" />
            {combat.vainqueur_nom}
          </p>
        </div>
      )}
    </div>
  );
};
