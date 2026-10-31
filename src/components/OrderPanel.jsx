import { useEffect, useState } from 'react';
import { brl, preco as fmtPreco } from '../lib/format.js';

/**
 * Converte o texto digitado em distância de preço, arredondada ao menor passo do ativo.
 * Vazio → null (sem stop/alvo); inválido ou ≤ 0 → NaN.
 */
function lerDistancia(texto, casas) {
  const t = texto.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  const passos = Math.max(1, Math.round(n * 10 ** casas));
  return passos / 10 ** casas;
}

/** Escolha de lotes, stop/alvo opcionais e botões de compra/venda ao preço do último candle. */
export default function OrderPanel({ ativo, precoAtual, ocupado, onOrdem }) {
  const [lotes, setLotes] = useState(1);
  const [stopTxt, setStopTxt] = useState('');
  const [alvoTxt, setAlvoTxt] = useState('');

  // As unidades mudam de um ativo para outro (R$ no dólar, pontos no Ibovespa): limpa os campos.
  useEffect(() => { setStopTxt(''); setAlvoTxt(''); }, [ativo.id]);

  const stop = lerDistancia(stopTxt, ativo.casas);
  const alvo = lerDistancia(alvoTxt, ativo.casas);
  const niveisOk = !Number.isNaN(stop) && !Number.isNaN(alvo);
  const valido = precoAtual != null && lotes >= 1 && lotes <= 100 && !ocupado && niveisOk;

  const unidade = ativo.casas === 0 ? 'pontos' : 'R$'; // dólar em R$, Ibovespa em pontos
  const passo = 1 / 10 ** ativo.casas;
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
          <input type="text" inputMode="decimal" placeholder={`opcional, ex.: ${passo * 20}`} value={stopTxt}
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

      <div className="botoes-ordem">
        <button className="btn btn-compra" disabled={!valido} onClick={() => onOrdem('compra', lotes, { stop, alvo })}>Comprar</button>
        <button className="btn btn-venda" disabled={!valido} onClick={() => onOrdem('venda', lotes, { stop, alvo })}>Vender</button>
      </div>
      {ocupado && <p className="executando" role="status">Executando ordem…</p>}
    </section>
  );
}
