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

## User Personas
1. **Administrateur**: Gestion complète - compétiteurs, combats, résultats, médailles, utilisateurs
2. **Coach**: Ajouter des compétiteurs, consulter les combats et résultats

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

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT + Google OAuth (Emergent Auth)

## What's Been Implemented (26 Jan 2025)

### Backend (server.py)
- Auth endpoints: register, login, Google OAuth session, logout, me
- Competiteurs CRUD with auto-category assignment
- Categories CRUD
- Tatamis CRUD
- Combats: generation (bracket), results, winner propagation
- Medals attribution
- History tracking
- Stats endpoint
- User management (admin only)

### Frontend
- LoginPage: JWT + Google Auth
- Dashboard: Stats overview
- CompetiteursPage: List, add, edit, delete
- CategoriesPage: List, create, delete
- TatamisPage: List, create, delete
- CombatsPage: View brackets, enter results
- ResultatsPage: Podium display, medal attribution
- UsersPage: Role management (admin)
- HistoriquePage: Modification audit trail

### Design System
- Light professional theme
- Fonts: Chivo (headings), Manrope (body)
- Colors: Slate base, Red (Hong), Blue (Chung), Gold/Silver/Bronze accents
- Full French interface

## Prioritized Backlog

### P0 (Critical) - Done
- ✅ Authentication (JWT + Google)
- ✅ Bracket generation
- ✅ Results entry
- ✅ Medal attribution

### P1 (High Priority)
- Export PDF des résultats
- Impression des feuilles de match
- Mode hors-ligne amélioré (PWA)

### P2 (Medium Priority)
- Statistiques avancées par compétiteur
- Timer de combat intégré
- Notifications en temps réel

### P3 (Nice to have)
- Multi-langues
- Dark mode
- Application mobile native

## Next Tasks
1. Test complet du flux médailles après finale
2. Améliorer l'affichage de l'arbre des combats (bracket visualization)
3. Ajouter export PDF des résultats
4. Implémenter PWA pour usage offline
