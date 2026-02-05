import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Plus, Trash2, FolderKanban, Users, Download, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const initialForm = {
  nom: "",
  age_min: "",
  age_max: "",
  sexe: "M",
  poids_min: "",
  poids_max: ""
};

export default function CategoriesPage() {
  const { isAdmin } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [categories, setCategories] = useState([]);
  const [competiteurs, setCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchCompetitions();
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      fetchData();
    }
  }, [selectedCompetition]);

  const fetchCompetitions = async () => {
    try {
      const response = await axios.get(`${API}/competitions`, { withCredentials: true });
      setCompetitions(response.data);
      
      const saved = localStorage.getItem('selectedCompetition');
      if (saved && response.data.find(c => c.competition_id === saved)) {
        setSelectedCompetition(saved);
      } else if (response.data.length > 0) {
        setSelectedCompetition(response.data[0].competition_id);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des compétitions");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [catRes, compRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${selectedCompetition}`, { withCredentials: true }),
        axios.get(`${API}/competiteurs?competition_id=${selectedCompetition}`, { withCredentials: true })
      ]);
      setCategories(catRes.data);
      setCompetiteurs(compRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    }
  };

  const handleSeedCategories = async () => {
    if (!window.confirm("Cela va supprimer les catégories existantes et créer toutes les catégories officielles FFTA/FFDA. Continuer ?")) return;
    
    setSeeding(true);
    try {
      const response = await axios.post(
        `${API}/categories/seed/${selectedCompetition}`,
        {},
        { withCredentials: true }
      );
      toast.success(`${response.data.total} catégories officielles créées !`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création des catégories");
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        competition_id: selectedCompetition,
        age_min: parseInt(form.age_min),
        age_max: parseInt(form.age_max),
        poids_min: parseFloat(form.poids_min),
        poids_max: parseFloat(form.poids_max)
      };
      
      await axios.post(`${API}/categories`, payload, { withCredentials: true });
      toast.success("Catégorie créée avec succès");
      setDialogOpen(false);
      setForm(initialForm);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) return;
    
    try {
      await axios.delete(`${API}/categories/${id}`, { withCredentials: true });
      toast.success("Catégorie supprimée");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const getCompetiteursCount = (categorieId) => {
    return competiteurs.filter(c => c.categorie_id === categorieId).length;
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
              Catégories
            </h1>
            <p className="text-slate-500 mt-1">{categories.length} catégorie(s)</p>
          </div>
          
          <div className="flex gap-2">
            {isAdmin && selectedCompetition && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleSeedCategories}
                  disabled={seeding}
                  data-testid="seed-categories-btn"
                >
                  {seeding ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Catégories officielles
                </Button>
                
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) setForm(initialForm);
                }}>
                  <DialogTrigger asChild>
                    <Button className="font-semibold uppercase tracking-wide" data-testid="add-categorie-btn">
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvelle catégorie
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                        Créer une catégorie
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom de la catégorie</Label>
                        <Input
                          id="nom"
                          placeholder="Ex: Cadets -55kg Masculin"
                          value={form.nom}
                          onChange={(e) => setForm({ ...form, nom: e.target.value })}
                          required
                          data-testid="categorie-nom-input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="age_min">Âge minimum</Label>
                          <Input
                            id="age_min"
                            type="number"
                            value={form.age_min}
                            onChange={(e) => setForm({ ...form, age_min: e.target.value })}
                            required
                            data-testid="categorie-age-min-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="age_max">Âge maximum</Label>
                          <Input
                            id="age_max"
                            type="number"
                            value={form.age_max}
                            onChange={(e) => setForm({ ...form, age_max: e.target.value })}
                            required
                            data-testid="categorie-age-max-input"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sexe">Sexe</Label>
                        <Select value={form.sexe} onValueChange={(val) => setForm({ ...form, sexe: val })}>
                          <SelectTrigger data-testid="categorie-sexe-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculin</SelectItem>
                            <SelectItem value="F">Féminin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="poids_min">Poids min (kg)</Label>
                          <Input
                            id="poids_min"
                            type="number"
                            step="0.1"
                            value={form.poids_min}
                            onChange={(e) => setForm({ ...form, poids_min: e.target.value })}
                            required
                            data-testid="categorie-poids-min-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="poids_max">Poids max (kg)</Label>
                          <Input
                            id="poids_max"
                            type="number"
                            step="0.1"
                            value={form.poids_max}
                            onChange={(e) => setForm({ ...form, poids_max: e.target.value })}
                            required
                            data-testid="categorie-poids-max-input"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit" data-testid="categorie-submit-btn">
                          Créer
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </motion.div>

        {/* Sélection compétition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 max-w-md">
                  <Label className="text-xs text-slate-500 mb-1 block">Compétition</Label>
                  <Select value={selectedCompetition} onValueChange={(val) => {
                    setSelectedCompetition(val);
                    localStorage.setItem('selectedCompetition', val);
                  }}>
                    <SelectTrigger data-testid="select-competition-categories">
                      <SelectValue placeholder="Sélectionner une compétition" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitions.map(comp => (
                        <SelectItem key={comp.competition_id} value={comp.competition_id}>
                          {comp.nom} - {new Date(comp.date).toLocaleDateString('fr-FR')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <FolderKanban className="h-12 w-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Aucune catégorie</p>
                  <p className="text-sm">Créez des catégories pour organiser les compétiteurs</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="table-header">
                        <TableHead>Nom</TableHead>
                        <TableHead>Tranche d'âge</TableHead>
                        <TableHead>Sexe</TableHead>
                        <TableHead>Poids</TableHead>
                        <TableHead>Compétiteurs</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.categorie_id} className="hover:bg-slate-50/50">
                          <TableCell className="font-semibold">{cat.nom}</TableCell>
                          <TableCell>
                            <span className="score-display">{cat.age_min} - {cat.age_max} ans</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={cat.sexe === "M" ? "default" : "secondary"}>
                              {cat.sexe === "M" ? "Masculin" : "Féminin"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="score-display">{cat.poids_min} - {cat.poids_max} kg</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span className="score-display">{getCompetiteursCount(cat.categorie_id)}</span>
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(cat.categorie_id)}
                                data-testid={`delete-cat-${cat.categorie_id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
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
              <p className="text-sm text-blue-700">
                <strong>Note :</strong> Les compétiteurs sont automatiquement assignés à une catégorie en fonction de leur âge, sexe et poids lors de leur inscription.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
