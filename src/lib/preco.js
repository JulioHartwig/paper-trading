/**
 * Escala e passo de preço de cada ativo (veja ATIVOS em config.js).
 * Dólar no padrão MetaTrader/B3: a cotação 5,3455 vira 5.345,50 pontos (escala 1000),
 * e o preço só varia de 0,50 em 0,50 (passo).
 */

/** Arredonda ao passo mínimo do ativo, sem sobras de ponto flutuante. */
export const arredondar = (valor, ativo) =>
  Number((Math.round(valor / ativo.passo) * ativo.passo).toFixed(ativo.casas));

export const arredondarCandle = (c, ativo) => ({
  time: c.time,
  open: arredondar(c.open, ativo),
  high: arredondar(c.high, ativo),
  low: arredondar(c.low, ativo),
  close: arredondar(c.close, ativo),
});

/** Converte candles da fonte (ex.: USD/BRL 5,3455) para a escala exibida (5.345,50 pontos). */
export const converterCandles = (candles, ativo) =>
  candles.map((c) =>
    arredondarCandle(
      { time: c.time, open: c.open * ativo.escala, high: c.high * ativo.escala, low: c.low * ativo.escala, close: c.close * ativo.escala },
      ativo
    )
  );
