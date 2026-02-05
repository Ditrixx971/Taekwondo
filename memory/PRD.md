# Taekwondo Competition Manager - PRD

## Original Problem Statement
Application web de gestion de compétitions de Taekwondo **simplifiée et centrée sur une seule compétition active**. L'application doit:
- Être utilisable par un administrateur et des coachs
- Gérer les inscriptions, la pesée, les combats et les résultats
- Respecter les règles officielles Taekwondo (élimination directe, finales à la fin)
- Répartir automatiquement les combats sur plusieurs aires de combat

## User Personas
1. **Administrateur**: Gestion complète - compétiteurs, combats, résultats, médailles, utilisateurs
2. **Coach**: Ajouter des compétiteurs (avec option surclassement), consulter les combats et résultats

## Core Architecture (Simplifiée)

### Workflow Utilisateur
1. **Connexion** → Page de sélection de compétition
2. **Sélection** de la compétition active (verrouillée pour toute la session)
3. **Workflow**: Inscriptions → Pesée → Aires de combat → Combats → Résultats

### Pages Principales
- `/` - **SelectionCompetitionPage**: Choix de la compétition active
- `/tableau-de-bord` - **DashboardPage**: Vue d'ensemble avec progression
- `/competiteurs` - **CompetiteursPage**: Inscriptions avec option surclassement
- `/pesee` - **PeseePage**: Pesée officielle et attribution automatique de catégorie
- `/categories` - **CategoriesPage**: Catégories officielles FFTA/FFDA
- `/aires-combat` - **AiresCombatPage**: Gestion des 2-3 aires de combat
- `/gestion-combats` - **GestionCombatsPage**: Génération et répartition des combats
- `/arbitre/:aireId` - **ArbitrePage**: Vue par aire pour saisie des résultats
- `/resultats` - **ResultatsPage**: Médailles par catégorie

### Règles Taekwondo Implémentées
- ✅ **Élimination directe**: Un perdant est éliminé définitivement (sauf demi-finale → bronze)
- ✅ **Finales à la fin**: Toutes les finales sont regroupées à la fin de la compétition
- ✅ **126 catégories officielles FFTA/FFDA** (Pupilles 1-2, Benjamins, Minimes, Cadets, Juniors, Seniors, Masters)
- ✅ **Surclassement**: Option pour inscrire un compétiteur dans une catégorie d'âge supérieure

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
- **Finales à la fin**: Toutes les finales regroupées après les combats réguliers
- **Règle élimination**: Perdant marqué comme éliminé (sauf bronze en demi)

## API Endpoints Clés

### Aires de Combat (Nouveaux)
- `POST /api/aires-combat` - Créer une aire
- `GET /api/aires-combat?competition_id=X` - Lister les aires
- `DELETE /api/aires-combat/{aire_id}` - Supprimer
- `POST /api/aires-combat/repartir/{competition_id}` - Répartition automatique

### Arbitre (Nouveaux)
- `GET /api/arbitre/aire/{aire_id}` - Vue complète (combat en cours, à venir, finales)
- `POST /api/arbitre/lancer/{combat_id}` - Lancer un combat
- `POST /api/arbitre/resultat/{combat_id}?vainqueur=rouge/bleu` - Saisir résultat
- `GET /api/arbitre/prochain/{aire_id}` - Prochain combat
- `POST /api/arbitre/verifier-finales/{competition_id}` - Vérifier si finales peuvent commencer

### Catégories
- `POST /api/categories/seed/{competition_id}` - Créer les 126 catégories officielles
- `GET /api/categories/for-surclassement/{competition_id}?sexe=M&age=10` - Catégories pour surclassement

## Test Credentials
- **Admin**: admin2@test.com / admin123
- **Competition test**: comp_535694c8e8dc (Open de Paris 2026)
- **Aires de combat**: Aire A, Aire B

## Test Status
- **Backend**: 100% (14/14 tests passés)
- **Frontend**: 100% (toutes les pages fonctionnelles)
- **Test file**: `/app/backend/tests/test_aires_combat_arbitre.py`

## Backlog

### P1 (Haute priorité)
- [ ] Timer de combat intégré avec contrôles (pause, reprise)
- [ ] Notifications sonores pour appel des combattants
- [ ] Améliorer le responsive mobile pour la vue arbitre

### P2 (Moyenne priorité)
- [ ] Export PDF des résultats et médailles
- [ ] Statistiques par club
- [ ] Mode hors-ligne amélioré (PWA)

### P3 (Nice to have)
- [ ] Multi-langues
- [ ] Dark mode
- [ ] Application mobile native

## Architecture Technique
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Auth**: JWT + Google OAuth (Emergent Auth)
- **État**: React Context pour compétition active
