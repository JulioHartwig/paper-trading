/** Aviso fixo: o mercado é simulado, para treino. */
export default function StatusBanner() {
  return (
    <p className="aviso aviso-info">
      Mercado simulado para treino: todos veem o mesmo cenário e cada candle dura o tempo real do timeframe escolhido.
      Os preços não são cotações reais.
    </p>
  );
}
