import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { UserCog, Shield, User } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API}/users/${userId}/role?role=${newRole}`, {}, { withCredentials: true });
      toast.success("Rôle mis à jour");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la mise à jour");
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
            Gestion des utilisateurs
          </h1>
          <p className="text-slate-500 mt-1">{users.length} utilisateur(s) enregistré(s)</p>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle actuel</TableHead>
                      <TableHead>Changer le rôle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                              {u.picture ? (
                                <img src={u.picture} alt={u.name} className="w-10 h-10 rounded-full" />
                              ) : (
                                <User className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{u.name}</p>
                              {u.user_id === currentUser.user_id && (
                                <span className="text-xs text-blue-500">(Vous)</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role === "admin" ? (
                              <><Shield className="h-3 w-3 mr-1" /> Administrateur</>
                            ) : (
                              <><User className="h-3 w-3 mr-1" /> Coach</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.user_id === currentUser.user_id ? (
                            <span className="text-sm text-slate-400">-</span>
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={(val) => handleRoleChange(u.user_id, val)}
                            >
                              <SelectTrigger className="w-40" data-testid={`role-select-${u.user_id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="coach">Coach</SelectItem>
                                <SelectItem value="admin">Administrateur</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                <UserCog className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">Permissions par rôle :</p>
                  <ul className="space-y-1">
                    <li><strong>Coach :</strong> Ajouter des compétiteurs, voir les combats et résultats</li>
                    <li><strong>Administrateur :</strong> Accès complet - gestion des compétiteurs, combats, résultats, médailles et utilisateurs</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
