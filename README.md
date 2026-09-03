# AgroClima Pará — App

Frontend do projeto AgroClima Pará. Transferido em 2026-09-03 do protótipo de
validação de UX (antes mantido em `Agro_Tec_documentacao/prototipo/`) para este
repositório dedicado, seguindo a separação: `Agro_Tec_app` (frontend),
`Agro_Tec_api` (backend), `Agro_Tec_infra` (variáveis de ambiente).

**Estado atual**: ainda 100% mockado (sem chamadas reais ao backend) — é o
ponto de partida herdado do protótipo, não uma reescrita. O backend real já
existe em `Agro_Tec_api` (auth, propriedades/talhões, clima, pulverização,
balanço hídrico, dashboard) e a integração é o próximo passo (ver "Próximos
passos" no fim deste documento).

Construído em **React + TypeScript + Tailwind CSS**.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal (ex: `http://localhost:5173`). A rota inicial redireciona para `/login`.

## Telas e HUs cobertas

| Rota | Tela | HUs |
| --- | --- | --- |
| `/login` | Autenticação + seletor de papel | HU-01, HU-14 |
| `/mapa` | Mapa de Talhões e Estações (Leaflet) | HU-06, HU-07 |
| `/propriedades` | Lista de Propriedades e Talhões (com exclusão) | HU-05 |
| `/talhoes/novo` | Cadastro de Talhão + parametrização automática de solo | HU-05, HU-04 |
| `/pulverizacao` | Janela de pulverização em tempo real | HU-08, HU-09 |
| `/plantio` | Dashboard de status de plantio | HU-10, HU-11 |
| `/mapa` (painel de detalhe) | Recomendação acionável "O que fazer agora" | HU-12 |

Os 3 talhões e as 3 estações mockados em `src/mocks/data.ts` já cobrem os três estados de decisão (Verde/Amarelo/Vermelho e Favorável/Bloqueio por vento/Bloqueio por inversão térmica), para que o cliente veja todos os cenários sem precisar esperar dados reais.

## Fluxo de cadastro (HU-05)

Em `/talhoes/novo`, o campo Propriedade tem a opção **"+ Cadastrar nova propriedade"**, que revela um formulário inline (nome, proprietário, município) — não é preciso já existir uma propriedade para cadastrar um talhão. A etapa de geometria usa um mapa Leaflet de verdade: cada clique adiciona um vértice do polígono (mínimo 3), com "Desfazer último ponto" e "Limpar" disponíveis. Ao concluir, o talhão criado (com área, solo e estação mais próxima calculados a partir do polígono desenhado) é adicionado à lista em memória e o Mapa de Talhões abre já focado nele.

Também dá pra importar um **GeoJSON de verdade** (Polygon, MultiPolygon, Feature ou FeatureCollection) no lugar de clicar manualmente: o botão "Importar GeoJSON" lê o arquivo, extrai o primeiro polígono válido e o mapa recentraliza automaticamente nele. Formatos KML/Shapefile citados na HU-05 **não** têm parser real aqui (ficaria pesado demais pra um protótipo de validação) — o suporte é só a GeoJSON.

Ao confirmar a geometria, duas validações rodam de verdade (`src/lib/validacaoGeometria.ts`, usando Turf.js) fechando uma brecha da análise de requisitos (RN015/RN016, já validadas com o dono do produto):
- **Sobreposição dentro da mesma propriedade** é **bloqueada** com uma mensagem inline — tente desenhar um talhão em cima do "Talhão Norte" já existente na Fazenda Boa Esperança para ver.
- **Talhão fora de uma bounding box aproximada do Pará** dispara uma confirmação ("tem certeza?") em vez de bloquear — pode ser um dado de fronteira legítimo.

**Isso não persiste entre recarregamentos de página** — é estado em memória (React Context, ver abaixo), então um F5 volta aos 3 talhões originais. Para persistir de verdade entre sessões seria necessário `localStorage` ou um backend real, o que foge do propósito deste protótipo (validar o fluxo de UX, não guardar dados).

## Propriedades e Talhões (`/propriedades`)

Lista todas as propriedades com seus talhões em tabela, incluindo a opção de **excluir um talhão** (com confirmação). É o complemento do cadastro: onde `/talhoes/novo` cria, `/propriedades` visualiza e gerencia o que já existe.

## Histórico de Umidade / Balanço Hídrico (HU-10)

Cada talhão carrega uma série sintética de ~10 dias de umidade do solo (`historicoUmidade`, gerada em `src/lib/historico.ts`), plotada com Recharts:
- **Sparkline compacto** nos cards do Dashboard de Plantio.
- **Gráfico com eixos e tooltip** no painel de detalhe do Mapa (ao clicar num talhão).

A linha usa uma tinta neutra (slate) — só o ponto do valor atual usa a cor semântica do status (verde/âmbar/vermelho), sempre ao lado do badge de status por extenso. Isso foi uma escolha deliberada: validamos a paleta com o script de acessibilidade da skill de dataviz e a cor de marca (emerald) ficava indistinguível do verde de status num mesmo gráfico.

## Motor de regras de pulverização (HU-09)

`src/lib/regrasPulverizacao.ts` implementa RN001-RN003 exatamente como a especificação oficial (`escopo/calculos-geo-metero.md` §2): `classificarPulverizacao(vento, rajada)`. A regra é mais simples do que um rascunho anterior deste protótipo supunha — vento < 3km/h **sozinho** já bloqueia por inversão térmica, sem precisar de nenhuma leitura de variação de temperatura (aquele rascunho, que inventava um limiar de 5°C, foi retirado — ver o histórico da RN014 em `requisitos/REQUISITOS.md`). O simulador do `AppDataContext` gera leituras brutas plausíveis e deixa esse motor **derivar** o status — não atribui o status diretamente — para exercitar o mesmo código que rodaria em produção.

## Balanço Hídrico do Solo — implementação de referência (HU-10)

`src/lib/balancoHidrico.ts` implementa fielmente a fórmula oficial (`escopo/calculos-geo-metero.md` §4): CAD, o balanço diário $ARM_i$ e a matriz de decisão Verde/Amarelo/Vermelho em % de CAD. **Não está religada** aos 3 talhões mockados do Dashboard/Mapa — os dados de demo já têm um status calibrado à mão para contar uma história clara na validação (Verde/Atenção/Risco bem distintos), e o campo mockado `capacidadeCampo` é uma fração solta, não um CAD em milímetros de verdade. Ligar os dois exigiria refazer o mock inteiro nessa unidade, o que foge do propósito de UX deste protótipo — mas a função está pronta pra reaproveitar no backend real.

**Nota:** a especificação oficial tinha uma leitura ambígua aqui — a matriz formal (§4C) exige chuva prevista ≥ 5mm para o status Verde, mas o exemplo em Python (§5) não usa esse parâmetro. **Resolvido em 2026-09-03 com o dono do produto:** a matriz formal é a regra oficial; o exemplo em Python é só uma simplificação ilustrativa. Era exatamente o que esta implementação já seguia, então nenhuma mudança de código foi necessária.

## Alertas em tempo real (HU-08/HU-09)

O simulador (`src/store/AppDataContext.tsx`) muda uma estação aleatória a cada ~16-30s para um novo cenário de vento, classificado pelo motor de regras acima. Cada mudança de status dispara:
- Um **toast** temporário (some sozinho em 6s).
- Uma entrada no **sino de notificações** do topo, com contador de não lidas.

Isso é só para a demonstração — reforça a promessa de "alerta instantâneo" da Constituição do projeto sem precisar esperar dados reais mudarem.

## Recomendação acionável — "O que fazer agora" (HU-12 ✅ validada, sem pendências)

No painel de detalhe do Mapa de Talhões, a primeira seção (antes até do Solo) é uma recomendação sintetizando o status de plantio (HU-11) + o status de pulverização da estação mais próxima (HU-08/HU-09) numa ou duas frases, com um selo de prioridade (Alta/Média/Baixa — sempre cor **+ texto**, nunca só cor).

**Isso não estava em nenhum documento do projeto** quando foi construído — identificado como lacuna ao testar o protótipo (o sistema classificava e mostrava status muito bem, mas nunca dizia "e agora, o que eu faço?"). A funcionalidade, a lógica de prioridade (RN011-013) e o limiar de tendência de umidade (RN019, 1,5 pontos percentuais em 3 dias) **foram validados com o dono do produto em 2026-09-03**. A lógica está isolada em `src/lib/recomendacao.ts` (função pura `gerarRecomendacao`) para ficar fácil de auditar e recalibrar quando o Balanço Hídrico passar a rodar com dados reais em vez da série sintética atual. A UI sempre mostra o aviso "Sugestão gerada automaticamente pelo protótipo — não substitui avaliação agronômica" mesmo assim, por ser uma boa prática permanente, não uma ressalva de "não validado".

## Exportação CSV (HU-15 ✅ validada)

No Dashboard de Plantio, o botão "Exportar CSV" (`src/lib/exportarCsv.ts`) baixa os talhões **atualmente filtrados** na tela (propriedade, talhão, área, solo, status, umidade), com BOM UTF-8 para abrir certo no Excel. Funciona rodando `npm run dev` localmente (Blob + `<a download>`) e também no Artifact publicado (via capability `downloads`, com confirmação explícita do viewer).

## Perfis de acesso (HU-14 ✅ validada)

A tela de login tem um seletor "Entrar como" (Produtor rural / Agrônomo / Gestor de tecnologia), guardado no `AppDataContext`. Escolher **Agrônomo** demonstra o conceito de acesso somente-leitura: some o item "Cadastrar Talhão" da barra lateral e a coluna "Ação"/botão "+ Cadastrar talhão" na tela de Propriedades. **Simplificação importante:** o protótipo não implementa vínculo agrônomo↔propriedade (critério de aceite 4 da HU-14) — o Agrônomo enxerga todas as propriedades mockadas, não só as "vinculadas" a ele. Isso é aceitável para validar o *conceito* de leitura-only, mas não deve ser copiado para o backend real sem esse vínculo.

## Decisões técnicas do protótipo

- **Estado global via `AppDataContext`** (`src/store/AppDataContext.tsx`): propriedades, talhões, medições e notificações vivem num único React Context, não mais em imports mutáveis direto dos mocks — assim toda tela reage automaticamente quando outra cria/exclui um talhão ou quando o simulador atualiza uma medição.
- **Roteamento com `HashRouter`** (não `BrowserRouter`): garante que o protótipo funcione ao ser aberto como arquivo estático, hospedagem simples ou embutido em um iframe (ex: link de validação), sem depender de configuração de servidor para rotas SPA.
- **Sem chamadas reais de API**: todos os dados vêm de `src/mocks/data.ts`. Os "loadings" simulados (ex: consulta ao SoilGrids na tela de cadastro) usam `setTimeout` só para dar sensação de tempo real.
- **Foco automático do mapa**: tanto o Mapa de Talhões quanto o mapa de desenho do Cadastro ajustam zoom/enquadramento (`fitBounds`) para o talhão em foco ou o polígono importado — sem isso, talhões reais (algumas centenas de metros) ficam imperceptíveis ou fora da tela.
- **Tipos em `src/types/index.ts`** já espelham os campos definidos no `requisitos/REQUISITOS.md` e no schema SQL do `escopo/`, facilitando reaproveitar como base ao migrar para o backend real.
- **Turf.js** para as validações geométricas (`@turf/turf`) — a única lib de geoprocessamento real do protótipo; todo o resto é matemática simples (haversine, shoelace) escrita à mão para não puxar dependência por pouca coisa.

## Próximos passos (fora do escopo do protótipo)

- Substituir os mocks por chamadas reais ao backend FastAPI (HU-01 a HU-11).
- Implementar autenticação JWT, cadastro de conta e recuperação de senha de verdade (HU-01, HU-13) — o login atual só navega para `/mapa`.
- Implementar o vínculo agrônomo↔propriedade de verdade (HU-14, critério 4-5) — o protótipo só simula a restrição de leitura, sem convite/aceite.
- Suporte real a KML/Shapefile na importação (hoje só GeoJSON).
- Edição de talhão existente (hoje só criar e excluir — falta o "U" de um CRUD completo).
- Todas as decisões de documentação (HU-12 a HU-15, RN019, leitura do Balanço Hídrico) **foram fechadas em 2026-09-03** — o que resta é só trabalho de implementação real, listado nos itens acima.
