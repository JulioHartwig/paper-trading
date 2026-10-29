import { TICKS_POR_CANDLE } from '../config.js';

/**
 * Gera uma série sintética (passeio aleatório) para o modo Replay quando ainda
 * não existe nenhuma série real guardada. Determinística: todos os alunos veem o mesmo gráfico.
 * Os preços NÃO são reais — a interface avisa isso.
 */
export function gerarSerieSintetica(ativo, tf, n = 240) {
  let semente = ativo.id.length * 9973 + tf;
  const aleatorio = () => { // gerador mulberry32
    semente |= 0; semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const passo = tf * 60;
  const inicio = Math.floor(Date.now() / 1000 / passo) * passo - n * passo;
  const vol = ativo.base * 0.0007 * Math.sqrt(tf);
  let precoAtual = ativo.base;

  return Array.from({ length: n }, (_, i) => {
    const open = precoAtual;
    const close = open + (aleatorio() - 0.5) * 2 * vol;
    const high = Math.max(open, close) + aleatorio() * vol * 0.5;
    const low = Math.min(open, close) - aleatorio() * vol * 0.5;
    precoAtual = close;
    return { time: inicio + i * passo, open, high, low, close };
  });
}

/**
 * Divide um candle fechado em TICKS_POR_CANDLE estados parciais, para o replay mostrar
 * o candle se formando: abertura → primeiro extremo → segundo extremo → fechamento.
 * (candle de alta passa primeiro pela mínima; de baixa, primeiro pela máxima.)
 * O último estado é idêntico ao candle original.
 */
export function gerarTicks(c, n = TICKS_POR_CANDLE) {
  const sobe = c.close >= c.open;
  const [a, b] = sobe ? [c.low, c.high] : [c.high, c.low];
  const pontos = [c.open, a, b, c.close];
  const amp = c.high - c.low;
  const seg = (n - 1) / 3; // passos por trecho (inteiro quando n = 3k+1)

  const caminho = Array.from({ length: n }, (_, k) => {
    const s = Math.min(2, Math.floor(k / seg));
    const f = (k - s * seg) / seg;
    let p = pontos[s] + (pontos[s + 1] - pontos[s]) * f;
    if (k % seg !== 0) {
      // ruído determinístico entre os pontos de passagem, para o movimento não ser uma linha reta
      const r = Math.sin(c.time * 0.001 + k * 12.9898) * 43758.5453;
      p += (r - Math.floor(r) - 0.5) * amp * 0.25;
    }
    return Math.min(c.high, Math.max(c.low, p));
  });

  let high = c.open;
  let low = c.open;
  return caminho.map((p) => {
    high = Math.max(high, p);
    low = Math.min(low, p);
    return { time: c.time, open: c.open, high, low, close: p };
  });
}
