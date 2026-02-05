import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Plus, Trash2, Grid3X3, Swords, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AiresCombatPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const navigate = useNavigate();
  
  const [aires, setAires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nom: "", numero: 1 });

  useEffect(() => {
    if (competition) {
      fetchAires();
    }
  }, [competition]);

  const fetchAires = async () => {
    try {
      const response = await axios.get(
        `${API}/aires-combat?competition_id=${competition.competition_id}`,
        { withCredentials: true }
      );
      setAires(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/aires-combat`, {
        competition_id: competition.competition_id,
        nom: form.nom || `Aire ${form.numero}`,
        numero: parseInt(form.numero)
      }, { withCredentials: true });
      
      toast.success("Aire de combat créée !");
      setDialogOpen(false);
      setForm({ nom: "", numero: aires.length + 1 });
      fetchAires();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleDelete = async (aireId) => {
    if (!window.confirm("Supprimer cette aire de combat ?")) return;
    
    try {
      await axios.delete(`${API}/aires-combat/${aireId}`, { withCredentials: true });
      toast.success("Aire supprimée");
      fetchAires();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const goToArbitre = (aireId) => {
    navigate(`/arbitre/${aireId}`);
  };

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
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
              Aires de combat
            </h1>
            <p className="text-slate-500 mt-1">
              {aires.length} aire(s) configurée(s)
            </p>
          </div>
          
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-aire-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une aire
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-bold uppercase">
                    Nouvelle aire de combat
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Numéro de l'aire</Label>
                    <Input
                      id="numero"
                      type="number"
                      min="1"
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                      required
                      data-testid="aire-numero-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom (optionnel)</Label>
                    <Input
                      id="nom"
                      placeholder={`Aire ${form.numero}`}
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      data-testid="aire-nom-input"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" data-testid="aire-submit-btn">
                      Créer
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {/* Info */}
        {aires.length === 0 && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Grid3X3 className="h-6 w-6 text-blue-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-blue-800">Configurez vos aires de combat</h3>
                    <p className="text-blue-700 text-sm mt-1">
                      Ajoutez le nombre d'aires disponibles pour votre compétition (généralement 2 ou 3).
                      Les combats seront automatiquement répartis sur ces aires.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Liste des aires */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aires.map((aire, index) => (
            <motion.div
              key={aire.aire_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-slate-200 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-black text-xl">{aire.numero}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          {aire.nom || `Aire ${aire.numero}`}
                        </h3>
                        <Badge variant="outline" className="mt-1">
                          <Swords className="h-3 w-3 mr-1" />
                          Aire de combat
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      onClick={() => goToArbitre(aire.aire_id)}
                      data-testid={`arbitre-aire-${aire.numero}`}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Vue Arbitre
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleDelete(aire.aire_id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
