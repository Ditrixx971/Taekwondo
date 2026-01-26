import { useState, useEffect } from "react";
import axios from "axios";
import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, Swords, Trophy, Grid3X3, FolderKanban, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <Card className="border-slate-200 hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 score-display">{value}</p>
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    competiteurs: 0,
    categories: 0,
    combats_total: 0,
    combats_termines: 0,
    medailles: 0,
    tatamis: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/stats`, { withCredentials: true });
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Tableau de bord
          </h1>
          <p className="text-slate-500 mt-1">Vue d'ensemble de la compétition</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Compétiteurs"
            value={stats.competiteurs}
            icon={Users}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            delay={0}
          />
          <StatCard
            title="Catégories"
            value={stats.categories}
            icon={FolderKanban}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            delay={0.1}
          />
          <StatCard
            title="Tatamis"
            value={stats.tatamis}
            icon={Grid3X3}
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
            delay={0.2}
          />
          <StatCard
            title="Combats Total"
            value={stats.combats_total}
            icon={Swords}
            color="bg-gradient-to-br from-red-500 to-red-600"
            delay={0.3}
          />
          <StatCard
            title="Combats Terminés"
            value={stats.combats_termines}
            icon={CheckCircle}
            color="bg-gradient-to-br from-amber-500 to-amber-600"
            delay={0.4}
          />
          <StatCard
            title="Médailles"
            value={stats.medailles}
            icon={Trophy}
            color="bg-gradient-to-br from-yellow-500 to-yellow-600"
            delay={0.5}
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                Guide rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-3">1</div>
                  <h3 className="font-semibold text-slate-900 mb-1">Catégories</h3>
                  <p className="text-sm text-slate-500">Créez les catégories de poids et d'âge</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-3">2</div>
                  <h3 className="font-semibold text-slate-900 mb-1">Compétiteurs</h3>
                  <p className="text-sm text-slate-500">Ajoutez les compétiteurs par catégorie</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold mb-3">3</div>
                  <h3 className="font-semibold text-slate-900 mb-1">Combats</h3>
                  <p className="text-sm text-slate-500">Générez l'arbre des combats</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold mb-3">4</div>
                  <h3 className="font-semibold text-slate-900 mb-1">Résultats</h3>
                  <p className="text-sm text-slate-500">Saisissez les scores et médailles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress */}
        {stats.combats_total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
          >
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                  Progression des combats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${(stats.combats_termines / stats.combats_total) * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-slate-900 score-display">
                    {Math.round((stats.combats_termines / stats.combats_total) * 100)}%
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {stats.combats_termines} combat(s) terminé(s) sur {stats.combats_total}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
