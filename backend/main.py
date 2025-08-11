from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import timedelta
from fastapi import Path
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
from urllib.parse import unquote
# CORREÇÃO AQUI: Usando o nome correto da pasta 'routers'
from routers import simulados
from routers import edital_verticalizado
from routers import calendario
from fastapi.encoders import jsonable_encoder
import logging
import json
import sys
import os

# Adds the 'backend' directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import pdf_processor # Import the pdf_processor module

# Relative imports
from . import crud, models, schemas, auth
from .database import SessionLocal, engine, get_db

# Configure the logger to display INFO or DEBUG messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:5173",  # Where your React frontend is running
    "http://127.0.0.1:5173",
    # Add other domains if the frontend is hosted elsewhere
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all origins for debugging
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allow all headers
)

app.include_router(simulados.router)
app.include_router(edital_verticalizado.router)
app.include_router(calendario.router, prefix="/api/calendario")

# --- Authentication Endpoints ---

@app.post("/api/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Endpoint for user authentication and JWT token issuance.
    Expects 'username' (which is the email) and 'password'.
    """
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        logger.warning(f"Login attempt failed for email: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        logger.warning(f"Inactive user tried to log in: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sua conta está pendente de aprovação ou foi desativada. Entre em contato com o administrador.",
        )
    
    # Add 'role' and 'id' to the token payload for easy access in the frontend
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role, "id": user.id},
        expires_delta=access_token_expires,
    )
    logger.info(f"Access token generated for user: {user.username} (Role: {user.role})")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me/", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    """
    Endpoint to get information about the logged-in user.
    """
    logger.info(f"Accessing logged-in user information: {current_user.username}")
    return current_user

@app.post("/api/register/", response_model=schemas.User)
async def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Endpoint for new user registration.
    """
    db_user_email = crud.get_user_by_email(db, email=user.email)
    if db_user_email:
        logger.warning(f"Registration attempt with existing email: {user.email}")
        raise HTTPException(status_code=400, detail="Email já registrado")
    
    db_user_username = crud.get_user_by_username(db, username=user.username)
    if db_user_username:
        logger.warning(f"Registration attempt with existing username: {user.username}")
        raise HTTPException(status_code=400, detail="Nome de usuário já existe")

    hashed_password = auth.get_password_hash(user.password)
    user.password = hashed_password
    
    new_user = crud.create_user(db=db, user=user)
    logger.info(f"New user registered: {new_user.username} (Role: {new_user.role}, Active: {new_user.is_active})")
    return new_user

# --- User Management Endpoints (Admin Only) ---

@app.get("/api/users/pending/", response_model=List[schemas.User])
async def get_pending_users(current_user: schemas.User = Depends(auth.get_current_admin_user), db: Session = Depends(get_db)):
    """
    Returns a list of users pending approval. Admin only.
    """
    logger.info(f"Admin {current_user.username} fetching pending users.")
    users = crud.get_pending_users(db)
    return users

@app.patch("/api/users/{user_id}/approve", response_model=schemas.User)
async def approve_user(user_id: int, current_user: schemas.User = Depends(auth.get_current_admin_user), db: Session = Depends(get_db)):
    """
    Approves a user, activating their account. Admin only.
    """
    logger.info(f"Admin {current_user.username} approving user ID: {user_id}")
    user = crud.update_user_status(db, user_id, is_active=True)
    if not user:
        logger.warning(f"Attempt to approve non-existent user ID: {user_id}")
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@app.patch("/api/users/{user_id}/reject", response_model=schemas.User)
async def reject_user(user_id: int, current_user: schemas.User = Depends(auth.get_current_admin_user), db: Session = Depends(get_db)):
    """
    Rejects a user, deactivating their account. Admin only.
    """
    logger.info(f"Admin {current_user.username} rejecting user ID: {user_id}")
    user = crud.update_user_status(db, user_id, is_active=False)
    if not user:
        logger.warning(f"Attempt to reject non-existent user ID: {user_id}")
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

# --- Question Endpoints ---

@app.get("/api/questions/buscar", response_model=List[schemas.Question])
async def search_questions_route(
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    return crud.search_questions(db, query=query)

@app.get("/api/questions/count-filtered/", response_model=Dict[str, Any])
async def count_filtered_questions(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    materia: Optional[str] = None,
    assunto: Optional[str] = None,
    banca: Optional[str] = None,
    orgao: Optional[str] = None,
    cargo: Optional[str] = None,
    ano: Optional[int] = None,
    escolaridade: Optional[str] = None,
    dificuldade: Optional[str] = None,
    regiao: Optional[str] = None,
    exclude_anuladas: Optional[bool] = False,
    exclude_desatualizadas: Optional[bool] = False,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Counts the number of questions based on filters and returns their IDs.
    Accessible by users and administrators.
    """
    logger.info(f"User {current_user.username} counting questions with filters: Materia={materia}, Assunto={assunto}, Banca={banca}, Excluir Anuladas={exclude_anuladas}, Excluir Desatualizadas={exclude_desatualizadas}")

    # Se search estiver preenchido, buscar por ID ou enunciado
    if search:
        try:
            question_id = int(search)
            question = crud.get_question(db, question_id=question_id)
            return {"count": 1 if question else 0, "ids": [question_id] if question else []}
        except ValueError:
            found_questions = crud.search_questions_by_enunciado(db, search)
            ids = [q.id for q in found_questions]
            return {"count": len(ids), "ids": ids}

    # Usar os filtros fornecidos normalmente
    result = crud.count_questions(
        db,
        materia=materia,
        assuntos=[assunto] if assunto else None,
        banca=[banca] if banca else None,
        orgao=[orgao] if orgao else None,
        cargo=[cargo] if cargo else None,
        ano=[ano] if ano else None,
        escolaridade=[escolaridade] if escolaridade else None,
        dificuldade=[dificuldade] if dificuldade else None,
        regiao=[regiao] if regiao else None,
        exclude_anuladas=exclude_anuladas,
        exclude_desatualizadas=exclude_desatualizadas
    )

    return result


@app.post("/api/questions/", response_model=schemas.Question, status_code=status.HTTP_201_CREATED)
async def create_question(
    question: schemas.QuestionCreate,
    current_user: schemas.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Admin {current_user.username} creating new question.")
    db_question = crud.create_question(db=db, question=question)
    return db_question

@app.get("/api/questions/fields/{field_name}", response_model=List[str])
async def get_unique_fields(
    field_name: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    try:
        print(f"Requested field: {field_name}")
        valores = crud.get_unique_question_fields(db, field_name)
        return [str(v) for v in valores if v is not None]
    except Exception as e:
        print(f"❌ Error fetching field '{field_name}':", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/questions/", response_model=List[schemas.Question])
async def read_questions(
    skip: int = 0,
    limit: int = 100,
    materia: Optional[str] = None,
    assunto: Optional[str] = None, # Este é o parâmetro de query que vem do frontend
    banca: Optional[str] = None,
    orgao: Optional[str] = None,
    cargo: Optional[str] = None,
    ano: Optional[int] = None,
    escolaridade: Optional[str] = None,
    dificuldade: Optional[str] = None,
    regiao: Optional[str] = None,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"User {current_user.username} fetching questions with filters: Materia={materia}, Assunto={assunto}, Banca={banca}")
    
    # CORREÇÃO AQUI: Passa 'assuntos' como uma lista, mesmo que contenha apenas um item ou seja None
    assuntos_list = [assunto] if assunto else None 

    questions = crud.get_questions(
        db, skip=skip, limit=limit,
        materia=materia, 
        assuntos=assuntos_list, # <-- CORRIGIDO: Agora passa 'assuntos' como uma lista
        banca=banca, orgao=orgao, cargo=cargo,
        ano=ano, escolaridade=escolaridade, dificuldade=dificuldade, regiao=regiao
    )
    return questions

@app.get("/api/questions/{question_id}", response_model=schemas.Question)
async def read_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Gets a question by ID.
    """
    logger.info(f"User {current_user.username} fetching question ID: {question_id}")
    db_question = crud.get_question(db, question_id=question_id)
    if db_question is None:
        logger.warning(f"Question ID {question_id} not found.")
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return db_question

@app.put("/api/questions/{question_id}", response_model=schemas.Question)
async def update_question(
    question_id: int,
    question: schemas.QuestionCreate,
    current_user: schemas.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Admin {current_user.username} updating question ID: {question_id}")
    db_question = crud.update_question(db, question_id=question_id, question_update=question)
    if db_question is None:
        logger.warning(f"Attempt to update non-existent question ID: {question_id}")
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return db_question

@app.patch("/api/questions/{question_id}/status", response_model=schemas.Question)
async def update_question_status_route(
    question_id: int,
    status_update: schemas.QuestionStatusUpdate,
    current_user: schemas.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Updates the annulled or outdated status of a question. Admin only.
    """
    logger.info(f"Admin {current_user.username} updating status of question ID: {question_id} with {status_update.model_dump()}")
    db_question = crud.update_question_status(db, question_id=question_id, status_update=status_update)
    if db_question is None:
        logger.warning(f"Attempt to update status of non-existent question ID: {question_id}")
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return db_question

@app.delete("/api/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    current_user: schemas.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Admin {current_user.username} deleting question ID: {question_id}")
    success = crud.delete_question(db, question_id=question_id)
    if not success:
        logger.warning(f"Attempt to delete non-existent question ID: {question_id}")
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return {"message": "Questão deletada com sucesso"}


# --- Question Statistics Endpoints (Individual) ---

# NEW ENDPOINT: GET to fetch question statistics
@app.get("/api/questions/{question_id}/statistics", response_model=schemas.QuestionStatistics)
async def get_question_stats_route(
    question_id: int, 
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Gets performance statistics for a specific question.
    """
    logger.info(f"User {current_user.username} fetching statistics for question ID: {question_id}")
    stats = crud.get_question_statistics(db, question_id=question_id)
    if not stats:
        # Returns zeroed statistics if no record yet
        return schemas.QuestionStatistics(question_id=question_id, total_attempts=0, correct_attempts=0)
    return stats

@app.get("/api/questions/{question_id}/statistics/split", response_model=Dict[str, Any])
async def get_split_statistics(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    total = crud.get_question_statistics(db, question_id)

    user_attempts = 0
    user_corrects = 0

    user_progresses = db.query(models.NotebookProgress).filter(
        models.NotebookProgress.user_id == current_user.id
    ).all()

    for progress in user_progresses:
        respostas = json.loads(progress.respostas) if isinstance(progress.respostas, str) else progress.respostas
        user_answer = respostas.get(str(question_id))
        if user_answer is not None:
            user_attempts += 1
            question = crud.get_question(db, question_id)
            if question:
                gabarito = question.gabarito.upper()
                tipo = question.tipo
                if tipo == "multipla":
                    g_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}
                    if user_answer == g_map.get(gabarito):
                        user_corrects += 1
                elif tipo == "certo_errado":
                    correto = 1 if gabarito.lower() == "certo" else 0
                    if user_answer == correto:
                        user_corrects += 1

    others_attempts = total.total_attempts - user_attempts
    others_corrects = total.correct_attempts - user_corrects

    return {
        "total": {
            "tentativas": total.total_attempts,
            "acertos": total.correct_attempts
        },
        "usuario": {
            "tentativas": user_attempts,
            "acertos": user_corrects
        },
        "outros": {
            "tentativas": others_attempts,
            "acertos": others_corrects
        }
    }

@app.patch("/api/questions/{question_id}/statistics", response_model=schemas.QuestionStatistics)
async def update_question_statistics_route(
    question_id: int,
    is_correct: bool = Body(..., embed=True), 
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the statistics of a question (total attempts, correct answers).
    Accessible by users and administrators.
    """
    logger.info(f"User {current_user.username} updating statistics for question ID: {question_id}, Correct: {is_correct}")
    stats = crud.update_question_statistics(db, question_id, is_correct)
    if not stats:
        logger.warning(f"Question ID {question_id} not found to update statistics.")
        raise HTTPException(status_code=404, detail="Questão não encontrada para atualizar estatísticas")
    return stats

@app.get("/api/users/me/stats", response_model=schemas.UserStats)
async def get_my_stats(current_user: schemas.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """
    Returns general study statistics for the logged-in user.
    """
    logger.info(f"User {current_user.username} fetching general statistics.")
    stats = crud.get_user_overall_stats(db, current_user.id)
    return stats

# --- Notebook Endpoints ---

@app.post("/api/notebooks/", response_model=schemas.Notebook, status_code=status.HTTP_201_CREATED)
async def create_notebook(
    notebook: schemas.NotebookCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new notebook for the logged-in user.
    """
    logger.info(f"User {current_user.username} creating notebook: {notebook.nome}")
    db_notebook = crud.create_notebook(db=db, notebook=notebook, user_id=current_user.id)
    return db_notebook

@app.get("/api/notebooks/", response_model=List[schemas.Notebook])
async def read_user_notebooks(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all notebooks of the logged-in user.
    """
    logger.info(f"User {current_user.username} fetching their notebooks.")
    notebooks = crud.get_user_notebooks(db, user_id=current_user.id)
    return notebooks

@app.get("/api/notebooks/{notebook_id}/resolve_data", response_model=schemas.NotebookResolveData)
async def get_notebook_resolve_data(
    notebook_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the complete data of a notebook for resolution, including questions and progress.
    """
    logger.info(f"User {current_user.username} fetching data to resolve notebook ID: {notebook_id}")
    db_notebook_data = crud.get_notebook_with_questions(db, notebook_id, current_user.id)
    if not db_notebook_data:
        logger.warning(f"Notebook ID {notebook_id} not found for user {current_user.username}.")
        raise HTTPException(status_code=404, detail="Caderno não encontrado ou você não tem permissão para acessá-lo.")
    
    progress_schema = None
    if db_notebook_data.progress_data:
        progress_schema = schemas.NotebookProgress.model_validate(db_notebook_data.progress_data)

    return schemas.NotebookResolveData(
        nome=db_notebook_data.nome,
        questoes=db_notebook_data.questions_data,
        progresso=progress_schema
    )

# NEW ENDPOINT: GET to fetch the progress of a specific notebook
@app.get("/api/notebooks/{notebook_id}/progress", response_model=schemas.NotebookProgress)
async def get_notebook_progress_route(
    notebook_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the progress of a specific notebook for the logged-in user.
    """
    logger.info(f"User {current_user.username} fetching progress for notebook ID: {notebook_id}")
    db_progress = crud.get_notebook_progress(db, notebook_id, current_user.id)
    if not db_progress:
        # If no progress, returns an object with default values
        return schemas.NotebookProgress(
            notebook_id=notebook_id,
            user_id=current_user.id,
            index=0,
            respostas={}
        )
    return db_progress

@app.patch("/api/notebooks/{notebook_id}/progress", response_model=schemas.NotebookProgress)
async def update_progress(
    notebook_id: int,
    progress_data: schemas.NotebookProgressUpdate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the progress of a notebook for the logged-in user.
    """
    logger.info(f"User {current_user.username} updating progress for notebook ID: {notebook_id}")
    db_progress = crud.create_or_update_notebook_progress(db, notebook_id, current_user.id, progress_data)
    return db_progress

@app.patch("/api/notebooks/{notebook_id}/resposta")
async def register_question_response(
    notebook_id: int,
    response_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Registers the answer to a question and updates the question's statistics.
    """
    question_id = response_data.get("questaoId")
    is_correct = response_data.get("acertou")

    if question_id is None or is_correct is None:
        raise HTTPException(status_code=400, detail="Incomplete response data (questaoId and acertou are required).")
    
    notebook = crud.get_notebook(db, notebook_id=notebook_id)
    if not notebook or notebook.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado ou caderno não encontrado.")
    
    try:
        crud.update_question_statistics(db, question_id=question_id, is_correct=is_correct)
        return {"message": "Resposta registrada e estatísticas atualizadas com sucesso."}
    except Exception as e:
        logger.error(f"Error registering response and updating statistics for question ID {question_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar a resposta: {e}")

@app.put("/api/notebooks/{notebook_id}", response_model=schemas.Notebook)
async def update_notebook(
    notebook_id: int,
    notebook_update: schemas.NotebookUpdate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the name of a notebook.
    """
    logger.info(f"User {current_user.username} updating notebook ID: {notebook_id}")
    db_notebook = crud.update_notebook(db, notebook_id=notebook_id, notebook_update=notebook_update)
    if not db_notebook:
        logger.warning(f"Notebook ID {notebook_id} not found for update by user {current_user.username}.")
        raise HTTPException(status_code=404, detail="Caderno não encontrado")
    return db_notebook

@app.delete("/api/notebooks/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(
    notebook_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a notebook.
    """
    logger.info(f"User {current_user.username} deleting notebook ID: {notebook_id}")
    success = crud.delete_notebook(db, notebook_id=notebook_id)
    if not success:
        logger.warning(f"Notebook ID {notebook_id} not found for deletion by user {current_user.username}.")
        raise HTTPException(status_code=404, detail="Caderno não encontrado")
    return {"message": "Caderno deletado com sucesso"}

# --- Comment Endpoints ---

@app.post("/api/questions/{question_id}/comments", response_model=schemas.Comment, status_code=status.HTTP_201_CREATED)
async def create_comment_for_question(
    question_id: int,
    comment: schemas.CommentCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adds a comment to a specific question.
    """
    logger.info(f"User {current_user.username} adding comment to question ID: {question_id}")

    # Create the comment in the database
    db_comment = crud.create_comment(db, question_id, current_user.id, comment.content)

    # Return the response in the format expected by the frontend (including the user)
    return schemas.Comment(
        id=db_comment.id,
        question_id=db_comment.question_id,
        user_id=db_comment.user_id,
        content=db_comment.content,
        points=db_comment.points,
        created_at=db_comment.created_at,
        updated_at=db_comment.updated_at,
        user=schemas.UserForComment(
            id=current_user.id,
            username=current_user.username
        )
    )

@app.get("/api/questions/{question_id}/comments", response_model=List[Dict[str, Any]])
async def get_question_comments(
    question_id: int,
    orderBy: str = "createdAt", 
    order: str = "desc",
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all comments for a specific question, with the current user's vote status.
    """
    logger.info(f"User {current_user.username} fetching comments for question ID: {question_id}")
    return crud.get_comments_with_vote_status(db, question_id, current_user.id)

@app.put("/api/questions/comments/{comment_id}", response_model=schemas.Comment)
async def update_comment_route(
    comment_id: int,
    comment_update: schemas.CommentCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates an existing comment.
    """
    logger.info(f"User {current_user.username} updating comment ID: {comment_id}")
    db_comment = crud.update_comment(db, comment_id, current_user.id, comment_update.content)
    if not db_comment:
        logger.warning(f"Comment ID {comment_id} not found or user {current_user.username} not authorized to update.")
        raise HTTPException(status_code=404, detail="Comentário não encontrado ou você não tem permissão para editar.")
    return db_comment

@app.delete("/api/questions/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment_route(
    comment_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a comment.
    """
    logger.info(f"User {current_user.username} deleting comment ID: {comment_id}")
    success = crud.delete_comment(db, comment_id, current_user.id)
    if not success:
        logger.warning(f"Comment ID {comment_id} not found or user {current_user.username} not authorized to delete.")
        raise HTTPException(status_code=404, detail="Comentário não encontrado ou você não tem permissão para deletar.")
    return {"message": "Comentário deletado com sucesso"}

@app.patch("/api/questions/comments/{comment_id}/vote", response_model=schemas.Comment)
async def vote_on_comment(
    comment_id: int,
    type: str = Query(..., description="Vote type: upvote, downvote, or remove"),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Registers or removes a vote on a comment.
    """
    logger.info(f"User {current_user.username} voting '{type}' on comment ID: {comment_id}")

    if type not in ["upvote", "downvote", "remove"]:
        raise HTTPException(status_code=400, detail="Tipo de voto inválido. Use 'upvote', 'downvote' ou 'remove'.")

    db_comment = crud.vote_comment(db, comment_id, current_user.id, type)

    if not db_comment:
        logger.warning(f"Comment ID {comment_id} not found for voting.")
        raise HTTPException(status_code=404, detail="Comentário não encontrado.")

    return db_comment

@app.get("/api/users/me/comments", response_model=List[schemas.CommentResponse]) # MODIFIED
def read_user_comments(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    print(f"DEBUG: Request received for /api/users/me/comments by user {current_user.id}")
    return crud.get_comments_by_user(db, current_user.id)

@app.get("/api/users/me/liked-comments", response_model=List[schemas.LikedComment])
def read_user_liked_comments(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    print(f"DEBUG: Request received for /api/users/me/liked-comments by user {current_user.id}")
    return crud.get_liked_comments_by_user(db, current_user.id)

@app.get("/api/comments/by-id/{comment_id}", response_model=schemas.CommentResponse)
def read_comment_detail(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    print(f"DEBUG: Request received for /api/comments/by-id/{comment_id} by user {current_user.id}")
    comment = crud.get_comment(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    
    # Load related data for the schema
    comment.author # This will load the author relationship
    comment.question # This will load the question relationship
    
    # Manually map to CommentResponse schema, including materia and assunto from question
    return schemas.CommentResponse(
        id=comment.id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user=schemas.UserForComment(id=comment.author.id, username=comment.author.username),
        question_id=comment.question_id,
        materia=comment.question.materia if comment.question else None,
        assunto=comment.question.assunto if comment.question else None
    )

# --- Theory Endpoints ---

@app.post("/api/theories/", response_model=schemas.Theory, status_code=status.HTTP_201_CREATED)
async def create_or_update_theory(
    theory: schemas.TheoryCreate,
    current_user: schemas.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Creates or updates a theory. Admin only.
    """
    logger.info(f"Admin {current_user.username} creating/updating theory for Subject: {theory.materia}, Topic: {theory.assunto}")
    db_theory = crud.create_or_update_theory(db, theory)
    return db_theory

@app.get("/api/theories/", response_model=List[schemas.TheoryMeta])
async def get_all_theory_metadata(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns metadata (subject and topic) for all theories.
    Accessible by users and administrators.
    """
    logger.info(f"User {current_user.username} fetching theory metadata.")
    theories_meta = crud.get_all_theory_metadata(db)
    return theories_meta

@app.get("/api/theories", response_model=schemas.Theory)
async def get_theory_content(
    materia: str = Query(...),
    assunto: str = Query(...),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    materia = unquote(materia)
    assunto = unquote(assunto)
    """
    Returns the content of a specific theory by subject and topic.
    Accessible by users and administrators.
    """
    logger.info(f"User {current_user.username} fetching theory for Subject: {materia}, Topic: {assunto}")
    db_theory = crud.get_theory(db, materia, assunto)
    if not db_theory:
        logger.warning(f"Theory not found for Subject: {materia}, Topic: {assunto}")
        raise HTTPException(status_code=404, detail="Teoria não encontrada")
    return db_theory

@app.delete("/api/theories/{materia}/{assunto}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theory_route(
    materia: str,
    assunto: str,
    current_user: schemas.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a specific theory. Admin only.
    """
    logger.info(f"Admin {current_user.username} deleting theory for Subject: {materia}, Topic: {assunto}")
    success = crud.delete_theory(db, materia, assunto)
    if not success:
        logger.warning(f"Theory not found for deletion: Materia={materia}, Assunto={assunto}")
        raise HTTPException(status_code=404, detail="Teoria não encontrada")
    return {"message": "Teoria deletada com sucesso"}

# --- PDF Upload Endpoints (Placeholder) ---

@app.post("/api/upload-pdf/")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint for uploading and processing PDF files for question extraction.
    Admin only.
    """
    logger.info(f"Admin {current_user.username} starting PDF upload: {file.filename}")
    if not file.filename.endswith(".pdf"):
        logger.warning(f"Attempt to upload non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")

    try:
        pdf_content = await file.read()
        num_questions_added = pdf_processor.process_pdf_and_add_questions(db, pdf_content)
        
        logger.info(f"PDF '{file.filename}' processed successfully. {num_questions_added} questions added.")
        return {"message": f"PDF processado com sucesso! {num_questions_added} questões adicionadas."}
    except Exception as e:
        logger.error(f"Error processing PDF '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar o PDF: {str(e)}")

# --- Favorite Questions Endpoints (NEW) ---

@app.post("/api/favorites/", response_model=schemas.FavoriteQuestion, status_code=status.HTTP_201_CREATED)
async def add_favorite_question(
    favorite_data: schemas.FavoriteQuestionCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adds a question to the user's favorites.
    """
    logger.info(f"User {current_user.username} favorited question ID: {favorite_data.question_id} from notebook ID: {favorite_data.notebook_id}")
    # Check if the question and notebook exist and belong to the user (or are public)
    question = crud.get_question(db, favorite_data.question_id)
    notebook = crud.get_notebook(db, favorite_data.notebook_id)

    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    if not notebook:
        raise HTTPException(status_code=404, detail="Caderno não encontrado.")
    # Add validation if the notebook belongs to the user or is a public notebook
    # if notebook.user_id != current_user.id:
    #     raise HTTPException(status_code=403, detail="Você não tem permissão para favoritar questões deste caderno.")

    # Check if it already exists to avoid duplicates (UniqueConstraint in the model already helps)
    existing_favorite = crud.get_favorite_question(db, current_user.id, favorite_data.question_id, favorite_data.notebook_id)
    if existing_favorite:
        raise HTTPException(status_code=409, detail="Questão já favoritada neste caderno.")

    db_favorite = crud.create_favorite_question(db, current_user.id, favorite_data.question_id, favorite_data.notebook_id)
    
    # Populate the question and notebook_name fields for the schema return
    db_favorite.question = question
    db_favorite.notebook_name = notebook.nome # Assuming notebook.nome is available

    return db_favorite

@app.delete("/api/favorites/{question_id}/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite_question(
    question_id: int,
    notebook_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Removes a question from the user's favorites.
    """
    logger.info(f"User {current_user.username} unfavorited question ID: {question_id} from notebook ID: {notebook_id}")
    success = crud.delete_favorite_question(db, current_user.id, question_id, notebook_id)
    if not success:
        raise HTTPException(status_code=404, detail="Questão favorita não encontrada.")
    return {"message": "Questão removida dos favoritos com sucesso."}

@app.get("/api/favorites/", response_model=List[schemas.FavoriteQuestion])
async def get_favorite_questions(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all favorite questions of the logged-in user.
    """
    logger.info(f"User {current_user.username} fetching favorite questions.")
    favorites = crud.get_all_favorite_questions_for_user(db, current_user.id)
    return favorites

@app.get("/api/users/me/wrong-questions", response_model=List[schemas.FavoriteQuestion])
def get_user_wrong_questions(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    return crud.get_user_wrong_questions(db, current_user.id)

# --- Notes Endpoints (QuestionNote) ---

@app.get("/api/notes/me", response_model=List[schemas.QuestionNoteResponse])
def get_my_notes(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Returns all notes of the logged-in user.
    """
    logger.info(f"User {current_user.username} fetching their notes.")
    notes = crud.get_user_notes(db, current_user.id)
    return notes

@app.get("/api/notes/detail/{note_id}", response_model=schemas.QuestionNoteResponse) # NEW ENDPOINT
def get_note_detail(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Gets the details of a specific note by its ID.
    """
    logger.info(f"User {current_user.username} fetching details of note ID: {note_id}")
    note = crud.get_note_by_id(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Anotação não encontrada ou você não tem permissão para acessá-la.")
    return note

@app.get("/api/notes/{question_id}", response_model=schemas.QuestionNoteResponse)
def get_note(question_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    """
    Gets a specific note for a question for the logged-in user.
    """
    note = crud.get_note_by_user_and_question(db, current_user.id, question_id)
    if not note:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    return note

@app.post("/api/notes/", response_model=schemas.QuestionNoteResponse)
def create_or_update_note(note: schemas.QuestionNoteBase, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    """
    Creates or updates a note for a specific question of the logged-in user.
    This endpoint handles both creation (if note doesn't exist) and update (if note exists).
    """
    logger.info(f"User {current_user.username} creating/updating note for question ID: {note.question_id}")
    return crud.create_or_update_note(db, current_user.id, note)

# NEW: PATCH endpoint for updating an existing note by its ID
@app.patch("/api/notes/{note_id}", response_model=schemas.QuestionNoteResponse)
def update_existing_note(
    note_id: int,
    note_update: schemas.QuestionNoteBase, # Use QuestionNoteBase for content update
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Updates an existing note by its ID.
    """
    logger.info(f"User {current_user.username} updating note ID: {note_id}")
    
    # First, get the existing note to ensure it belongs to the user
    existing_note = crud.get_note_by_id(db, note_id, current_user.id)
    if not existing_note:
        raise HTTPException(status_code=404, detail="Anotação não encontrada ou você não tem permissão para editá-la.")
    
    # Use the crud function to update the note content
    updated_note = crud.create_or_update_note(db, current_user.id, note_update) # crud.create_or_update_note handles the update logic
    
    # Ensure the returned object matches the schema, including question data
    updated_note.materia = updated_note.question.materia if updated_note.question else None
    updated_note.assunto = updated_note.question.assunto if updated_note.question else None
    updated_note.title = "Anotação" # Default title for the frontend
    
    return updated_note


@app.delete("/api/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note_endpoint(note_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    """
    Deletes a note by ID, checking if it belongs to the user.
    """
    success = crud.delete_note(db, note_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Nota não encontrada ou você não tem permissão para deletar.")
    return {"message": "Nota deletada com sucesso"}

@app.post("/api/edital-verticalizado/", response_model=schemas.VerticalizedSyllabus)
def create_syllabus(
    syllabus: schemas.VerticalizedSyllabusCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.create_verticalized_syllabus(db=db, syllabus=syllabus, user_id=current_user.id)

@app.get("/api/edital-verticalizado/", response_model=List[schemas.VerticalizedSyllabus])
def list_user_syllabi(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_user_syllabi(db, current_user.id)

@app.get("/api/edital-verticalizado/{syllabus_id}", response_model=schemas.VerticalizedSyllabus)
def get_syllabus(
    syllabus_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    syllabus = crud.get_syllabus_by_id(db, syllabus_id, current_user.id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Edital não encontrado")
    return syllabus

@app.patch("/api/edital-verticalizado/{syllabus_id}", response_model=schemas.VerticalizedSyllabus)
def update_syllabus( # Renomeado para maior clareza
    syllabus_id: int,
    syllabus_update: schemas.VerticalizedSyllabusUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    # Você precisará criar uma função crud.update_syllabus
    updated_syllabus = crud.update_syllabus(db, syllabus_id, current_user.id, syllabus_update)
    if not updated_syllabus:
        raise HTTPException(status_code=404, detail="Edital não encontrado.")
    return updated_syllabus

@app.delete("/api/edital-verticalizado/{syllabus_id}")
def delete_syllabus(
    syllabus_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    success = crud.delete_syllabus(db, syllabus_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Edital não encontrado")
    return {"message": "Edital excluído com sucesso"}

@app.get("/api/edital/{edital_id}/materias", response_model=List[str])
def get_materias_edital(
    edital_id: int, 
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Retorna a lista de matérias de um edital verticalizado específico,
    verificando a propriedade do usuário.
    """
    # Chama a função CRUD que contém a lógica de busca e extração.
    # Passar o user_id garante que um usuário não possa ver matérias de um edital de outro.
    materias = crud.get_materias_for_edital(db, edital_id=edital_id, user_id=current_user.id)
    
    # Se a função CRUD retornar uma lista vazia, significa que o edital não foi 
    # encontrado para aquele usuário ou que o campo 'conteudo' está vazio.
    if not materias:
        raise HTTPException(
            status_code=404, 
            detail="Edital não encontrado ou não contém matérias."
        )
        
    return materias

# Endpoint para buscar todos os editais de um usuário que possuem calendário
@app.get("/api/planos-de-estudo/usuario", response_model=List[schemas.VerticalizedSyllabus])
def get_user_syllabi_with_calendars(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Busca todos os editais de um usuário que possuem um calendário de estudo associado.
    """
    syllabi = crud.get_syllabi_with_calendars(db, current_user.id)
    if not syllabi:
        return []
    return syllabi


# Endpoint para gerar o plano de estudos de um edital específico
@app.get("/api/planos-de-estudo/{edital_id}", response_model=Dict[str, List[Any]])
def get_sugestoes_de_estudo_com_pesos(
    edital_id: int,
    banca: str = Query(None, description="Banca do concurso"),
    horas_semana: int = Query(20, description="Número de horas disponíveis por semana"),
    db: Session = Depends(get_db)
):
    """
    Gera um plano de estudos com sugestões de horas por matéria baseado no edital e na banca.
    """
    edital = crud.get_verticalized_syllabus(db, edital_id=edital_id)
    if not edital:
        raise HTTPException(status_code=404, detail="Edital não encontrado")

    materias = edital.conteudo.keys()
    materias_data = {m: {"topicos": len(edital.conteudo[m]), "questoes_banca": 0} for m in materias}

    # Contar questões da banca
    for materia in materias_data.keys():
        count = db.query(models.Question).filter(
            models.Question.materia == materia,
            models.Question.banca == banca
        ).count()
        materias_data[materia]["questoes_banca"] = count

    # Calcular pesos e horas sugeridas
    total_peso = sum(v["topicos"] + v["questoes_banca"] for v in materias_data.values())
    sugestoes = []
    for materia, dados in materias_data.items():
        peso = dados["topicos"] + dados["questoes_banca"]
        horas_sugeridas = round((peso / total_peso) * horas_semana, 2) if total_peso > 0 else 0
        sugestoes.append({
            "materia": materia,
            "topicos": dados["topicos"],
            "questoes_banca": dados["questoes_banca"],
            "peso": peso,
            "horas_sugeridas": horas_sugeridas
        })

    # Ordenar matérias por peso (mais prioridade primeiro)
    sugestoes.sort(key=lambda x: x["peso"], reverse=True)

    return {"sugestoes": sugestoes}


# Endpoint único para listar todos os planos de estudo do usuário com título do edital
@app.get("/api/plano-de-estudo", response_model=List[schemas.StudyCalendar])
def list_user_study_plans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # A função CRUD já faz o join e busca os dados necessários
    planos_db = crud.get_user_study_plans_with_titles(db, current_user.id)

    # Lista para armazenar os resultados formatados
    resultados_finais = []

    for plano_info in planos_db:
        # Busca o objeto 'edital' completo para satisfazer o schema
        edital_obj = crud.get_syllabus_by_id(db, syllabus_id=plano_info.edital_id, user_id=current_user.id)
        
        if not edital_obj:
            # Se por algum motivo o edital não for encontrado, pula este plano
            continue

        # Monta o dicionário de resposta no formato exato do schema StudyCalendar
        plano_formatado = {
            "id": plano_info.id,
            "user_id": current_user.id,  # Adiciona o user_id que estava faltando
            "edital_id": plano_info.edital_id,
            "titulo_edital": plano_info.titulo_edital,
            "data": plano_info.data,
            "data_inicio": plano_info.data_inicio,
            "data_fim": plano_info.data_fim,
            "criado_em": plano_info.criado_em,
            "updated_at": plano_info.updated_at,
            "edital": edital_obj  # Adiciona o objeto edital completo que estava faltando
        }
        resultados_finais.append(plano_formatado)

    return resultados_finais