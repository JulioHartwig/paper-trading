import { criarGerador, criarFormador } from './candleBuilder.js';
import { converterCandles, arredondarCandle } from '../lib/preco.js';

export const DURACAO_CANDLE_MS = 60 * 1000; // o mercado "bate" em candles de 1 minuto; os outros timeframes agrupam estes
export const MAX_FECHADOS = 2000;           // candles de 1 min guardados em memória
export const MAX_VISIVEIS = 150;            // candles exibidos no gráfico

const SEMANA = 7 * 24 * 3600;

/**
 * Motor do mercado simulado de UM ativo, com candles de 1 minuto.
 * - Determinístico e atrelado ao relógio: o preço de cada minuto é o mesmo para todos os alunos
 *   e continua o mesmo se a página for recarregada. A sequência recomeça do preço-base a cada semana.
 * - agoraSeg: horário atual em segundos (já no fuso local, para o eixo do gráfico mostrar a hora local).
 */
export function criarMotor(ativo, agoraSeg) {
  const ancora = Math.floor(agoraSeg / SEMANA) * SEMANA;
  const minutoAtual = Math.floor(agoraSeg / 60) * 60;
  const gerar = criarGerador(ativo, ancora / SEMANA);
  const proxima = (time) => converterCandles([{ time, ...gerar() }], ativo)[0]; // já em pontos e no passo

  // Histórico: do início da semana até o minuto atual (a sequência precisa partir da âncora para ser a mesma).
  let fechados = [];
  for (let t = ancora; t < minutoAtual; t += 60) fechados.push(proxima(t));
  fechados = fechados.slice(-MAX_FECHADOS);

  // Candle em formação: começa já no ponto em que o minuto está agora.
  let tempo = minutoAtual;
  let formador = criarFormador(proxima(tempo), DURACAO_CANDLE_MS);
  const decorridoMs = (agoraSeg - minutoAtual) * 1000;
  let formando = decorridoMs > 0
    ? arredondarCandle(formador.avancar(decorridoMs).candle, ativo)
    : formador.inicial();

  return {
    estado: () => ({ fechados, formando }),

    /** Faz o tempo andar `deltaMs`. Se passar de um minuto (ou mais), fecha os candles necessários. */
    avancar(deltaMs) {
      let restante = deltaMs;
      for (;;) {
        const r = formador.avancar(restante);
        if (!r.fim) { formando = arredondarCandle(r.candle, ativo); return; }
        fechados = [...fechados.slice(-(MAX_FECHADOS - 1)), r.candle];
        tempo += 60;
        formador = criarFormador(proxima(tempo), DURACAO_CANDLE_MS);
        formando = formador.inicial();
        restante = r.sobra;
      }
    },
  };
}

/**
 * Agrupa os candles de 1 minuto no timeframe pedido (5, 15...). O último candle inclui o minuto em formação,
 * então o preço atual é o mesmo em qualquer timeframe.
 */
export function agregarCandles(fechados, formando, tf) {
  const todos = [...fechados, formando];
  if (tf === 1) return todos;
  const passo = tf * 60;
  const saida = [];
  let atual = null;
  for (const c of todos) {
    const t = Math.floor(c.time / passo) * passo;
    if (!atual || atual.time !== t) {
      atual = { time: t, open: c.open, high: c.high, low: c.low, close: c.close };
      saida.push(atual);
    } else {
      atual.high = Math.max(atual.high, c.high);
      atual.low = Math.min(atual.low, c.low);
      atual.close = c.close;
    }
  }
  return saida;
}
