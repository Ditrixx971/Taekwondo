# Taekwondo Competition Manager - PRD

## Original Problem Statement
Application web de gestion de compétitions de Taekwondo **simplifiée et centrée sur une seule compétition active**. L'application doit:
- Être utilisable par un administrateur, des coachs et un super-admin (MASTER)
- Gérer les inscriptions, la pesée, les combats et les résultats
- Respecter les règles officielles Taekwondo (élimination directe, finales à la fin)
- Répartir automatiquement les combats sur plusieurs aires de combat
- Permettre la validation des coachs par compétition
- Supporter l'import/export Excel des compétiteurs
- **Module Combat Manuel**: Permettre la création, modification et connexion manuelle des combats

## User Personas
1. **MASTER (Super-admin)**: Gestion totale - tous les droits admin + suppression d'utilisateurs
2. **Administrateur**: Gestion complète - compétiteurs, combats, résultats, médailles, validation des coachs
3. **Coach**: Ajouter des compétiteurs (validé par compétition), consulter les combats et résultats

## Core Architecture (Simplifiée)

### Workflow Utilisateur
1. **Connexion** → Page de sélection de compétition
2. **Sélection** de la compétition active (verrouillée pour toute la session)
3. **Workflow**: Inscriptions → Pesée → Aires de combat → Combats → Résultats

### Pages Principales
- `/` - **SelectionCompetitionPage**: Choix de la compétition active
- `/tableau-de-bord` - **DashboardPage**: Vue d'ensemble avec progression
- `/competiteurs` - **CompetiteursPage**: Inscriptions + Import/Export Excel
- `/pesee` - **PeseePage**: Pesée officielle et attribution automatique de catégorie
- `/categories` - **CategoriesPage**: Catégories officielles FFTA/FFDA
- `/aires-combat` - **AiresCombatPage**: Gestion des 2-3 aires de combat
- `/gestion-combats` - **GestionCombatsPage**: Génération et répartition des combats
- `/arbre-combat` - **ArbreCombatPage**: Visualisation arbre de combat (bracket)
- `/ordre-combats` - **OrdreCombatsPage**: Liste ordonnée avec drag & drop
- `/arbitre/:aireId` - **ArbitrePage**: Vue par aire pour saisie des résultats
- `/resultats` - **ResultatsPage**: Médailles et podiums par catégorie
- `/users` - **UsersPage**: Gestion des utilisateurs et rôles
- `/coaches-competition` - **CoachesCompetitionPage**: Validation des coachs par compétition

## What's Been Implemented

### Phase 1 (26 Jan 2025) - MVP
- Auth JWT + Google OAuth
- CRUD Compétiteurs avec attribution auto de catégorie
- CRUD Catégories et Tatamis
- Génération d'arbres de combat
- Saisie des résultats et médailles

### Phase 2 (26 Jan 2025) - Combats
- Vue combats à suivre
- Planification horaire
- Export PDF des arbres

### Phase 3 (26 Jan 2025) - Multi-compétition
- Gestion multi-compétitions
- Onglet Pesée
- Contrôle d'accès admin/coach

### Phase 4 (5 Feb 2026) - Catégories & Surclassement
- 126 catégories officielles FFTA/FFDA
- Option surclassement à l'inscription
- Attribution automatique basée sur âge/sexe/poids

### Phase 5 (5 Feb 2026) - SIMPLIFICATION & AIRES DE COMBAT ✅
- **Architecture simplifiée**: Une seule compétition active à la fois
- **CompetitionContext**: État global de la compétition sélectionnée
- **SelectionCompetitionPage**: Page d'entrée pour choisir la compétition
- **Aires de combat**: Remplacement de "tatami" par "aire de combat"
- **Répartition automatique**: Combats distribués équitablement sur les aires
- **Vue Arbitre par aire**: Interface dédiée pour saisie rapide des résultats

### Phase 6 (6 Feb 2026) - PHASE 1 UTILISATEUR ✅
- **Drag & Drop des combats** (via @dnd-kit): Réorganisation de l'ordre des combats sur une aire
- **Gestion statut aires**: Boutons Active/Pause/HS avec persistance
- **Arbre de combat visuel**: Affichage bracket (quarts, demis, finale, bronze)
- **Page Ordre des combats**: Liste ordonnée avec horaires approximatifs
- **Page Résultats améliorée**: Statistiques, collapsibles par catégorie, podium

### Phase 7 (6 Feb 2026) - PHASE 2 UTILISATEUR ✅
- **Rôle MASTER (Super-admin)**: Accès total à toutes les compétitions + gestion des utilisateurs + suppression de comptes
- **Validation coachs par compétition**: Chaque coach doit être autorisé individuellement par compétition
- **Page CoachesCompetitionPage**: Interface pour gérer les coachs autorisés
- **Import/Export Excel des compétiteurs**:
  - Export: Génère un fichier .xlsx avec tous les compétiteurs de la compétition
  - Template: Téléchargement d'un modèle Excel avec validation des données
  - Import: Upload d'un fichier Excel avec création automatique des compétiteurs
- **Page UsersPage améliorée**: Support des 3 rôles, suppression d'utilisateurs (MASTER only)

### Phase 8 (21 Mar 2026) - MODULE COMBAT MANUEL - Backend ✅
- **Modèle Combat étendu**: Nouveaux champs pour connexions manuelles
  - `mode_creation`: "auto" ou "manuel"
  - `combat_suivant_id`: ID du combat où le vainqueur va
  - `combat_suivant_slot`: "rouge" ou "bleu"
  - `combat_source_rouge_id`, `combat_source_bleu_id`: Sources des combattants
  - `pret`: Statut si le combat est prêt (deux combattants définis)
  - `nom_personnalise`: Nom personnalisé pour le combat
- **CRUD Combats Manuels**: Création, modification, suppression
- **Système de connexion**: Connecter/déconnecter les combats entre eux
- **Propagation vainqueur**: Via connexions manuelles OU automatique
- **Distribution automatique**: Round-robin sur les aires actives
- **API "Combats prêts"**: Liste les combats prêts à être lancés

### Phase 9 (21 Mar 2026) - MODULE COMBAT MANUEL - Frontend ✅
- **Page CombatsManuelPage** (`/combats-manuel`): Éditeur visuel graphique
  - Affichage en colonnes par tour (quarts, demis, finales, manuel)
  - Nœuds de combat interactifs avec indicateurs de statut
  - Panneau de détails pour modifier les combats
  - Dialogue de création de nouveaux combats
  - Système de connexion visuel (icônes chaîne)
  - Distribution automatique sur aires
- **Navigation intégrée**: 
  - Lien dans le menu latéral "Éditeur manuel"
  - Bouton d'accès depuis la page Gestion Combats
  - Navigation vers la vue arbre standard

### Phase 10 (21 Mar 2026) - Tri des compétiteurs ✅
- **Tri interactif sur la page Inscriptions**:
  - Colonnes triables: Nom, Club, Sexe, Poids déclaré, Poids officiel, Catégorie
  - Indicateurs visuels (↑/↓) sur la colonne active
  - Tri ascendant/descendant en cliquant sur l'en-tête
  - Compatible avec la recherche et les filtres existants

### Phase 11 (30 Mar 2026) - Refonte Ordre des Combats ✅
- **Affichage complet des combattants**: Nom complet + Club + Catégorie affichés pour chaque combattant
- **Combats "À déterminer"**: Toujours visibles avec badge TBD et bordure en pointillés
- **Export PDF** (jsPDF + jspdf-autotable):
  - Format A4 Paysage
  - Header avec nom de la compétition et titre "ORDRE DE PASSAGE DES COMBATS"
  - Footer avec date/heure de génération et numéro de page
  - Tableau avec colonnes: #, Heure, Aire, Tour, Catégorie, BLEU, ROUGE, Statut
  - Couleurs différenciées pour les combattants Bleu/Rouge
- **Impression optimisée** (CSS @media print):
  - Masquage automatique de la sidebar et éléments non imprimables
  - Format A4 paysage forcé
  - Titre personnalisé avec statistiques
- **Statistiques étendues**: 5 compteurs (Total, Terminés, En cours, À déterminer, Finales)
- **Vues Colonnes/Unifié**: Basculement entre vue par aire et vue chronologique

### Phase 12 (30 Mar 2026) - Refonte Génération Arbre (Règles World Taekwondo) ✅
- **Bracket par puissance de 2**: Génération automatique du bracket complet selon la taille
  - 2 participants  → 1 combat (Finale directe)
  - 3-4 participants → 3 combats (2 Demis + Finale)
  - 5-8 participants → 7 combats (Quarts + Demis + Finale)
  - 9-16 participants → 15 combats (8èmes + Quarts + Demis + Finale)
  - 17-32 participants → 31 combats (16èmes + 8èmes + Quarts + Demis + Finale)
- **PAS de combat bronze** (règle World Taekwondo):
  - Les deux perdants des demi-finales reçoivent le bronze ex-aequo
  - Suppression de la génération et propagation vers combat bronze
- **Gestion des BYEs**:
  - Attribution automatique aux premiers inscrits
  - API GET/PUT `/api/categories/{id}/byes` pour consulter/modifier
  - Interface modale pour le MASTER de modifier les BYEs
  - Verrouillage des BYEs une fois le premier combat commencé
  - Répartition stratégique des BYEs dans le bracket
- **Podium automatique**:
  - 🥇 Or: Vainqueur de la finale
  - 🥈 Argent: Perdant de la finale
  - 🥉 Bronze: Perdant demi-finale 1 (ex-aequo)
  - 🥉 Bronze: Perdant demi-finale 2 (ex-aequo)
- **Nouveaux tours supportés**: seizieme, huitieme, quart, demi, finale
- **Page ArbreCombatPage refactorisée**:
  - Affichage dynamique de tous les tours
  - Section Podium avec affichage visuel
  - Bouton "Modifier BYEs" pour le MASTER
  - Information bracket_size et num_byes dans l'en-tête

### Phase 13 (31 Mar 2026) - Refonte UI Arbre des Combats ✅
- **Design compact et professionnel**:
  - Composant MatchCompact : une ligne par combattant avec points colorés (bleu/rouge)
  - Hauteur max 60px par combat, police 12-13px
  - Clubs affichés entre parenthèses
  - Trophée jaune discret pour le vainqueur
- **Colonnes de tours**:
  - Organisation horizontale : Quarts → Demis → Finale → Champion
  - Labels en haut de chaque colonne
  - Espacement dynamique selon la profondeur du tour
- **Export PDF (jsPDF)**:
  - Format A4 paysage (A3 pour brackets >15 combats)
  - En-tête : Nom compétition + Catégorie + Date
  - Combats avec codes couleurs B:/R:
  - Pied de page : Date d'impression + Page N/N
  - Fichier nommé : arbre_{categorie}_{date}.pdf
- **Impression optimisée**:
  - CSS @media print avec @page A4 landscape
  - Masquage sidebar et boutons
  - En-tête et pied de page imprimés
- **Podium compact**:
  - Style médailles avec emoji 🥇🥈🥉
  - Bronze ex-aequo affiché côte à côte
  - Message "Règles World Taekwondo"

### Phase 14 (31 Mar 2026) - Correction Logique Génération Arbre ✅
- **Règle fondamentale - Puissance de 2 stricte**:
  - 2 combattants → bracket de 2 (finale)
  - 3-4 combattants → bracket de 4 (demis + finale)
  - 5-8 combattants → bracket de 8 (quarts + demis + finale)
  - 9-16 combattants → bracket de 16 (8èmes + quarts + demis + finale)
  - 17-32 combattants → bracket de 32 (16èmes + 8èmes + quarts + demis + finale)
- **Tests passés**: Backend 7/7 (100%) + Frontend 10/10 (100%)

### Phase 15 (31 Mar 2026) - Logique Anti-BYE Visuel ✅
- **Nouvelle règle fondamentale**: Un combat est créé UNIQUEMENT si les 2 combattants sont connus (A != null ET B != null)
- **Comportement des BYEs**:
  - Les BYEs ne créent PAS de combat visible
  - Les gagnants par BYE sont propagés automatiquement et silencieusement
  - Les gagnants BYE sont stockés dans `bracket_structure.known_rouge/known_bleu` pour création dynamique
- **Création dynamique des combats**:
  - Les combats futurs (quarts, demis, finale) sont créés lors de la saisie des résultats
  - Quand un résultat est saisi, le système vérifie si le combat suivant peut être créé (2 combattants connus)
  - La fonction `propager_vainqueur` crée les combats dynamiquement
- **Exemple vérifié pour 13 combattants**:
  - Bracket size = 16 ✅
  - BYEs = 3 (16-13) ✅
  - Combats créés à la génération = 5 (et non 8 avec des BYEs) ✅
  - API `/api/combats/arbre` retourne 0 combat avec rouge/bleu = null ✅
- **Frontend**:
  - 0 occurrence de "À déterminer" dans l'affichage de l'arbre
  - Affichage propre sans combats "fantômes"
- **Tests passés**: Backend 10/10 (100%) + Frontend 8/8 (100%)

## API Endpoints Clés

### Gestion des utilisateurs
- `GET /api/users` - Liste tous les utilisateurs (admin+)
- `PUT /api/users/{user_id}/role?role=X` - Change le rôle (admin peut coach<->admin, master peut tout)
- `DELETE /api/users/{user_id}` - Supprime un utilisateur (MASTER only)

### Validation des coachs par compétition
- `GET /api/competitions/{competition_id}/coaches` - Liste les coachs autorisés
- `GET /api/competitions/{competition_id}/coaches/available` - Liste les coachs disponibles (non autorisés)
- `POST /api/competitions/{competition_id}/coaches/{coach_id}` - Autorise un coach
- `DELETE /api/competitions/{competition_id}/coaches/{coach_id}` - Retire un coach

### Import/Export Excel
- `GET /api/excel/competiteurs/export/{competition_id}` - Export des compétiteurs en Excel
- `GET /api/excel/competiteurs/template` - Télécharge le template d'import
- `POST /api/excel/competiteurs/import/{competition_id}` - Import des compétiteurs depuis Excel

### Aires de Combat
- `POST /api/aires-combat` - Créer une aire
- `GET /api/aires-combat?competition_id=X` - Lister les aires
- `PUT /api/aires-combat/{aire_id}` - Modifier nom/statut (active/pause/hs)

### Ordre et Drag & Drop
- `GET /api/combats/ordre/{aire_id}` - Liste ordonnée des combats
- `PUT /api/combats/reorder/{aire_id}` - Sauvegarder nouvel ordre (drag & drop)
- `POST /api/combats/{combat_id}/forfait` - Déclarer forfait

### Arbre de Combat
- `GET /api/combats/arbre/{categorie_id}` - Données de l'arbre (quarts, demis, finale, bronze)

### Combats Manuels (NOUVEAU)
- `POST /api/combats-manuels` - Créer un combat manuel
- `PUT /api/combats-manuels/{combat_id}` - Modifier un combat manuel
- `DELETE /api/combats-manuels/{combat_id}` - Supprimer un combat manuel
- `POST /api/combats-manuels/connecter` - Connecter le vainqueur d'un combat vers un autre
- `POST /api/combats-manuels/deconnecter` - Déconnecter une connexion
- `GET /api/combats-manuels/prets/{competition_id}` - Combats prêts à être lancés
- `GET /api/combats-manuels/non-assignes/{competition_id}` - Combats prêts non assignés
- `POST /api/combats-manuels/assigner-aire` - Assigner un combat à une aire
- `POST /api/combats-manuels/distribution-auto/{competition_id}` - Distribution round-robin
- `GET /api/combats-manuels/arbre/{categorie_id}` - Arbre avec connexions pour UI graphique

## Test Credentials
- **Admin**: admin2@test.com / admin123
- **Coach**: coach_test@test.com / coach123
- **Competition test**: comp_52f906b963d6 (OPEN PETIT BOURG)

## Test Status
- **Backend**: 100% (iteration_7.json - 26/26 tests Combat Manuel Backend)
- **Frontend**: 100% (iteration_8.json - 18/18 tests Combat Manuel Frontend)
- **OrdreCombatsPage**: 100% (iteration_9.json - 13/13 tests refonte UI + PDF)
- **Anti-BYE Logic**: 100% (iteration_14.json - 10/10 backend + 8/8 frontend)
- **Test files**: 
  - `/app/backend/tests/test_aires_combat_arbitre.py`
  - `/app/backend/tests/test_phase1_features.py`
  - `/app/backend/tests/test_phase2_features.py`
  - `/app/backend/tests/test_combats_manuels.py`
  - `/app/backend/tests/test_anti_bye_logic.py`

## Backlog

### P0 (Module Combat Manuel)
- [x] Phase 1 - Backend: Modèles et endpoints (TERMINÉ 21 Mar 2026)
- [x] Phase 2 - Frontend: Éditeur visuel graphique (TERMINÉ 21 Mar 2026)
- [ ] Phase 3 - Logique de flux continu: Distribution automatique temps réel vers les aires

### P1 (Haute priorité)
- [ ] Rapports et statistiques (classement des clubs, médailles par club)
- [ ] Export PDF/Excel des résultats
- [ ] Amélioration des filtres sur la page des catégories

### P2 (Nice to have)
- [ ] Timer de combat intégré avec contrôles (pause, reprise)
- [ ] Notifications sonores pour appel des combattants
- [ ] Améliorer le responsive mobile pour la vue arbitre
- [ ] Mode hors-ligne amélioré (PWA)
- [ ] Multi-langues
- [ ] Dark mode

## Architecture Technique
- **Backend**: FastAPI + MongoDB + openpyxl (Excel)
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion + @dnd-kit
- **Auth**: JWT + Google OAuth (Emergent Auth)
- **État**: React Context pour compétition active
