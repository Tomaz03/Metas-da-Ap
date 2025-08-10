import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, BookOpen, Repeat, Dumbbell, Calendar, BarChart2, PieChart } from "lucide-react";

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export default function PlanoDeEstudos({ plano, onVoltar }) {
  const [diaAtual, setDiaAtual] = useState(new Date().getDay());
  const [atividades, setAtividades] = useState({});
  const [resumoSemanal, setResumoSemanal] = useState({
    total: 0,
    porMateria: {},
    exercicios: 0,
    revisoes: 0,
  });

  const calcularResumoDaSemana = useCallback((planoData) => {
    let totalMinutos = 0;
    const porMateria = {};
    let exerciciosMinutos = 0;
    let revisoesMinutos = 0;

    for (const dia of DIAS_SEMANA) {
      // O nome da chave no objeto de dados é apenas a primeira parte do nome do dia
      const blocos = planoData[dia.split('-')[0]] || [];
      for (const bloco of blocos) {
        const inicioMinutos = timeToMinutes(bloco.inicio);
        const fimMinutos = timeToMinutes(bloco.fim);
        const duracao = fimMinutos - inicioMinutos;

        if (duracao > 0) {
          totalMinutos += duracao;

          const materiaNome = bloco.materia
            .replace(/^(Exercícios - |Revisão - )/, "")
            .trim();

          if (porMateria[materiaNome]) {
            porMateria[materiaNome] += duracao;
          } else {
            porMateria[materiaNome] = duracao;
          }

          if (bloco.materia.startsWith("Exercícios - ")) {
            exerciciosMinutos += duracao;
          } else if (bloco.materia.startsWith("Revisão - ")) {
            revisoesMinutos += duracao;
          }
        }
      }
    }

    setResumoSemanal({
      total: totalMinutos,
      porMateria: porMateria,
      exercicios: exerciciosMinutos,
      revisoes: revisoesMinutos,
    });
  }, []);

  useEffect(() => {
    if (plano && plano.data) {
      setAtividades(plano.data);
      calcularResumoDaSemana(plano.data);
    }
  }, [plano, calcularResumoDaSemana]);

  const formatMinutesToHours = (totalMinutes) => {
    if (totalMinutes === 0) return "0 min";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}min`);
    return parts.join(" ");
  };

  const mudarDia = (delta) => {
    setDiaAtual((prev) => {
      let novo = prev + delta;
      if (novo < 0) novo = 6;
      if (novo > 6) novo = 0;
      return novo;
    });
  };

  if (!plano) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
        <p className="text-gray-500 text-lg animate-pulse">Carregando plano...</p>
      </div>
    );
  }

  const nomeDia = DIAS_SEMANA[diaAtual];
  const blocosDia = atividades[nomeDia.split('-')[0]] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <button
            onClick={onVoltar}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200 font-medium px-4 py-2 rounded-lg hover:bg-indigo-50"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 bg-white/80 px-6 py-3 rounded-xl shadow-sm backdrop-blur-sm">
            Meu Plano de Estudos
          </h1>
          <div className="w-10"></div> {/* Spacer for balance */}
        </header>

        {/* Alteração de layout: agora as seções são exibidas em uma única coluna */}
        <div className="grid grid-cols-1 gap-6">

          {/* Seção da agenda do dia */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => mudarDia(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-500 hover:text-indigo-600"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-500">Hoje é</p>
                <h2 className="text-2xl font-bold text-gray-800">{nomeDia}</h2>
              </div>
              <button
                onClick={() => mudarDia(1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-500 hover:text-indigo-600"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                <Calendar size={20} className="text-indigo-500" />
                Agenda do Dia
              </h3>
              
              {blocosDia.length > 0 ? (
                <div className="space-y-3">
                  {blocosDia.map((b, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{b.materia}</h4>
                          <div className="flex items-center mt-1 text-sm text-gray-600">
                            <Clock size={14} className="mr-1 text-indigo-500" />
                            <span>{b.inicio} - {b.fim}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                          {formatMinutesToHours(timeToMinutes(b.fim) - timeToMinutes(b.inicio))}
                        </span>
                      </div>
                      {b.comentario && (
                        <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {b.comentario}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Dumbbell size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nenhuma atividade agendada</p>
                </div>
              )}
            </div>
          </div>

          {/* Seção de resumo semanal, agora abaixo da agenda do dia */}
          <div className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-lg p-5 border-t-4 border-indigo-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Horas semanais</p>
                    <p className="text-xl font-bold text-gray-800">
                      {formatMinutesToHours(resumoSemanal.total)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-5 border-t-4 border-yellow-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                    <Dumbbell size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Exercícios</p>
                    <p className="text-xl font-bold text-gray-800">
                      {formatMinutesToHours(resumoSemanal.exercicios)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-5 border-t-4 border-green-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <Repeat size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Revisões</p>
                    <p className="text-xl font-bold text-gray-800">
                      {formatMinutesToHours(resumoSemanal.revisoes)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes por matéria */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-4">
                <BarChart2 size={20} className="text-indigo-500" />
                Distribuição por Matéria
              </h3>
              
              {Object.entries(resumoSemanal.porMateria).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(resumoSemanal.porMateria)
                    .sort((a, b) => b[1] - a[1])
                    .map(([materia, minutos]) => (
                      <div key={materia} className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-700">{materia}</span>
                          <span className="text-sm font-semibold text-gray-600">
                            {formatMinutesToHours(minutos)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{
                              width: `${(minutos / resumoSemanal.total) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nenhum dado de matéria disponível</p>
                </div>
              )}
            </div>

            {/* Visualização gráfica */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-4">
                <PieChart size={20} className="text-indigo-500" />
                Visão Geral
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40 mb-4">
                    <div className="absolute inset-0 rounded-full border-8 border-indigo-100"></div>
                    <div 
                      className="absolute inset-0 rounded-full border-8 border-indigo-500"
                      style={{
                        clipPath: `polygon(0 0, 100% 0, 100% 100%, 0% 100%)`,
                        transform: `rotate(${(resumoSemanal.exercicios / resumoSemanal.total) * 360}deg)`
                      }}
                    ></div>
                    <div 
                      className="absolute inset-0 rounded-full border-8 border-yellow-400"
                      style={{
                        clipPath: `polygon(0 0, 100% 0, 100% 100%, 0% 100%)`,
                        transform: `rotate(${(resumoSemanal.revisoes / resumoSemanal.total) * 360}deg)`
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-700">
                        {Math.round((resumoSemanal.total / (7 * 24 * 60)) * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">da semana dedicada</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-indigo-500 mr-2"></div>
                    <span className="text-sm text-gray-700">Estudo</span>
                    <span className="ml-auto text-sm font-medium">
                      {formatMinutesToHours(resumoSemanal.total - resumoSemanal.exercicios - resumoSemanal.revisoes)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-yellow-400 mr-2"></div>
                    <span className="text-sm text-gray-700">Exercícios</span>
                    <span className="ml-auto text-sm font-medium">
                      {formatMinutesToHours(resumoSemanal.exercicios)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm text-gray-700">Revisões</span>
                    <span className="ml-auto text-sm font-medium">
                      {formatMinutesToHours(resumoSemanal.revisoes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





















