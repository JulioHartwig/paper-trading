import { ATIVOS } from '../config.js';
import { brl, preco as fmtPreco, dataHora } from '../lib/format.js';
import { exportarCSV } from '../lib/export.js';

/** Histórico de operações encerradas + exportação do resultado em CSV. */
export default function HistoryPanel({ historico }) {
  const exportar = () => {
    const nome = window.prompt('Seu nome (para identificar o arquivo):', '');
    if (nome !== null) exportarCSV(historico, nome.trim());
  };

  return (
    <section className="painel">
      <div className="titulo-linha">
        <h2>Histórico de operações</h2>
        <button className="btn btn-pequeno" disabled={!historico.length} onClick={exportar}>Exportar CSV</button>
      </div>
      {historico.length === 0 ? (
        <p className="vazio">As operações encerradas aparecem aqui.</p>
      ) : (
        <div className="tabela-rolagem">
          <table>
            <thead>
              <tr><th>Encerrada em</th><th>Ativo</th><th>Lado</th><th>Lotes</th><th>Entrada</th><th>Saída</th><th>Resultado</th></tr>
            </thead>
            <tbody>
              {historico.map((h) => {
                const ativo = ATIVOS.find((a) => a.id === h.ativoId);
                return (
                  <tr key={h.id}>
                    <td>{dataHora(h.horaSaida)}{h.simulado ? ' (replay)' : ''}</td>
                    <td>{ativo.nome}</td>
                    <td>{h.lado === 'compra' ? 'Compra' : 'Venda'}</td>
                    <td>{h.lotes}</td>
                    <td>{fmtPreco(h.precoEntrada, ativo.casas)}</td>
                    <td>{fmtPreco(h.precoSaida, ativo.casas)}</td>
                    <td className={h.resultado >= 0 ? 'ganho' : 'perda'}>{brl(h.resultado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
