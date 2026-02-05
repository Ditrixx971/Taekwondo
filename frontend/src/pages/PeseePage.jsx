import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth, useCompetition } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { 
  Scale, 
  Check, 
  X, 
  AlertTriangle,
  Download,
  Search
} from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PeseePage() {
  const { isAdmin } = useAuth();
  const { competition } = useCompetition();
  const [competiteurs, setCompetiteurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPese, setFilterPese] = useState("all");
  
  // Dialog pesée
  const [peseeDialog, setPeseeDialog] = useState(false);
  const [selectedCompetiteur, setSelectedCompetiteur] = useState(null);
  const [poidsOfficiel, setPoidsOfficiel] = useState("");

  useEffect(() => {
    if (competition) {
      fetchPesee();
    }
  }, [competition]);

  const fetchPesee = async () => {
    try {
      const response = await axios.get(`${API}/pesee/${competition.competition_id}`, { withCredentials: true });
      setCompetiteurs(response.data);
    } catch (error) {
      console.error("Error fetching pesee:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPesee = (competiteur) => {
    setSelectedCompetiteur(competiteur);
    setPoidsOfficiel(competiteur.poids_officiel?.toString() || competiteur.poids_declare?.toString() || "");
    setPeseeDialog(true);
  };

  const handleEnregistrerPesee = async () => {
    if (!poidsOfficiel || parseFloat(poidsOfficiel) <= 0) {
      toast.error("Veuillez entrer un poids valide");
      return;
    }

    try {
      const response = await axios.put(
        `${API}/pesee/${selectedCompetiteur.competiteur_id}`,
        { poids_officiel: parseFloat(poidsOfficiel) },
        { withCredentials: true }
      );
      
      if (response.data.categorie_changee) {
        toast.warning("Attention: la catégorie a changé suite à la pesée");
      } else {
        toast.success("Pesée enregistrée");
      }
      
      setPeseeDialog(false);
      fetchPesee();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    }
  };

  const handleAnnulerPesee = async (competiteurId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette pesée ?")) return;
    
    try {
      await axios.delete(`${API}/pesee/${competiteurId}`, { withCredentials: true });
      toast.success("Pesée annulée");
      fetchPesee();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleExportPesee = () => {
    const headers = ["Nom", "Prénom", "Club", "Sexe", "Poids déclaré", "Poids officiel", "Catégorie", "Statut pesée"];
    const rows = filteredCompetiteurs.map(c => [
      c.nom,
      c.prenom,
      c.club,
      c.sexe,
      c.poids_declare,
      c.poids_officiel || "-",
      c.categorie_nom,
      c.pese ? "Pesé" : "Non pesé"
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pesee_${competition.competition_id}.csv`;
    link.click();
  };

  const filteredCompetiteurs = competiteurs.filter(c => {
    const matchSearch = 
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.club.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPese = 
      filterPese === "all" ||
      (filterPese === "pese" && c.pese) ||
      (filterPese === "non_pese" && !c.pese);
    return matchSearch && matchPese;
  });

  const stats = {
    total: competiteurs.length,
    peses: competiteurs.filter(c => c.pese).length,
    nonPeses: competiteurs.filter(c => !c.pese).length
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
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
              Pesée
            </h1>
            <p className="text-slate-500 mt-1">Gestion des poids officiels</p>
          </div>
          
          <Button variant="outline" onClick={handleExportPesee} data-testid="export-pesee-btn">
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex gap-4 justify-center">
                <div className="text-center px-6 py-3 bg-slate-50 rounded-lg">
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="text-center px-6 py-3 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{stats.peses}</p>
                  <p className="text-xs text-slate-500">Pesés</p>
                </div>
                <div className="text-center px-6 py-3 bg-amber-50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{stats.nonPeses}</p>
                  <p className="text-xs text-slate-500">À peser</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Barre de progression */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${(stats.peses / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700">
                {Math.round((stats.peses / stats.total) * 100)}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                    data-testid="search-pesee"
                  />
                </div>
                <Select value={filterPese} onValueChange={setFilterPese}>
                  <SelectTrigger className="w-48" data-testid="filter-pesee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pese">Pesés</SelectItem>
                    <SelectItem value="non_pese">Non pesés</SelectItem>
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
          transition={{ delay: 0.25 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {filteredCompetiteurs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Scale className="h-12 w-12 mb-4 text-slate-300" />
                  <p className="text-lg font-medium">Aucun compétiteur</p>
                  <p className="text-sm">Ajoutez des compétiteurs à cette compétition</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Statut</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Club</TableHead>
                        <TableHead>Sexe</TableHead>
                        <TableHead>Poids déclaré</TableHead>
                        <TableHead>Poids officiel</TableHead>
                        <TableHead>Catégorie</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompetiteurs.map((comp) => (
                        <TableRow key={comp.competiteur_id} className={`hover:bg-slate-50/50 ${!comp.pese ? 'bg-amber-50/30' : ''}`}>
                          <TableCell>
                            {comp.pese ? (
                              <Badge className="bg-green-100 text-green-700">
                                <Check className="h-3 w-3 mr-1" />
                                Pesé
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                À peser
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {comp.prenom} {comp.nom}
                          </TableCell>
                          <TableCell>{comp.club}</TableCell>
                          <TableCell>
                            <Badge variant={comp.sexe === "M" ? "default" : "secondary"}>
                              {comp.sexe}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {comp.poids_declare} kg
                          </TableCell>
                          <TableCell className="font-bold">
                            {comp.poids_officiel ? (
                              <span className={comp.poids_officiel !== comp.poids_declare ? "text-blue-600" : ""}>
                                {comp.poids_officiel} kg
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={!comp.categorie_id ? "text-red-500" : ""}>
                              {comp.categorie_nom || "Non assignée"}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant={comp.pese ? "outline" : "default"}
                                  onClick={() => handleOpenPesee(comp)}
                                  data-testid={`pesee-${comp.competiteur_id}`}
                                >
                                  <Scale className="h-4 w-4 mr-1" />
                                  {comp.pese ? "Modifier" : "Peser"}
                                </Button>
                                {comp.pese && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:bg-red-50"
                                    onClick={() => handleAnnulerPesee(comp.competiteur_id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
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

        {/* Dialog Pesée */}
        <Dialog open={peseeDialog} onOpenChange={setPeseeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold uppercase tracking-wide">
                Enregistrer la pesée
              </DialogTitle>
            </DialogHeader>
            {selectedCompetiteur && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="font-bold text-lg">
                    {selectedCompetiteur.prenom} {selectedCompetiteur.nom}
                  </p>
                  <p className="text-sm text-slate-500">{selectedCompetiteur.club}</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>Poids déclaré: <strong>{selectedCompetiteur.poids_declare} kg</strong></span>
                    <span>Catégorie: <strong>{selectedCompetiteur.categorie_nom}</strong></span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Poids officiel (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={poidsOfficiel}
                    onChange={(e) => setPoidsOfficiel(e.target.value)}
                    placeholder="Ex: 54.5"
                    autoFocus
                    data-testid="poids-officiel-input"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setPeseeDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleEnregistrerPesee} data-testid="confirm-pesee-btn">
                    <Check className="h-4 w-4 mr-1" />
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
