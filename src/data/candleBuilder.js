/** Gerador pseudoaleatório determinístico (mulberry32): a mesma semente dá sempre a mesma sequência. */
function criarAleatorio(semente) {
  let s = semente | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cada chamada devolve o próximo candle de 1 minuto de um passeio aleatório, com leve retorno
 * ao preço-base (o preço não foge para longe). O open de cada candle é o close do anterior.
 * Valores na unidade da fonte (ex.: USD/BRL 5,4); a conversão para pontos é feita depois.
 * Os preços NÃO são reais — a interface avisa isso.
 */
export function criarGerador(ativo, semente0) {
  const hashId = [...ativo.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
  const aleatorio = criarAleatorio(hashId + semente0 * 7919);
  const vol = ativo.base * 0.0007;
  let preco = ativo.base;

  return () => {
    const open = preco;
    const close = open + (aleatorio() - 0.5) * 2 * vol + (ativo.base - open) * 0.0005;
    const high = Math.max(open, close) + aleatorio() * vol * 0.5;
    const low = Math.min(open, close) - aleatorio() * vol * 0.5;
    preco = close;
    return { open, high, low, close };
  };
}

/**
 * Forma um candle já conhecido ao longo de `duracaoMs`.
 * Caminho: abertura → primeiro extremo → segundo extremo → fechamento
 * (candle de alta passa antes pela mínima; o de baixa, antes pela máxima).
 *
 * Uso: const f = criarFormador(candle, duracaoMs);
 *      f.inicial()        → candle recém-aberto (só o preço de abertura)
 *      f.avancar(deltaMs) → { candle, fim, sobra }. Em `fim` o candle é idêntico ao original e
 *                           `sobra` é o tempo que passou além do fim (para o próximo candle começar no ponto certo).
 */
export function criarFormador(c, duracaoMs) {
  const sobe = c.close >= c.open;
  const pontos = [c.open, sobe ? c.low : c.high, sobe ? c.high : c.low, c.close];
  const amp = c.high - c.low;
  let decorrido = 0;
  let fAnterior = 0;
  let high = c.open;
  let low = c.open;

  return {
    inicial: () => ({ time: c.time, open: c.open, high: c.open, low: c.open, close: c.open }),

    avancar(deltaMs) {
      const total = decorrido + deltaMs;
      decorrido = Math.min(duracaoMs, total);
      const f = decorrido / duracaoMs;
      if (f >= 1) return { candle: { ...c }, fim: true, sobra: total - duracaoMs };

      const trecho = Math.min(2, Math.floor(f * 3));
      const g = f * 3 - trecho;
      let p = pontos[trecho] + (pontos[trecho + 1] - pontos[trecho]) * g;

      if (fAnterior < 1 / 3 && f >= 1 / 3) p = pontos[1];        // passou pelo 1º extremo: pousa nele
      else if (fAnterior < 2 / 3 && f >= 2 / 3) p = pontos[2];   // passou pelo 2º extremo
      else p += (Math.random() - 0.5) * amp * 0.2;               // oscilação entre os extremos
      p = Math.min(c.high, Math.max(c.low, p));

      fAnterior = f;
      high = Math.max(high, p);
      low = Math.min(low, p);
      return { candle: { time: c.time, open: c.open, high, low, close: p }, fim: false, sobra: 0 };
    },
  };
}
