import { Layout } from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { 
  Trophy, 
  Users, 
  TreeDeciduous, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  HelpCircle,
  ArrowRight,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";

export default function AidePage() {
  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <HelpCircle className="h-8 w-8" />
            Guide de l&apos;application
          </h1>
          <p className="text-slate-500 mt-2">
            Comprendre le fonctionnement de l&apos;arbre de combat et des règles de compétition
          </p>
        </motion.div>

        {/* Arbre de combat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreeDeciduous className="h-5 w-5 text-green-600" />
                Fonctionnement de l&apos;arbre de combat
              </CardTitle>
              <CardDescription>
                Nombre pair et impair de combattants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-slate-600">
                L&apos;application génère automatiquement un <strong>arbre de combats équilibré</strong>, 
                quelle que soit la taille de la catégorie. L&apos;objectif est toujours d&apos;arriver à une 
                structure standard basée sur une <strong>puissance de 2</strong> (2, 4, 8, 16…).
              </p>

              <Separator />

              {/* Nombre pair */}
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-500">Pair</Badge>
                  Nombre pair de combattants (4, 6, 8, 16…)
                </h3>
                <p className="text-slate-600 mb-4">
                  Tous les combattants commencent au même niveau de l&apos;arbre.
                </p>

                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-blue-800">Exemple : 4 combattants</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-2">Demi-finales :</p>
                      <ul className="text-sm text-blue-600 space-y-1">
                        <li>• Combat 1 : A vs B</li>
                        <li>• Combat 2 : C vs D</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-2">Finale :</p>
                      <p className="text-sm text-blue-600">Vainqueur 1 vs Vainqueur 2</p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 flex items-center gap-1 mt-2">
                    <ArrowRight className="h-4 w-4" />
                    Tous les combattants effectuent le même nombre de combats, sans avantage.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Nombre impair */}
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
                  <Badge className="bg-amber-500">Impair</Badge>
                  Nombre impair de combattants (3, 5, 7, 9…)
                </h3>
                <p className="text-slate-600 mb-4">
                  Lorsqu&apos;une catégorie contient un nombre impair de combattants, 
                  l&apos;application crée automatiquement un ou plusieurs <strong>BYE</strong>.
                </p>

                <div className="bg-amber-50 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-amber-800 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Qu&apos;est-ce qu&apos;un BYE ?
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Un BYE permet à un combattant d&apos;accéder directement au tour suivant sans combattre.
                    C&apos;est une pratique standard dans les tournois sportifs.
                  </p>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-amber-800">Exemple : 5 combattants</p>
                  <p className="text-sm text-amber-700 mb-2">
                    Objectif : arriver à 4 combattants pour les demi-finales.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-1">Tour préliminaire :</p>
                      <ul className="text-sm text-amber-600 space-y-1">
                        <li>• Combat 1 : A vs B</li>
                        <li>• C, D et E passent automatiquement (BYE)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-1">Demi-finales :</p>
                      <ul className="text-sm text-amber-600 space-y-1">
                        <li>• Vainqueur A/B vs C</li>
                        <li>• D vs E</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-1">Finale :</p>
                      <p className="text-sm text-amber-600">Vainqueurs des demi-finales</p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-700 flex items-center gap-1 mt-2">
                    <ArrowRight className="h-4 w-4" />
                    Un combattant peut faire un combat de plus, ce qui est normal en nombre impair.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Règles de gestion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Règles de gestion appliquées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Arbre automatiquement ajusté à une puissance de 2</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Répartition équitable des BYE</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Gestion du surclassement (catégorie supérieure)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Détection d&apos;un combattant inscrit dans plusieurs catégories</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Gestion des absences et forfaits (victoire automatique)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Distinction entre victoire par combat, forfait et décision arbitrale</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Modification de l&apos;ordre des combats par l&apos;arbitre</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">Gestion du statut des aires (active / pause / HS)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Types de victoire */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Types de victoire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-green-800">Par combat</p>
                  <p className="text-sm text-green-600 mt-1">
                    Victoire normale suite au combat
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <XCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-bold text-amber-800">Par forfait</p>
                  <p className="text-sm text-amber-600 mt-1">
                    L&apos;adversaire est absent ou abandonne
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="font-bold text-red-800">Décision arbitrale</p>
                  <p className="text-sm text-red-600 mt-1">
                    Disqualification ou décision du jury
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Médailles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Résultats, Podium et Médailles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 mx-auto mb-3 flex items-center justify-center shadow-lg">
                    <Trophy className="h-8 w-8 text-yellow-800" />
                  </div>
                  <p className="font-black text-xl text-yellow-600">🥇 OR</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Vainqueur de la finale
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    (appelé en dernier sur le podium)
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 mx-auto mb-3 flex items-center justify-center shadow-lg">
                    <Trophy className="h-8 w-8 text-slate-600" />
                  </div>
                  <p className="font-black text-xl text-slate-500">🥈 ARGENT</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Finaliste
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    (perdant de la finale)
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 mx-auto mb-3 flex items-center justify-center shadow-lg">
                    <Trophy className="h-8 w-8 text-amber-100" />
                  </div>
                  <p className="font-black text-xl text-amber-700">🥉 BRONZE</p>
                  <p className="text-sm text-slate-600 mt-1">
                    1 ou 2 bronzes selon le règlement
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    (perdants des demi-finales)
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-semibold text-slate-800 mb-2">À savoir :</p>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Les résultats sont affichés par catégorie dans un encadré dédié
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Le podium est visible immédiatement après la finale
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Les finales sont programmées à la fin de la journée de compétition
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conseils pour les arbitres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-slate-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5" />
                Conseils pour les arbitres
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  Utilisez la vue <strong>&quot;Arbitrage multi-aires&quot;</strong> pour surveiller plusieurs aires simultanément
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  Utilisez la vue individuelle (<strong>/arbitre/:aireId</strong>) pour une aire dédiée en plein écran
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  Modifiez l&apos;ordre des combats depuis <strong>&quot;Ordre des combats&quot;</strong> par glisser-déposer
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  En cas de problème sur une aire, passez-la en <strong>Pause</strong> ou <strong>HS</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  Les données se rafraîchissent automatiquement toutes les 5 secondes
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
