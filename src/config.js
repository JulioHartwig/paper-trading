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
export const REPLAY_MS = 1500;       // um novo candle a cada 1,5 s no modo replay
