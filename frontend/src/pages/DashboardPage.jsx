import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  Users, 
  Scale, 
  FolderKanban, 
  Swords, 
  Trophy,
  Grid3X3,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [airesCombat, setAiresCombat] = useState([]);

  useEffect(() => {
    if (competition) {
      fetchData();
    }
  }, [competition]);

  const fetchData = async () => {
    try {
      const [compRes, airesRes, combatsRes, competiteursRes] = await Promise.all([
        axios.get(`${API}/competitions/${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/aires-combat?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/combats?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/competiteurs?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      
      const competiteurs = competiteursRes.data;
      const combats = combatsRes.data;
      
      setStats({
        competiteurs: competiteurs.length,
        competiteursPeses: competiteurs.filter(c => c.pese).length,
        combatsTotal: combats.length,
        combatsTermines: combats.filter(c => c.termine).length,
        combatsEnCours: combats.filter(c => c.statut === "en_cours").length,
        ...compRes.data
      });
      
      setAiresCombat(airesRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowStatus = () => {
    if (!stats) return [];
    
    return [
      {
        step: 1,
        label: "Inscriptions",
        icon: Users,
        status: stats.competiteurs > 0 ? "done" : "pending",
        count: stats.competiteurs,
        path: "/competiteurs"
      },
      {
        step: 2,
        label: "Pesée",
        icon: Scale,
        status: stats.competiteursPeses === stats.competiteurs && stats.competiteurs > 0 ? "done" : 
                stats.competiteursPeses > 0 ? "in_progress" : "pending",
        count: `${stats.competiteursPeses}/${stats.competiteurs}`,
        path: "/pesee"
      },
      {
        step: 3,
        label: "Aires de combat",
        icon: Grid3X3,
        status: airesCombat.length > 0 ? "done" : "pending",
        count: airesCombat.length,
        path: "/aires-combat"
      },
      {
        step: 4,
        label: "Combats",
        icon: Swords,
        status: stats.combatsTotal > 0 ? (stats.combatsTermines === stats.combatsTotal ? "done" : "in_progress") : "pending",
        count: `${stats.combatsTermines}/${stats.combatsTotal}`,
        path: "/gestion-combats"
      },
      {
        step: 5,
        label: "Résultats",
        icon: Trophy,
        status: stats.combatsTotal > 0 && stats.combatsTermines === stats.combatsTotal ? "done" : "pending",
        count: null,
        path: "/resultats"
      }
    ];
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

  const workflow = getWorkflowStatus();
  const progress = stats?.combatsTotal > 0 
    ? Math.round((stats.combatsTermines / stats.combatsTotal) * 100) 
    : 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-slate-500 mt-1">Vue d'ensemble de la compétition</p>
        </motion.div>

        {/* Progression globale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Progression</h2>
                  <p className="text-slate-500 text-sm">
                    {stats?.combatsTermines || 0} combats terminés sur {stats?.combatsTotal || 0}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-slate-900">{progress}%</span>
                </div>
              </div>
              <Progress value={progress} className="h-3" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Workflow Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-bold text-slate-900 mb-4">Étapes de la compétition</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              const statusColors = {
                done: "bg-green-50 border-green-200 text-green-700",
                in_progress: "bg-blue-50 border-blue-200 text-blue-700",
                pending: "bg-slate-50 border-slate-200 text-slate-500"
              };
              const iconColors = {
                done: "text-green-500",
                in_progress: "text-blue-500",
                pending: "text-slate-400"
              };
              
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Card 
                    className={`${statusColors[item.status]} cursor-pointer hover:shadow-md transition-all`}
                    onClick={() => navigate(item.path)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="relative">
                        <Icon className={`h-8 w-8 mx-auto mb-2 ${iconColors[item.status]}`} />
                        {item.status === "done" && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 absolute -top-1 -right-1" />
                        )}
                        {item.status === "in_progress" && (
                          <PlayCircle className="h-4 w-4 text-blue-500 absolute -top-1 -right-1 animate-pulse" />
                        )}
                      </div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      {item.count !== null && (
                        <p className="text-xs mt-1 opacity-75">{item.count}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Aires de combat actives */}
        {airesCombat.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Aires de combat</h2>
              <Button variant="outline" size="sm" onClick={() => navigate("/gestion-combats")}>
                Voir tout
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {airesCombat.map((aire, index) => (
                <motion.div
                  key={aire.aire_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card 
                    className="border-slate-200 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/arbitre/${aire.aire_id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge className="bg-slate-900 mb-2">Aire {aire.numero}</Badge>
                          <h3 className="font-bold text-slate-900">{aire.nom}</h3>
                        </div>
                        <Button size="sm" className="bg-red-500 hover:bg-red-600">
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Arbitrer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions rapides */}
        {isAdmin && stats?.combatsTotal === 0 && stats?.competiteurs > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-800">Prêt à générer les combats ?</h3>
                    <p className="text-amber-700 text-sm mt-1">
                      Vous avez {stats.competiteurs} compétiteurs inscrits. 
                      {stats.competiteursPeses < stats.competiteurs 
                        ? ` Attention: ${stats.competiteurs - stats.competiteursPeses} n'ont pas encore été pesés.`
                        : " Tous les compétiteurs ont été pesés."
                      }
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => navigate("/gestion-combats")}>
                        <Swords className="h-4 w-4 mr-2" />
                        Générer les combats
                      </Button>
                      {stats.competiteursPeses < stats.competiteurs && (
                        <Button variant="outline" onClick={() => navigate("/pesee")}>
                          <Scale className="h-4 w-4 mr-2" />
                          Continuer la pesée
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
