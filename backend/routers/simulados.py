from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from schemas import SimuladoConfigSchema, QuestaoFeedback
from import crud, schemas, models 
from auth import get_current_user 
from database import get_db 
from datetime import datetime, timedelta
import random
import json

router = APIRouter()

@router.post("/api/simulados/generate/")
def gerar_simulado(payload: SimuladoConfigSchema, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    todas_questoes = []
    questoes_ids_selecionadas = []

    for config in payload.materias_config:
        # Montar filtros adicionais

        filtros_adicionais = config.additional_filters or {}

        questoes = crud.get_questions(
            db=db,
            materia=config.materia,
            assuntos=[a.assunto for a in config.assuntos],
            banca=filtros_adicionais.get("banca"),
            orgao=filtros_adicionais.get("orgao"),
            cargo=filtros_adicionais.get("cargo"),
            ano=filtros_adicionais.get("ano"),
            escolaridade=filtros_adicionais.get("escolaridade"),
            dificuldade=filtros_adicionais.get("dificuldade"),
            regiao=filtros_adicionais.get("regiao"),
            limit=config.quantidade_total,
            exclude_anuladas=False,
            exclude_desatualizadas=False,
        )
        if len(questoes) < config.quantidade_total:
            raise HTTPException(status_code=400, detail=f"Não há questões suficientes para {config.materia}")
        questoes_selecionadas = random.sample(questoes, config.quantidade_total)
        todas_questoes.extend(questoes_selecionadas)
        questoes_ids_selecionadas.extend([q.id for q in questoes_selecionadas]) 

    questoes_formatadas = []
    for q in todas_questoes:
        alternativas_formatadas = crud.transformar_alternativas(q) 
        correta_id_mapeada = crud.mapear_gabarito_para_indice(q.gabarito) 

        questoes_formatadas.append({
            "id": q.id,
            "content": crud.strip_p_tags(q.enunciado),
            "alternativas": alternativas_formatadas, 
            "correct_alternative_id": correta_id_mapeada,  
            "materia": q.materia, 
            "assunto": q.assunto, 
            "tipo": crud.obter_tipo_por_materia(q.materia) 
        })

    initial_simulado = models.Simulado(
        user_id=current_user.id,
        tempo_limite=payload.tempo_limite_minutos * 60, 
        total_questoes=len(todas_questoes),
        questoes_ids=questoes_ids_selecionadas,
        acertos_total=0, erros_total=0, percentual_acerto=0.0,
        acertos_basicos=0, erros_basicos=0, acertos_especificos=0, erros_especificos=0,
        acertos_por_materia={}, erros_por_materia={},
        acertos_por_assunto={}, erros_por_assunto={},
        respostas_usuario={}
    )
    db.add(initial_simulado)
    db.commit()
    db.refresh(initial_simulado)

    response_data = {
        "tempo_limite_minutos": payload.tempo_limite_minutos,
        "simulado_id": initial_simulado.id, 
        "questoes": questoes_formatadas
    }
    
    print("DEBUG: Dados do simulado gerados (antes de enviar para o frontend):")
    print(json.dumps(response_data, indent=2, ensure_ascii=False))

    return response_data

@router.post("/api/simulados/{simulado_id}/submit/", response_model=schemas.ResultadoSimulado) 
def submit_simulado(
    simulado_id: int,
    submission: schemas.SubmitRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    total = len(submission.answers)
    acertos = 0
    erros = 0
    feedback = []

    simulado = crud.get_simulado(db, simulado_id=simulado_id)
    if not simulado or simulado.user_id != current_user.id: 
        raise HTTPException(status_code=404, detail="Simulado não encontrado ou você não tem permissão.")
    
    tempo_limite_segundos = simulado.tempo_limite 

    question_ids_in_submission = [r.question_id for r in submission.answers]
    questions_map = {
        q.id: q for q in db.query(models.Question)
                             .filter(models.Question.id.in_(question_ids_in_submission))
                             .all()
    }

    for resposta in submission.answers:
        questao = questions_map.get(resposta.question_id)
        if not questao:
            continue 

        correct_alternative_id_mapped = crud.mapear_gabarito_para_indice(questao.gabarito)

        user_selected_alternative_id_mapped = None
        if resposta.selected_alternative_id is not None and resposta.selected_alternative_id != -1:
            user_selected_alternative_id_mapped = resposta.selected_alternative_id + 1

        is_correct = (user_selected_alternative_id_mapped == correct_alternative_id_mapped)

        if is_correct:
            acertos += 1
        else:
            erros += 1

        alternativas_formatted = crud.transformar_alternativas(questao)

        feedback.append(QuestaoFeedback(
            question_id=questao.id,
            content=crud.strip_p_tags(questao.enunciado),
            alternatives=alternativas_formatted,
            selected_alternative_id=resposta.selected_alternative_id,
            correct_alternative_id=correct_alternative_id_mapped,
            is_correct=is_correct
        ))

    percentual = (acertos / total) * 100 if total > 0 else 0.0

    simulado_id_salvo = crud.salvar_simulado(
        db=db,
        user_id=current_user.id,
        tempo_limite=tempo_limite_segundos, 
        tempo_utilizado=submission.time_taken_seconds,
        respostas_raw=submission.answers,
        feedback_questoes=feedback,
        acertos=acertos,
        erros=erros,
        percentual=percentual
    )

    simulado_completo = db.query(models.Simulado).filter(models.Simulado.id == simulado_id_salvo).first()
    
    if not simulado_completo:
        raise HTTPException(status_code=500, detail="Erro ao recuperar o simulado salvo.")

    return schemas.ResultadoSimulado(
        tempo_limite=simulado_completo.tempo_limite,
        tempo_utilizado=simulado_completo.tempo_utilizado,
        acertos_total=simulado_completo.acertos_total,
        erros_total=simulado_completo.erros_total,
        percentual_acerto=simulado_completo.percentual_acerto,
        feedback_questoes=feedback,
        acertos_basicos=simulado_completo.acertos_basicos,
        erros_basicos=simulado_completo.erros_basicos,
        acertos_especificos=simulado_completo.acertos_especificos,
        erros_especificos=simulado_completo.erros_especificos,
        acertos_por_materia=simulado_completo.acertos_por_materia,
        erros_por_materia=simulado_completo.erros_por_materia,
        acertos_por_assunto=simulado_completo.acertos_por_assunto,
        erros_por_assunto=simulado_completo.erros_por_assunto,
    )

@router.get("/api/simulados/stats", response_model=schemas.SimuladoStatisticsResponse) 
def obter_estatisticas_simulados(
    dias: Optional[int] = Query(None, description="Filtrar pelos últimos X dias"),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    simulados_query = db.query(models.Simulado).filter(models.Simulado.user_id == current_user.id)

    if dias:
        limite_data = datetime.utcnow() - timedelta(days=dias)
        simulados_query = simulados_query.filter(models.Simulado.data_realizacao >= limite_data)

    simulados = simulados_query.all()

    if not simulados:
        return schemas.SimuladoStatisticsResponse( 
            total_simulados=0,
            percentual_geral=0.0,
            por_tipo={
                "basico": {"acertos": 0, "total": 0, "percentual": 0.0},
                "especifico": {"acertos": 0, "total": 0, "percentual": 0.0}
            },
            por_materia={},
            historico=[]
        )

    total_acertos_geral = sum(s.acertos_total for s in simulados)
    total_questoes_geral = sum(s.total_questoes for s in simulados)
    percentual_geral = (total_acertos_geral / total_questoes_geral) * 100 if total_questoes_geral else 0

    agg_acertos_por_tipo = {"basico": 0, "especifico": 0}
    agg_erros_por_tipo = {"basico": 0, "especifico": 0}
    agg_acertos_por_materia = {}
    agg_erros_por_materia = {}

    for s in simulados:
        agg_acertos_por_tipo["basico"] += s.acertos_basicos
        agg_erros_por_tipo["basico"] += s.erros_basicos
        agg_acertos_por_tipo["especifico"] += s.acertos_especificos
        agg_erros_por_tipo["especifico"] += s.erros_especificos

        # Corrigir campos JSON serializados como string
        try:
            acertos_por_materia = json.loads(s.acertos_por_materia) if isinstance(s.acertos_por_materia, str) else s.acertos_por_materia
        except:
            acertos_por_materia = {}

        try:
            erros_por_materia = json.loads(s.erros_por_materia) if isinstance(s.erros_por_materia, str) else s.erros_por_materia
        except:
            erros_por_materia = {}

        for mat, acertos in acertos_por_materia.items():
            agg_acertos_por_materia[mat] = agg_acertos_por_materia.get(mat, 0) + acertos
        for mat, erros in erros_por_materia.items():
            agg_erros_por_materia[mat] = agg_erros_por_materia.get(mat, 0) + erros

    por_tipo = {}
    for tipo in ["basico", "especifico"]:
        total_tipo = agg_acertos_por_tipo[tipo] + agg_erros_por_tipo[tipo]
        percentual = (agg_acertos_por_tipo[tipo] / total_tipo) * 100 if total_tipo else 0
        por_tipo[tipo] = schemas.SimuladoTipoStats( 
            acertos=agg_acertos_por_tipo[tipo],
            total=total_tipo,
            percentual=round(percentual, 2)
        )

    por_materia = {}
    for mat in set(list(agg_acertos_por_materia.keys()) + list(agg_erros_por_materia.keys())):
        total_materia = agg_acertos_por_materia.get(mat, 0) + agg_erros_por_materia.get(mat, 0)
        percentual = (agg_acertos_por_materia.get(mat, 0) / total_materia) * 100 if total_materia else 0
        por_materia[mat] = schemas.SimuladoMateriaStats( 
            acertos=agg_acertos_por_materia.get(mat, 0),
            total=total_materia,
            percentual=round(percentual, 2)
        )

    historico = sorted([schemas.SimuladoHistoricoItem( 
        id=s.id,
        data=s.data_realizacao.strftime("%Y-%m-%d %H:%M"),
        acertos=s.acertos_total,
        erros=s.erros_total,
        percentual=round(s.percentual_acerto, 2),
        tempo_utilizado=s.tempo_utilizado or 0
    ) for s in simulados], key=lambda x: x.data, reverse=True)

    return schemas.SimuladoStatisticsResponse( 
        total_simulados=len(simulados),
        percentual_geral=round(percentual_geral, 2),
        por_tipo=por_tipo,
        por_materia=por_materia,
        historico=historico
    )

@router.get("/api/simulados/count-questions/")
def contar_questoes_filtradas(
  materia: Optional[str] = None,
  assuntos: Optional[List[str]] = Query(None),
  banca: Optional[List[str]] = Query(None),
  orgao: Optional[List[str]] = Query(None),
  cargo: Optional[List[str]] = Query(None),
  ano: Optional[List[int]] = Query(None),
  escolaridade: Optional[List[str]] = Query(None),
  dificuldade: Optional[List[str]] = Query(None),
  regiao: Optional[List[str]] = Query(None),
  db: Session = Depends(get_db),
):
  total = crud.count_questions(
    db=db,
    materia=materia,
    assuntos=assuntos,
    banca=banca,
    orgao=orgao,
    cargo=cargo,
    ano=ano,
    escolaridade=escolaridade,
    dificuldade=dificuldade,
    regiao=regiao
  )
  return {"total": total}












