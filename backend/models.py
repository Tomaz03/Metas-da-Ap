# models.py
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy import UniqueConstraint
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Float, JSON, Date
import json
from datetime import datetime # Importação essencial para datetime.utcnow

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="comum")

    # Relacionamentos
    notebooks = relationship("Notebook", back_populates="owner")
    comments = relationship("Comment", back_populates="author")
    progresses = relationship("NotebookProgress", back_populates="user_rel")
    favorite_questions = relationship("FavoriteQuestion", back_populates="user")
    question_notes = relationship("QuestionNote", back_populates="user")
    syllabi = relationship("VerticalizedSyllabus", back_populates="owner")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"


class Question(Base):
    """
    Modelo de Questão de Prova.
    """
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    enunciado = Column(Text, nullable=False)
    item_a = Column(Text)
    item_b = Column(Text)
    item_c = Column(Text)
    item_d = Column(Text)
    item_e = Column(Text)
    materia = Column(String, index=True, nullable=False)
    assunto = Column(String, index=True, nullable=False)
    banca = Column(String, index=True, nullable=False)
    orgao = Column(String, index=True)
    cargo = Column(String, index=True)
    ano = Column(Integer, index=True)
    escolaridade = Column(String, index=True)
    dificuldade = Column(String, index=True)
    regiao = Column(String, index=True)
    gabarito = Column(String, nullable=False) # 'A', 'B', 'C', 'D', 'E' ou 'Certo', 'Errado'
    informacoes = Column(Text)
    comentarioProfessor = Column(Text)
    tipo = Column(String, nullable=False, default="multipla") # "multipla" ou "certo_errado"
    is_anulada = Column(Boolean, default=False)
    is_desatualizada = Column(Boolean, default=False)

    # Relacionamentos
    comments = relationship("Comment", back_populates="question")
    question_stats = relationship("QuestionStatistics", back_populates="question", uselist=False)
    favorited_by = relationship("FavoriteQuestion", back_populates="question")
    notes = relationship("QuestionNote", back_populates="question")

    def __repr__(self):
        return f"<Question(id={self.id}, materia='{self.materia}', assunto='{self.assunto}')>"

class QuestionStatistics(Base):
    """
    Modelo para armazenar estatísticas de desempenho de uma questão.
    """
    __tablename__ = "question_statistics"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), unique=True, nullable=False)
    total_attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)

    # Relacionamento
    question = relationship("Question", back_populates="question_stats")

    def __repr__(self):
        return f"<QuestionStatistics(question_id={self.question_id}, total={self.total_attempts}, correct={self.correct_attempts})>"

class Theory(Base):
    """
    Modelo para armazenar conteúdo teórico.
    """
    __tablename__ = "theories"

    id = Column(Integer, primary_key=True, index=True)
    materia = Column(String, index=True, nullable=False)
    assunto = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)

    def __repr__(self):
        return f"<Theory(id={self.id}, materia='{self.materia}', assunto='{self.assunto}')>"

class Notebook(Base):
    """
    Modelo de Caderno de Questões criado por um usuário.
    """
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    questoes_ids = Column(Text, nullable=False, default="[]")
    filtros = Column(Text, nullable=False, default="{}")
    paiId = Column(Integer, ForeignKey("notebooks.id"), nullable=True)

    # Relacionamentos
    owner = relationship("User", back_populates="notebooks")
    children = relationship("Notebook", backref="parent", remote_side=[id])
    favorited_in = relationship("FavoriteQuestion", back_populates="notebook")

    def __repr__(self):
        return f"<Notebook(id={self.id}, nome='{self.nome}', user_id={self.user_id})>"

class NotebookProgress(Base):
    """
    Modelo para armazenar o progresso do usuário em um caderno.
    """
    __tablename__ = "notebook_progress"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    index = Column(Integer, default=0, nullable=False)
    respostas = Column(Text, nullable=False, default="{}")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos
    notebook_rel = relationship("Notebook")
    user_rel = relationship("User", back_populates="progresses")

    def __repr__(self):
        return f"<NotebookProgress(id={self.id}, notebook_id={self.notebook_id}, user_id={self.user_id}, index={self.index})>"

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    points = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos
    question = relationship("Question", back_populates="comments")
    author = relationship("User", back_populates="comments")

    def __repr__(self):
        return f"<Comment(id={self.id}, question_id={self.question_id}, user_id={self.user_id})>"

class CommentVote(Base):
    __tablename__ = "comment_votes"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vote_type = Column(String, nullable=False)  # "upvote" ou "downvote"

    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="unique_user_comment_vote"),
    )

    def __repr__(self):
        return f"<CommentVote(comment_id={self.comment_id}, user_id={self.user_id}, vote_type={self.vote_type})>"


class FavoriteQuestion(Base):
    """
    Modelo para armazenar questões favoritas de um usuário.
    """
    __tablename__ = "favorite_questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), nullable=False)
    favorited_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "question_id", "notebook_id", name="unique_favorite_per_user_question_notebook"),
    )

    # Relacionamentos
    user = relationship("User", back_populates="favorite_questions")
    question = relationship("Question", back_populates="favorited_by")
    notebook = relationship("Notebook", back_populates="favorited_in")

    def __repr__(self):
        return f"<FavoriteQuestion(id={self.id}, user_id={self.user_id}, question_id={self.question_id}, notebook_id={self.notebook_id})>"

class QuestionNote(Base):
    __tablename__ = "question_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    content = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="question_notes")
    question = relationship("Question", back_populates="notes")

    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_user_question_note"),)

# Modelo para a tabela de resultados de simulados (UNIFICADO)
class Simulado(Base): # Renomeado de SimuladoResult e agora é o principal
    __tablename__ = "simulados" # Mantém o nome da tabela consistente
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    data_realizacao = Column(DateTime, default=datetime.utcnow)
    tempo_limite = Column(Integer) # Tempo limite configurado (em segundos)
    tempo_utilizado = Column(Integer) # Tempo efetivamente utilizado (em segundos)
    total_questoes = Column(Integer)
    acertos_total = Column(Integer)
    erros_total = Column(Integer)
    percentual_acerto = Column(Float) # Alterado para Float
    acertos_basicos = Column(Integer)
    erros_basicos = Column(Integer)
    acertos_especificos = Column(Integer)
    erros_especificos = Column(Integer)
    acertos_por_materia = Column(JSON)
    erros_por_materia = Column(JSON)
    acertos_por_assunto = Column(JSON)
    erros_por_assunto = Column(JSON)
    respostas_usuario = Column(JSON)
    questoes_ids = Column(JSON)
    criado_em = Column(DateTime(timezone=True), server_default=func.now()) # Para filtros de data

    user = relationship("User")

class RespostaSimulado(Base): # Mantido para respostas individuais
    __tablename__ = "respostas_simulado"
    id = Column(Integer, primary_key=True, index=True)
    simulado_id = Column(Integer, ForeignKey("simulados.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    selected_alternative_id = Column(Integer)
    correct_alternative_id = Column(Integer)
    is_correct = Column(Boolean)
    materia = Column(String) # Adicionado para facilitar consultas
    tipo = Column(String)    # Adicionado para facilitar consultas

    simulado = relationship("Simulado")
    question = relationship("Question")

class VerticalizedSyllabus(Base):
    __tablename__ = "verticalized_syllabi"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    nome = Column(String, nullable=False) # Nome dado pelo usuário
    disciplina = Column(String, nullable=False) # Ex: "Direito Constitucional"
    conteudo = Column(JSON, nullable=False) # Tabela de conteúdos
    marcacoes = Column(JSON, nullable=True) # Marcação por checkbox
    criado_em = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="syllabi")  # Adicione esta linha

class StudyCalendar(Base):
    __tablename__ = "study_calendar"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    edital_id = Column(Integer, ForeignKey("verticalized_syllabi.id"), nullable=False)
    data = Column(JSON, nullable=False)
    # Novos campos para o período de estudo
    data_inicio = Column(Date, nullable=True)
    data_fim = Column(Date, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="study_calendars")
    edital = relationship("VerticalizedSyllabus", backref="study_calendars")

    def __repr__(self):
        return f"<StudyPlan(id={self.id}, nome='{self.nome}', user_id={self.user_id})>"