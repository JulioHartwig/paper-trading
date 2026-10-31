import { useState } from 'react';
import { ATIVOS } from '../config.js';
import { calcPL } from '../state/accountReducer.js';
import { brl, preco as fmtPreco } from '../lib/format.js';

const paraTexto = (v, casas) => (v == null ? '' : v.toFixed(casas).replace('.', ','));

/** Texto → preço arredondado às casas do ativo. Vazio → null (sem nível); inválido → NaN. */
function lerPreco(texto, casas) {
  const t = texto.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(casas)) : NaN;
}

/** Posições abertas com lucro/prejuízo em tempo real, stop/alvo editáveis e botão para encerrar. */
export default function PositionsPanel({ posicoes, precos, ativoId, ocupado, onEncerrar, onAjustar }) {
  const [edicao, setEdicao] = useState(null); // { id, stop, alvo, erro } da posição em edição

  const iniciarEdicao = (p, casas) =>
    setEdicao({ id: p.id, stop: paraTexto(p.stopPreco, casas), alvo: paraTexto(p.alvoPreco, casas), erro: '' });

  const salvar = (p, ativo, atual) => {
    const stop = lerPreco(edicao.stop, ativo.casas);
    const alvo = lerPreco(edicao.alvo, ativo.casas);
    const falhar = (erro) => setEdicao({ ...edicao, erro });

    if (Number.isNaN(stop) || Number.isNaN(alvo)) return falhar('Use números maiores que zero, ou deixe vazio para remover.');

    // O nível precisa ficar do lado certo do preço atual; senão a posição seria encerrada na hora.
    const compra = p.lado === 'compra';
    const precoTxt = fmtPreco(atual, ativo.casas);
    if (stop != null && (compra ? stop >= atual : stop <= atual)) {
      return falhar(`O stop de ${compra ? 'compra' : 'venda'} deve ficar ${compra ? 'abaixo' : 'acima'} do preço atual (${precoTxt}).`);
    }
    if (alvo != null && (compra ? alvo <= atual : alvo >= atual)) {
      return falhar(`O alvo de ${compra ? 'compra' : 'venda'} deve ficar ${compra ? 'acima' : 'abaixo'} do preço atual (${precoTxt}).`);
    }
    onAjustar(p.id, stop, alvo);
    setEdicao(null);
  };

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
            const editando = edicao?.id === p.id;
            const stopN = editando ? lerPreco(edicao.stop, ativo.casas) : null;
            const alvoN = editando ? lerPreco(edicao.alvo, ativo.casas) : null;
            return (
              <li key={p.id}>
                <div>
                  <strong>{p.lado === 'compra' ? 'Compra' : 'Venda'} {p.lotes}</strong> · {ativo.nome}
                  <div className="detalhe">
                    Entrada {fmtPreco(p.precoEntrada, ativo.casas)} → {fmtPreco(atual, ativo.casas)}
                    {!noAtivoAtual && ' (último preço visto)'}
                  </div>
                  {(p.stopPreco != null || p.alvoPreco != null) && (
                    <div className="detalhe">
                      {p.stopPreco != null && <>Stop {fmtPreco(p.stopPreco, ativo.casas)}</>}
                      {p.stopPreco != null && p.alvoPreco != null && ' · '}
                      {p.alvoPreco != null && <>Alvo {fmtPreco(p.alvoPreco, ativo.casas)}</>}
                      {!noAtivoAtual && ' — só são monitorados com este ativo na tela'}
                    </div>
                  )}
                </div>
                <div className="direita">
                  <span className={pl >= 0 ? 'ganho' : 'perda'}>{brl(pl)}</span>
                  <button className="btn btn-pequeno" disabled={!noAtivoAtual}
                    title={noAtivoAtual ? '' : 'Selecione este ativo para ajustar'}
                    onClick={() => iniciarEdicao(p, ativo.casas)}>Stop/alvo</button>
                  <button className="btn btn-pequeno" disabled={!noAtivoAtual || ocupado}
                    title={noAtivoAtual ? '' : 'Selecione este ativo para encerrar'}
                    onClick={() => onEncerrar(p.id)}>Encerrar</button>
                </div>

                {editando && (
                  <div className="edicao">
                    <div className="par-campos">
                      <label className="campo">
                        Stop (preço)
                        <input type="text" inputMode="decimal" placeholder="sem stop" value={edicao.stop}
                          onChange={(e) => setEdicao({ ...edicao, stop: e.target.value, erro: '' })} />
                      </label>
                      <label className="campo">
                        Alvo (preço)
                        <input type="text" inputMode="decimal" placeholder="sem alvo" value={edicao.alvo}
                          onChange={(e) => setEdicao({ ...edicao, alvo: e.target.value, erro: '' })} />
                      </label>
                    </div>
                    {(stopN != null && !Number.isNaN(stopN)) || (alvoN != null && !Number.isNaN(alvoN)) ? (
                      <p className="estimativa">
                        {stopN != null && !Number.isNaN(stopN) && <>Resultado no stop ≈ {brl(calcPL(p, stopN))}</>}
                        {stopN != null && !Number.isNaN(stopN) && alvoN != null && !Number.isNaN(alvoN) && ' · '}
                        {alvoN != null && !Number.isNaN(alvoN) && <>Resultado no alvo ≈ {brl(calcPL(p, alvoN))}</>}
                      </p>
                    ) : null}
                    {edicao.erro && <p className="erro-campo">{edicao.erro}</p>}
                    <div className="acoes">
                      <button className="btn btn-pequeno" onClick={() => salvar(p, ativo, atual)}>Salvar</button>
                      <button className="btn btn-pequeno" onClick={() => setEdicao(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
