import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Plus, Trash2, FolderKanban, Users, Download, RefreshCw, ChevronRight, X, AlertTriangle, ArrowUpCircle } from "lucide-react";
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
  const { competition } = useCompetition();
  const [categories, setCategories] = useState([]);
  const [competiteurs, setCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  
  // État pour la catégorie sélectionnée
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (competition) {
      fetchData();
    }
  }, [competition]);

  const fetchData = async () => {
    try {
      const [catRes, compRes] = await Promise.all([
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/competiteurs?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      setCategories(catRes.data);
      setCompetiteurs(compRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedCategories = async () => {
    if (!window.confirm("Cela va supprimer les catégories existantes et créer toutes les catégories officielles FFTA/FFDA. Continuer ?")) return;
    
    setSeeding(true);
    try {
      const response = await axios.post(
        `${API}/categories/seed/${competition.competition_id}`,
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
        competition_id: competition.competition_id,
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

  // Obtenir les compétiteurs d'une catégorie
  const getCompetiteursForCategorie = (categorieId) => {
    return competiteurs.filter(c => c.categorie_id === categorieId);
  };

  // Ouvrir les détails d'une catégorie
  const handleCategorieClick = (cat) => {
    setSelectedCategorie(cat);
    setDetailsDialogOpen(true);
  };

  const closeDetails = () => {
    setSelectedCategorie(null);
    setDetailsDialogOpen(false);
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
            {isAdmin && competition && (
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
                        <TableRow 
                          key={cat.categorie_id} 
                          className="hover:bg-slate-50/50 cursor-pointer"
                          onClick={() => handleCategorieClick(cat)}
                          data-testid={`categorie-row-${cat.categorie_id}`}
                        >
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              {cat.nom}
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </TableCell>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(cat.categorie_id);
                                }}
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

        {/* Dialogue détails catégorie */}
        <Dialog open={detailsDialogOpen} onOpenChange={(open) => !open && closeDetails()}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                {selectedCategorie?.nom}
              </DialogTitle>
              <DialogDescription>
                {selectedCategorie && (
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant={selectedCategorie.sexe === "M" ? "default" : "secondary"}>
                      {selectedCategorie.sexe === "M" ? "Masculin" : "Féminin"}
                    </Badge>
                    <span className="text-sm">{selectedCategorie.age_min} - {selectedCategorie.age_max} ans</span>
                    <span className="text-sm">{selectedCategorie.poids_min} - {selectedCategorie.poids_max} kg</span>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto mt-4">
              {selectedCategorie && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Compétiteurs ({getCompetiteursForCategorie(selectedCategorie.categorie_id).length})
                  </h3>
                  
                  {getCompetiteursForCategorie(selectedCategorie.categorie_id).length === 0 ? (
                    <div className="bg-slate-50 rounded-lg p-8 text-center">
                      <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">Aucun compétiteur dans cette catégorie</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Les compétiteurs sont automatiquement assignés lors de l'inscription
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Club</TableHead>
                            <TableHead>Poids déclaré</TableHead>
                            <TableHead>Poids officiel</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCompetiteursForCategorie(selectedCategorie.categorie_id).map((comp) => (
                            <TableRow key={comp.competiteur_id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {comp.prenom} {comp.nom}
                                  {comp.surclasse && (
                                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                                      Surclassé
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{comp.club}</TableCell>
                              <TableCell className="font-mono">{comp.poids_declare} kg</TableCell>
                              <TableCell>
                                {comp.poids_officiel ? (
                                  <span className="font-mono font-bold text-green-600">{comp.poids_officiel} kg</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {comp.disqualifie ? (
                                  <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                    <AlertTriangle className="h-3 w-3" />
                                    Disqualifié
                                  </Badge>
                                ) : comp.pese ? (
                                  <Badge className="bg-green-100 text-green-700">Pesé</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700">À peser</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {/* Statistiques */}
                  {getCompetiteursForCategorie(selectedCategorie.categorie_id).length > 0 && (
                    <div className="flex justify-center gap-8 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">
                          {getCompetiteursForCategorie(selectedCategorie.categorie_id).length}
                        </p>
                        <p className="text-xs text-slate-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-600">
                          {getCompetiteursForCategorie(selectedCategorie.categorie_id).filter(c => c.pese).length}
                        </p>
                        <p className="text-xs text-slate-500">Pesés</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-600">
                          {getCompetiteursForCategorie(selectedCategorie.categorie_id).filter(c => !c.pese && !c.disqualifie).length}
                        </p>
                        <p className="text-xs text-slate-500">À peser</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-red-600">
                          {getCompetiteursForCategorie(selectedCategorie.categorie_id).filter(c => c.disqualifie).length}
                        </p>
                        <p className="text-xs text-slate-500">Disqualifiés</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
