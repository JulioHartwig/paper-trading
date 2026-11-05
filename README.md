# 📈 Simulador de Negociações — Paper Trading para Sala de Aula

> Aprenda a operar **mini dólar** e **mini índice** em um mercado simulado, com dinheiro de mentira.
> Roda inteiro no navegador, é gratuito e se hospeda no GitHub Pages.

**🔗 Acesse:** https://juliohartwig.github.io/paper-trading/

<!-- Adicione uma captura de tela: salve em docs/tela.png e descomente a linha abaixo.
![Tela do simulador](docs/tela.png)
-->

---

## Por que este projeto existe

Quem está aprendendo a operar costuma errar com dinheiro de verdade. Este simulador foi feito para o aluno **praticar compra e venda, gestão de risco e leitura de gráfico** em um ambiente que se comporta como a plataforma de uma corretora (preços em pontos, ticks, valor do ponto), mas sem risco financeiro.

Ele foi pensado para uso em aula:

- **Sem cadastro, sem servidor, sem custo.** O aluno abre o link e opera.
- **Todos os alunos veem o mesmo cenário**, o que facilita comentar o gráfico em sala e comparar decisões.
- **Cada aluno tem a própria conta**, guardada no navegador dele.
- **O professor recebe o resultado** por um arquivo CSV exportado pelo aluno.

---

## O que dá para fazer

| Recurso | Descrição |
|---|---|
| 📊 **Gráfico de candles** | Mini dólar e mini índice, com timeframes de 1, 5 e 15 minutos (TradingView Lightweight Charts). |
| ⏱️ **Mercado simulado em tempo real** | Cada candle dura o tempo real do timeframe (o de 1 minuto leva 1 minuto) e se forma aos poucos: o preço sobe e desce em ticks de 0,3 a 2,5 s antes de fechar. |
| 🛒 **Compra e venda** | Ordens em lotes (1 a 100), com um pequeno atraso na execução. A ordem é executada ao preço do momento da execução, não do clique. |
| 🎯 **Stop e alvo** | Definidos na ordem ou movidos depois, com a posição aberta. Aparecem no gráfico como linhas tracejadas com o resultado em R$. A posição é encerrada automaticamente ao atingir o nível. |
| 💰 **Painel de resultados** | Saldo, resultado em aberto em tempo real, patrimônio, posições abertas e histórico com o motivo de cada saída (manual, stop ou alvo). |
| 💾 **Conta no navegador** | Saldo, posições e histórico ficam no `localStorage`. Há botão para resetar a conta. |
| 📤 **Exportar resultado** | O aluno baixa um CSV com o nome dele e o histórico de operações. |

---

## Regras de negócio

Os preços e valores seguem a referência da B3 / MetaTrader 5:

| | Mini dólar (WDO) | Mini índice (WIN) |
|---|---|---|
| Preço exibido | Pontos (ex.: `5.420,00`) | Pontos (ex.: `134.000`) |
| Tick (variação mínima) | 0,5 ponto | 5 pontos |
| Valor do tick | R$ 5,00 | R$ 1,00 |
| Valor do ponto | R$ 10,00 por lote | R$ 0,20 por lote |

**Resultado** = (pontos de saída − pontos de entrada) × valor do ponto × lotes. Na venda, o sinal se inverte.

- Compra a 134.000 e venda a 134.500 → +500 pontos × R$ 0,20 = **+R$ 100,00**
- Venda a 5.420,0 e recompra a 5.410,0 → +10 pontos × R$ 10,00 = **+R$ 100,00**

> Simplificações didáticas: sem margem, alavancagem, corretagem ou custos operacionais, e sem ordens limitadas. O saldo inicial é de R$ 10.000,00.

---

## Como funciona por dentro

```mermaid
flowchart LR
    A[Cenário simulado<br/>igual para todos] --> B[Candles se formam<br/>tick a tick]
    B --> C[Ordens, stop e alvo]
    C --> D[(localStorage<br/>conta do aluno)]
    D --> E[CSV para o professor]
```

- **Tudo roda no navegador.** Não há servidor, banco de dados nem serviço externo para manter.
- **O cenário é gerado no próprio navegador** (um passeio aleatório determinístico), então todos os alunos veem a mesma sequência de preços. Os preços **não** são cotações reais.
- **Escala do MetaTrader.** Os preços são arredondados ao tick de cada ativo e exibidos em pontos.

---

## Para o professor

**Uma aula, em quatro passos:**

1. Os alunos abrem o link e escolhem o ativo e o timeframe.
2. Cada aluno opera, define stop e alvo e acompanha o resultado no painel.
3. Você comenta o gráfico com a turma, já que todos veem os mesmos candles.
4. No fim, cada um clica em **Exportar CSV** e envia o arquivo a você.

**Boas práticas:**

- Como o tempo é real, o timeframe de **1 minuto** é o mais adequado para aula: um candle de 5 minutos leva 5 minutos para fechar, e o de 15 leva 15.
- Peça que usem **sempre o mesmo navegador e aparelho**: a conta fica salva nele. Limpar os dados do navegador ou abrir uma aba anônima apaga tudo.
- Não há ranking da turma, porque isso exigiria um servidor. Para comparar resultados, use os CSVs.

---

## Rodar localmente

Requer Node.js 18 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

## Publicar no GitHub Pages

1. Envie o projeto para a branch `main` de um repositório.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Envie um commit para `main` (ou rode **Actions → Deploy no GitHub Pages → Run workflow**).

O endereço final aparece em **Settings → Pages**. O workflow está em `.github/workflows/deploy.yml`. Não há chaves de API nem variáveis para configurar.

---

## Personalizar

| O que | Onde |
|---|---|
| Saldo inicial | `SALDO_INICIAL` em `src/config.js` |
| Valor do ponto, tick, casas decimais e escala de cada ativo | `ATIVOS` em `src/config.js` |
| Atraso na execução das ordens | `ATRASO_ORDEM_MS` em `src/config.js` |
| Ritmo dos ticks (0,3 a 2,5 s) | `src/data/replayConfig.js` |
| Cenário simulado (preço inicial e volatilidade) | `base` em `ATIVOS` e `gerarSerieSintetica` em `src/data/candleBuilder.js` |
| Limite de lotes por ordem | `src/components/OrderPanel.jsx` |

---

## Limitações conhecidas

- **Os preços são simulados.** Servem para treinar a operação e a gestão de risco, mas não reproduzem o comportamento de um mercado real.
- **Cenário finito.** A série tem 240 candles e recomeça quando termina.
- **Dados só no navegador.** Trocar de computador ou limpar o histórico apaga a conta. O professor não vê os resultados sem o CSV.
- **Stop e alvo** só são monitorados para o ativo que está na tela, e a saída é imediata ao preço vigente, que pode ficar um pouco além do nível.
- **Sem margem e sem custos.** Com até 100 lotes por ordem, a conta pode zerar rápido. Ajuste o limite de lotes ou o saldo conforme a turma.

---

## Estrutura do projeto

```
.github/workflows/deploy.yml   deploy automático no GitHub Pages
src/
├── config.js                  ativos, escala, tick, valor do ponto, saldo
├── App.jsx                    tela principal e fluxo das ordens
├── components/                gráfico, nova ordem, posições, histórico, aviso
├── data/                      cenário simulado, formação dos candles e hook useMarketData
├── state/                     regras da conta (reducer) e localStorage
└── lib/                       formatação, escala de preços e exportação CSV
```

**Tecnologias:** React 18, Vite, TradingView Lightweight Charts, GitHub Actions.

---

## Próximos passos possíveis

- Velocidade do mercado simulado (1x, 5x, 20x)
- Sessões reais de mercado gravadas em arquivo, para treinar sobre dias históricos
- Relatório com taxa de acerto, maior ganho e maior perda
- Limite de lotes por patrimônio e trava quando a conta zerar
- Custos simulados (corretagem e spread)
- Backup da conta em JSON (exportar e importar)

---

> ⚠️ **Aviso:** projeto estritamente educacional. Nada aqui é recomendação de investimento, e o desempenho no simulador não garante resultado em operações reais.
