# Taekwondo Competition Manager - PRD

## Original Problem Statement
Application web de gestion de compétitions de Taekwondo avec:
- Gestion des rôles (Coach et Administrateur)
- Gestion des compétiteurs avec attribution automatique des catégories
- Génération automatique d'arbres de combat (quarts, demi, finale)
- Saisie des résultats avec types de victoire (normale, forfait, abandon, disqualification)
- Attribution des médailles (Or, Argent, Bronze)
- Gestion multi-tatamis
- Historique des modifications
- **Gestion multi-compétitions** avec isolation des données
- **Pesée officielle** avec recalcul automatique des catégories
- **Surclassement** permettant l'inscription dans une catégorie d'âge supérieure

## User Personas
1. **Administrateur**: Gestion complète - compétiteurs, combats, résultats, médailles, utilisateurs, planification, pesée
2. **Coach**: Ajouter des compétiteurs (avec option surclassement), consulter les combats et résultats

## Core Requirements
- ✅ Authentification Google OAuth + JWT
- ✅ Gestion des compétiteurs (CRUD)
- ✅ Catégories automatiques (âge/sexe/poids)
- ✅ Génération d'arbres de combat
- ✅ Gestion multi-tatamis
- ✅ Saisie des résultats (admin only)
- ✅ Attribution des médailles
- ✅ Historique des modifications
- ✅ Interface en français
- ✅ Vue combats à suivre avec filtres
- ✅ Mode déroulement (complet/finales à la fin)
- ✅ Planification horaire
- ✅ Arbre interactif + Export PDF
- ✅ Gestion multi-compétitions
- ✅ Onglet Pesée avec recalcul catégorie
- ✅ **126 catégories officielles FFTA/FFDA**
- ✅ **Surclassement** (inscription dans catégorie supérieure)

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI + Framer Motion
- **Auth**: JWT + Google OAuth (Emergent Auth)

## What's Been Implemented

### Phase 1 (26 Jan 2025)
- Auth endpoints: register, login, Google OAuth session, logout, me
- Competiteurs CRUD with auto-category assignment
- Categories CRUD
- Tatamis CRUD
- Combats: generation (bracket), results, winner propagation
- Medals attribution
- History tracking
- Stats endpoint
- User management (admin only)

### Phase 2 (26 Jan 2025) - Combats & Planification
- GET /api/combats/suivre: Liste enrichie avec filtres
- POST /api/combats/planifier/{categorie_id}: Planification horaire
- GET /api/combats/arbre/{categorie_id}: Arbre complet pour export
- PUT /api/combats/{combat_id}/statut: Gestion des statuts
- POST /api/combats/lancer-categorie/{categorie_id}: Lancement par catégorie
- POST /api/combats/lancer-finales: Lancement des finales
- POST /api/combats/{combat_id}/suivant: Passage au combat suivant
- PUT /api/combats/modifier-ordre: Modification de l'ordre

### Phase 3 (26 Jan 2025) - Multi-compétition & Pesée
- Gestion multi-compétitions avec isolation des données
- Onglet Pesée avec poids officiel et recalcul catégorie
- Contrôle d'accès basé sur les rôles (admin/coach)

### Phase 4 (5 Feb 2026) - Catégories Officielles & Surclassement
- **POST /api/categories/seed/{competition_id}**: Création des 126 catégories officielles FFTA/FFDA
  - Pupilles 1 (6 ans), Pupilles 2 (7 ans)
  - Benjamins (8-9 ans)
  - Minimes (10-11 ans)
  - Cadets (12-13 ans)
  - Juniors (14-17 ans)
  - Seniors (18-29 ans)
  - Masters (30+ ans)
- **GET /api/categories/for-surclassement/{competition_id}**: Catégories disponibles pour surclassement
- **GET /api/categories/age-groups**: Liste des groupes d'âge officiels
- **Surclassement à l'inscription**:
  - Option checkbox dans le formulaire d'ajout
  - Dropdown avec catégories d'âge supérieur
  - Validation du poids par rapport à la catégorie choisie
  - Badge "Surclassé" affiché dans la liste des compétiteurs

### Frontend Pages
- LoginPage: JWT + Google Auth
- Dashboard: Stats overview
- **CompetitionsPage**: Liste, création, sélection de compétitions
- **CompetiteursPage**: List, add (avec surclassement), edit, delete
- **PeseePage**: Pesée officielle avec recalcul catégorie
- **CategoriesPage**: List avec bouton "Catégories officielles" pour seeding
- TatamisPage: List, create, delete
- CombatsPage: View brackets, enter results
- CombatsSuivrePage: Vue temps réel avec filtres et lancement
- ArbreCombatsPage: Visualisation arbre + Export PDF
- ResultatsPage: Podium display, medal attribution
- UsersPage: Role management (admin)
- HistoriquePage: Modification audit trail

## Prioritized Backlog

### P0 (Critical) - Done
- ✅ Authentication (JWT + Google)
- ✅ Bracket generation
- ✅ Results entry
- ✅ Medal attribution
- ✅ Vue combats à suivre
- ✅ Planification horaire
- ✅ Export PDF
- ✅ Multi-compétition
- ✅ Pesée officielle
- ✅ Catégories officielles FFTA/FFDA
- ✅ Surclassement

### P1 (High Priority)
- Synchroniser toutes les pages frontend avec competition_id
- Drag & drop pour réorganiser les combats
- Timer de combat intégré avec buzzer

### P2 (Medium Priority)
- Mode hors-ligne amélioré (PWA)
- Statistiques avancées par compétiteur
- Notifications en temps réel (WebSocket)
- Gestion des pauses programmées

### P3 (Nice to have)
- Multi-langues
- Dark mode
- Application mobile native

## Test Credentials
- **Admin**: admin2@test.com / admin123
- **Competition test**: comp_535694c8e8dc (Open de Paris 2026)

## Next Tasks
1. ~~Implémenter les catégories officielles FFTA/FFDA~~
2. ~~Implémenter le surclassement~~
3. Synchroniser le frontend avec competition_id sur toutes les pages
4. Améliorer l'UX du drag & drop pour réorganisation
5. Ajouter timer de combat avec contrôles
