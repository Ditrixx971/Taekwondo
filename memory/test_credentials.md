# Test Credentials

## Comptes principaux

### Master / Admin
- **Email:** admin2@test.com
- **Password:** admin123
- **Role:** master

### Coach
- **Email:** coach_test@test.com
- **Password:** coach123
- **Role:** coach

## Compétition de test
- **ID:** comp_52f906b963d6
- **Nom:** OPEN PETIT BOURG

## Endpoints clés (non-protégés)
- `GET /api/auth/check-master` → `{has_master: bool, master_count: int}`
- `POST /api/auth/setup-master` (authentifié) → Promeut le user en MASTER si aucun MASTER n'existe
