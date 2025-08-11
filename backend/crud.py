from sqlalchemy.orm import Session, joinedload
import models, schemas
from typing import List, Optional, Dict, Any, Union
from sqlalchemy import distinct, func
import json
from fastapi.encoders import jsonable_encoder
from datetime import datetime, date # Import datetime
import re # Importar módulo de expressões regulares

# Função auxiliar para remover tags <p> e </p>
def strip_p_tags(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None
    # Remove <p> no início e </p> no final, e também <p> ou </p> soltos
    cleaned_text = re.sub(r'</?p>', '', text).strip()
    return cleaned_text

# --- CRUD Functions for Users ---

def get_user(db: Session, user_id: int):
    """
    Gets a user by ID.
    """
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    """
    Gets a user by email.
    """
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_username(db: Session, username: str):
    """
    Gets a user by username.
    """
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    """
    Creates a new user in the database.
    """
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=user.password, # Password should already be hashed from auth.py
        role=user.role if user.role else "comum",
        is_active=True if user.role == "admin" else False # Admins active by default, common pending
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_pending_users(db: Session) -> List[models.User]:
    """
    Returns a list of users with role 'comum' that have not yet been activated (is_active=False).
    """
    return db.query(models.User).filter(
        models.User.role == "comum",
        models.User.is_active == False
    ).all()

def update_user_status(db: Session, user_id: int, is_active: bool):
    """
    Updates a user's activity status.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.is_active = is_active
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    return None

# --- CRUD Functions for Questions ---

def get_question(db: Session, question_id: int):
    """
    Gets a question by ID.
    """
    return db.query(models.Question).filter(models.Question.id == question_id).first()

def get_questions(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    materia: Optional[str] = None,
    assuntos: Optional[List[str]] = None,
    banca: Optional[Union[str, List[str]]] = None,
    orgao: Optional[Union[str, List[str]]] = None,
    cargo: Optional[Union[str, List[str]]] = None,
    ano: Optional[Union[int, List[int]]] = None,
    escolaridade: Optional[Union[str, List[str]]] = None,
    dificuldade: Optional[Union[str, List[str]]] = None,
    regiao: Optional[Union[str, List[str]]] = None,
    exclude_anuladas: Optional[bool] = False,
    exclude_desatualizadas: Optional[bool] = False
) -> List[models.Question]:
    """
    Lists questions with optional filters, including annulment/outdated status.
    Accepts single values or lists for filtering fields.
    """
    query = db.query(models.Question)

    if materia:
        query = query.filter(models.Question.materia == materia)
    if assuntos:
        query = query.filter(models.Question.assunto.in_(assuntos))

    if banca:
        if isinstance(banca, list):
            query = query.filter(models.Question.banca.in_(banca))
        else:
            query = query.filter(models.Question.banca == banca)

    if orgao:
        if isinstance(orgao, list):
            query = query.filter(models.Question.orgao.in_(orgao))
        else:
            query = query.filter(models.Question.orgao == orgao)

    if cargo:
        if isinstance(cargo, list):
            query = query.filter(models.Question.cargo.in_(cargo))
        else:
            query = query.filter(models.Question.cargo == cargo)

    if ano:
        if isinstance(ano, list):
            query = query.filter(models.Question.ano.in_(ano))
        else:
            query = query.filter(models.Question.ano == ano)

    if escolaridade:
        if isinstance(escolaridade, list):
            query = query.filter(models.Question.escolaridade.in_(escolaridade))
        else:
            query = query.filter(models.Question.escolaridade == escolaridade)

    if dificuldade:
        if isinstance(dificuldade, list):
            query = query.filter(models.Question.dificuldade.in_(dificuldade))
        else:
            query = query.filter(models.Question.dificuldade == dificuldade)

    if regiao:
        if isinstance(regiao, list):
            query = query.filter(models.Question.regiao.in_(regiao))
        else:
            query = query.filter(models.Question.regiao == regiao)

    if exclude_anuladas:
        query = query.filter(models.Question.is_anulada == False)
    if exclude_desatualizadas:
        query = query.filter(models.Question.is_desatualizada == False)

    return query.offset(skip).limit(limit).all()


def count_questions(
    db: Session,
    materia: Optional[str] = None,
    assuntos: Optional[List[str]] = None,
    banca: Optional[List[str]] = None,
    orgao: Optional[List[str]] = None,
    cargo: Optional[List[str]]= None,
    ano: Optional[List[int]] = None,
    escolaridade: Optional[List[str]] = None,
    dificuldade: Optional[List[str]] = None,
    regiao: Optional[List[str]] = None,
    exclude_anuladas: Optional[bool] = False,
    exclude_desatualizadas: Optional[bool] = False
) -> Dict[str, Any]:
    """
    Counts the number of questions based on filters and returns their IDs,
    considering the annulment/outdated status.
    """
    query = db.query(models.Question.id)
    if materia:
        query = query.filter(models.Question.materia == materia)
    if assuntos:
        query = query.filter(models.Question.assunto.in_(assuntos))
    if banca:
        query = query.filter(models.Question.banca.in_(banca))
    if orgao:
        query = query.filter(models.Question.orgao.in_(orgao))
    if cargo:
        query = query.filter(models.Question.cargo.in_(cargo))
    if ano:
        query = query.filter(models.Question.ano.in_(ano))
    if escolaridade:
        query = query.filter(models.Question.escolaridade.in_(escolaridade))
    if dificuldade:
        query = query.filter(models.Question.dificuldade.in_(dificuldade))
    if regiao:
        query = query.filter(models.Question.regiao.in_(regiao))
    if exclude_anuladas:
        query = query.filter(models.Question.is_anulada == False)
    if exclude_desatualizadas:
        query = query.filter(models.Question.is_desatualizada == False)

    ids = [q.id for q in query.all()]
    return {"count": len(ids), "ids": ids}

def create_question(db: Session, question: schemas.QuestionCreate):
    """
    Creates a new question in the database.
    """
    db_question = models.Question(
        enunciado=question.enunciado,
        item_a=question.item_a,
        item_b=question.item_b,
        item_c=question.item_c,
        item_d=question.item_d,
        item_e=question.item_e,
        materia=question.materia,
        assunto=question.assunto,
        banca=question.banca,
        orgao=question.orgao,
        cargo=question.cargo,
        ano=question.ano,
        escolaridade=question.escolaridade,
        dificuldade=question.dificuldade,
        regiao=question.regiao,
        gabarito=question.gabarito,
        informacoes=question.informacoes,
        comentarioProfessor=question.comentarioProfessor,
        tipo=question.tipo,
        is_anulada=question.is_anulada,
        is_desatualizada=question.is_desatualizada
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def update_question(db: Session, question_id: int, question_update: schemas.QuestionCreate):
    """
    Updates an existing question by ID.
    """
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        for key, value in question_update.dict(exclude_unset=True).items():
            setattr(db_question, key, value)
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        return db_question
    return None

def update_question_status(db: Session, question_id: int, status_update: schemas.QuestionStatusUpdate):
    """
    Updates the annulment or outdated status of a question.
    """
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        if status_update.is_anulada is not None:
            db_question.is_anulada = status_update.is_anulada
        if status_update.is_desatualizada is not None:
            db_question.is_desatualizada = status_update.is_desatualizada
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        return db_question
    return None

def delete_question(db: Session, question_id: int):
    """
    Deletes a question by ID.
    """
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        db.delete(db_question)
        db.commit()
        return True
    return False

def get_unique_question_fields(db: Session, field_name: str) -> List[str]:
    """
    Returns a list of unique values for a specific field in the questions table.
    """
    if not hasattr(models.Question, field_name):
        return []

    query = db.query(distinct(getattr(models.Question, field_name)))
    results = query.all()
    return sorted([r[0] for r in results if r[0] is not None])

def get_question_statistics(db: Session, question_id: int):
    """
    Gets or creates statistics for a question.
    """
    stats = db.query(models.QuestionStatistics).filter(models.QuestionStatistics.question_id == question_id).first()
    if not stats:
        stats = models.QuestionStatistics(question_id=question_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats

def update_question_statistics(db: Session, question_id: int, is_correct: bool):
    """
    Updates the statistics of a question.
    """
    stats = get_question_statistics(db, question_id) # Ensures statistics exist
    stats.total_attempts += 1
    if is_correct:
        stats.correct_attempts += 1
    db.add(stats)
    db.commit()
    db.refresh(stats)
    return stats

# NEW FUNCTION: User Statistics
def get_user_overall_stats(db: Session, user_id: int) -> schemas.UserStats:
    """
    Calculates and returns general study statistics for a user.
    This aggregates data from all of the user's notebook progresses.
    """
    all_user_progresses = db.query(models.NotebookProgress).filter(
        models.NotebookProgress.user_id == user_id
    ).all()

    total_questoes_resolvidas = 0
    total_acertos = 0
    total_erros = 0

    for progress in all_user_progresses:
        # Check if responses is a JSON string before trying to load
        respostas_salvas = json.loads(progress.respostas) if isinstance(progress.respostas, str) else progress.respostas
        
        total_questoes_resolvidas += len(respostas_salvas)

        if respostas_salvas: # ✅ Correção aqui: de 'respostas_salavas' para 'respostas_salvas'
            question_ids_in_answers = [int(q_id) for q_id in respostas_salvas.keys()]
            questions_for_scoring = db.query(models.Question.id, models.Question.gabarito, models.Question.tipo).filter(
                models.Question.id.in_(question_ids_in_answers)
            ).all()
            
            gabarito_map_multipla = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}

            for q_id, gabarito, tipo in questions_for_scoring:
                user_answer = respostas_salvas.get(str(q_id))
                
                if tipo == "multipla":
                    correct_index = gabarito_map_multipla.get(gabarito.upper())
                    if user_answer is not None and user_answer == correct_index:
                        total_acertos += 1
                elif tipo == "certo_errado":
                    correct_value = 1 if gabarito.lower() == 'certo' else 0
                    if user_answer is not None and user_answer == correct_value:
                        total_acertos += 1
    
    total_erros = total_questoes_resolvidas - total_acertos
    percentual_acerto = (total_acertos / total_questoes_resolvidas) * 100 if total_questoes_resolvidas > 0 else 0.0

    return schemas.UserStats(
        total_questoes_resolvidas=total_questoes_resolvidas,
        total_acertos=total_acertos,
        total_erros=total_erros,
        # CORREÇÃO AQUI: Renomear para 'percentual_acerto_geral'
        percentual_acerto_geral=round(percentual_acerto, 2), 
        # Estes campos são opcionais no schema, então podem ser dicionários vazios
        acertos_por_materia={}, 
        erros_por_materia={}    
    )

# --- CRUD Functions for Notebooks ---

def create_notebook(db: Session, notebook: schemas.NotebookCreate, user_id: int):
    """
    Creates a new notebook for a user.
    """
    db_notebook = models.Notebook(
        nome=notebook.nome,
        user_id=user_id,
        questoes_ids=json.dumps(notebook.questoes_ids), # Convert list to JSON string
        filtros=json.dumps(notebook.filtros), # Convert dict to JSON string
        paiId=notebook.paiId
    )
    db.add(db_notebook)
    db.commit()
    db.refresh(db_notebook)
    # Deserialize before returning to match the schema
    db_notebook.questoes_ids = json.loads(db_notebook.questoes_ids)
    db_notebook.filtros = json.loads(db_notebook.filtros)
    return db_notebook

def get_notebook(db: Session, notebook_id: int):
    """
    Gets a notebook by ID.
    """
    db_notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if db_notebook:
        # Convert back from JSON string to Python objects
        db_notebook.questoes_ids = json.loads(db_notebook.questoes_ids)
        db_notebook.filtros = json.loads(db_notebook.filtros)
        db.expunge(db_notebook) # Detach the object from the session
    return db_notebook

def get_notebook_with_questions(db: Session, notebook_id: int, user_id: int):
    """
    Gets a notebook by ID, including its questions and user progress.
    Also checks if the questions are favorited by the user.
    """
    db_notebook = db.query(models.Notebook).filter(
        models.Notebook.id == notebook_id,
        models.Notebook.user_id == user_id
    ).first()

    if not db_notebook:
        return None

    # Convert back from JSON string to Python objects
    db_notebook.questoes_ids = json.loads(db_notebook.questoes_ids)
    db_notebook.filtros = json.loads(db_notebook.filtros)

    # Fetch questions based on IDs
    processed_questions = []
    if db_notebook.questoes_ids:
        questions = db.query(models.Question).filter(
            models.Question.id.in_(db_notebook.questoes_ids)
        ).all()
        
        # Get favorite questions of the user for this notebook
        favorite_question_ids = {
            fav.question_id for fav in db.query(models.FavoriteQuestion).filter(
                models.FavoriteQuestion.user_id == user_id,
                models.FavoriteQuestion.notebook_id == notebook_id,
                models.FavoriteQuestion.question_id.in_(db_notebook.questoes_ids)
            ).all()
        }

        for q in questions:
            q_dict = q.__dict__.copy() # Copy to avoid modifying the SQLAlchemy object directly
            
            # Use transformar_alternativas to get the formatted alternatives
            q_dict['alternativas'] = transformar_alternativas(q)

            correta_index = None
            if q.tipo == "multipla":
                # Maps 'A'->0, 'B'->1, etc.
                gabarito_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}
                correta_index = gabarito_map.get(q.gabarito.upper())
            elif q.tipo == "certo_errado":
                # 'Certo' -> 1, 'Errado' -> 0
                correta_index = 1 if q.gabarito.lower() == 'certo' else (0 if q.gabarito.lower() == 'errado' else None)
            
            q_dict['correta'] = correta_index
            q_dict['is_favorited'] = q.id in favorite_question_ids # Add favorited status
            processed_questions.append(schemas.Question(**q_dict)) # Convert to Question schema

    db_notebook.questions_data = processed_questions # Add the list of Question objects to the notebook

    # Load progress SEPARATELY
    db_notebook.progress_data = get_notebook_progress(db, notebook_id, user_id) # Call the existing function

    # Explicitly detach the notebook object from the session.
    # This prevents it from being implicitly flushed later
    # if other objects in the same session are committed.
    db.expunge(db_notebook) # <--- KEY LINE ADDED HERE

    return db_notebook

def get_user_notebooks(db: Session, user_id: int) -> List[models.Notebook]:
    """
    Lists all notebooks of a specific user, including progress statistics.
    """
    notebooks = db.query(models.Notebook).filter(models.Notebook.user_id == user_id).all()
    for notebook in notebooks:
        # Convert back from JSON string to Python objects
        notebook.questoes_ids = json.loads(notebook.questoes_ids)
        notebook.filtros = json.loads(notebook.filtros)
        
        # Add question count for display in MyNotebooks
        notebook.total_questoes = len(notebook.questoes_ids)

        # Fetch progress for each notebook to get correct/answered
        progress = db.query(models.NotebookProgress).filter(
            models.NotebookProgress.notebook_id == notebook.id,
            models.NotebookProgress.user_id == user_id
        ).first()
        if progress:
            # Check if responses is a JSON string before trying to load
            respostas_salvas = json.loads(progress.respostas) if isinstance(progress.respostas, str) else progress.respostas
            notebook.respondidas = len(respostas_salvas)
            
            acertos_count = 0
            if respostas_salvas:
                question_ids_in_answers = [int(q_id) for q_id in respostas_salvas.keys()]
                questions_for_scoring = db.query(models.Question.id, models.Question.gabarito, models.Question.tipo).filter(
                    models.Question.id.in_(question_ids_in_answers)
                ).all()
                
                gabarito_map_multipla = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}

                for q_id, gabarito, tipo in questions_for_scoring:
                    user_answer = respostas_salvas.get(str(q_id))
                    
                    if tipo == "multipla":
                        correct_index = gabarito_map_multipla.get(gabarito.upper())
                        if user_answer is not None and user_answer == correct_index:
                            acertos_count += 1
                    elif tipo == "certo_errado":
                        correct_value = 1 if gabarito.lower() == 'certo' else 0
                        if user_answer is not None and user_answer == correct_value:
                            acertos_count += 1
            notebook.acertos = acertos_count
        else:
            notebook.respondidas = 0
            notebook.acertos = 0

    return notebooks

def delete_notebook(db: Session, notebook_id: int):
    """
    Deletes a notebook by ID.
    Also deletes associated progress.
    """
    db_notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if db_notebook:
        # Delete associated progress, if it exists
        db_progress = db.query(models.NotebookProgress).filter(models.NotebookProgress.notebook_id == notebook_id).first()
        if db_progress:
            db.delete(db_progress)
        
        db.delete(db_notebook)
        db.commit()
        return True
    return False

def update_notebook(db: Session, notebook_id: int, notebook_update: schemas.NotebookUpdate):
    """
    Updates an existing notebook by ID.
    Only allows updating the name.
    """
    db_notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if db_notebook:
        if notebook_update.nome is not None:
            db_notebook.nome = notebook_update.nome
        
        # No serialization needed here, as NotebookUpdate only has 'nome'
        # If other fields were updated, they would need to be serialized.

        db.add(db_notebook)
        db.commit()
        db.refresh(db_notebook)
        # Convert back from JSON string to Python objects before returning
        db_notebook.questoes_ids = json.loads(db_notebook.questoes_ids)
        db_notebook.filtros = json.loads(db_notebook.filtros)
        return db_notebook
    return None

# --- CRUD Functions for Notebook Progress ---

def get_notebook_progress(db: Session, notebook_id: int, user_id: int):
    """
    Gets the progress of a notebook for a user.
    """
    progress = db.query(models.NotebookProgress).filter(
        models.NotebookProgress.notebook_id == notebook_id,
        models.NotebookProgress.user_id == user_id
    ).first()
    if progress:
        # Check if responses is a JSON string before trying to load
        progress.respostas = json.loads(progress.respostas) if isinstance(progress.respostas, str) else progress.respostas
    return progress

def create_or_update_notebook_progress(db: Session, notebook_id: int, user_id: int, progress_data: schemas.NotebookProgressUpdate):
    """
    Creates or updates the progress of a notebook for a user.
    """
    db_progress = db.query(models.NotebookProgress).filter(
        models.NotebookProgress.notebook_id == notebook_id,
        models.NotebookProgress.user_id == user_id
    ).first()

    if db_progress:
        db_progress.index = progress_data.index
        db_progress.respostas = json.dumps(progress_data.respostas) # Convert dict to JSON string
    else:
        db_progress = models.NotebookProgress(
            notebook_id=notebook_id,
            user_id=user_id,
            index=progress_data.index,
            respostas=json.dumps(progress_data.respostas) # Convert dict to JSON string
        )
        db.add(db_progress)
    
    db.commit()
    db.refresh(db_progress)
    # Check if responses is a JSON string before trying to load
    db_progress.respostas = json.loads(db_progress.respostas) if isinstance(db_progress.respostas, str) else db_progress.respostas
    return db_progress

# --- CRUD Functions for Comments ---

def create_comment(db: Session, question_id: int, user_id: int, content: str):
    """
    Creates a new comment for a question.
    """
    db_comment = models.Comment(
    question_id=question_id,
    user_id=user_id,
    content=content,
    points=1   # Comments start with 1 point
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_comments_for_question(db: Session, question_id: int, order_by: str = "createdAt", order_direction: str = "desc"):
    """
    Gets all comments for a question, with sorting options.
    """
    query = db.query(models.Comment).filter(models.Comment.question_id == question_id)

    if order_by == "createdAt":
        if order_direction == "asc":
            query = query.order_by(models.Comment.created_at.asc())
        else:
            query = query.order_by(models.Comment.created_at.desc())
    elif order_by == "points":
        if order_direction == "asc":
            query = query.order_by(models.Comment.points.asc())
        else:
            query = query.order_by(models.Comment.points.desc())

    comments = query.options(joinedload(models.Comment.author)).all() # Loads the author together

    formatted_comments = []
    for comment in comments:
        comment_dict = comment.__dict__.copy()
        # Ensure 'user' is a UserForComment object for the return schema
        comment_dict['user'] = schemas.UserForComment(id=comment.author.id, username=comment.author.username)
        formatted_comments.append(schemas.Comment(**comment_dict))
    
    return formatted_comments

def update_comment(db: Session, comment_id: int, user_id: int, content: str):
    """
    Updates the content of a comment.
    """
    db_comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.user_id == user_id
    ).first()
    if db_comment:
        db_comment.content = content
        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
        db_comment.author # Loads the author for the schema
        comment_dict = db_comment.__dict__.copy()
        comment_dict['user'] = schemas.UserForComment(id=db_comment.author.id, username=db_comment.author.username)
        return schemas.Comment(**comment_dict)
    return None

def delete_comment(db: Session, comment_id: int, user_id: int):
    """
    Deletes a comment.
    """
    db_comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.user_id == user_id
    ).first()
    if db_comment:
        db.delete(db_comment)
        db.commit()
        return True
    return False
    
def vote_comment(db: Session, comment_id: int, user_id: int, vote_type: str):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")

    if comment.user_id == user_id:
        raise HTTPException(status_code=403, detail="Você não pode votar no próprio comentário.")

    existing_vote = (
        db.query(models.CommentVote)
        .filter_by(comment_id=comment_id, user_id=user_id)
        .first()
    )

    if existing_vote:
        if existing_vote.vote_type == vote_type:
            # Clicked the same vote type again → remove
            db.delete(existing_vote)
            if vote_type == "upvote":
                comment.points = max(comment.points - 1, 0)
            elif vote_type == "downvote":
                comment.points += 1
        else:
            # Changed vote
            if existing_vote.vote_type == "upvote" and vote_type == "downvote":
                comment.points = max(comment.points - 2, 0)
            elif existing_vote.vote_type == "downvote" and vote_type == "upvote":
                comment.points += 2
            existing_vote.vote_type = vote_type
            db.add(existing_vote)
    else:
        # First vote
        new_vote = models.CommentVote(comment_id=comment_id, user_id=user_id, vote_type=vote_type)
        db.add(new_vote)
        if vote_type == "upvote":
            comment.points += 1
        elif vote_type == "downvote":
            comment.points = max(comment.points - 1, 0)

    db.commit()
    db.refresh(comment)

    # Ensure the author is loaded for the return
    comment.author = comment.author or db.query(models.User).filter_by(id=comment.user_id).first()

    comment_dict = comment.__dict__.copy()
    comment_dict['user'] = schemas.UserForComment(id=comment.author.id, username=comment.author.username)

    return schemas.Comment(**comment_dict)

    # Ensure the comment author comes with the response
    comment.author = comment.author if comment.author else db.query(models.User).filter_by(id=comment.user_id).first()
    comment_dict = comment.__dict__.copy()
    comment_dict['user'] = schemas.UserForComment(id=comment.author.id, username=comment.author.username)
    return schemas.Comment(**comment_dict)

def get_comments_with_vote_status(db: Session, question_id: int, user_id: int):
    comments = (
        db.query(models.Comment)
        .options(joinedload(models.Comment.author))  # ? Loads the author together
        .filter(models.Comment.question_id == question_id)
        .order_by(models.Comment.created_at.desc())
        .all()
    )

    votes = (
        db.query(models.CommentVote)
        .filter(models.CommentVote.user_id == user_id)
        .filter(models.CommentVote.comment_id.in_([c.id for c in comments]))
        .all()
    )

    vote_map = {v.comment_id: v.vote_type for v in votes}

    formatted_comments = []
    for c in comments:
        comment_dict = c.__dict__.copy()
        comment_dict["user"] = schemas.UserForComment(
            id=c.author.id,
            username=c.author.username
        )
        comment_data = schemas.Comment(**comment_dict)
        formatted_comments.append({
            **comment_data.model_dump(),
            "voted_by_me": vote_map.get(c.id)
        })

    return formatted_comments

def get_liked_comments_by_user(db: Session, user_id: int):
    results = (
        db.query(models.Comment)
        .join(models.CommentVote, models.Comment.id == models.CommentVote.comment_id)
        .filter(models.CommentVote.user_id == user_id, models.CommentVote.vote_type == "upvote")
        .join(models.User, models.User.id == models.Comment.user_id)
        .join(models.Question, models.Question.id == models.Comment.question_id)
        .with_entities(
            models.Comment.id.label("comment_id"),
            models.Comment.content.label("content"),
            models.Comment.created_at.label("created_at"), # Adicionado
            models.Comment.updated_at.label("updated_at"), # Adicionado
            models.Question.id.label("question_id"),
            models.Question.materia.label("materia"),
            models.Question.assunto.label("assunto"),
            models.User.username.label("autor"),
            models.User.id.label("autor_id")
        )
        .all()
    )
    return results

def get_comment(db: Session, comment_id: int):
    return db.query(models.Comment).filter(models.Comment.id == comment_id).first()

def get_comments_by_user(db: Session, user_id: int):
    """
    Returns all comments made by a user, including question and author data.
    """
    comments = db.query(models.Comment).filter(
        models.Comment.user_id == user_id
    ).order_by(models.Comment.created_at.desc()).options(
        joinedload(models.Comment.author),
        joinedload(models.Comment.question)
    ).all()

    formatted_comments = []
    for comment in comments:
        # Ensure question and author relationships are loaded
        question_materia = comment.question.materia if comment.question else None
        question_assunto = comment.question.assunto if comment.question else None

        formatted_comments.append(schemas.CommentResponse(
            id=comment.id,
            content=comment.content,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            user=schemas.UserForComment(id=comment.author.id, username=comment.author.username),
            question_id=comment.question_id,
            materia=question_materia,
            assunto=question_assunto
        ))
    return formatted_comments

# --- CRUD Functions for Theories ---

def create_or_update_theory(db: Session, theory_data: schemas.TheoryCreate):
    """
    Creates or updates a theory based on subject and topic.
    """
    db_theory = db.query(models.Theory).filter(
        models.Theory.materia == theory_data.materia,
        models.Theory.assunto == theory_data.assunto
    ).first()

    if db_theory:
        db_theory.content = theory_data.content
    else:
        db_theory = models.Theory(
            materia=theory_data.materia,
            assunto=theory_data.assunto,
            content=theory_data.content
        )
        db.add(db_theory)
    
    db.commit()
    db.refresh(db_theory)
    return db_theory

def get_all_theory_metadata(db: Session) -> List[schemas.TheoryMeta]:
    """
    Gets metadata (subject and topic) for all theories.
    """
    theories = db.query(models.Theory.materia, models.Theory.assunto).distinct().all()
    
    grouped_theories = {}
    for materia, assunto in theories:
        if materia not in grouped_theories:
            grouped_theories[materia] = []
        grouped_theories[materia].append(assunto)
    
    result = []
    for materia, assuntos in grouped_theories.items():
        result.append({"materia": materia, "assuntos": sorted(assuntos)})
    
    return result

def get_theory(db: Session, materia: str, assunto: str):
    return db.query(models.Theory).filter(
        func.lower(models.Theory.materia) == materia.strip().lower(),
        func.lower(models.Theory.assunto) == assunto.strip().lower()
    ).first()

def delete_theory(db: Session, materia: str, assunto: str):
    """
    Deletes a specific theory.
    """
    db_theory = db.query(models.Theory).filter(
        models.Theory.materia == materia,
        models.Theory.assunto == assunto
    ).first()
    if db_theory:
        db.delete(db_theory)
        db.commit()
        return True
    return False

# --- CRUD Functions for Favorite Questions (NEW) ---

def create_favorite_question(db: Session, user_id: int, question_id: int, notebook_id: int):
    """
    Adds a question to the user's favorites.
    """
    db_favorite = models.FavoriteQuestion(
        user_id=user_id,
        question_id=question_id,
        notebook_id=notebook_id,
        favorited_at=datetime.now() # Set datetime explicitly
    )
    db.add(db_favorite)
    db.commit()
    db.refresh(db_favorite) # Ensures favorited_at is populated
    return db_favorite

def delete_favorite_question(db: Session, user_id: int, question_id: int, notebook_id: int):
    """
    Removes a question from the user's favorites.
    """
    db_favorite = db.query(models.FavoriteQuestion).filter(
        models.FavoriteQuestion.user_id == user_id,
        models.FavoriteQuestion.question_id == question_id,
        models.FavoriteQuestion.notebook_id == notebook_id
    ).first()
    if db_favorite:
        db.delete(db_favorite)
        db.commit()
        return True
    return False

def get_favorite_question(db: Session, user_id: int, question_id: int, notebook_id: int):
    """
    Checks if a specific question is favorited by a user in a notebook.
    """
    return db.query(models.FavoriteQuestion).filter(
        models.FavoriteQuestion.user_id == user_id,
        models.FavoriteQuestion.question_id == question_id,
        models.FavoriteQuestion.notebook_id == notebook_id
    ).first()

def get_all_favorite_questions_for_user(db: Session, user_id: int) -> List[schemas.FavoriteQuestion]:
    """
    Returns all favorite questions of a user, with complete question data
    and the name of the notebook from which it was favorited.
    """
    favorite_entries = db.query(models.FavoriteQuestion).filter(
        models.FavoriteQuestion.user_id == user_id
    ).options(
        joinedload(models.FavoriteQuestion.question),
        joinedload(models.FavoriteQuestion.notebook)
    ).all()

    favorited_questions_data = []
    for entry in favorite_entries:
        question_data = entry.question
        notebook_name = entry.notebook.nome if entry.notebook else "Caderno Desconhecido"
        
        # Map question data to the frontend Question schema
        q_dict = question_data.__dict__.copy()
        # Use transformar_alternativas to get the formatted alternatives
        q_dict['alternativas'] = transformar_alternativas(question_data) # Pass the question object here

        correta_index = None
        if q_dict.get('tipo') == "multipla":
            gabarito_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}
            correta_index = gabarito_map.get(q_dict.get('gabarito', '').upper())
        elif q_dict.get('tipo') == "certo_errado":
            correta_index = 1 if q_dict.get('gabarito', '').lower() == 'certo' else (0 if q_dict.get('gabarito', '').lower() == 'errado' else None)
        
        q_dict['correta'] = correta_index
        q_dict['is_favorited'] = True # Always True for questions in this list

        # Ensure favorited_at is a valid datetime. If None, use datetime.now() as fallback.
        safe_favorited_at = entry.favorited_at if entry.favorited_at else datetime.now()

        favorited_questions_data.append(schemas.FavoriteQuestion(
            id=entry.id,
            user_id=entry.user_id,
            question_id=entry.question_id,
            notebook_id=entry.notebook_id,
            favorited_at=safe_favorited_at, # Use the safe value
            question=schemas.Question(**q_dict), # Pass the mapped question
            notebook_name=notebook_name
        ))
    return favorited_questions_data

def get_note_by_user_and_question(db: Session, user_id: int, question_id: int):
    """
    Gets a specific note from a user for a question, including question data.
    """
    # Loads the note and the associated question
    note = db.query(models.QuestionNote).options(joinedload(models.QuestionNote.question)).filter_by(user_id=user_id, question_id=question_id).first()
    if note:
        # Fills subject and topic from the associated question object for the schema
        note.materia = note.question.materia if note.question else None
        note.assunto = note.question.assunto if note.question else None
        note.title = "Anotação" # Default title for the frontend
    return note

def get_note_by_id(db: Session, note_id: int, user_id: int):
    """
    Gets a note by its ID, checking the user, and including question data.
    """
    # Loads the note and the associated question
    note = db.query(models.QuestionNote).options(joinedload(models.QuestionNote.question)).filter_by(id=note_id, user_id=user_id).first()
    if note:
        # Fills subject and topic from the associated question object for the schema
        note.materia = note.question.materia if note.question else None
        note.assunto = note.question.assunto if note.question else None
        note.title = "Anotação" # Default title for the frontend
    return note

def create_or_update_note(db: Session, user_id: int, note_data: schemas.QuestionNoteBase):
    """
    Creates or updates a note for a specific question of a user.
    Does not save subject and topic directly in the note.
    """
    note = db.query(models.QuestionNote).filter_by(
        user_id=user_id,
        question_id=note_data.question_id
    ).first()

    if note:
        note.content = note_data.content
        # REMOVED: Update of subject and topic here
    else:
        note = models.QuestionNote(
            user_id=user_id,
            question_id=note_data.question_id,
            content=note_data.content,
            # REMOVED: Addition of subject and topic here
        )
        db.add(note)

    db.commit()
    db.refresh(note)
    return note

def get_user_notes(db: Session, user_id: int) -> List[models.QuestionNote]:
    """
    Gets all notes created by a user, including associated question data.
    """
    # Loads the notes and associated questions
    notes = db.query(models.QuestionNote).options(joinedload(models.QuestionNote.question)).filter(models.QuestionNote.user_id == user_id).all()
    
    # Adds question data to each note object for the schema
    for note in notes:
        # Check if the question exists before trying to access subject/topic
        note.materia = note.question.materia if note.question else None
        note.assunto = note.question.assunto if note.question else None
        note.title = "Anotação" # Default title for the frontend
    return notes

def delete_note(db: Session, note_id: int, user_id: int):
    """
    Deletes a note by ID, checking if it belongs to the user.
    """
    note = db.query(models.QuestionNote).filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return False
    db.delete(note)
    db.commit()
    return True

def search_questions(db: Session, query: Optional[str]) -> List[models.Question]:
    if not query:
        return db.query(models.Question).limit(50).all()  # Returns some by default

    if query.isdigit():
        return db.query(models.Question).filter(models.Question.id == int(query)).all()
    
    return db.query(models.Question).filter(models.Question.enunciado.ilike(f"%{query}%")).all()

def search_questions_by_enunciado(db: Session, search: str) -> List[models.Question]:
    return db.query(models.Question).filter(models.Question.enunciado.ilike(f"%{search}%")).limit(5).all()

def get_user_wrong_questions(db: Session, user_id: int):
    """
    Retorna todas as questões que o usuário errou, com nome do caderno.
    """
    from .models import NotebookProgress, Notebook, Question
    from .schemas import FavoriteQuestion
    from datetime import datetime
    import json

    wrong_questions = []

    progresses = db.query(NotebookProgress).filter(NotebookProgress.user_id == user_id).all()

    g_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}

    for progress in progresses:
        # Lê e trata as respostas do progresso
        respostas = json.loads(progress.respostas) if isinstance(progress.respostas, str) else progress.respostas
        if not isinstance(respostas, dict):
            continue

        # Converte chaves para inteiro
        try:
            respostas = {int(k): v for k, v in respostas.items()}
        except Exception:
            continue

        # Recupera caderno e questões
        notebook = db.query(Notebook).filter_by(id=progress.notebook_id).first()
        if not respostas or not notebook:
            continue

        questoes = db.query(Question).filter(Question.id.in_(respostas.keys())).all()

        for q in questoes:
            resposta_usuario = respostas.get(q.id)
            acertou = False

            try:
                resposta_usuario = int(resposta_usuario)
            except (ValueError, TypeError):
                resposta_usuario = None

            if q.tipo == "multipla":
                index_correto = g_map.get(q.gabarito.upper())
                if resposta_usuario is not None and resposta_usuario == index_correto: # Adicionado 'is not None'
                    acertou = True
            elif q.tipo == "certo_errado":
                correto = 1 if q.gabarito.lower() == "certo" else 0
                if resposta_usuario is not None and resposta_usuario == correto: # Adicionado 'is not None'
                    acertou = True

            if not acertou:
                # Certifique-se de que a questão tem as alternativas formatadas para o schema
                q_dict = q.__dict__.copy()
                q_dict['alternativas'] = transformar_alternativas(q) # Chamar a função aqui
                
                correta_index = None
                if q_dict.get('tipo') == "multipla":
                    gabarito_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4}
                    correta_index = gabarito_map.get(q_dict.get('gabarito', '').upper())
                elif q_dict.get('tipo') == "certo_errado":
                    correta_index = 1 if q_dict.get('gabarito', '').lower() == 'certo' else (0 if q_dict.get('gabarito', '').lower() == 'errado' else None)
                q_dict['correta'] = correta_index

                wrong_questions.append(schemas.FavoriteQuestion(
                    id=0, # ID fictício, pois não é um favorito real
                    user_id=user_id,
                    question_id=q.id,
                    notebook_id=notebook.id,
                    notebook_name=notebook.nome,
                    favorited_at=datetime.now(),
                    question=schemas.Question(**q_dict) # Passar o objeto Question com alternativas
                ))

    return wrong_questions

# As funções abaixo foram movidas para o final do arquivo para melhor organização
# e para garantir que 'models' e 'schemas' já estejam definidos.
# Elas foram mantidas aqui no seu arquivo original, então apenas as estou re-incluindo.

# from . import models # Já importado no topo

# --- CRUD Functions for Simulado Results ---

def get_questions_by_ids(db: Session, question_ids: List[int]) -> List[models.Question]:
    """
    Obtém uma lista de questões pelos seus IDs.
    """
    return db.query(models.Question).filter(models.Question.id.in_(question_ids)).all()

def mapear_gabarito_para_indice(letra: str) -> Optional[int]:
    """
    Mapeia a letra do gabarito (A, B, C, D, E) para um índice numérico (1, 2, 3, 4, 5).
    Para questões Certo/Errado, mapeia 'Certo' para 1 e 'Errado' para 0.
    """
    if letra is None:
        return None
    
    letra_upper = letra.upper().strip()
    if letra_upper in ['A', 'B', 'C', 'D', 'E']:
        mapa = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5} # Mapeia A para 1, B para 2, etc.
        return mapa.get(letra_upper)
    elif letra_upper == 'CERTO':
        return 1
    elif letra_upper == 'ERRADO':
        return 0
    return None # Retorna None se não for um gabarito reconhecido

def transformar_alternativas(questao):
    """
    Transforma os campos item_a, item_b, etc. de uma questão
    em uma lista de dicionários no formato esperado pelo frontend, com IDs 1-indexed.
    Aplica strip_p_tags para remover tags <p>.
    """
    alternativas = []
    for idx, item_attr in enumerate(['item_a', 'item_b', 'item_c', 'item_d', 'item_e'], start=1):  # ← aqui começa do 1
        item_content = getattr(questao, item_attr, None)
        if item_content:
            alternativas.append({'id': idx, 'text': strip_p_tags(item_content)}) # Aplicar strip_p_tags
    
    print(f"DEBUG: Alternativas transformadas para questão {questao.id}: {alternativas}")
    return alternativas

def obter_tipo_por_materia(materia: str) -> str:
    # Defina conforme sua regra de negócio. Exemplo:
    basicos = ["Português", "RLM", "Informática", "Ética", "Direito Administrativo", "Direito Constitucional"] 
    return "basico" if materia in basicos else "especifico"

def get_simulado(db: Session, simulado_id: int):
    """
    Obtém um simulado pelo seu ID.
    """
    return db.query(models.Simulado).filter(models.Simulado.id == simulado_id).first()

def salvar_simulado(
    db: Session,
    user_id: int,
    tempo_limite: int,  # Tempo limite em segundos (da configuração inicial)
    tempo_utilizado: int,  # Tempo efetivamente utilizado em segundos
    respostas_raw: List[schemas.RespostaSimulado],  # Respostas do usuário
    feedback_questoes: List[schemas.QuestaoFeedback],  # Feedback detalhado por questão (agora QuestaoFeedback)
    acertos: int,  # Total de acertos
    erros: int,  # Total de erros
    percentual: float,  # Percentual geral de acertos
) -> int:
    """
    Salva ou atualiza os resultados detalhados de um simulado.
    Se um simulado com o ID já existir, ele será atualizado.
    Caso contrário, um novo simulado será criado.
    """
    
    total_questoes = len(respostas_raw)

    # Dicionários para acumular estatísticas
    acertos_por_tipo = {"basico": 0, "especifico": 0}
    erros_por_tipo = {"basico": 0, "especifico": 0}
    acertos_por_materia = {}
    erros_por_materia = {}
    acertos_por_assunto = {}
    erros_por_assunto = {}
    
    # Mapear IDs de questão para objetos Question para acesso eficiente
    question_ids = [r.question_id for r in respostas_raw]
    questions_map = {
        q.id: q for q in db.query(models.Question).filter(models.Question.id.in_(question_ids)).all()
    }

    # Processar cada resposta para acumular estatísticas detalhadas
    for fb_data in feedback_questoes: # Itera sobre os objetos QuestaoFeedback
        question = questions_map.get(fb_data.question_id) # Acessa question_id diretamente
        if not question:
            continue  

        materia = question.materia
        assunto = question.assunto
        tipo = obter_tipo_por_materia(materia)

        if materia not in acertos_por_materia:
            acertos_por_materia[materia] = 0
            erros_por_materia[materia] = 0
        if assunto not in acertos_por_assunto:
            acertos_por_assunto[assunto] = 0
            erros_por_assunto[assunto] = 0

        if fb_data.is_correct: # Acessa is_correct diretamente
            acertos_por_tipo[tipo] += 1
            acertos_por_materia[materia] += 1
            acertos_por_assunto[assunto] += 1
        else:
            erros_por_tipo[tipo] += 1
            erros_por_materia[materia] += 1
            erros_por_assunto[assunto] += 1

    # Preparar as respostas do usuário no formato JSON
    respostas_usuario_json = {
        str(r.question_id): r.selected_alternative_id for r in respostas_raw
    }

    # Criar o objeto Simulado com todas as estatísticas calculadas
    simulado_db = models.Simulado(
        user_id=user_id,
        data_realizacao=datetime.utcnow(),
        tempo_limite=tempo_limite,
        tempo_utilizado=tempo_utilizado,
        total_questoes=total_questoes,
        acertos_total=acertos,
        erros_total=erros,
        percentual_acerto=percentual,
        acertos_basicos=acertos_por_tipo["basico"],
        erros_basicos=erros_por_tipo["basico"],
        acertos_especificos=acertos_por_tipo["especifico"],
        erros_especificos=erros_por_tipo["especifico"],
        acertos_por_materia=acertos_por_materia,
        erros_por_materia=erros_por_materia,
        acertos_por_assunto=acertos_por_assunto,
        erros_por_assunto=erros_por_assunto,
        respostas_usuario=respostas_usuario_json,
        questoes_ids=question_ids
    )
    db.add(simulado_db)
    db.commit()
    db.refresh(simulado_db)

    # Salvar as respostas individuais no modelo RespostaSimulado
    for fb_data in feedback_questoes: # Itera sobre os objetos QuestaoFeedback
        question = questions_map.get(fb_data.question_id)
        if not question:
            continue
        
        materia = question.materia
        tipo = obter_tipo_por_materia(materia)

        resposta = models.RespostaSimulado(
            simulado_id=simulado_db.id,
            question_id=fb_data.question_id,
            selected_alternative_id=fb_data.selected_alternative_id,
            correct_alternative_id=fb_data.correct_alternative_id,
            is_correct=fb_data.is_correct,
            materia=materia,
            tipo=tipo
        )
        db.add(resposta)
    
    db.commit() 
    return simulado_db.id

# --- CRUD Functions for Verticalized Syllabus ---

def create_verticalized_syllabus(db: Session, syllabus: schemas.VerticalizedSyllabusCreate, user_id: int):
    db_syllabus = models.VerticalizedSyllabus(
        user_id=user_id,
        nome=syllabus.nome,
        disciplina=syllabus.disciplina,
        conteudo=jsonable_encoder(syllabus.conteudo),
        marcacoes=jsonable_encoder(syllabus.marcacoes)
    )
    db.add(db_syllabus)
    db.commit()
    db.refresh(db_syllabus)
    return db_syllabus

def get_user_syllabi(db: Session, user_id: int):
    """
    Gets all verticalized syllabi for a user.
    """
    return db.query(models.VerticalizedSyllabus).filter(
        models.VerticalizedSyllabus.user_id == user_id
    ).all()

def get_syllabus_by_id(db: Session, syllabus_id: int, user_id: int):
    """
    Gets a specific syllabus by ID, checking user ownership.
    """
    return db.query(models.VerticalizedSyllabus).filter(
        models.VerticalizedSyllabus.id == syllabus_id,
        models.VerticalizedSyllabus.user_id == user_id
    ).first()

def update_syllabus(db: Session, syllabus_id: int, user_id: int, syllabus_update: schemas.VerticalizedSyllabusUpdate):
    db_syllabus = get_syllabus_by_id(db, syllabus_id, user_id)
    if not db_syllabus:
        return None

    update_data = syllabus_update.model_dump(exclude_unset=True)

    if 'marcacoes' in update_data:
        # Se os dados já vierem como dict do frontend, não precisamos fazer model_dump
        # Apenas garantimos que a estrutura está correta e salvamos como JSON
        update_data['marcacoes'] = {
            section: {
                topic: marcacao for topic, marcacao in topics.items()
            } for section, topics in update_data['marcacoes'].items()
        }

    for key, value in update_data.items():
        setattr(db_syllabus, key, value)

    db.commit()
    db.refresh(db_syllabus)
    return db_syllabus

def delete_syllabus(db: Session, syllabus_id: int, user_id: int):
    """
    Deletes a verticalized syllabus.
    """
    db_syllabus = get_syllabus_by_id(db, syllabus_id, user_id)
    if db_syllabus:
        db.delete(db_syllabus)
        db.commit()
        return True
    return False

# --- ADICIONE A FUNÇÃO ABAIXO NESTE LOCAL ---
def get_materias_for_edital(db: Session, edital_id: int, user_id: int) -> List[str]:
    """
    Extrai a lista de matérias de um edital verticalizado específico,
    verificando a propriedade do usuário.
    """
    # Busca o edital garantindo que ele pertence ao usuário logado
    edital = db.query(models.VerticalizedSyllabus).filter(
        models.VerticalizedSyllabus.id == edital_id,
        models.VerticalizedSyllabus.user_id == user_id
    ).first()

    # Se o edital não for encontrado ou não tiver conteúdo, retorna uma lista vazia
    if not edital or not edital.conteudo:
        return []
    
    # O campo 'conteudo' é um dicionário JSON. As chaves do primeiro nível 
    # (ex: "Direito Constitucional", "Português") são os nomes das matérias.
    # O método .keys() retorna todas as chaves, que são exatamente o que precisamos.
    materias = list(edital.conteudo.keys())
    
    # Retorna a lista de matérias em ordem alfabética para uma exibição consistente no frontend.
    return sorted(materias)


def get_study_calendar(db: Session, user_id: int, edital_id: int):
    return db.query(models.StudyCalendar).filter_by(user_id=user_id, edital_id=edital_id).first()

def update_or_create_study_calendar(
    db: Session,
    user_id: int,
    edital_id: int,
    data: Dict[str, List[schemas.StudyBlock]],
    data_inicio: Optional[date] = None, # <--- Corrigindo o tipo de anotação
    data_fim: Optional[date] = None,     # <--- Corrigindo o tipo de anotação
) -> models.StudyCalendar:
    
    # Adicionei um print para ver os dados que chegam
    print(f"INFO: Recebendo dados para o calendário do edital {edital_id} do usuário {user_id}:")
    print(f"data_inicio: {data_inicio}, data_fim: {data_fim}")

    # Tenta encontrar o calendário existente
    calendar = get_study_calendar(db, user_id, edital_id)
    
    if calendar:
        # Se encontrou, atualiza os dados e os timestamps
        calendar.data = jsonable_encoder(data)
        calendar.data_inicio = data_inicio
        calendar.data_fim = data_fim
        calendar.updated_at = datetime.utcnow()
        print(f"INFO: Atualizando calendário existente ID {calendar.id} para o usuário {user_id}.")
    else:
        # Se não encontrou, cria um novo objeto
        print(f"INFO: Criando novo calendário para o usuário {user_id} e edital {edital_id}.")
        calendar = models.StudyCalendar(
            user_id=user_id,
            edital_id=edital_id,
            data=jsonable_encoder(data),
            data_inicio=data_inicio,
            data_fim=data_fim
        )
        db.add(calendar)
        
    db.commit()
    db.refresh(calendar)
    
    return calendar

def get_syllabi_with_calendars(db: Session, user_id: int) -> List[models.VerticalizedSyllabus]:
    """
    Busca todos os editais de um usuário que possuem um calendário de estudo associado.
    """
    # Esta query junta a tabela de editais (VerticalizedSyllabus) com a de calendários (StudyCalendar)
    # e filtra para retornar apenas os editais do usuário que têm uma correspondência na tabela de calendários.
    return db.query(models.VerticalizedSyllabus).join(
        models.StudyCalendar, 
        models.VerticalizedSyllabus.id == models.StudyCalendar.edital_id
    ).filter(
        models.VerticalizedSyllabus.user_id == user_id
    ).all()

def get_user_study_plans_with_titles(db: Session, user_id: int):
    """
    Retorna todos os calendários de estudo do usuário com o título do edital associado.
    """
    return db.query(
        models.StudyCalendar.id,
        models.StudyCalendar.edital_id,
        models.StudyCalendar.data_inicio,
        models.StudyCalendar.data_fim,
        models.StudyCalendar.data,
        models.VerticalizedSyllabus.nome.label("titulo_edital"),
        models.StudyCalendar.criado_em,
        models.StudyCalendar.updated_at
    ).join(
        models.VerticalizedSyllabus,
        models.VerticalizedSyllabus.id == models.StudyCalendar.edital_id
    ).filter(
        models.StudyCalendar.user_id == user_id
    ).all()













