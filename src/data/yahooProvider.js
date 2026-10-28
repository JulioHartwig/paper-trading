import { WORKER_URL, PROXY_PUBLICO } from '../config.js';

const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const INTERVALO = { 1: '1m', 5: '5m', 15: '15m' };

/**
 * Busca candles OHLC. Retorna [{ time, open, high, low, close }] com time em segundos.
 * Usa o Worker próprio se configurado; senão, um proxy público (reserva).
 */
export async function buscarCandles(simbolo, tf) {
  const intervalo = INTERVALO[tf];
  const periodo = tf === 15 ? '5d' : '1d'; // 15 min precisa de mais dias para ter candles suficientes

  let url;
  if (WORKER_URL) {
    url = `${WORKER_URL}?symbol=${encodeURIComponent(simbolo)}&interval=${intervalo}&range=${periodo}`;
  } else {
    const alvo = `${YAHOO}${encodeURIComponent(simbolo)}?interval=${intervalo}&range=${periodo}`;
    url = PROXY_PUBLICO + encodeURIComponent(alvo);
  }

  let resp;
  try {
    resp = await fetch(url);
  } catch {
    throw new Error('Sem conexão com a fonte de dados.');
  }
  if (!resp.ok) throw new Error(`A fonte de dados respondeu com erro (HTTP ${resp.status}).`);

  const json = await resp.json();
  const r = json?.chart?.result?.[0];
  if (!r?.timestamp) throw new Error('Sem candles disponíveis agora (mercado fechado?).');

  // Soma o fuso da bolsa para o gráfico mostrar o horário local (Brasília), não UTC.
  const fuso = r.meta?.gmtoffset || 0;
  const q = r.indicators.quote[0];
  const candles = r.timestamp
    .map((t, i) => ({ time: t + fuso, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i] }))
    .filter((c) => [c.open, c.high, c.low, c.close].every((v) => v != null)); // Yahoo devolve null em minutos sem negócio

  if (!candles.length) throw new Error('Sem candles disponíveis agora (mercado fechado?).');
  return candles;
}
