from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from .. import models, schemas, crud
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/edital-verticalizado",
    tags=["edital-verticalizado"]
)

@router.post("/{edital_id}/gerar-caderno")
def gerar_caderno_do_edital(
    edital_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Buscar o edital no banco
    edital = db.query(models.VerticalizedSyllabus).filter(models.VerticalizedSyllabus.id == edital_id).first()
    if not edital:
        raise HTTPException(status_code=404, detail="Edital não encontrado")

    # Extrair matérias e assuntos a partir do conteúdo do edital
    conteudo = edital.conteudo or {}
    materias = list(conteudo.keys())
    assuntos = [assunto for sublist in conteudo.values() for assunto in sublist]

    if not materias:
        raise HTTPException(status_code=400, detail="Nenhuma matéria encontrada no edital")

    # Buscar questões que batem com as matérias ou assuntos
    if materias:
        filtros += [models.Question.materia.ilike(f"%{m}%") for m in materias]
    if assuntos:
        filtros += [models.Question.assunto.ilike(f"%{a}%") for a in assuntos]

    if not filtros:
        raise HTTPException(status_code=400, detail="Nenhum filtro fornecido")

    questoes = db.query(models.Question).filter(or_(*filtros)).all()

    if not questoes:
        raise HTTPException(status_code=404, detail="Nenhuma questão encontrada para os filtros do edital")

    # Criar o caderno
    novo_caderno = models.Notebook(
        name=f"Caderno - {edital.nome}",
        user_id=current_user.id
    )
    db.add(novo_caderno)
    db.commit()
    db.refresh(novo_caderno)

    # Associar questões ao caderno
    for q in questoes:
        nq = models.NotebookQuestion(notebook_id=novo_caderno.id, question_id=q.id)
        db.add(nq)

    db.commit()
    return {"notebook_id": novo_caderno.id}














