import { ATIVOS } from '../config.js';
import { calcPL } from '../state/accountReducer.js';
import { brl, preco as fmtPreco } from '../lib/format.js';

/** Posições abertas com lucro/prejuízo em tempo real e botão para encerrar. */
export default function PositionsPanel({ posicoes, precos, ativoId, onEncerrar }) {
  return (
    <section className="painel">
      <h2>Posições abertas</h2>
      {posicoes.length === 0 ? (
        <p className="vazio">Nenhuma posição aberta. Use Comprar ou Vender para começar.</p>
      ) : (
        <ul className="lista-pos">
          {posicoes.map((p) => {
            const ativo = ATIVOS.find((a) => a.id === p.ativoId);
            const atual = precos[p.ativoId] ?? p.precoEntrada;
            const pl = calcPL(p, atual);
            const noAtivoAtual = p.ativoId === ativoId;
            return (
              <li key={p.id}>
                <div>
                  <strong>{p.lado === 'compra' ? 'Compra' : 'Venda'} {p.lotes}</strong> · {ativo.nome}
                  <div className="detalhe">
                    Entrada {fmtPreco(p.precoEntrada, ativo.casas)} → {fmtPreco(atual, ativo.casas)}
                    {!noAtivoAtual && ' (último preço visto)'}
                  </div>
                </div>
                <div className="direita">
                  <span className={pl >= 0 ? 'ganho' : 'perda'}>{brl(pl)}</span>
                  <button className="btn btn-pequeno" disabled={!noAtivoAtual}
                    title={noAtivoAtual ? '' : 'Selecione este ativo para encerrar'}
                    onClick={() => onEncerrar(p.id)}>Encerrar</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
