import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Plus, Trash2, Grid3X3 } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const initialForm = {
  nom: "",
  numero: ""
};

export default function TatamisPage() {
  const { isAdmin } = useAuth();
  const [tatamis, setTatamis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API}/tatamis`, { withCredentials: true });
      setTatamis(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des tatamis");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nom: form.nom,
        numero: parseInt(form.numero)
      };
      
      await axios.post(`${API}/tatamis`, payload, { withCredentials: true });
      toast.success("Tatami créé avec succès");
      setDialogOpen(false);
      setForm(initialForm);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce tatami ?")) return;
    
    try {
      await axios.delete(`${API}/tatamis/${id}`, { withCredentials: true });
      toast.success("Tatami supprimé");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
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
              Tatamis
            </h1>
            <p className="text-slate-500 mt-1">{tatamis.length} tatami(s) disponible(s)</p>
          </div>
          
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setForm(initialForm);
            }}>
              <DialogTrigger asChild>
                <Button className="font-semibold uppercase tracking-wide" data-testid="add-tatami-btn">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un tatami
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                    Nouveau tatami
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      placeholder="Ex: Tatami Principal"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      required
                      data-testid="tatami-nom-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Numéro</Label>
                    <Input
                      id="numero"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                      required
                      data-testid="tatami-numero-input"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" data-testid="tatami-submit-btn">
                      Créer
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {/* Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {tatamis.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <Grid3X3 className="h-12 w-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Aucun tatami</p>
                  <p className="text-sm">Ajoutez des aires de combat pour commencer</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tatamis.map((tatami, index) => (
                <motion.div
                  key={tatami.tatami_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-slate-200 hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center mb-4">
                            <span className="text-white font-black text-xl score-display">{tatami.numero}</span>
                          </div>
                          <h3 className="font-bold text-lg text-slate-900">{tatami.nom}</h3>
                          <p className="text-sm text-slate-500 mt-1">Aire de combat #{tatami.numero}</p>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(tatami.tatami_id)}
                            data-testid={`delete-tatami-${tatami.tatami_id}`}
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
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
