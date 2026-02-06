import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { UserCheck, UserPlus, UserMinus, Shield, User, Users, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CoachesCompetitionPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const [authorizedCoaches, setAuthorizedCoaches] = useState([]);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialog, setRemoveDialog] = useState({ open: false, coach: null });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (competition?.competition_id) {
      fetchData();
    }
  }, [competition]);

  const fetchData = async () => {
    try {
      const [authRes, availRes] = await Promise.all([
        axios.get(`${API}/competitions/${competition.competition_id}/coaches`, { withCredentials: true }),
        axios.get(`${API}/competitions/${competition.competition_id}/coaches/available`, { withCredentials: true })
      ]);
      setAuthorizedCoaches(authRes.data);
      setAvailableCoaches(availRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoach = async (coachId) => {
    setProcessing(true);
    try {
      await axios.post(`${API}/competitions/${competition.competition_id}/coaches/${coachId}`, {}, { withCredentials: true });
      toast.success("Coach autorisé pour cette compétition");
      fetchData();
      setAddDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'ajout");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveCoach = async () => {
    if (!removeDialog.coach) return;
    
    setProcessing(true);
    try {
      await axios.delete(`${API}/competitions/${competition.competition_id}/coaches/${removeDialog.coach.user_id}`, { withCredentials: true });
      toast.success("Coach retiré de cette compétition");
      setRemoveDialog({ open: false, coach: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors du retrait");
    } finally {
      setProcessing(false);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <Card className="border-slate-200">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <Shield className="h-12 w-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium">Accès refusé</p>
              <p className="text-sm">Cette page est réservée aux administrateurs</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (!competition) {
    return (
      <Layout>
        <Card className="border-slate-200">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-slate-500">
              <Users className="h-12 w-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium">Aucune compétition sélectionnée</p>
              <p className="text-sm">Veuillez d'abord sélectionner une compétition</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

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
              Coachs autorisés
            </h1>
            <p className="text-slate-500 mt-1">
              Gérer les coachs autorisés pour <strong>{competition.nom}</strong>
            </p>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-semibold uppercase tracking-wide" data-testid="add-coach-btn">
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter un coach
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Ajouter un coach
                </DialogTitle>
                <DialogDescription>
                  Sélectionnez un coach à autoriser pour cette compétition
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-80 overflow-y-auto py-4">
                {availableCoaches.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Tous les coachs sont déjà autorisés</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableCoaches.map((coach) => (
                      <div
                        key={coach.user_id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            {coach.picture ? (
                              <img src={coach.picture} alt={coach.name} className="w-10 h-10 rounded-full" />
                            ) : (
                              <User className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{coach.name}</p>
                            <p className="text-sm text-slate-500">{coach.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddCoach(coach.user_id)}
                          disabled={processing}
                          data-testid={`add-coach-${coach.user_id}`}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Authorized Coaches Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                Coachs autorisés ({authorizedCoaches.length})
              </CardTitle>
              <CardDescription>
                Ces coachs peuvent inscrire des compétiteurs et consulter les informations de cette compétition
              </CardDescription>
            </CardHeader>
            <CardContent>
              {authorizedCoaches.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Aucun coach autorisé</p>
                  <p className="text-sm mt-1">Ajoutez des coachs pour qu'ils puissent participer à cette compétition</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="table-header">
                        <TableHead>Coach</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authorizedCoaches.map((coach) => (
                        <TableRow key={coach.user_id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                {coach.picture ? (
                                  <img src={coach.picture} alt={coach.name} className="w-10 h-10 rounded-full" />
                                ) : (
                                  <User className="h-5 w-5 text-slate-400" />
                                )}
                              </div>
                              <p className="font-semibold">{coach.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{coach.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <User className="h-3 w-3 mr-1" />
                              {coach.role === "admin" ? "Administrateur" : "Coach"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setRemoveDialog({ open: true, coach })}
                              data-testid={`remove-coach-${coach.user_id}`}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
          <Card className="border-slate-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <UserCheck className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">À propos des autorisations :</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Les coachs doivent être autorisés pour chaque compétition individuellement</li>
                    <li>Un coach autorisé peut inscrire des compétiteurs de son club</li>
                    <li>Il peut voir les combats, les résultats et les médailles</li>
                    <li>Les administrateurs ont automatiquement accès à toutes les compétitions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dialog de confirmation de retrait */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ open, coach: removeDialog.coach })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Retirer le coach
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>{removeDialog.coach?.name}</strong> de cette compétition ?
              <br /><br />
              Le coach ne pourra plus accéder aux informations de cette compétition ni inscrire de nouveaux compétiteurs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog({ open: false, coach: null })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRemoveCoach} disabled={processing}>
              {processing ? "Retrait..." : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
