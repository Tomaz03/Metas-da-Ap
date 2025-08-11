from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date

# --- Schemas de Autenticação e Usuário ---

class Token(BaseModel):
    """Schema para o token de acesso JWT."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Schema para os dados contidos no token JWT."""
    username: Optional[str] = None

class UserBase(BaseModel):
    """Schema base para o usuário."""
    email: EmailStr
    username: str

class UserCreate(UserBase):
    """Schema para criação de um novo usuário."""
    password: str
    role: Optional[str] = "comum" # Define o papel padrão como "comum"

class User(UserBase):
    """Schema para representação completa do usuário (retorno da API)."""
    id: int
    is_active: bool
    role: str
    # created_at: datetime # Removido
    # updated_at: datetime # Removido

    class Config:
        from_attributes = True # Permite mapeamento de ORM (SQLAlchemy) para Pydantic V2

class UserForComment(BaseModel):
    """Schema simplificado para exibir informações do usuário em comentários."""
    id: int
    username: str

    class Config:
        from_attributes = True

class UserStats(BaseModel):
    """Schema para as estatísticas gerais do usuário."""
    total_questoes_resolvidas: int
    total_acertos: int
    total_erros: int
    percentual_acerto_geral: float
    acertos_por_materia: Dict[str, Dict[str, int]]
    erros_por_materia: Dict[str, Dict[str, int]]

    class Config:
        from_attributes = True

# --- Schemas de Questão ---

class Alternative(BaseModel):
    id: int
    text: str

class QuestionBase(BaseModel):
    """Schema base para uma questão."""
    enunciado: str
    item_a: Optional[str] = None
    item_b: Optional[str] = None
    item_c: Optional[str] = None
    item_d: Optional[str] = None
    item_e: Optional[str] = None
    materia: str
    assunto: str
    banca: str
    orgao: Optional[str] = None
    cargo: Optional[str] = None
    ano: Optional[int] = None
    escolaridade: Optional[str] = None
    dificuldade: Optional[str] = None
    regiao: Optional[str] = None
    gabarito: str
    informacoes: Optional[str] = None
    comentarioProfessor: Optional[str] = None
    tipo: str = "multipla" # "multipla" ou "certo_errado"
    is_anulada: Optional[bool] = False # NOVO CAMPO
    is_desatualizada: Optional[bool] = False # NOVO CAMPO

class QuestionCreate(QuestionBase):
    """Schema para criação de uma questão."""
    pass

class Question(QuestionBase):
    """Schema para representação completa da questão (retorno da API)."""
    id: int
    alternativas: Optional[List[Alternative]] = None # Agora usa o schema Alternative
    correta: Optional[int] = None # Campo adicionado para o frontend, não no DB
    is_favorited: Optional[bool] = False # NOVO CAMPO PARA O FRONTEND

    class Config:
        from_attributes = True

class QuestionStatusUpdate(BaseModel):
    """Schema para atualização do status de uma questão (anulada/desatualizada)."""
    is_anulada: Optional[bool] = None
    is_desatualizada: Optional[bool] = None

class QuestionStatistics(BaseModel):
    """Schema para estatísticas de uma questão."""
    question_id: int
    total_attempts: int
    correct_attempts: int
    
    class Config:
        from_attributes = True

# --- Schemas de Caderno ---

class NotebookBase(BaseModel):
    """Schema base para um caderno."""
    nome: str
    questoes_ids: List[int] = Field(default_factory=list) # Lista de IDs de questões
    filtros: Dict[str, Any] = Field(default_factory=dict) # Filtros usados para criar o caderno
    paiId: Optional[int] = None # Para cadernos dentro de pastas

class NotebookCreate(NotebookBase):
    """Schema para criação de um caderno."""
    pass

class NotebookUpdate(BaseModel):
    """Schema para atualização de um caderno (apenas nome)."""
    nome: str

class Notebook(NotebookBase):
    """Schema para representação completa do caderno (retorno da API)."""
    id: int
    user_id: int
    total_questoes: Optional[int] = None # Adicionado para exibir no frontend
    respondidas: Optional[int] = None # Adicionado para exibir no frontend
    acertos: Optional[int] = None # Adicionado para exibir no frontend
    # created_at: datetime # Removido
    # updated_at: datetime # Removido

    class Config:
        from_attributes = True

class NotebookProgressUpdate(BaseModel):
    """Schema para atualização do progresso do usuário em um caderno."""
    index: int
    respostas: Dict[str, int] # {question_id: user_answer_index}

class NotebookProgress(NotebookProgressUpdate):
    """Schema para o progresso do usuário em um caderno."""
    notebook_id: int
    user_id: int
    # created_at: datetime # Removido
    updated_at: Optional[datetime] = None # Alterado para Optional[datetime] = None

    class Config:
        from_attributes = True # Importante para o Pydantic validar de modelos ORM

class NotebookResolveData(BaseModel):
    """Schema para os dados de resolução de um caderno (para o frontend)."""
    nome: str
    questoes: List[Question]
    progresso: Optional[NotebookProgress] = None # O progresso pode não existir ainda

# --- Schemas de Comentário ---

class CommentCreate(BaseModel):
    """Schema para criação de um comentário."""
    content: str

class Comment(BaseModel):
    """Schema para representação completa de um comentário."""
    id: int
    question_id: int
    user_id: int
    content: str
    points: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserForComment] = None  # ✅ Torna opcional

    class Config:
        from_attributes = True

class CommentResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    updated_at: Optional[datetime]
    user: UserForComment
    question_id: int
    materia: Optional[str]
    assunto: Optional[str]

    class Config:
        from_attributes = True

class LikedComment(BaseModel):
    comment_id: int
    content: str
    question_id: int
    materia: str
    assunto: str
    autor: str
    autor_id: int


# --- Schemas de Teoria ---

class TheoryCreate(BaseModel):
    """Schema para criação/atualização de uma teoria."""
    materia: str
    assunto: str
    content: str

class Theory(BaseModel):
    """Schema para representação completa de uma teoria."""
    id: int
    materia: str
    assunto: str
    content: str
    # created_at: datetime # Removido
    # updated_at: datetime # Removido

    class Config:
        from_attributes = True

class TheoryMeta(BaseModel):
    """Schema para metadados de teoria (matéria e assuntos)."""
    materia: str
    assuntos: List[str]


# --- Schemas de Questões Favoritas ---
class FavoriteQuestionBase(BaseModel): # NOVO SCHEMA
    question_id: int
    notebook_id: int

class FavoriteQuestionCreate(FavoriteQuestionBase): # NOVO SCHEMA
    pass

class FavoriteQuestion(FavoriteQuestionBase): # NOVO SCHEMA
    id: int
    user_id: int
    favorited_at: datetime
    
    # Campos adicionais para o frontend exibir a questão e o caderno
    question: Optional[Question] = None
    notebook_name: Optional[str] = None

    class Config:
        from_attributes = True

class QuestionNoteBase(BaseModel):
    question_id: int
    content: str

class QuestionNoteCreate(QuestionNoteBase):
    pass

# NOVO SCHEMA: Para a resposta de anotações, incluindo dados da questão
class QuestionNoteResponse(QuestionNoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    materia: Optional[str] = None # Adicionado para o frontend
    assunto: Optional[str] = None # Adicionado para o frontend
    title: Optional[str] = None # Adicionado para o frontend (para MyNotes)

    class Config:
        from_attributes = True

class AssuntoItem(BaseModel):
    assunto: str

class MateriaConfig(BaseModel):
    materia: str
    tipo: str  # "basico" ou "especifico"
    quantidade_total: int
    assuntos: List[AssuntoItem]
    additional_filters: Optional[Dict[str, List[str]]] = {}  # <-- ADICIONADO

class SimuladoConfigSchema(BaseModel):
    tempo_limite_minutos: int
    materias_config: List[MateriaConfig]

class RespostaSimulado(BaseModel):
    question_id: int
    selected_alternative_id: int # Pode ser -1 se não respondida

class SubmitRequest(BaseModel):
    answers: List[RespostaSimulado]
    time_taken_seconds: int

# **CLASSE DE FEEDBACK PADRONIZADA**
class QuestaoFeedback(BaseModel):
    question_id: int
    is_correct: bool
    selected_alternative_id: Optional[int] # 0-indexed do frontend
    correct_alternative_id: Optional[int] # 1-indexed do backend
    content: str # Enunciado da questão
    alternatives: List[Alternative] # Lista de objetos Alternative

class ResultadoSimulado(BaseModel):
    tempo_limite: int
    tempo_utilizado: int  # tempo em segundos
    acertos_total: int
    erros_total: int
    percentual_acerto: float
    feedback_questoes: List[QuestaoFeedback] # Agora usa QuestaoFeedback
    # NOVOS CAMPOS PARA ESTATÍSTICAS DETALHADAS
    acertos_basicos: int
    erros_basicos: int
    acertos_especificos: int
    erros_especificos: int
    acertos_por_materia: Dict[str, int] # Alterado para Dict[str, int]
    erros_por_materia: Dict[str, int]   # Alterado para Dict[str, int]
    acertos_por_assunto: Dict[str, int]
    erros_por_assunto: Dict[str, int]

    @property
    def tempo_utilizado_minutes(self):
        return self.tempo_utilizado // 60

    class Config:
        from_attributes = True # Adicionado para permitir mapeamento de ORM

# NOVOS SCHEMAS para as estatísticas do simulado
class SimuladoTipoStats(BaseModel):
    acertos: int
    total: int
    percentual: float

class SimuladoMateriaStats(BaseModel):
    acertos: int
    total: int
    percentual: float

class SimuladoHistoricoItem(BaseModel):
    id: int
    data: str
    acertos: int
    erros: int
    percentual: float
    tempo_utilizado: int

class SimuladoStatisticsResponse(BaseModel):
    total_simulados: int
    percentual_geral: float
    por_tipo: Dict[str, SimuladoTipoStats]
    por_materia: Dict[str, SimuladoMateriaStats]
    historico: List[SimuladoHistoricoItem]

    class Config:
        from_attributes = True

# NOVO: Schema para as marcações de cada tópico
class MarcacaoTopico(BaseModel):
    completado: bool = False
    leiSeca: bool = False
    juris: bool = False
    questoes: bool = False
    revisoes: bool = False
    revisaoNumero: Optional[int] = None

# Schema base
class VerticalizedSyllabusBase(BaseModel):
    nome: str
    disciplina: str
    conteudo: Dict[str, Any]
    marcacoes: Dict[str, Any]

# Schema para criação (o que vem do frontend)
class VerticalizedSyllabusCreate(VerticalizedSyllabusBase):
    conteudo: Dict[str, List[str]] # Espera um dicionário de listas de strings
    # ATUALIZADO: Agora usa o novo schema MarcacaoTopico
    marcacoes: Dict[str, Dict[str, MarcacaoTopico]]

# Schema para resposta (o que vai para o frontend)
class VerticalizedSyllabus(VerticalizedSyllabusBase):
    id: int
    user_id: int
    conteudo: Dict[str, Any]
    marcacoes: Dict[str, Any]
    criado_em: datetime
    
    # Adicione este campo para que o frontend receba 'titulo'
    titulo: str = Field(alias='nome') 

    class Config:
        from_attributes = True
        # Adicione esta linha para permitir o uso de alias
        populate_by_name = True

class VerticalizedSyllabusUpdate(BaseModel):
    nome: Optional[str] = None
    disciplina: Optional[str] = None
    conteudo: Optional[Dict[str, List[str]]] = None
    marcacoes: Optional[Dict[str, Dict[str, Any]]] = None

class StudyBlock(BaseModel):
    materia: str
    inicio: str  # formato "HH:MM"
    fim: str     # formato "HH:MM"
    comentario: Optional[str] = ""

class StudyCalendarBase(BaseModel):
    data: Dict[str, List[StudyBlock]]  # dias da semana: blocos de estudo
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None

class StudyCalendarCreate(StudyCalendarBase):
    data_inicio: Optional[date] = None # Adicione os novos campos
    data_fim: Optional[date] = None     # Adicione os novos campos

class StudyCalendarUpdate(StudyCalendarBase):
    pass

class StudyCalendar(StudyCalendarBase):
    id: int
    user_id: int
    edital_id: int
    titulo_edital: str
    data: Dict[str, Any]
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    criado_em: datetime
    updated_at: datetime

    # Adicionando o relacionamento para o edital verticalizado
    edital: VerticalizedSyllabus
    
    class Config:
        from_attributes = True
        populate_by_name = True

class CalendarWithEditalTitle(BaseModel):
    id: int
    edital_id: int
    titulo_edital: str = Field(alias='nome') # Adicionei o alias para o nome do edital
    
    class Config:
        from_attributes = True

class StudyPlanOverview(BaseModel):
    id: int
    nome: str
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None

    class Config:
        from_attributes = True
