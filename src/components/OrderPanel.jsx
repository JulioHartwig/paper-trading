import { useEffect, useState } from 'react';
import { brl, preco as fmtPreco } from '../lib/format.js';
import { arredondar } from '../lib/preco.js';

/**
 * Converte o texto digitado em distância de preço, arredondada ao menor passo do ativo.
 * Vazio → null (sem stop/alvo); inválido ou ≤ 0 → NaN.
 */
function lerDistancia(texto, ativo) {
  const t = texto.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return Math.max(ativo.passo, arredondar(n, ativo)); // múltiplo do passo, no mínimo 1 passo
}

/** Escolha de lotes, stop/alvo opcionais e botões de compra/venda ao preço do último candle. */
export default function OrderPanel({ ativo, precoAtual, ocupado, garantia, disponivel, aviso, onOrdem }) {
  const [lotes, setLotes] = useState(1);
  const [stopTxt, setStopTxt] = useState('');
  const [alvoTxt, setAlvoTxt] = useState('');

  // As unidades mudam de um ativo para outro (R$ no dólar, pontos no Ibovespa): limpa os campos.
  useEffect(() => { setStopTxt(''); setAlvoTxt(''); }, [ativo.id]);

  const stop = lerDistancia(stopTxt, ativo);
  const alvo = lerDistancia(alvoTxt, ativo);
  const niveisOk = !Number.isNaN(stop) && !Number.isNaN(alvo);
  // Cada lote exige a garantia livre no patrimônio (2 lotes = 2 × garantia).
  const exigida = lotes * garantia;
  const garantiaOk = disponivel >= exigida;
  const maxLotes = Math.max(0, Math.min(100, Math.floor(disponivel / garantia)));
  const valido = precoAtual != null && lotes >= 1 && lotes <= 100 && !ocupado && niveisOk && garantiaOk;

  const unidade = 'pontos'; // os dois ativos são cotados em pontos
  const valor = (distancia) => brl(distancia * ativo.multiplicador * lotes);

  return (
    <section className="painel">
      <h2>Nova ordem</h2>
      <p className="preco-atual">{fmtPreco(precoAtual, ativo.casas)}</p>
      <label className="campo">
        Quantidade (lotes)
        <input type="number" min="1" max="100" step="1" value={lotes}
          onChange={(e) => setLotes(Math.max(0, Math.floor(Number(e.target.value))))} />
      </label>

      <div className="par-campos">
        <label className="campo">
          Stop ({unidade})
          <input type="text" inputMode="decimal" placeholder={`opcional, ex.: ${ativo.passo * 20}`} value={stopTxt}
            onChange={(e) => setStopTxt(e.target.value)} />
        </label>
        <label className="campo">
          Alvo ({unidade})
          <input type="text" inputMode="decimal" placeholder="opcional" value={alvoTxt}
            onChange={(e) => setAlvoTxt(e.target.value)} />
        </label>
      </div>
      {!niveisOk && <p className="erro-campo">Stop e alvo devem ser números maiores que zero.</p>}
      {niveisOk && (stop != null || alvo != null) && (
        <p className="estimativa">
          {stop != null && <>Perda no stop ≈ {valor(stop)}</>}
          {stop != null && alvo != null && ' · '}
          {alvo != null && <>Ganho no alvo ≈ {valor(alvo)}</>}
          <br />A distância é contada a partir do preço de execução.
        </p>
      )}

      <p className={garantiaOk ? 'estimativa' : 'erro-campo'}>
        {garantiaOk
          ? `Garantia: ${brl(garantia)} por lote · esta ordem bloqueia ${brl(exigida)} · disponível: ${brl(disponivel)}`
          : `Garantia insuficiente: ${lotes} lote(s) exigem ${brl(exigida)} e você tem ${brl(Math.max(disponivel, 0))} disponível${maxLotes > 0 ? ` (máximo agora: ${maxLotes} lote(s))` : ''}.`}
      </p>

      <div className="botoes-ordem">
        <button className="btn btn-compra" disabled={!valido} onClick={() => onOrdem('compra', lotes, { stop, alvo })}>Comprar</button>
        <button className="btn btn-venda" disabled={!valido} onClick={() => onOrdem('venda', lotes, { stop, alvo })}>Vender</button>
      </div>
      {ocupado && <p className="executando" role="status">Executando ordem…</p>}
      {aviso && <p className="erro-campo">{aviso}</p>}
    </section>
  );
}
