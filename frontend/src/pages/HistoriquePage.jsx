import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { History, Clock } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HistoriquePage() {
  const [historique, setHistorique] = useState([]);
  const [combats, setCombats] = useState([]);
  const [competiteurs, setCompetiteurs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [histRes, combatsRes, compRes] = await Promise.all([
        axios.get(`${API}/historique`, { withCredentials: true }),
        axios.get(`${API}/combats`, { withCredentials: true }),
        axios.get(`${API}/competiteurs`, { withCredentials: true })
      ]);
      setHistorique(histRes.data);
      setCombats(combatsRes.data);
      setCompetiteurs(compRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const getCompetiteurNom = (id) => {
    if (!id) return "Aucun";
    const comp = competiteurs.find(c => c.competiteur_id === id);
    return comp ? `${comp.prenom} ${comp.nom}` : "Inconnu";
  };

  const getCombatInfo = (combatId) => {
    return combats.find(c => c.combat_id === combatId);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        >
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Historique des modifications
          </h1>
          <p className="text-slate-500 mt-1">Traçabilité des changements de résultats</p>
        </motion.div>

        {/* History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {historique.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <History className="h-12 w-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Aucune modification</p>
                  <p className="text-sm">L'historique des modifications apparaîtra ici</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="table-header">
                        <TableHead>Date</TableHead>
                        <TableHead>Combat</TableHead>
                        <TableHead>Ancien résultat</TableHead>
                        <TableHead>Nouveau résultat</TableHead>
                        <TableHead>Modifié par</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historique.map((h) => {
                        const combat = getCombatInfo(h.combat_id);
                        return (
                          <TableRow key={h.historique_id} className="hover:bg-slate-50/50">
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-slate-400" />
                                {formatDate(h.modifie_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {combat?.tour || "Combat"} #{combat?.position || "?"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">{getCompetiteurNom(h.ancien_vainqueur_id)}</p>
                                <p className="text-slate-500 score-display">
                                  {h.ancien_score_rouge} - {h.ancien_score_bleu}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium text-green-600">{getCompetiteurNom(h.nouveau_vainqueur_id)}</p>
                                <p className="text-slate-500 score-display">
                                  {h.nouveau_score_rouge} - {h.nouveau_score_bleu}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-500">{h.modifie_par}</span>
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

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-slate-200 bg-amber-50/50">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700">
                <strong>Note :</strong> Toutes les modifications de résultats sont automatiquement enregistrées pour garantir la traçabilité et l'audit des compétitions.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
