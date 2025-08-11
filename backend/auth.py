from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, APIRouter, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging

# Configura o logger para exibir mensagens INFO ou DEBUG
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Importações relativas
from backend import models, schemas, crud
from backend.database import get_db

# Criação do roteador
router = APIRouter(
    tags=["auth"]
)

# Tente importar bcrypt diretamente para verificar a versão
try:
    import bcrypt
except ImportError:
    print("Aviso: A biblioteca 'bcrypt' não foi encontrada. Certifique-se de que 'passlib[bcrypt]' está instalada.")
    print("Para instalar: pip install 'passlib[bcrypt]'")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "sua_chave_secreta_muito_segura_e_longa"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se uma senha em texto puro corresponde a uma senha hasheada.
    """
    logger.info(f"Verificando senha: plain_password (parcial)={plain_password[:3]}..., hashed_password (parcial)={hashed_password[:3]}...")
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Cria o hash de uma senha em texto puro.
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Cria um token de acesso JWT.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = router.OAuth2PasswordBearer(tokenUrl="api/auth/token")

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    """
    Autentica um usuário com base no nome de usuário e senha.
    """
    user = crud.get_user_by_username(db, username=username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    logger.info(f"Usuário '{username}' autenticado com sucesso.")
    return user

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> schemas.User:
    """
    Obtém o usuário atual a partir do token JWT.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        if username is None or user_id is None:
            logger.error("Token sem username ou user_id.")
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError as e:
        logger.error(f"Erro ao decodificar token JWT: {e}")
        raise credentials_exception
    user = crud.get_user_by_username(db, username=username) # A busca aqui continua por username (sub do token)
    if user is None or not user.is_active:
        logger.warning(f"Usuário '{username}' não encontrado ou inativo para token válido.")
        raise credentials_exception
    logger.info(f"Usuário '{username}' obtido do token com sucesso.")
    return schemas.User(id=user.id, username=user.username, email=user.email, is_active=user.is_active, role=user.role)

async def get_current_admin_user(current_user: schemas.User = Depends(get_current_user)):
    """
    Obtém o usuário atual e verifica se ele é um administrador.
    """
    if current_user.role != "admin":
        logger.warning(f"Tentativa de acesso admin por usuário não admin: {current_user.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operação não permitida para usuários não administradores",
        )
    return current_user

# --- Rotas de Autenticação ---

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "id": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email) or crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Email ou nome de usuário já registrado")
    return crud.create_user(db=db, user=user)

@router.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user






        











