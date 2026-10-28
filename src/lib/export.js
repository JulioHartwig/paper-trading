import { dataHora } from './format.js';

/**
 * Gera um CSV (separador ";" e vírgula decimal, abre direto no Excel em pt-BR)
 * para o aluno enviar o resultado ao professor.
 */
export function exportarCSV(historico, nomeAluno) {
  const virgula = (v) => String(v).replace('.', ',');
  const cab = ['Entrada', 'Saída', 'Ativo', 'Lado', 'Lotes', 'Preço entrada', 'Preço saída', 'Resultado (R$)', 'Dados simulados'];
  const linhas = historico.map((h) =>
    [
      dataHora(h.hora), dataHora(h.horaSaida), h.ativoId, h.lado, h.lotes,
      virgula(h.precoEntrada), virgula(h.precoSaida), virgula(h.resultado.toFixed(2)),
      h.simulado ? 'sim' : 'não',
    ].join(';')
  );
  const texto = '\uFEFF' + [`Aluno;${nomeAluno}`, cab.join(';'), ...linhas].join('\n');

  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `resultado-${nomeAluno.replace(/\s+/g, '-').toLowerCase() || 'aluno'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
