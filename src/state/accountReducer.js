import { ATIVOS, SALDO_INICIAL } from '../config.js';

/** Lucro/prejuízo (R$) de uma posição ao preço informado. */
export function calcPL(pos, precoAtual) {
  const ativo = ATIVOS.find((a) => a.id === pos.ativoId);
  const direcao = pos.lado === 'compra' ? 1 : -1; // venda ganha quando o preço cai
  return (precoAtual - pos.precoEntrada) * direcao * pos.lotes * ativo.multiplicador;
}

export const estadoInicial = () => ({
  saldo: SALDO_INICIAL, // saldo realizado (só muda ao encerrar posições)
  posicoes: [],
  historico: [],
  proximoId: 1,
});

export function reducer(state, action) {
  switch (action.type) {
    case 'ABRIR':
      return {
        ...state,
        posicoes: [...state.posicoes, { id: state.proximoId, ...action.ordem }],
        proximoId: state.proximoId + 1,
      };
    case 'ENCERRAR': {
      const pos = state.posicoes.find((p) => p.id === action.id);
      if (!pos) return state;
      const resultado = calcPL(pos, action.preco);
      return {
        ...state,
        saldo: state.saldo + resultado,
        posicoes: state.posicoes.filter((p) => p.id !== action.id),
        historico: [{ ...pos, precoSaida: action.preco, horaSaida: action.hora, resultado }, ...state.historico],
      };
    }
    case 'RESETAR':
      return estadoInicial();
    default:
      return state;
  }
}
