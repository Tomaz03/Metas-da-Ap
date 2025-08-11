# Importações necessárias
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
import json # Importa o módulo json

# Criação do roteador
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
    """
    Gera um caderno de questões com base nas matérias e assuntos de um edital verticalizado,
    utilizando uma lógica de busca mais flexível para encontrar correspondências.
    """
    # 1. Buscar o edital no banco de dados.
    edital = db.query(models.VerticalizedSyllabus).filter(models.VerticalizedSyllabus.id == edital_id).first()
    if not edital:
        raise HTTPException(status_code=404, detail="Edital não encontrado")

    # 2. Extrair matérias e assuntos a partir do conteúdo do edital.
    conteudo = edital.conteudo or {}
    materias_do_edital = list(conteudo.keys())
    
    # 3. Processar os assuntos para criar termos de busca mais granulares.
    termos_de_busca_assuntos = []
    assuntos_do_edital_bruto = [assunto for sublist in conteudo.values() for assunto in sublist]

    for assunto_str in assuntos_do_edital_bruto:
        partes = [p.strip() for p in assunto_str.replace(',', ';').split(';') if p.strip()]
        for parte in partes:
            palavras = parte.split()
            palavras_filtradas = [p for p in palavras if len(p) > 2 and p.lower() not in ['de', 'da', 'do', 'e', 'em', 'para', 'com']]
            termos_de_busca_assuntos.extend(palavras_filtradas)

    # 4. Criar os filtros para a busca no banco de dados.
    filtros = []
    
    for materia in materias_do_edital:
        filtros.append(models.Question.materia.ilike(f"%{materia}%"))
    
    for termo in set(termos_de_busca_assuntos):
        filtros.append(models.Question.assunto.ilike(f"%{termo}%"))

    if not filtros:
        raise HTTPException(status_code=400, detail="Nenhum filtro fornecido")

    # 5. Buscar as questões no banco de dados usando os filtros.
    questoes = db.query(models.Question).filter(or_(*filtros)).all()
    
    questoes_unicas = list({questao.id: questao for questao in questoes}.values())

    if not questoes_unicas:
        raise HTTPException(status_code=404, detail="Nenhuma questão encontrada no banco de dados para os assuntos do edital.")

    # 6. Criar uma nova instância de caderno de questões, usando o campo 'nome'
    # e uma lista com os IDs das questões encontradas.
    questoes_ids = [questao.id for questao in questoes_unicas]
    
    # CORREÇÃO CRÍTICA AQUI: Converta a lista de IDs para uma string JSON.
    questoes_ids_json = json.dumps(questoes_ids)

    novo_caderno = models.Notebook(
        nome=f"Caderno - {edital.nome}", 
        user_id=current_user.id,
        questoes_ids=questoes_ids_json # Use a string JSON serializada
    )
    db.add(novo_caderno)
    db.commit()
    db.refresh(novo_caderno)

    return {"message": "Caderno gerado com sucesso!", "notebook_id": novo_caderno.id}




















