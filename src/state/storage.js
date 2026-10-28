import { estadoInicial } from './accountReducer.js';

// Tudo fica no navegador do aluno (localStorage). Se mudar o formato dos dados,
// troque o sufixo "v1" para não carregar dados antigos incompatíveis.
const CHAVE = 'paper-trading-v1';

export function carregarEstado() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE));
    if (bruto && Array.isArray(bruto.posicoes) && Array.isArray(bruto.historico) && typeof bruto.saldo === 'number') {
      return bruto;
    }
  } catch { /* dados corrompidos ou localStorage indisponível */ }
  return estadoInicial();
}

export function salvarEstado(estado) {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* modo anônimo/cheio */ }
}

// Última série real recebida: usada pelo modo Replay.
export function salvarUltimaSerie(ativoId, tf, candles) {
  try { localStorage.setItem(`pt-serie-${ativoId}-${tf}`, JSON.stringify(candles)); } catch { /* ignora */ }
}

export function lerUltimaSerie(ativoId, tf) {
  try {
    const s = JSON.parse(localStorage.getItem(`pt-serie-${ativoId}-${tf}`));
    return Array.isArray(s) && s.length > 10 ? s : null;
  } catch { return null; }
}
