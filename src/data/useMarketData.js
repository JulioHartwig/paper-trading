import { useEffect, useState } from 'react';
import { ATUALIZACAO_MS, REPLAY_MS, TICKS_POR_CANDLE } from '../config.js';
import { buscarCandles } from './yahooProvider.js';
import { gerarSerieSintetica, gerarTicks } from './candleBuilder.js';
import { lerUltimaSerie, salvarUltimaSerie } from '../state/storage.js';

/**
 * Entrega os candles do ativo/timeframe escolhidos.
 *  - modo 'real': busca periodicamente na fonte de dados.
 *  - modo 'replay': repete uma sessão; o candle atual se forma tick a tick (sobe/desce) antes de fechar.
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

    // Replay: começa com um terço da série já desenhada e forma um candle por vez, tick a tick.
    const serie = lerUltimaSerie(ativo.id, tf) || gerarSerieSintetica(ativo, tf);
    const inicio = Math.min(60, Math.floor(serie.length / 3));
    let i = inicio; // candle em formação
    let k = 0;      // tick atual dentro do candle
    let ticks = gerarTicks(serie[i]);
    const mostrar = () => setDados({ chave, candles: [...serie.slice(0, i), ticks[k]], erro: null });
    mostrar();
    const id = setInterval(() => {
      k += 1;
      if (k >= TICKS_POR_CANDLE) {
        k = 0;
        i = i + 1 >= serie.length ? inicio : i + 1; // ao acabar a série, recomeça
        ticks = gerarTicks(serie[i]);
      }
      mostrar();
    }, REPLAY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const atual = dados.chave === chave ? dados : { candles: [], erro: null };
  return { candles: atual.candles, erro: atual.erro, carregando: !atual.candles.length && !atual.erro };
}
