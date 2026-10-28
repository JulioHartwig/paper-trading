import { useState } from 'react';
import { preco as fmtPreco } from '../lib/format.js';

/** Escolha de lotes e botões de compra/venda ao preço do último candle. */
export default function OrderPanel({ ativo, precoAtual, onOrdem }) {
  const [lotes, setLotes] = useState(1);
  const valido = precoAtual != null && lotes >= 1 && lotes <= 100;

  return (
    <section className="painel">
      <h2>Nova ordem</h2>
      <p className="preco-atual">{fmtPreco(precoAtual, ativo.casas)}</p>
      <label className="campo">
        Quantidade (lotes)
        <input type="number" min="1" max="100" step="1" value={lotes}
          onChange={(e) => setLotes(Math.max(0, Math.floor(Number(e.target.value))))} />
      </label>
      <div className="botoes-ordem">
        <button className="btn btn-compra" disabled={!valido} onClick={() => onOrdem('compra', lotes)}>Comprar</button>
        <button className="btn btn-venda" disabled={!valido} onClick={() => onOrdem('venda', lotes)}>Vender</button>
      </div>
    </section>
  );
}
