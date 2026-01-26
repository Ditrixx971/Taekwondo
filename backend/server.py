from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "coach"  # coach or admin

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    picture: Optional[str] = None

class Competiteur(BaseModel):
    model_config = ConfigDict(extra="ignore")
    competiteur_id: str = Field(default_factory=lambda: f"comp_{uuid.uuid4().hex[:12]}")
    nom: str
    prenom: str
    date_naissance: str
    sexe: str  # M or F
    poids: float
    club: str
    categorie_id: Optional[str] = None
    disqualifie: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompetiteurCreate(BaseModel):
    nom: str
    prenom: str
    date_naissance: str
    sexe: str
    poids: float
    club: str

class Categorie(BaseModel):
    model_config = ConfigDict(extra="ignore")
    categorie_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    nom: str
    age_min: int
    age_max: int
    sexe: str
    poids_min: float
    poids_max: float

class CategorieCreate(BaseModel):
    nom: str
    age_min: int
    age_max: int
    sexe: str
    poids_min: float
    poids_max: float

class Tatami(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tatami_id: str = Field(default_factory=lambda: f"tat_{uuid.uuid4().hex[:12]}")
    nom: str
    numero: int

class TatamiCreate(BaseModel):
    nom: str
    numero: int

class Combat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    combat_id: str = Field(default_factory=lambda: f"cbt_{uuid.uuid4().hex[:12]}")
    categorie_id: str
    tatami_id: Optional[str] = None
    tour: str  # quart, demi, finale, bronze
    position: int  # position in bracket
    ordre: int = 0  # ordre d'exécution global
    rouge_id: Optional[str] = None
    bleu_id: Optional[str] = None
    vainqueur_id: Optional[str] = None
    score_rouge: int = 0
    score_bleu: int = 0
    type_victoire: Optional[str] = None  # normal, forfait, abandon, disqualification
    statut: str = "a_venir"  # a_venir, en_cours, termine, non_dispute
    termine: bool = False
    heure_debut: Optional[str] = None  # ISO format
    duree_minutes: int = 6  # durée estimée en minutes
    est_pause: bool = False  # si c'est un créneau de pause
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CombatResultat(BaseModel):
    vainqueur_id: str
    score_rouge: int = 0
    score_bleu: int = 0
    type_victoire: str = "normal"

class PlanificationCreate(BaseModel):
    heure_debut_competition: str  # ISO format ex: "09:00"
    duree_combat_minutes: int = 6
    pauses: List[dict] = []  # [{"apres_combat": 10, "duree_minutes": 15}]

class ModifierOrdreCombat(BaseModel):
    combat_id: str
    nouvel_ordre: int
    nouvelle_heure: Optional[str] = None

class Medaille(BaseModel):
    model_config = ConfigDict(extra="ignore")
    medaille_id: str = Field(default_factory=lambda: f"med_{uuid.uuid4().hex[:12]}")
    categorie_id: str
    competiteur_id: str
    type: str  # or, argent, bronze

class HistoriqueResultat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    historique_id: str = Field(default_factory=lambda: f"hist_{uuid.uuid4().hex[:12]}")
    combat_id: str
    ancien_vainqueur_id: Optional[str]
    nouveau_vainqueur_id: str
    ancien_score_rouge: int
    ancien_score_bleu: int
    nouveau_score_rouge: int
    nouveau_score_bleu: int
    modifie_par: str
    modifie_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ AUTH HELPERS ============

async def get_current_user(request: Request) -> User:
    session_token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization")
    
    if auth_header and auth_header.startswith("Bearer "):
        session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expirée")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    return User(**user)

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register")
async def register(data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    from passlib.hash import bcrypt
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "password": bcrypt.hash(data.password),
        "name": data.name,
        "role": data.role,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    session_token = f"sess_{uuid.uuid4().hex}"
    session_doc = {
        "session_id": f"sid_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "email": data.email, "name": data.name, "role": data.role}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    from passlib.hash import bcrypt
    if not bcrypt.verify(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    session_token = f"sess_{uuid.uuid4().hex}"
    session_doc = {
        "session_id": f"sid_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "picture": user.get("picture")
    }

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")
    
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Session invalide")
        oauth_data = resp.json()
    
    email = oauth_data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": oauth_data["name"], "picture": oauth_data.get("picture")}}
        )
        role = existing["role"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": oauth_data["name"],
            "role": "coach",
            "picture": oauth_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        role = "coach"
    
    session_token = oauth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    session_doc = {
        "session_id": f"sid_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": oauth_data["name"],
        "role": role,
        "picture": oauth_data.get("picture")
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"message": "Déconnecté"}

# ============ COMPETITEURS ENDPOINTS ============

def calculate_age(date_naissance: str) -> int:
    birth = datetime.strptime(date_naissance, "%Y-%m-%d")
    today = datetime.now()
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))

async def assign_categorie(competiteur: dict) -> Optional[str]:
    age = calculate_age(competiteur["date_naissance"])
    poids = competiteur["poids"]
    sexe = competiteur["sexe"]
    
    categorie = await db.categories.find_one({
        "sexe": sexe,
        "age_min": {"$lte": age},
        "age_max": {"$gte": age},
        "poids_min": {"$lte": poids},
        "poids_max": {"$gte": poids}
    }, {"_id": 0})
    
    return categorie["categorie_id"] if categorie else None

@api_router.get("/competiteurs", response_model=List[Competiteur])
async def list_competiteurs(categorie_id: Optional[str] = None, club: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {}
    if categorie_id:
        query["categorie_id"] = categorie_id
    if club:
        query["club"] = club
    
    competiteurs = await db.competiteurs.find(query, {"_id": 0}).to_list(1000)
    return competiteurs

@api_router.get("/competiteurs/{competiteur_id}", response_model=Competiteur)
async def get_competiteur(competiteur_id: str, user: User = Depends(get_current_user)):
    comp = await db.competiteurs.find_one({"competiteur_id": competiteur_id}, {"_id": 0})
    if not comp:
        raise HTTPException(status_code=404, detail="Compétiteur non trouvé")
    return comp

@api_router.post("/competiteurs", response_model=Competiteur)
async def create_competiteur(data: CompetiteurCreate, user: User = Depends(get_current_user)):
    comp = Competiteur(**data.model_dump())
    comp_dict = comp.model_dump()
    comp_dict["created_at"] = comp_dict["created_at"].isoformat()
    
    categorie_id = await assign_categorie(comp_dict)
    comp_dict["categorie_id"] = categorie_id
    
    await db.competiteurs.insert_one(comp_dict)
    return comp_dict

@api_router.put("/competiteurs/{competiteur_id}", response_model=Competiteur)
async def update_competiteur(competiteur_id: str, data: CompetiteurCreate, user: User = Depends(require_admin)):
    existing = await db.competiteurs.find_one({"competiteur_id": competiteur_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Compétiteur non trouvé")
    
    update_data = data.model_dump()
    categorie_id = await assign_categorie({**update_data, "date_naissance": update_data["date_naissance"]})
    update_data["categorie_id"] = categorie_id
    
    await db.competiteurs.update_one(
        {"competiteur_id": competiteur_id},
        {"$set": update_data}
    )
    
    updated = await db.competiteurs.find_one({"competiteur_id": competiteur_id}, {"_id": 0})
    return updated

@api_router.delete("/competiteurs/{competiteur_id}")
async def delete_competiteur(competiteur_id: str, user: User = Depends(require_admin)):
    result = await db.competiteurs.delete_one({"competiteur_id": competiteur_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compétiteur non trouvé")
    return {"message": "Compétiteur supprimé"}

# ============ CATEGORIES ENDPOINTS ============

@api_router.get("/categories", response_model=List[Categorie])
async def list_categories(user: User = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=Categorie)
async def create_categorie(data: CategorieCreate, user: User = Depends(require_admin)):
    cat = Categorie(**data.model_dump())
    cat_dict = cat.model_dump()
    await db.categories.insert_one(cat_dict)
    return cat_dict

@api_router.delete("/categories/{categorie_id}")
async def delete_categorie(categorie_id: str, user: User = Depends(require_admin)):
    result = await db.categories.delete_one({"categorie_id": categorie_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return {"message": "Catégorie supprimée"}

# ============ TATAMIS ENDPOINTS ============

@api_router.get("/tatamis", response_model=List[Tatami])
async def list_tatamis(user: User = Depends(get_current_user)):
    tatamis = await db.tatamis.find({}, {"_id": 0}).to_list(100)
    return tatamis

@api_router.post("/tatamis", response_model=Tatami)
async def create_tatami(data: TatamiCreate, user: User = Depends(require_admin)):
    tat = Tatami(**data.model_dump())
    tat_dict = tat.model_dump()
    await db.tatamis.insert_one(tat_dict)
    return tat_dict

@api_router.delete("/tatamis/{tatami_id}")
async def delete_tatami(tatami_id: str, user: User = Depends(require_admin)):
    result = await db.tatamis.delete_one({"tatami_id": tatami_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tatami non trouvé")
    return {"message": "Tatami supprimé"}

# ============ COMBATS ENDPOINTS ============

@api_router.get("/combats/suivre")
async def combats_a_suivre(
    categorie_id: Optional[str] = None,
    tatami_id: Optional[str] = None,
    tour: Optional[str] = None,
    statut: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Récupère les combats à suivre avec filtres"""
    query = {"statut": {"$ne": "termine"}} if not statut else {}
    
    if categorie_id:
        query["categorie_id"] = categorie_id
    if tatami_id:
        query["tatami_id"] = tatami_id
    if tour:
        query["tour"] = tour
    if statut:
        query["statut"] = statut
    
    combats = await db.combats.find(query, {"_id": 0}).sort("ordre", 1).to_list(500)
    
    # Enrichir avec les noms des compétiteurs et catégories
    for combat in combats:
        if combat.get("rouge_id"):
            rouge = await db.competiteurs.find_one({"competiteur_id": combat["rouge_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "club": 1})
            combat["rouge_nom"] = f"{rouge['prenom']} {rouge['nom']}" if rouge else "Inconnu"
            combat["rouge_club"] = rouge.get("club", "") if rouge else ""
        else:
            combat["rouge_nom"] = "À déterminer"
            combat["rouge_club"] = ""
            
        if combat.get("bleu_id"):
            bleu = await db.competiteurs.find_one({"competiteur_id": combat["bleu_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "club": 1})
            combat["bleu_nom"] = f"{bleu['prenom']} {bleu['nom']}" if bleu else "Inconnu"
            combat["bleu_club"] = bleu.get("club", "") if bleu else ""
        else:
            combat["bleu_nom"] = "À déterminer"
            combat["bleu_club"] = ""
        
        cat = await db.categories.find_one({"categorie_id": combat["categorie_id"]}, {"_id": 0, "nom": 1})
        combat["categorie_nom"] = cat["nom"] if cat else "Inconnue"
        
        if combat.get("tatami_id"):
            tatami = await db.tatamis.find_one({"tatami_id": combat["tatami_id"]}, {"_id": 0, "nom": 1, "numero": 1})
            combat["tatami_nom"] = tatami["nom"] if tatami else "Non assigné"
        else:
            combat["tatami_nom"] = "Non assigné"
    
    return combats

@api_router.get("/combats/arbre/{categorie_id}")
async def get_arbre_combats(categorie_id: str, user: User = Depends(get_current_user)):
    """Récupère l'arbre complet des combats pour une catégorie (pour affichage et export PDF)"""
    combats = await db.combats.find({"categorie_id": categorie_id}, {"_id": 0}).to_list(100)
    
    # Enrichir avec les informations
    arbre = {"quart": [], "demi": [], "bronze": [], "finale": []}
    
    for combat in combats:
        # Ajouter les noms des compétiteurs
        if combat.get("rouge_id"):
            rouge = await db.competiteurs.find_one({"competiteur_id": combat["rouge_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "club": 1})
            combat["rouge"] = {"nom": f"{rouge['prenom']} {rouge['nom']}", "club": rouge.get("club", "")} if rouge else {"nom": "Inconnu", "club": ""}
        else:
            combat["rouge"] = {"nom": "À déterminer", "club": ""}
            
        if combat.get("bleu_id"):
            bleu = await db.competiteurs.find_one({"competiteur_id": combat["bleu_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "club": 1})
            combat["bleu"] = {"nom": f"{bleu['prenom']} {bleu['nom']}", "club": bleu.get("club", "")} if bleu else {"nom": "Inconnu", "club": ""}
        else:
            combat["bleu"] = {"nom": "À déterminer", "club": ""}
        
        # Ajouter le vainqueur si terminé
        if combat.get("vainqueur_id"):
            vainqueur = await db.competiteurs.find_one({"competiteur_id": combat["vainqueur_id"]}, {"_id": 0, "nom": 1, "prenom": 1})
            combat["vainqueur_nom"] = f"{vainqueur['prenom']} {vainqueur['nom']}" if vainqueur else "Inconnu"
        
        if combat["tour"] in arbre:
            arbre[combat["tour"]].append(combat)
    
    # Trier par position
    for tour in arbre:
        arbre[tour] = sorted(arbre[tour], key=lambda x: x.get("position", 0))
    
    # Ajouter les infos de la catégorie
    categorie = await db.categories.find_one({"categorie_id": categorie_id}, {"_id": 0})
    
    return {
        "categorie": categorie,
        "arbre": arbre,
        "total_combats": len(combats),
        "combats_termines": len([c for c in combats if c.get("termine")])
    }

@api_router.get("/combats", response_model=List[Combat])
async def list_combats(
    categorie_id: Optional[str] = None,
    tatami_id: Optional[str] = None,
    tour: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    query = {}
    if categorie_id:
        query["categorie_id"] = categorie_id
    if tatami_id:
        query["tatami_id"] = tatami_id
    if tour:
        query["tour"] = tour
    
    combats = await db.combats.find(query, {"_id": 0}).to_list(1000)
    return combats

@api_router.get("/combats/{combat_id}", response_model=Combat)
async def get_combat(combat_id: str, user: User = Depends(get_current_user)):
    combat = await db.combats.find_one({"combat_id": combat_id}, {"_id": 0})
    if not combat:
        raise HTTPException(status_code=404, detail="Combat non trouvé")
    return combat

@api_router.post("/combats/generer/{categorie_id}")
async def generer_tableau(categorie_id: str, tatami_id: Optional[str] = None, user: User = Depends(require_admin)):
    """Génère l'arbre des combats pour une catégorie"""
    # Supprimer les anciens combats de cette catégorie
    await db.combats.delete_many({"categorie_id": categorie_id})
    await db.medailles.delete_many({"categorie_id": categorie_id})
    
    # Récupérer les compétiteurs de la catégorie
    competiteurs = await db.competiteurs.find(
        {"categorie_id": categorie_id, "disqualifie": False},
        {"_id": 0}
    ).to_list(100)
    
    if len(competiteurs) < 2:
        raise HTTPException(status_code=400, detail="Il faut au moins 2 compétiteurs pour générer un tableau")
    
    # Mélanger pour tirage au sort
    random.shuffle(competiteurs)
    
    combats_created = []
    n = len(competiteurs)
    
    async def insert_combat(combat_obj):
        """Helper to insert combat and return clean dict without _id"""
        combat_dict = combat_obj.model_dump()
        combat_dict["created_at"] = combat_dict["created_at"].isoformat()
        await db.combats.insert_one(combat_dict)
        # Remove _id added by MongoDB before returning
        combat_dict.pop("_id", None)
        return combat_dict
    
    if n == 2:
        # Finale directe
        combat = Combat(
            categorie_id=categorie_id,
            tatami_id=tatami_id,
            tour="finale",
            position=1,
            rouge_id=competiteurs[0]["competiteur_id"],
            bleu_id=competiteurs[1]["competiteur_id"]
        )
        combat_dict = await insert_combat(combat)
        combats_created.append(combat_dict)
        
    elif n == 3:
        # Cas spécial: 2 en demi, 1 direct en finale
        # Demi-finale
        demi = Combat(
            categorie_id=categorie_id,
            tatami_id=tatami_id,
            tour="demi",
            position=1,
            rouge_id=competiteurs[0]["competiteur_id"],
            bleu_id=competiteurs[1]["competiteur_id"]
        )
        demi_dict = await insert_combat(demi)
        combats_created.append(demi_dict)
        
        # Finale (vainqueur demi vs 3ème)
        finale = Combat(
            categorie_id=categorie_id,
            tatami_id=tatami_id,
            tour="finale",
            position=1,
            rouge_id=None,  # Sera rempli après la demi
            bleu_id=competiteurs[2]["competiteur_id"]
        )
        finale_dict = await insert_combat(finale)
        combats_created.append(finale_dict)
        
    elif n == 4:
        # 2 demi-finales + 1 finale + match bronze
        for i in range(2):
            demi = Combat(
                categorie_id=categorie_id,
                tatami_id=tatami_id,
                tour="demi",
                position=i + 1,
                rouge_id=competiteurs[i*2]["competiteur_id"],
                bleu_id=competiteurs[i*2 + 1]["competiteur_id"]
            )
            demi_dict = await insert_combat(demi)
            combats_created.append(demi_dict)
        
        # Finale
        finale = Combat(
            categorie_id=categorie_id,
            tatami_id=tatami_id,
            tour="finale",
            position=1,
            rouge_id=None,
            bleu_id=None
        )
        finale_dict = await insert_combat(finale)
        combats_created.append(finale_dict)
        
        # Match bronze
        bronze = Combat(
            categorie_id=categorie_id,
            tatami_id=tatami_id,
            tour="bronze",
            position=1,
            rouge_id=None,
            bleu_id=None
        )
        bronze_dict = await insert_combat(bronze)
        combats_created.append(bronze_dict)
        
    else:
        # Plus de 4: quarts + demis + finale + bronze
        # Simplification: on prend les 8 premiers
        competiteurs = competiteurs[:8]
        
        # Quarts de finale
        for i in range(4):
            quart = Combat(
                categorie_id=categorie_id,
                tatami_id=tatami_id,
                tour="quart",
                position=i + 1,
                rouge_id=competiteurs[i*2]["competiteur_id"] if i*2 < len(competiteurs) else None,
                bleu_id=competiteurs[i*2 + 1]["competiteur_id"] if i*2 + 1 < len(competiteurs) else None
            )
            quart_dict = await insert_combat(quart)
            combats_created.append(quart_dict)
        
        # Demi-finales
        for i in range(2):
            demi = Combat(
                categorie_id=categorie_id,
                tatami_id=tatami_id,
                tour="demi",
                position=i + 1,
                rouge_id=None,
                bleu_id=None
            )
            demi_dict = await insert_combat(demi)
            combats_created.append(demi_dict)
        
        # Finale
        finale = Combat(
            categorie_id=categorie_id,
            tatami_id=tatami_id,
            tour="finale",
            position=1,
            rouge_id=None,
            bleu_id=None
        )
        finale_dict = await insert_combat(finale)
        combats_created.append(finale_dict)
        
        # Match bronze
        bronze = Combat(
            categorie_id=categorie_id,
            tatami_id=tatami_id,
            tour="bronze",
            position=1,
            rouge_id=None,
            bleu_id=None
        )
        bronze_dict = await insert_combat(bronze)
        combats_created.append(bronze_dict)
    
    return {"message": f"Tableau généré avec {len(combats_created)} combats", "combats": combats_created}

@api_router.put("/combats/{combat_id}/resultat")
async def saisir_resultat(combat_id: str, data: CombatResultat, user: User = Depends(require_admin)):
    """Saisir ou modifier le résultat d'un combat"""
    combat = await db.combats.find_one({"combat_id": combat_id}, {"_id": 0})
    if not combat:
        raise HTTPException(status_code=404, detail="Combat non trouvé")
    
    # Sauvegarder dans l'historique si modification
    if combat.get("termine"):
        historique = HistoriqueResultat(
            combat_id=combat_id,
            ancien_vainqueur_id=combat.get("vainqueur_id"),
            nouveau_vainqueur_id=data.vainqueur_id,
            ancien_score_rouge=combat.get("score_rouge", 0),
            ancien_score_bleu=combat.get("score_bleu", 0),
            nouveau_score_rouge=data.score_rouge,
            nouveau_score_bleu=data.score_bleu,
            modifie_par=user.user_id
        )
        hist_dict = historique.model_dump()
        hist_dict["modifie_at"] = hist_dict["modifie_at"].isoformat()
        await db.historique_resultats.insert_one(hist_dict)
    
    # Gérer la disqualification
    if data.type_victoire == "disqualification":
        perdant_id = combat["rouge_id"] if data.vainqueur_id == combat["bleu_id"] else combat["bleu_id"]
        await db.competiteurs.update_one(
            {"competiteur_id": perdant_id},
            {"$set": {"disqualifie": True}}
        )
    
    # Mettre à jour le combat
    await db.combats.update_one(
        {"combat_id": combat_id},
        {"$set": {
            "vainqueur_id": data.vainqueur_id,
            "score_rouge": data.score_rouge,
            "score_bleu": data.score_bleu,
            "type_victoire": data.type_victoire,
            "termine": True,
            "statut": "termine"
        }}
    )
    
    # Propager le vainqueur au tour suivant
    await propager_vainqueur(combat, data.vainqueur_id)
    
    updated = await db.combats.find_one({"combat_id": combat_id}, {"_id": 0})
    return updated

async def propager_vainqueur(combat: dict, vainqueur_id: str):
    """Propage le vainqueur au combat suivant"""
    categorie_id = combat["categorie_id"]
    tour = combat["tour"]
    position = combat["position"]
    
    # Trouver le perdant pour le match bronze
    perdant_id = combat["rouge_id"] if vainqueur_id == combat["bleu_id"] else combat["bleu_id"]
    
    if tour == "quart":
        # Vers demi-finale
        demi_position = (position + 1) // 2
        demi = await db.combats.find_one({
            "categorie_id": categorie_id,
            "tour": "demi",
            "position": demi_position
        }, {"_id": 0})
        
        if demi:
            field = "rouge_id" if position % 2 == 1 else "bleu_id"
            await db.combats.update_one(
                {"combat_id": demi["combat_id"]},
                {"$set": {field: vainqueur_id}}
            )
    
    elif tour == "demi":
        # Vers finale
        finale = await db.combats.find_one({
            "categorie_id": categorie_id,
            "tour": "finale"
        }, {"_id": 0})
        
        if finale:
            field = "rouge_id" if position == 1 else "bleu_id"
            await db.combats.update_one(
                {"combat_id": finale["combat_id"]},
                {"$set": {field: vainqueur_id}}
            )
        
        # Vers match bronze (perdant)
        bronze = await db.combats.find_one({
            "categorie_id": categorie_id,
            "tour": "bronze"
        }, {"_id": 0})
        
        if bronze and perdant_id:
            # Vérifier si le perdant n'est pas disqualifié
            perdant = await db.competiteurs.find_one({"competiteur_id": perdant_id}, {"_id": 0})
            if perdant and not perdant.get("disqualifie"):
                field = "rouge_id" if position == 1 else "bleu_id"
                await db.combats.update_one(
                    {"combat_id": bronze["combat_id"]},
                    {"$set": {field: perdant_id}}
                )

@api_router.post("/combats/{categorie_id}/attribuer-medailles")
async def attribuer_medailles(categorie_id: str, user: User = Depends(require_admin)):
    """Attribue les médailles après la finale"""
    # Finale
    finale = await db.combats.find_one({
        "categorie_id": categorie_id,
        "tour": "finale",
        "termine": True
    }, {"_id": 0})
    
    if not finale:
        raise HTTPException(status_code=400, detail="La finale n'est pas terminée")
    
    medailles = []
    
    # Or au vainqueur de la finale
    or_medaille = Medaille(
        categorie_id=categorie_id,
        competiteur_id=finale["vainqueur_id"],
        type="or"
    )
    await db.medailles.insert_one(or_medaille.model_dump())
    medailles.append(or_medaille.model_dump())
    
    # Argent au perdant de la finale (si non disqualifié)
    perdant_finale = finale["rouge_id"] if finale["vainqueur_id"] == finale["bleu_id"] else finale["bleu_id"]
    if perdant_finale:
        perdant = await db.competiteurs.find_one({"competiteur_id": perdant_finale}, {"_id": 0})
        if perdant and not perdant.get("disqualifie"):
            argent_medaille = Medaille(
                categorie_id=categorie_id,
                competiteur_id=perdant_finale,
                type="argent"
            )
            await db.medailles.insert_one(argent_medaille.model_dump())
            medailles.append(argent_medaille.model_dump())
    
    # Bronze - vérifier le match bronze ou perdants des demis
    bronze_match = await db.combats.find_one({
        "categorie_id": categorie_id,
        "tour": "bronze",
        "termine": True
    }, {"_id": 0})
    
    if bronze_match and bronze_match.get("vainqueur_id"):
        bronze_medaille = Medaille(
            categorie_id=categorie_id,
            competiteur_id=bronze_match["vainqueur_id"],
            type="bronze"
        )
        await db.medailles.insert_one(bronze_medaille.model_dump())
        medailles.append(bronze_medaille.model_dump())
    else:
        # Attribuer bronze aux perdants des demis
        demis = await db.combats.find({
            "categorie_id": categorie_id,
            "tour": "demi",
            "termine": True
        }, {"_id": 0}).to_list(10)
        
        for demi in demis:
            perdant_id = demi["rouge_id"] if demi["vainqueur_id"] == demi["bleu_id"] else demi["bleu_id"]
            if perdant_id:
                perdant = await db.competiteurs.find_one({"competiteur_id": perdant_id}, {"_id": 0})
                if perdant and not perdant.get("disqualifie"):
                    bronze_medaille = Medaille(
                        categorie_id=categorie_id,
                        competiteur_id=perdant_id,
                        type="bronze"
                    )
                    await db.medailles.insert_one(bronze_medaille.model_dump())
                    medailles.append(bronze_medaille.model_dump())
    
    return {"message": f"{len(medailles)} médailles attribuées", "medailles": medailles}

@api_router.put("/combats/{combat_id}/statut")
async def modifier_statut_combat(combat_id: str, statut: str, user: User = Depends(require_admin)):
    """Modifier le statut d'un combat (a_venir, en_cours, termine, non_dispute)"""
    if statut not in ["a_venir", "en_cours", "termine", "non_dispute"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    result = await db.combats.update_one(
        {"combat_id": combat_id},
        {"$set": {"statut": statut, "termine": statut in ["termine", "non_dispute"]}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Combat non trouvé")
    
    return {"message": "Statut mis à jour"}

@api_router.post("/combats/planifier/{categorie_id}")
async def planifier_combats(categorie_id: str, data: PlanificationCreate, user: User = Depends(require_admin)):
    """Planifier les horaires des combats d'une catégorie"""
    combats = await db.combats.find(
        {"categorie_id": categorie_id},
        {"_id": 0}
    ).sort([("tour", 1), ("position", 1)]).to_list(100)
    
    if not combats:
        raise HTTPException(status_code=404, detail="Aucun combat trouvé")
    
    # Définir l'ordre des tours
    tour_ordre = {"quart": 1, "demi": 2, "bronze": 3, "finale": 4}
    combats_sorted = sorted(combats, key=lambda x: (tour_ordre.get(x["tour"], 99), x["position"]))
    
    # Parser l'heure de début
    try:
        heure_parts = data.heure_debut_competition.split(":")
        current_hour = int(heure_parts[0])
        current_minute = int(heure_parts[1])
    except:
        raise HTTPException(status_code=400, detail="Format d'heure invalide (HH:MM)")
    
    # Planifier chaque combat
    pauses_dict = {p.get("apres_combat", 0): p.get("duree_minutes", 15) for p in data.pauses}
    
    for i, combat in enumerate(combats_sorted):
        heure = f"{current_hour:02d}:{current_minute:02d}"
        
        await db.combats.update_one(
            {"combat_id": combat["combat_id"]},
            {"$set": {
                "ordre": i + 1,
                "heure_debut": heure,
                "duree_minutes": data.duree_combat_minutes
            }}
        )
        
        # Ajouter la durée du combat
        current_minute += data.duree_combat_minutes
        
        # Ajouter une pause si définie
        if (i + 1) in pauses_dict:
            current_minute += pauses_dict[i + 1]
        
        # Gérer le dépassement d'heure
        while current_minute >= 60:
            current_minute -= 60
            current_hour += 1
    
    return {"message": f"{len(combats_sorted)} combats planifiés", "heure_fin_estimee": f"{current_hour:02d}:{current_minute:02d}"}

@api_router.put("/combats/modifier-ordre")
async def modifier_ordre_combat(data: ModifierOrdreCombat, user: User = Depends(require_admin)):
    """Modifier l'ordre d'un combat et recalculer les horaires si nécessaire"""
    combat = await db.combats.find_one({"combat_id": data.combat_id}, {"_id": 0})
    if not combat:
        raise HTTPException(status_code=404, detail="Combat non trouvé")
    
    update_data = {"ordre": data.nouvel_ordre}
    if data.nouvelle_heure:
        update_data["heure_debut"] = data.nouvelle_heure
    
    await db.combats.update_one(
        {"combat_id": data.combat_id},
        {"$set": update_data}
    )
    
    return {"message": "Ordre mis à jour"}

@api_router.post("/combats/lancer-categorie/{categorie_id}")
async def lancer_categorie(categorie_id: str, mode: str = "complet", user: User = Depends(require_admin)):
    """
    Lancer les combats d'une catégorie
    mode: 'complet' = tous les combats, 'finales_fin' = tous sauf finales
    """
    if mode not in ["complet", "finales_fin"]:
        raise HTTPException(status_code=400, detail="Mode invalide (complet ou finales_fin)")
    
    query = {"categorie_id": categorie_id, "statut": "a_venir"}
    if mode == "finales_fin":
        query["tour"] = {"$nin": ["finale", "bronze"]}
    
    # Mettre le premier combat en cours
    premier_combat = await db.combats.find_one(query, {"_id": 0}, sort=[("ordre", 1)])
    
    if premier_combat:
        await db.combats.update_one(
            {"combat_id": premier_combat["combat_id"]},
            {"$set": {"statut": "en_cours"}}
        )
        return {"message": f"Catégorie lancée en mode {mode}", "premier_combat": premier_combat["combat_id"]}
    
    return {"message": "Aucun combat à lancer"}

@api_router.post("/combats/lancer-finales")
async def lancer_finales(user: User = Depends(require_admin)):
    """Lancer toutes les finales de toutes les catégories"""
    finales = await db.combats.find(
        {"tour": {"$in": ["finale", "bronze"]}, "statut": "a_venir"},
        {"_id": 0}
    ).sort("ordre", 1).to_list(100)
    
    if finales:
        # Mettre la première finale en cours
        await db.combats.update_one(
            {"combat_id": finales[0]["combat_id"]},
            {"$set": {"statut": "en_cours"}}
        )
        return {"message": f"{len(finales)} finales prêtes à être lancées", "premiere_finale": finales[0]["combat_id"]}
    
    return {"message": "Aucune finale à lancer"}

@api_router.post("/combats/{combat_id}/suivant")
async def passer_combat_suivant(combat_id: str, user: User = Depends(require_admin)):
    """Terminer le combat actuel et passer au suivant"""
    combat = await db.combats.find_one({"combat_id": combat_id}, {"_id": 0})
    if not combat:
        raise HTTPException(status_code=404, detail="Combat non trouvé")
    
    # Trouver le prochain combat
    prochain = await db.combats.find_one(
        {"ordre": {"$gt": combat.get("ordre", 0)}, "statut": "a_venir"},
        {"_id": 0},
        sort=[("ordre", 1)]
    )
    
    if prochain:
        await db.combats.update_one(
            {"combat_id": prochain["combat_id"]},
            {"$set": {"statut": "en_cours"}}
        )
        return {"message": "Combat suivant lancé", "combat_id": prochain["combat_id"]}
    
    return {"message": "Plus de combat à suivre"}

# ============ MEDAILLES ENDPOINTS ============

@api_router.get("/medailles", response_model=List[Medaille])
async def list_medailles(categorie_id: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {}
    if categorie_id:
        query["categorie_id"] = categorie_id
    
    medailles = await db.medailles.find(query, {"_id": 0}).to_list(1000)
    return medailles

# ============ HISTORIQUE ENDPOINTS ============

@api_router.get("/historique", response_model=List[HistoriqueResultat])
async def list_historique(combat_id: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {}
    if combat_id:
        query["combat_id"] = combat_id
    
    historique = await db.historique_resultats.find(query, {"_id": 0}).to_list(1000)
    return historique

# ============ STATS ENDPOINTS ============

@api_router.get("/stats")
async def get_stats(user: User = Depends(get_current_user)):
    competiteurs_count = await db.competiteurs.count_documents({})
    categories_count = await db.categories.count_documents({})
    combats_count = await db.combats.count_documents({})
    combats_termines = await db.combats.count_documents({"termine": True})
    medailles_count = await db.medailles.count_documents({})
    tatamis_count = await db.tatamis.count_documents({})
    
    return {
        "competiteurs": competiteurs_count,
        "categories": categories_count,
        "combats_total": combats_count,
        "combats_termines": combats_termines,
        "medailles": medailles_count,
        "tatamis": tatamis_count
    }

# ============ ADMIN: Promote user ============

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin: User = Depends(require_admin)):
    if role not in ["coach", "admin"]:
        raise HTTPException(status_code=400, detail="Rôle invalide")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": f"Rôle mis à jour en {role}"}

@api_router.get("/users")
async def list_users(admin: User = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
