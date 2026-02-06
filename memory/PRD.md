# Taekwondo Competition Manager - PRD

## Original Problem Statement
Application web de gestion de compétitions de Taekwondo **simplifiée et centrée sur une seule compétition active**. L'application doit:
- Être utilisable par un administrateur, des coachs et un super-admin (MASTER)
- Gérer les inscriptions, la pesée, les combats et les résultats
- Respecter les règles officielles Taekwondo (élimination directe, finales à la fin)
- Répartir automatiquement les combats sur plusieurs aires de combat
- Permettre la validation des coachs par compétition
- Supporter l'import/export Excel des compétiteurs

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

## Test Credentials
- **Admin**: admin2@test.com / admin123
- **Coach**: coach_test@test.com / coach123
- **Competition test**: comp_535694c8e8dc (Open de Paris 2026)

## Test Status
- **Backend**: 100% (iteration_6.json - 19/19 tests)
- **Frontend**: 100%
- **Test files**: 
  - `/app/backend/tests/test_aires_combat_arbitre.py`
  - `/app/backend/tests/test_phase1_features.py`
  - `/app/backend/tests/test_phase2_features.py`

## Backlog

### P1 (Phase 3 - Haute priorité)
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
