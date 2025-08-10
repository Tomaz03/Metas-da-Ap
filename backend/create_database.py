# create_database.py

from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime

# Caminho do banco SQLite
DATABASE_URL = "sqlite:///./meubanco.db"  # você pode mudar esse nome

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELOS ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Integer, default=0)
    role = Column(String, default="comum")

    notebooks = relationship("Notebook", back_populates="user")
    progresses = relationship("NotebookProgress", back_populates="user")


class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    questoes_ids = Column(Text)
    filtros = Column(Text)
    paiId = Column(Integer, nullable=True)

    user = relationship("User", back_populates="notebooks")
    progresses = relationship("NotebookProgress", back_populates="notebook")


class NotebookProgress(Base):
    __tablename__ = "notebook_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)  # CORREÇÃO AQUI
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    index = Column(Integer, default=0)
    respostas = Column(Text, default='{}')  # respostas salvas como JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    notebook = relationship("Notebook", back_populates="progresses")
    user = relationship("User", back_populates="progresses")


# --- CRIAÇÃO DO BANCO ---

def criar_banco():
    print("Criando banco de dados...")
    Base.metadata.drop_all(bind=engine)   # Remove tudo antes
    Base.metadata.create_all(bind=engine) # Cria tudo novamente
    print("Banco criado com sucesso: meubanco.db")


if __name__ == "__main__":
    criar_banco()
