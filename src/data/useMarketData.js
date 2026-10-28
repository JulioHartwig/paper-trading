import { useEffect, useState } from 'react';
import { ATUALIZACAO_MS, REPLAY_MS } from '../config.js';
import { buscarCandles } from './yahooProvider.js';
import { gerarSerieSintetica } from './candleBuilder.js';
import { lerUltimaSerie, salvarUltimaSerie } from '../state/storage.js';

/**
 * Entrega os candles do ativo/timeframe escolhidos.
 *  - modo 'real': busca periodicamente na fonte de dados.
 *  - modo 'replay': repete uma sessão candle a candle (aula fora do pregão).
 * Para trocar de fonte no futuro, basta alterar o import de buscarCandles.
 */
export function useMarketData(ativo, tf, modo) {
  const chave = `${ativo.id}|${tf}|${modo}`;
  // Guardamos a "chave" junto dos dados para nunca misturar candles do ativo anterior com o novo.
  const [dados, setDados] = useState({ chave: '', candles: [], erro: null });

  useEffect(() => {
    if (modo === 'real') {
      let vivo = true;
      const carregar = async () => {
        try {
          const candles = await buscarCandles(ativo.simbolo, tf);
          if (!vivo) return;
          setDados({ chave, candles, erro: null });
          salvarUltimaSerie(ativo.id, tf, candles);
        } catch (e) {
          if (vivo) setDados((d) => ({ chave, candles: d.chave === chave ? d.candles : [], erro: e.message }));
        }
      };
      carregar();
      const id = setInterval(carregar, ATUALIZACAO_MS);
      return () => { vivo = false; clearInterval(id); };
    }

    // Replay: começa com um terço da série já desenhada e revela um candle por vez.
    const serie = lerUltimaSerie(ativo.id, tf) || gerarSerieSintetica(ativo, tf);
    const inicio = Math.min(60, Math.floor(serie.length / 3));
    let i = inicio;
    const mostrar = () => setDados({ chave, candles: serie.slice(0, i + 1), erro: null });
    mostrar();
    const id = setInterval(() => { i = i + 1 >= serie.length ? inicio : i + 1; mostrar(); }, REPLAY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const atual = dados.chave === chave ? dados : { candles: [], erro: null };
  return { candles: atual.candles, erro: atual.erro, carregando: !atual.candles.length && !atual.erro };
}
