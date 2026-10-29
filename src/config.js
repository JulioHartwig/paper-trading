// Configurações centrais do simulador.
export const SALDO_INICIAL = 10000;

/**
 * multiplicador: quanto vale 1 ponto de variação de preço para 1 lote.
 *  - Dólar: 1 lote = US$ 1.000  → variação de R$ 0,01 ≈ R$ 10 por lote.
 *  - Ibovespa: 1 lote = R$ 0,20 por ponto (como o mini índice).
 * É uma simplificação didática: sem margem, corretagem ou custos.
 */
export const ATIVOS = [
  { id: 'usdbrl', nome: 'Dólar (USD/BRL)', simbolo: 'USDBRL=X', multiplicador: 1000, casas: 4, base: 5.4 },
  { id: 'ibov', nome: 'Ibovespa', simbolo: '^BVSP', multiplicador: 0.2, casas: 2, base: 130000 },
];

export const TIMEFRAMES = [1, 5, 15]; // minutos

// URL do Cloudflare Worker (definida no build via VITE_WORKER_URL).
export const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';
// Reserva quando não há Worker. Serviço público: pode ficar instável.
export const PROXY_PUBLICO = 'https://api.allorigins.win/raw?url=';

export const ATUALIZACAO_MS = 30000; // frequência de atualização dos dados reais
// Replay: cada candle é "desenhado" em TICKS_POR_CANDLE passos (um a cada REPLAY_MS),
// então o candle atual sobe e desce antes de fechar. 13 passos × 250 ms ≈ 3,2 s por candle.
// (TICKS_POR_CANDLE deve ser 3×k+1: 7, 10, 13, 16...)
export const REPLAY_MS = 250;
export const TICKS_POR_CANDLE = 13;

// Atraso entre clicar em Comprar/Vender/Encerrar e a execução da ordem.
// A ordem é executada ao preço do momento da execução, não do clique.
export const ATRASO_ORDEM_MS = 1500;
