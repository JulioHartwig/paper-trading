import { useEffect, useState } from 'react';
import { gerarSerieSintetica, criarFormador } from './candleBuilder.js';
import { sortearIntervalo, duracaoDoCandleMs } from './replayConfig.js';
import { converterCandles, arredondarCandle } from '../lib/preco.js';

/**
 * Mercado simulado para treino.
 * O cenário é gerado no navegador e é o mesmo para todos os alunos. Cada candle leva o tempo
 * real do timeframe (1 min = 1 min) e se forma por ticks em intervalos aleatórios
 * (veja replayConfig.js).
 */
export function useMarketData(ativo, tf) {
  const chave = `${ativo.id}|${tf}`;
  // Guardamos a "chave" junto dos dados para nunca misturar candles do ativo anterior com o novo.
  const [dados, setDados] = useState({ chave: '', candles: [] });

  useEffect(() => {
    // Começa com um terço da série já desenhada e forma um candle por vez.
    const serie = converterCandles(gerarSerieSintetica(ativo, tf), ativo);
    const inicio = Math.min(60, Math.floor(serie.length / 3));
    const duracao = duracaoDoCandleMs(tf);
    let i = inicio; // candle em formação
    let formador = criarFormador(serie[i], duracao);
    const mostrar = (candleAtual) =>
      setDados({ chave, candles: [...serie.slice(0, i), arredondarCandle(candleAtual, ativo)] });
    mostrar(formador.inicial());

    // Cadeia de timeouts: cada tick sorteia o próprio intervalo.
    let timer;
    const proximoTick = () => {
      const delta = sortearIntervalo();
      timer = setTimeout(() => {
        const { candle, fim } = formador.avancar(delta);
        if (fim) {
          mostrar(candle);
          i = i + 1 >= serie.length ? inicio : i + 1; // ao acabar a série, recomeça
          formador = criarFormador(serie[i], duracao);
          mostrar(formador.inicial()); // o novo candle abre logo em seguida
        } else {
          mostrar(candle);
        }
        proximoTick();
      }, delta);
    };
    proximoTick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return { candles: dados.chave === chave ? dados.candles : [] };
}
