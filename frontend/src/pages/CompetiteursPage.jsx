import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Plus, Pencil, Trash2, Search, Users, AlertTriangle, ArrowUpCircle, Download, Upload, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const initialForm = {
  nom: "",
  prenom: "",
  date_naissance: "",
  sexe: "M",
  poids_declare: "",
  club: "",
  surclasse: false,
  categorie_surclasse_id: ""
};

export default function CompetiteursPage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const [competiteurs, setCompetiteurs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesSurclassement, setCategoriesSurclassement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("all");

  useEffect(() => {
    if (competition) {
      fetchData();
    }
  }, [competition]);

  // Charger les catégories de surclassement quand les données du form changent
  useEffect(() => {
    if (form.surclasse && form.date_naissance && form.sexe && competition) {
      fetchCategoriesSurclassement();
    } else {
      setCategoriesSurclassement([]);
    }
  }, [form.surclasse, form.date_naissance, form.sexe, competition]);

  const fetchData = async () => {
    try {
      const [compRes, catRes] = await Promise.all([
        axios.get(`${API}/competiteurs?competition_id=${competition.competition_id}`, { withCredentials: true }),
        axios.get(`${API}/categories?competition_id=${competition.competition_id}`, { withCredentials: true })
      ]);
      setCompetiteurs(compRes.data);
      setCategories(catRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesSurclassement = async () => {
    if (!form.date_naissance || !competition) return;
    
    try {
      // Calculer l'âge
      const birthDate = new Date(form.date_naissance);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      const response = await axios.get(
        `${API}/categories/for-surclassement/${competition.competition_id}?sexe=${form.sexe}&age=${age}`,
        { withCredentials: true }
      );
      setCategoriesSurclassement(response.data);
    } catch (error) {
      console.error("Erreur chargement catégories surclassement:", error);
    }
  };

  const calculateAge = (dateNaissance) => {
    if (!dateNaissance) return null;
    const birthDate = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...form, 
        poids_declare: parseFloat(form.poids_declare),
        competition_id: competition.competition_id,
        surclasse: form.surclasse,
        categorie_surclasse_id: form.surclasse ? form.categorie_surclasse_id : null
      };
      
      if (form.surclasse && !form.categorie_surclasse_id) {
        toast.error("Veuillez sélectionner une catégorie de surclassement");
        return;
      }
      
      if (editingId) {
        await axios.put(`${API}/competiteurs/${editingId}`, payload, { withCredentials: true });
        toast.success("Compétiteur modifié avec succès");
      } else {
        await axios.post(`${API}/competiteurs`, payload, { withCredentials: true });
        toast.success("Compétiteur ajouté avec succès");
      }
      
      setDialogOpen(false);
      setForm(initialForm);
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'opération");
    }
  };

  const handleEdit = (comp) => {
    setForm({
      nom: comp.nom,
      prenom: comp.prenom,
      date_naissance: comp.date_naissance,
      sexe: comp.sexe,
      poids_declare: comp.poids_declare?.toString() || "",
      club: comp.club,
      surclasse: comp.surclasse || false,
      categorie_surclasse_id: comp.surclasse ? comp.categorie_id : ""
    });
    setEditingId(comp.competiteur_id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce compétiteur ?")) return;
    
    try {
      await axios.delete(`${API}/competiteurs/${id}`, { withCredentials: true });
      toast.success("Compétiteur supprimé");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const getCategorieNom = (categorieId) => {
    const cat = categories.find(c => c.categorie_id === categorieId);
    return cat ? cat.nom : "Non assigné";
  };

  const filteredCompetiteurs = competiteurs.filter(comp => {
    const matchSearch = 
      comp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.club.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategorie = filterCategorie === "all" || comp.categorie_id === filterCategorie;
    return matchSearch && matchCategorie;
  });

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
              Compétiteurs
            </h1>
            <p className="text-slate-500 mt-1">{competiteurs.length} compétiteur(s) enregistré(s)</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setForm(initialForm);
              setEditingId(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="font-semibold uppercase tracking-wide" data-testid="add-competiteur-btn">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                  {editingId ? "Modifier le compétiteur" : "Nouveau compétiteur"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                      required
                      data-testid="competiteur-prenom-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      required
                      data-testid="competiteur-nom-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_naissance">Date de naissance</Label>
                  <Input
                    id="date_naissance"
                    type="date"
                    value={form.date_naissance}
                    onChange={(e) => setForm({ ...form, date_naissance: e.target.value, categorie_surclasse_id: "" })}
                    required
                    data-testid="competiteur-date-input"
                  />
                  {form.date_naissance && (
                    <p className="text-xs text-slate-500">
                      Âge: {calculateAge(form.date_naissance)} ans
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sexe">Sexe</Label>
                    <Select value={form.sexe} onValueChange={(val) => setForm({ ...form, sexe: val, categorie_surclasse_id: "" })}>
                      <SelectTrigger data-testid="competiteur-sexe-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="poids_declare">Poids déclaré (kg)</Label>
                    <Input
                      id="poids_declare"
                      type="number"
                      step="0.1"
                      value={form.poids_declare}
                      onChange={(e) => setForm({ ...form, poids_declare: e.target.value })}
                      required
                      data-testid="competiteur-poids-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club">Club</Label>
                  <Input
                    id="club"
                    value={form.club}
                    onChange={(e) => setForm({ ...form, club: e.target.value })}
                    required
                    data-testid="competiteur-club-input"
                  />
                </div>

                {/* Option Surclassement */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="surclasse"
                      checked={form.surclasse}
                      onCheckedChange={(checked) => setForm({ 
                        ...form, 
                        surclasse: checked, 
                        categorie_surclasse_id: "" 
                      })}
                      data-testid="surclasse-checkbox"
                    />
                    <Label 
                      htmlFor="surclasse" 
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <ArrowUpCircle className="h-4 w-4 text-blue-500" />
                      Surclassement (catégorie d'âge supérieure)
                    </Label>
                  </div>
                  
                  {form.surclasse && (
                    <div className="space-y-2 pl-6">
                      {!form.date_naissance ? (
                        <p className="text-xs text-amber-600">
                          Veuillez d'abord renseigner la date de naissance
                        </p>
                      ) : categoriesSurclassement.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          Chargement des catégories disponibles...
                        </p>
                      ) : (
                        <>
                          <Label className="text-xs text-slate-500">
                            Catégorie de surclassement
                          </Label>
                          <Select 
                            value={form.categorie_surclasse_id} 
                            onValueChange={(val) => setForm({ ...form, categorie_surclasse_id: val })}
                          >
                            <SelectTrigger data-testid="surclasse-categorie-select">
                              <SelectValue placeholder="Choisir une catégorie" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {categoriesSurclassement.map(cat => (
                                <SelectItem key={cat.categorie_id} value={cat.categorie_id}>
                                  {cat.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-blue-600">
                            Le compétiteur sera inscrit dans cette catégorie supérieure.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" data-testid="competiteur-submit-btn">
                    {editingId ? "Modifier" : "Ajouter"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher par nom, prénom ou club..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="search-input"
                  />
                </div>
                <Select value={filterCategorie} onValueChange={setFilterCategorie}>
                  <SelectTrigger className="w-full sm:w-48" data-testid="filter-categorie-select">
                    <SelectValue placeholder="Catégorie" />
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {filteredCompetiteurs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Users className="h-12 w-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Aucun compétiteur trouvé</p>
                  <p className="text-sm">Ajoutez des compétiteurs pour commencer</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="table-header">
                        <TableHead>Nom</TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead>Sexe</TableHead>
                        <TableHead>Poids déclaré</TableHead>
                        <TableHead>Poids officiel</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Statut</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompetiteurs.map((comp) => (
                        <TableRow key={comp.competiteur_id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">
                            {comp.prenom} {comp.nom}
                          </TableCell>
                          <TableCell>{comp.club}</TableCell>
                          <TableCell>
                            <Badge variant={comp.sexe === "M" ? "default" : "secondary"}>
                              {comp.sexe === "M" ? "M" : "F"}
                            </Badge>
                          </TableCell>
                          <TableCell className="score-display">{comp.poids_declare} kg</TableCell>
                          <TableCell className="score-display font-bold">
                            {comp.poids_officiel ? (
                              <span className="text-green-600">{comp.poids_officiel} kg</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">
                                {getCategorieNom(comp.categorie_id)}
                              </Badge>
                              {comp.surclasse && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                                  Surclassé
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {comp.disqualifie ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Disqualifié
                              </Badge>
                            ) : comp.pese ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Pesé
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                À peser
                              </Badge>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(comp)}
                                  data-testid={`edit-${comp.competiteur_id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDelete(comp.competiteur_id)}
                                  data-testid={`delete-${comp.competiteur_id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
      </div>
    </Layout>
  );
}
