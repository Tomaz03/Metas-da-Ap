from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import random
import json
from backend import crud, models, schemas # Importação corrigida
from backend.auth import get_current_user
from backend.database import get_db

router = APIRouter()

@router.post("/api/simulados/generate/")
def gerar_simulado(payload: schemas.SimuladoConfigSchema, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
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
        acertos_total=0,
        erros_total=0,
        percentual_acerto=0.0,
        acertos_basicos=0,
        erros_basicos=0,
        acertos_especificos=0,
        erros_especificos=0,
        questoes_respondidas=0,
        tempo_utilizado=0,
        data_realizacao=datetime.utcnow()
    )

    db.add(initial_simulado)
    db.commit()
    db.refresh(initial_simulado)
    
    return schemas.SimuladoCreatedResponse(
        id=initial_simulado.id,
        questoes=questoes_formatadas,
        tempo_limite_minutos=payload.tempo_limite_minutos,
        status="criado"
    )

@router.post("/api/simulados/submit/{simulado_id}")
def submeter_simulado(
    simulado_id: int,
    respostas: List[schemas.QuestaoFeedback],
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    simulado = crud.get_simulado_by_id(db, simulado_id, current_user.id)
    if not simulado:
        raise HTTPException(status_code=404, detail="Simulado não encontrado.")

    if simulado.status == "finalizado":
        raise HTTPException(status_code=400, detail="Simulado já foi finalizado.")

    acertos = 0
    erros = 0
    acertos_basicos = 0
    erros_basicos = 0
    acertos_especificos = 0
    erros_especificos = 0
    
    # Mapear as respostas do usuário para facilitar a busca
    respostas_map = {r.questao_id: r.resposta_usuario for r in respostas}
    
    # Buscar todas as questões do simulado de uma vez
    questoes_ids = json.loads(simulado.questoes_ids) if isinstance(simulado.questoes_ids, str) else simulado.questoes_ids
    questoes = db.query(models.Question).filter(models.Question.id.in_(questoes_ids)).all()
    
    questoes_map = {q.id: q for q in questoes}

    for questao_id, resposta_usuario in respostas_map.items():
        questao = questoes_map.get(questao_id)
        if not questao:
            continue

        gabarito = crud.mapear_gabarito_para_indice(questao.gabarito, questao.tipo)

        if resposta_usuario is not None and resposta_usuario == gabarito:
            acertos += 1
            if crud.obter_tipo_por_materia(questao.materia) == "basico":
                acertos_basicos += 1
            else:
                acertos_especificos += 1
        else:
            erros += 1
            if crud.obter_tipo_por_materia(questao.materia) == "basico":
                erros_basicos += 1
            else:
                erros_especificos += 1

    percentual_acerto = (acertos / simulado.total_questoes) * 100 if simulado.total_questoes > 0 else 0

    # Atualizar o simulado
    simulado.acertos_total = acertos
    simulado.erros_total = erros
    simulado.acertos_basicos = acertos_basicos
    simulado.erros_basicos = erros_basicos
    simulado.acertos_especificos = acertos_especificos
    simulado.erros_especificos = erros_especificos
    simulado.percentual_acerto = percentual_acerto
    simulado.questoes_respondidas = len(respostas)
    simulado.data_submissao = datetime.utcnow()
    simulado.status = "finalizado"

    db.commit()
    db.refresh(simulado)

    return {"message": "Simulado submetido com sucesso", "simulado_id": simulado.id, "percentual_acerto": simulado.percentual_acerto}


@router.get("/api/simulados/list/")
def listar_simulados(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    simulados = crud.get_user_simulados(db, current_user.id)
    return [schemas.SimuladoOverview.from_orm(s) for s in simulados]


@router.get("/api/simulados/statistics/")
def get_user_simulado_statistics(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    simulados = crud.get_user_simulados(db, current_user.id)
    
    if not simulados:
        return schemas.SimuladoStatisticsResponse(
            total_simulados=0,
            percentual_geral=0.0,
            por_tipo={},
            por_materia={},
            historico=[]
        )

    total_acertos_geral = 0
    total_questoes_geral = 0
    por_tipo = {"basico": {"acertos": 0, "erros": 0}, "especifico": {"acertos": 0, "erros": 0}}
    por_materia = {}

    for s in simulados:
        if s.status == "finalizado":
            total_acertos_geral += s.acertos_total
            total_questoes_geral += s.total_questoes
            
            por_tipo["basico"]["acertos"] += s.acertos_basicos
            por_tipo["basico"]["erros"] += s.erros_basicos
            por_tipo["especifico"]["acertos"] += s.acertos_especificos
            por_tipo["especifico"]["erros"] += s.erros_especificos
            
            # Recalcular estatísticas por matéria
            if s.questoes_ids and isinstance(s.questoes_ids, list):
                questoes = db.query(models.Question).filter(models.Question.id.in_(s.questoes_ids)).all()
                respostas = crud.get_respostas_simulado(db, s.id) # Assumindo que essa função existe
                
                for q in questoes:
                    if q.materia not in por_materia:
                        por_materia[q.materia] = {"acertos": 0, "erros": 0, "total": 0}
                    
                    por_materia[q.materia]["total"] += 1
                    
                    if respostas.get(str(q.id)) is not None:
                        gabarito = crud.mapear_gabarito_para_indice(q.gabarito)
                        if respostas.get(str(q.id)) == gabarito:
                            por_materia[q.materia]["acertos"] += 1
                        else:
                            por_materia[q.materia]["erros"] += 1

    percentual_geral = (total_acertos_geral / total_questoes_geral) * 100 if total_questoes_geral > 0 else 0.0

    # Adicionar percentual por tipo e matéria
    for tipo, stats in por_tipo.items():
        total_questoes_tipo = stats["acertos"] + stats["erros"]
        stats["percentual"] = (stats["acertos"] / total_questoes_tipo) * 100 if total_questoes_tipo > 0 else 0.0
    
    for materia, stats in por_materia.items():
        total_questoes_materia = stats["acertos"] + stats["erros"]
        stats["percentual"] = (stats["acertos"] / total_questoes_materia) * 100 if total_questoes_materia > 0 else 0.0

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
    db: Session = Depends(get_db)
):
    filtros = {
        "materia": materia,
        "assuntos": assuntos,
        "banca": banca,
        "orgao": orgao,
        "cargo": cargo,
        "ano": ano,
        "escolaridade": escolaridade,
        "dificuldade": dificuldade,
        "regiao": regiao,
    }
    
    # Chama a função count_questions do crud
    resultado = crud.count_questions(db=db, **filtros)
    
    return {"total_questoes": resultado["count"]}















