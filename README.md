# Simulador de Negociações (Paper Trading) – Sala de Aula

Aplicação web para os alunos praticarem compra e venda de **dólar (USD/BRL)** e **Ibovespa** com cotações reais (com atraso) e **dinheiro fictício**. Roda 100% no navegador, é gratuita e pode ser hospedada no GitHub Pages.

## Como funciona

- Gráfico de candles (TradingView Lightweight Charts) com timeframes de 1, 5 e 15 minutos.
- Ordens de compra e venda ao preço do último candle, com linha horizontal marcando a entrada.
- Saldo inicial de R$ 10.000,00, resultado em aberto em tempo real, encerramento de posições e histórico.
- Tudo é salvo no `localStorage` do navegador do aluno. Botão "Resetar conta" para recomeçar.
- Botão "Exportar CSV" para o aluno enviar o resultado ao professor.
- Modo **Replay**: repete uma sessão anterior candle a candle, útil quando o mercado está fechado.

Valor dos lotes (simplificação didática, sem margem, corretagem ou custos), em `src/config.js`:

| Ativo | 1 lote | Exemplo |
|---|---|---|
| Dólar | US$ 1.000 | variação de R$ 0,01 = R$ 10 por lote |
| Ibovespa | R$ 0,20 por ponto | variação de 100 pontos = R$ 20 por lote |

## Fonte de dados

Os candles vêm do endpoint público de gráficos do Yahoo Finance (`USDBRL=X` e `^BVSP`). Ele é **não oficial**, não tem garantia de continuidade, e o navegador não consegue chamá-lo diretamente (CORS). Por isso há duas formas de acesso:

1. **Cloudflare Worker próprio (recomendado):** gratuito, sem cartão, com cache de 30 s. Veja "Publicar o Worker".
2. **Proxy público (reserva):** usado quando `VITE_WORKER_URL` está vazio. Funciona para testes, mas pode falhar ou mudar as regras.

## Rodar localmente

Requer Node.js 18 ou superior.

```bash
npm install
cp .env.example .env     # opcional: edite com a URL do seu Worker
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

## Publicar o Worker (3 minutos)

1. Crie uma conta gratuita em https://dash.cloudflare.com.
2. Vá em **Workers & Pages → Create → Create Worker**, dê um nome (ex.: `paper-trading`) e clique em **Deploy**.
3. Clique em **Edit code**, apague o conteúdo e cole o arquivo `worker/index.js`. Clique em **Deploy**.
4. Copie a URL do Worker (ex.: `https://paper-trading.seu-usuario.workers.dev`).
5. Teste no navegador: `SUA_URL/?symbol=USDBRL=X&interval=5m&range=1d` deve retornar um JSON.

O plano gratuito permite 100 mil requisições por dia. Com o cache, uma turma inteira usa uma fração disso.

## Publicar no GitHub Pages (passo a passo)

1. Crie um repositório no GitHub e envie este projeto para a branch `main`:
   ```bash
   git init && git add . && git commit -m "Simulador de paper trading"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Para usar o Worker: **Settings → Secrets and variables → Actions → aba Variables → New repository variable**. Nome `VITE_WORKER_URL`, valor igual à URL do Worker. (É uma URL pública, por isso não precisa ser um *secret*.)
4. Envie qualquer commit para `main` (ou rode o workflow em **Actions → Deploy no GitHub Pages → Run workflow**).
5. Ao terminar, o endereço aparece em **Settings → Pages**: `https://SEU-USUARIO.github.io/SEU-REPO/`.

O workflow está em `.github/workflows/deploy.yml`. Não há chaves de API secretas neste projeto.

## Limitações conhecidas

- **Atraso:** as cotações têm atraso de até cerca de 15 minutos, dependendo do ativo e da fonte.
- **Horário de mercado:** o Ibovespa só tem candles novos no pregão da B3 (dias úteis). O dólar negocia quase 24h em dias úteis. Fora desses horários, use o modo Replay.
- **localStorage:** os dados ficam em um único navegador e aparelho. Limpar os dados do navegador, usar aba anônima ou trocar de computador apaga a conta. O professor não vê os resultados dos alunos, por isso existe a exportação em CSV. Um ranking da turma exigiria um backend.
- **Fonte não oficial:** o Yahoo pode mudar ou bloquear o endpoint sem aviso. O Worker roda nos servidores da Cloudflare, e em casos raros o Yahoo pode limitar esses IPs. O app mostra uma mensagem amigável se isso ocorrer.
- **Simplificações:** sem margem, alavancagem, corretagem, slippage ou ordens limitadas. A ordem é sempre executada ao preço do último candle.
- **Modo Replay:** repete a última série real guardada no navegador. Se ainda não houver nenhuma, usa dados simulados (identificados na tela).

## Trocar a fonte de dados no futuro

Toda a busca de candles está em `src/data/yahooProvider.js`, que devolve `[{ time, open, high, low, close }]` (`time` em segundos, no fuso local). Para usar outra fonte:

1. Crie `src/data/outraFonte.js` exportando `buscarCandles(simbolo, tf)` com o mesmo formato de retorno.
2. Em `src/data/useMarketData.js`, troque o `import { buscarCandles }` para o novo arquivo.
3. Ajuste `simbolo` de cada ativo em `src/config.js`.

Para incluir novos ativos, adicione um item em `ATIVOS` (`src/config.js`) e o símbolo na lista `SIMBOLOS` de `worker/index.js`.

## Estrutura

```
.github/workflows/deploy.yml   deploy automático no GitHub Pages
worker/index.js                proxy Cloudflare com cache
src/config.js                  ativos, lotes, saldo, URLs
src/data/                      busca de candles, replay e hook useMarketData
src/state/                     regras da conta (reducer) e localStorage
src/components/                gráfico, ordens, posições, histórico, avisos
src/lib/                       formatação e exportação CSV
```
