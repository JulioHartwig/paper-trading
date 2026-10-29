// Ritmo do modo Replay.
// Cada candle dura o tempo real do timeframe (1 min = 60 s, 5 min = 300 s, 15 min = 900 s).
// Dentro dele, os ticks chegam em intervalos aleatórios entre TICK_MIN_MS e TICK_MAX_MS.
export const TICK_MIN_MS = 300;
export const TICK_MAX_MS = 2500;

export const sortearIntervalo = () => TICK_MIN_MS + Math.random() * (TICK_MAX_MS - TICK_MIN_MS);
export const duracaoDoCandleMs = (tfMinutos) => tfMinutos * 60 * 1000;
