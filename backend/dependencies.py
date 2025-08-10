# backend/dependencies.py
from fastapi import Depends
from .database import get_db
from . import models

def get_current_user():
    # Função simulada — substitua pela real
    return models.User(id=1, username="Usuário Simulado")
