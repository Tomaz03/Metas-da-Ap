from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, auth
from ..database import get_db

router = APIRouter(
        tags=["calendario"]
)

@router.get("/{edital_id}", response_model=schemas.StudyCalendar)
def obter_plano_de_estudo(
    edital_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna o calendário de estudo de um edital específico do usuário.
    """
    # 1. Busca o calendário
    calendar = crud.get_study_calendar(db, current_user.id, edital_id)
    if not calendar:
        raise HTTPException(status_code=404, detail="Plano de estudo não encontrado")

    # 2. Busca os dados do edital associado
    edital = crud.get_syllabus_by_id(db, syllabus_id=edital_id, user_id=current_user.id)
    if not edital:
        # Isso seria um estado inconsistente, mas é bom tratar
        raise HTTPException(status_code=404, detail="Edital associado ao calendário não foi encontrado.")

    # 3. Adiciona os atributos que faltam para corresponder ao schema
    setattr(calendar, 'titulo_edital', edital.nome)
    setattr(calendar, 'edital', edital)

    # 4. Retorna o objeto completo
    return calendar

# 3. A rota POST já está correta em relação ao novo modelo.
@router.post("/{edital_id}", response_model=schemas.StudyCalendar)
def criar_ou_atualizar_calendario(
    edital_id: int,
    calendar_data: schemas.StudyCalendarCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Cria um novo calendário de estudo ou atualiza um existente.
    """
    # 1. Busca o edital para garantir que ele existe e para obter seus dados.
    edital = crud.get_syllabus_by_id(db, syllabus_id=edital_id, user_id=current_user.id)
    if not edital:
        raise HTTPException(status_code=403, detail="Acesso negado ou edital não encontrado.")

    # 2. Chama a função CRUD para salvar os dados no banco.
    saved_calendar = crud.update_or_create_study_calendar(
        db=db,
        user_id=current_user.id,
        edital_id=edital_id,
        data=calendar_data.data,
        data_inicio=calendar_data.data_inicio,
        data_fim=calendar_data.data_fim
    )

    # 3. Adiciona manualmente os atributos que faltam ao objeto antes de retorná-lo.
    #    Isso garante que o objeto corresponda ao schema `schemas.StudyCalendar`.
    setattr(saved_calendar, 'titulo_edital', edital.nome)
    setattr(saved_calendar, 'edital', edital)

    # 4. Retorna o objeto completo. Agora ele é compatível com o response_model.
    return saved_calendar