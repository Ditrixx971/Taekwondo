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

### Nouvelles fonctionnalités (v2)
- Vue des combats à suivre en temps réel avec filtres
- Mode de déroulement: complet ou finales à la fin
- Planification horaire avec heure de début et durée par combat
- Arbre des combats interactif avec export PDF
- Gestion des statuts (à venir, en cours, terminé, non disputé)

## User Personas
1. **Administrateur**: Gestion complète - compétiteurs, combats, résultats, médailles, utilisateurs, planification
2. **Coach**: Ajouter des compétiteurs, consulter les combats et résultats en temps réel

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

### Phase 2 (26 Jan 2025) - Nouvelles fonctionnalités
- GET /api/combats/suivre: Liste enrichie avec filtres
- POST /api/combats/planifier/{categorie_id}: Planification horaire
- GET /api/combats/arbre/{categorie_id}: Arbre complet pour export
- PUT /api/combats/{combat_id}/statut: Gestion des statuts
- POST /api/combats/lancer-categorie/{categorie_id}: Lancement par catégorie
- POST /api/combats/lancer-finales: Lancement des finales
- POST /api/combats/{combat_id}/suivant: Passage au combat suivant
- PUT /api/combats/modifier-ordre: Modification de l'ordre

### Frontend Pages
- LoginPage: JWT + Google Auth
- Dashboard: Stats overview
- CombatsSuivrePage: Vue temps réel avec filtres et lancement
- ArbreCombatsPage: Visualisation arbre + Export PDF
- CompetiteursPage: List, add, edit, delete
- CategoriesPage: List, create, delete
- TatamisPage: List, create, delete
- CombatsPage: View brackets, enter results
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

### P1 (High Priority)
- Drag & drop pour réorganiser les combats
- Timer de combat intégré avec buzzer
- Mode hors-ligne amélioré (PWA)

### P2 (Medium Priority)
- Statistiques avancées par compétiteur
- Notifications en temps réel (WebSocket)
- Gestion des pauses programmées

### P3 (Nice to have)
- Multi-langues
- Dark mode
- Application mobile native

## Next Tasks
1. Améliorer l'UX du drag & drop pour réorganisation
2. Ajouter timer de combat avec contrôles
3. Implémenter PWA pour usage offline
4. Ajouter WebSocket pour mise à jour temps réel
