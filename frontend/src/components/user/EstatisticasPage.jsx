import React, { useEffect, useState } from "react";
import { BarChart2, Percent, BookOpenCheck, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import html2pdf from "html2pdf.js";

export default function EstatisticasPage({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const url = new URL(`${import.meta.env.VITE_API_URL}/api/simulados/stats`);
      if (filtroPeriodo !== "todos") {
        url.searchParams.set("dias", filtroPeriodo);
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
    } finally {
      setLoading(false);
    }
  };
  fetchStats();
}, [token, filtroPeriodo]);


  if (loading) {
    return <div className="text-center text-gray-600 mt-20">Carregando estatísticas...</div>;
  }

  if (!stats) {
    return <div className="text-center text-red-600 mt-20">Erro ao carregar estatísticas.</div>;
  }

  // Aplicar filtro de período ao histórico
  const historicoFiltrado = stats.historico.filter((s) => {
    if (filtroPeriodo === "todos") return true;
    const dias = parseInt(filtroPeriodo);
    const dataSimulado = new Date(s.data);
    const hoje = new Date();
    const diffDias = (hoje - dataSimulado) / (1000 * 60 * 60 * 24);
    return diffDias <= dias;
  });

  // Calcular o tempo médio com base no histórico filtrado
  const tempoMedio = historicoFiltrado.length > 0
    ? Math.round(historicoFiltrado.reduce((acc, s) => acc + s.tempo_utilizado, 0) / historicoFiltrado.length)
    : 0;

  // Preparar dados para o gráfico de matérias
  const chartData = Object.entries(stats.por_materia).map(([materia, dados]) => ({
    materia,
    percentual: dados.percentual
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Título e botão de exportar */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-800">Estatísticas dos Simulados</h1>
        <button
          onClick={() => {
            const element = document.getElementById("estatisticas-container");
            html2pdf()
              .from(element)
              .set({
                margin: 0.5,
                filename: `estatisticas_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
              })
              .save();
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm shadow"
        >
          Exportar PDF
        </button>
      </div>

      {/* Filtro de período */}
      <div className="mb-4 flex items-center justify-end">
        <label className="text-sm text-gray-600 mr-2">Período:</label>
        <select
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
          className="border rounded px-3 py-1 text-sm shadow"
        >
          <option value="todos">Todos</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>
      </div>

      <div id="estatisticas-container">
        {/* Painéis principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border border-purple-100">
            <div className="flex items-center space-x-3 text-purple-700">
              <BarChart2 className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Simulados Feitos</h2>
            </div>
            <p className="text-3xl mt-2 font-bold">{historicoFiltrado.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-green-100">
            <div className="flex items-center space-x-3 text-green-700">
              <Percent className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Percentual Geral</h2>
            </div>
            <p className="text-3xl mt-2 font-bold">
              {historicoFiltrado.length > 0 
                ? (historicoFiltrado.reduce((acc, s) => acc + s.percentual, 0) / historicoFiltrado.length).toFixed(2) 
                : 0}%
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-yellow-100">
            <div className="flex items-center space-x-3 text-yellow-700">
              <Clock className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Tempo Médio</h2>
            </div>
            <p className="text-xl mt-2 font-medium text-gray-600">
              {historicoFiltrado.length > 0
                ? `${tempoMedio} segundos`
                : "-"}
            </p>
          </div>
        </div>

        {/* Estatísticas por tipo */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acertos por Tipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["basico", "especifico"].map((tipo) => (
              <div key={tipo} className="bg-white p-5 rounded shadow border">
                <div className="flex justify-between mb-2 text-gray-700 font-semibold">
                  <span>{tipo === "basico" ? "Conhecimentos Básicos" : "Conhecimentos Específicos"}</span>
                  <span>{stats.por_tipo[tipo].percentual.toFixed(2)}%</span>
                </div>
                <div className="text-sm text-gray-500">
                  {stats.por_tipo[tipo].acertos} acertos de {stats.por_tipo[tipo].total} questões
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estatísticas por matéria */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Acertos por Matéria</h2>
          <div className="overflow-auto bg-white shadow rounded border mb-6">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Matéria</th>
                  <th className="px-4 py-3 text-left">Acertos</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.por_materia).map(([materia, dados]) => (
                  <tr key={materia} className="border-t">
                    <td className="px-4 py-2">{materia}</td>
                    <td className="px-4 py-2">{dados.acertos}</td>
                    <td className="px-4 py-2">{dados.total}</td>
                    <td className="px-4 py-2">{dados.percentual.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de barras por matéria */}
        <div className="mt-8 mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Gráfico: Percentual por Matéria</h3>
          <div className="h-80 bg-white p-4 rounded shadow border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="materia" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Percentual']} />
                <Bar dataKey="percentual" fill="#6366f1" name="Percentual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de pizza por tipo */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Gráfico: Acertos por Tipo</h3>
          <div className="h-72 bg-white p-4 rounded shadow border">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Básico",
                      value: stats.por_tipo.basico.acertos
                    },
                    {
                      name: "Específico",
                      value: stats.por_tipo.especifico.acertos
                    }
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  <Cell fill="#10b981" /> {/* verde para básico */}
                  <Cell fill="#facc15" /> {/* amarelo para específico */}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de linha: evolução percentual */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Evolução dos Acertos (%)</h3>
          <div className="h-80 bg-white p-4 rounded shadow border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={historicoFiltrado.map((s, i) => ({
                  data: `#${historicoFiltrado.length - i}`,
                  percentual: s.percentual
                })).reverse()}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Bar dataKey="percentual" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico: tempo gasto em cada simulado */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Tempo por Simulado (em minutos)</h3>
          <div className="h-80 bg-white p-4 rounded shadow border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={historicoFiltrado.map((s, i) => ({
                  simulado: `#${historicoFiltrado.length - i}`,
                  tempo: Math.round(s.tempo_utilizado / 60)
                })).reverse()}
                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit=" min" />
                <YAxis type="category" dataKey="simulado" />
                <Tooltip formatter={(v) => `${v} min`} />
                <Bar dataKey="tempo" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histórico */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Histórico de Simulados</h2>
          <div className="overflow-auto bg-white shadow rounded border">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Acertos</th>
                  <th className="px-4 py-3 text-left">Erros</th>
                  <th className="px-4 py-3 text-left">Percentual</th>
                  <th className="px-4 py-3 text-left">Tempo (s)</th>
                </tr>
              </thead>
              <tbody>
                {historicoFiltrado.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{s.data}</td>
                    <td className="px-4 py-2">{s.acertos}</td>
                    <td className="px-4 py-2">{s.erros}</td>
                    <td className="px-4 py-2">{s.percentual.toFixed(2)}%</td>
                    <td className="px-4 py-2">{s.tempo_utilizado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
