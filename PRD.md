# PRD — TodoList_C (saladaMista)

| Campo | Valor |
|---|---|
| Produto | TodoList_C — lista diária de atividades pessoais e profissionais |
| Marca | saladaMista |
| Autor / Product Owner | Sergio Resende |
| Versão do documento | 0.11 |
| Data | 04/11/2026 |
| Status | Etapa 2 em desenvolvimento — Marco 1 concluído (app desktop local, sem login e sem sincronização) |

Documentos relacionados: `descricao-original.md` (pedido original e exemplos), `brainstorm.md` (análise e decisões).

---

## 1. Visão geral

Um aplicativo **desktop** (instalado no PC, sem depender do navegador) para organizar as atividades do dia em um **"paper"** — uma lista diária dividida em seções (ex.: "Atividades DXC" e "Atividades Pessoais"). A cada novo dia, o app cria o paper do dia trazendo automaticamente o que ficou pendente e o que foi planejado para aquela data, e permite **imprimir uma folha A4** no layout que o usuário já usa hoje.

Os dados ficam numa **base local** (funciona offline) e são **sincronizados com a nuvem** quando há conexão, preparando o terreno para uma versão mobile.

### 1.1 Problema

Hoje o paper diário é montado à mão (no Word/Excel): copiar o que ficou pendente do dia anterior, apagar o que foi concluído, lembrar o que estava planejado para hoje e formatar para impressão. É repetitivo, sujeito a esquecimento e não existe histórico.

### 1.2 Objetivos

1. Montar o paper do dia em **menos de 1 minuto** no primeiro acesso.
2. **Zero pendências perdidas**: todo item não concluído é levado para o próximo paper até ser concluído ou excluído.
3. Atividades planejadas para datas futuras aparecem **somente** no paper do dia planejado.
4. Folha A4 impressa **fiel ao layout atual** (faixa de data, seções com cabeçalho colorido, marcadores, espaço para anotações).
5. Funcionar **100% offline** e sincronizar sem perda de dados ao reconectar.

### 1.3 Fora de escopo (MVP)

Lembretes/notificações, recorrência, colaboração/compartilhamento entre usuários, anexos, integração com calendário, app mobile (Etapa 3).

---

## 2. Usuário e cenários

**Persona principal:** profissional com rotina intensa que mistura demandas do trabalho e pessoais, prefere ter a lista impressa sobre a mesa e trabalha no PC o dia todo, às vezes sem rede.

**Cenários-chave**

1. **Início do dia** — abre o app às 8h; o app detecta que não há paper de hoje e mostra o assistente "Criar paper do dia" com os pendentes de ontem e os planejados para hoje. Ele revisa, inclui 2 itens novos, confirma e imprime.
2. **Durante o dia** — conclui "Revisão SFDC", renomeia "Ronaldo.contrato" para "Cobrar Ronaldo - contrato", adiciona um sub-item na "Agenda".
3. **Planejamento** — cria "Habilitação Detran" para quinta-feira; o item só aparece no paper de quinta.
4. **Sem conexão** — no avião, conclui itens e cria novos; ao reconectar, tudo sincroniza.
5. **Dias sem paper** — o último paper criado foi em 30/10 e o app não foi aberto nos dias seguintes; em 04/11 o app importa os pendentes de 30/10 e tudo que foi planejado entre 31/10 e 04/11. Não há distinção entre dias úteis, fins de semana ou feriados.

---

## 3. Conceitos e modelo de dados

| Conceito | Definição |
|---|---|
| **Atividade** | Unidade de trabalho com texto, seção, status e (opcionalmente) data planejada. Existe ao longo de vários dias até ser concluída ou excluída. |
| **Sub-item** | Atividade filha de outra (máx. **2 níveis**: item → sub-item). Ex.: "Agenda" → "Amanda". |
| **Seção (categoria)** | Agrupamento customizável do paper (ex.: "Atividades DXC", "Atividades Pessoais"). Tem nome, cor do cabeçalho e ordem. |
| **Paper do dia** | Lista de um dia específico. Existe **um paper por data**. Guarda um retrato das atividades daquele dia (para histórico). |
| **Atividade planejada** | Atividade com data futura. Fica "na gaveta" e entra no paper quando a data chega. |

### 3.1 Entidades (proposta)

```
Usuario      (id, nome, email, provedor_auth[google|email], criado_em)
Secao        (id, usuario_id, nome, cor_cabecalho, ordem, arquivada, updated_at, deleted_at)
Atividade    (id, usuario_id, secao_id, parent_id NULL, texto, ordem,
              status[pendente|concluida|excluida], data_planejada NULL,
              criada_em, concluida_em NULL, updated_at, deleted_at)
Paper        (id, usuario_id, data, criado_em, impresso_em NULL, updated_at)
PaperItem    (id, paper_id, atividade_id, texto_no_dia, ordem, status_no_dia, updated_at)
```

- IDs em **UUID** (gerados no cliente, necessários para criar offline).
- `updated_at` + `deleted_at` (soft delete) em tudo que sincroniza.
- `PaperItem` permite saber, por exemplo, que "IBMR" esteve em aberto em 5 papers seguidos.
- `texto_no_dia` guarda o texto como estava naquele paper: editar o item no paper de hoje não altera o histórico dos dias anteriores.

---

## 4. Requisitos funcionais

Prioridade: **M** = obrigatório no MVP · **S** = desejável no MVP · **C** = backlog.

### 4.1 Autenticação

| ID | Requisito | Prior. |
|---|---|---|
| RF-01 | Login com conta **Google** (OAuth). | M |
| RF-02 | Cadastro e login com **e-mail e senha** próprios do app, com confirmação de e-mail. | M |
| RF-03 | Recuperação de senha por e-mail. | M |
| RF-04 | Sessão persistente: após o primeiro login, o app abre direto, **inclusive offline**. | M |
| RF-05 | Logout (com aviso se houver dados ainda não sincronizados). | M |

### 4.2 Paper do dia

| ID | Requisito | Prior. |
|---|---|---|
| RF-10 | No primeiro acesso de cada data, o app exibe o assistente **"Criar paper do dia"**. | M |
| RF-11 | O assistente pré-carrega: (a) todas as atividades **pendentes do último paper cadastrado**, qualquer que seja a data dele (não há regra de dias úteis; podem existir dias sem paper) e (b) todas as atividades **planejadas com data ≤ hoje** que ainda não entraram em nenhum paper. | M |
| RF-11a | Os itens são importados **exatamente como estão** (texto, seção, sub-itens e ordem). Qualquer ajuste de texto é feito pelo usuário no paper de destino, depois da importação. | M |
| RF-12 | No assistente, o usuário pode desmarcar itens importados, excluir itens e **incluir novos** antes de confirmar. Item desmarcado **fica fora do paper**, continua pendente e **não pede nova data** (D4). | M |
| RF-12a | Itens desmarcados vão para a lista **"Fora do paper"**, acessível na tela principal, de onde podem ser trazidos de volta ao paper do dia a qualquer momento, concluídos ou excluídos. Eles **não** são reimportados automaticamente nos dias seguintes. | M |
| RF-13 | Itens planejados chegam **marcados visualmente** ("planejado para hoje") na primeira exibição. | S |
| RF-14 | Ao importar um sub-item pendente, o item pai vem junto (mesmo que o pai seja apenas um agrupador). | M |
| RF-15 | Mudança de data com o app aberto (passou da meia-noite): o app avisa e oferece criar o paper do novo dia. | S |
| RF-16 | Navegar entre os papers pela faixa de data (botões « e » e Alt+←/→), em modo somente leitura para os dias anteriores. Pula os dias sem paper e não passa de hoje. O botão Imprimir imprime o paper que está na tela. | M |

### 4.3 Atividades

| ID | Requisito | Prior. |
|---|---|---|
| RF-20 | **Criar** atividade em uma seção, a qualquer momento, com Enter para salvar e já iniciar a próxima. | M |
| RF-21 | **Criar sub-item** sob uma atividade (máx. 2 níveis; Tab para recuar, Shift+Tab para voltar). | M |
| RF-22 | **Concluir** atividade (checkbox). Fica riscada no paper de hoje e **não é importada** no próximo dia. Pode ser desfeita no mesmo dia. | M |
| RF-23 | Concluir um item pai **conclui todos os sub-itens**. Concluir todos os sub-itens **não** conclui o pai automaticamente. | M |
| RF-24 | **Excluir** atividade (com desfazer por alguns segundos). Excluir um pai exclui os sub-itens. | M |
| RF-25 | **Editar o texto** de uma atividade no paper atual (duplo clique ou F2). A alteração vale daí em diante; papers anteriores mantêm o texto original. | M |
| RF-26 | **Criar atividade com data futura**: ela não aparece no paper de hoje, só no paper da data escolhida. | M |
| RF-27 | Ver a lista de **atividades planejadas** (próximos dias), com opção de editar a data ou trazer para hoje. | S |
| RF-28 | **Reordenar** atividades dentro da seção (botões subir/descer ou arrastar). | S |
| RF-29 | Mover atividade para outra seção. | S |
| RF-30 | Arrastar entre seções, contador "em aberto há N dias", busca no histórico. | C |
| RF-31 | Campo de hora + lembrete com notificação do sistema; atividades recorrentes. | C |

### 4.4 Seções (categorias)

| ID | Requisito | Prior. |
|---|---|---|
| RF-40 | Seções padrão no primeiro uso: "Profissional" e "Pessoal". | M |
| RF-41 | Criar, renomear, reordenar e arquivar seções (arquivar exige seção vazia ou mover itens). | M |
| RF-42 | Escolher a cor do cabeçalho da seção (padrão: verde da palavra "mista" do logo, `#4AA05C`). | S |

### 4.5 Impressão A4

| ID | Requisito | Prior. |
|---|---|---|
| RF-50 | Botão **Imprimir** gera a folha A4 (retrato) do paper do dia, abrindo a pré-visualização/diálogo de impressão do sistema. | M |
| RF-51 | Layout fiel ao modelo: faixa de **data** no topo (fundo verde-escuro do logo saladaMista `#323A3D`, texto branco, negrito, centralizado, formato dd/mm/aaaa); cada seção em **caixa com borda preta grossa** e cabeçalho em faixa colorida (padrão `#4AA05C`, texto branco); marcador "●" no 1º nível e "○" no 2º nível. | M |
| RF-52 | **Espaço em branco** ao final de cada caixa para anotações à mão. | M |
| RF-53 | Por padrão a impressão **omite itens concluídos**; opção de incluí-los riscados. | S |
| RF-54 | Se o conteúdo não couber em 1 página, reduzir a fonte até um mínimo legível; acima disso, quebrar em 2 páginas sem cortar uma seção ao meio. | S |
| RF-56 | **Logo saladaMista com fundo branco** (`logo-salada-mista-branco.png`) no **rodapé do paper diário**, centralizado: no pé da folha impressa e no fim do paper na tela. | M |
| RF-55 | Exportar o paper em PDF. | C |

### 4.6 "Sobre" e marca

| ID | Requisito | Prior. |
|---|---|---|
| RF-60 | **Logo saladaMista com fundo branco** no **canto esquerdo do header** da aplicação (clicável, abre o "Sobre"). | M |
| RF-61 | Clicar no logo abre a janela **"Sobre"** com: nome do app, versão (ex.: 1.0.0), build e data, desenvolvido por saladaMista, contato/site, aviso de copyright e status da sincronização (última sincronização). | M |

### 4.7 Sincronização

| ID | Requisito | Prior. |
|---|---|---|
| RF-70 | Todas as operações são gravadas **primeiro na base local**; o app funciona integralmente offline. | M |
| RF-71 | Ao detectar conexão, envia alterações pendentes e baixa alterações remotas automaticamente (e periodicamente enquanto online). | M |
| RF-72 | Indicador de estado: "Sincronizado", "Sincronizando…", "Offline — N alterações pendentes". | M |
| RF-73 | Botão "Sincronizar agora". | S |
| RF-74 | Resolução de conflitos: **último a alterar vence**, por campo (`updated_at`); exclusões são propagadas via soft delete. | M |

---

## 5. Regras de negócio (resumo)

1. **RN-01** — Existe no máximo um paper por usuário por data.
2. **RN-02** — A "data de hoje" é a data local do computador; o dia vira à meia-noite.
3. **RN-03** — Importação = pendentes do **último paper cadastrado** (independente de quantos dias se passaram, sem regra de dias úteis) + planejadas com data ≤ hoje ainda não importadas. Os itens vêm sem alteração; edição só no destino.
4. **RN-04** — Concluída ou excluída nunca é importada.
5. **RN-05** — Atividade com data futura só aparece no paper da sua data (ou depois, se atrasada).
6. **RN-06** — Hierarquia de no máximo 2 níveis. O exemplo "Agenda > 10/11 14:30 > Leo, Kaio, Gustavo" é representado como sub-item "10/11 14:30 – Leo, Kaio, Gustavo".
7. **RN-07** — Concluir/excluir pai propaga para os filhos; o contrário não.
8. **RN-08** — Sub-item pendente arrasta o pai para o próximo paper.
9. **RN-09** — Item desmarcado no assistente fica pendente na lista "Fora do paper", sem data; só volta a um paper quando o usuário o traz manualmente.

---

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **Desktop nativo** (instalador), sem uso de navegador. **Prioridade: Windows 10/11**; stack multiplataforma para gerar também a versão macOS (D1). |
| RNF-09 | **Custo de infraestrutura zero** no MVP: operar dentro do plano gratuito do Supabase (D3). |
| RNF-02 | Abrir o app e exibir o paper em **< 2 s**; ações de criar/concluir com resposta imediata (< 100 ms). |
| RNF-03 | Base local criptografada ou protegida pelo perfil do usuário do sistema operacional; comunicação com a nuvem só via HTTPS. |
| RNF-04 | Senhas nunca armazenadas em texto puro (responsabilidade do provedor de autenticação). |
| RNF-05 | Interface em **português (Brasil)**; datas dd/mm/aaaa. |
| RNF-06 | Usável inteiramente pelo teclado (atalhos para novo item, concluir, editar, imprimir). |
| RNF-07 | Atualização automática do app (verificar nova versão ao iniciar). |
| RNF-08 | Backup: dados na nuvem são a cópia de segurança; exportar dados em JSON como alternativa. |

---

## 7. Telas (para o protótipo da Etapa 1)

1. **Login** — logo saladaMista, "Entrar com Google", e-mail/senha, "Criar conta", "Esqueci a senha".
2. **Assistente "Criar paper do dia"** — data de hoje; blocos "Pendentes de dd/mm" e "Planejadas para hoje", com checkbox por item; campo "Adicionar nova atividade" por seção; botão "Criar paper".
3. **Paper do dia (tela principal)** — barra superior com data, botões "Imprimir", "Planejadas", "Fora do paper", "Seções", indicador de sincronização; corpo com as seções em caixas, no mesmo visual da folha impressa; ações por item (concluir, editar, sub-item, data futura, excluir); logo saladaMista no canto esquerdo da barra superior.
4. **Planejadas** — lista agrupada por data futura.
5. **Gerenciar seções** — criar, renomear, cor, ordem, arquivar.
6. **Pré-visualização de impressão A4**.
7. **Janela "Sobre"**.

---

## 8. Arquitetura da versão final (Etapa 2) — stack confirmada (D10)

| Camada | Decisão | Observação |
|---|---|---|
| App desktop | **Electron + React + TypeScript + Tailwind CSS (D2)**, com Vite para build | Tudo em TypeScript (sem Rust); ecossistema maduro; gera Windows e macOS do mesmo código |
| Estrutura do projeto | **`electron-vite`** (processos main, preload e renderer com Vite e TypeScript) | Lógica de domínio (importação do paper, regras RN-xx, sincronização) num módulo TypeScript separado, sem dependência de Electron, reaproveitável na Etapa 3 |
| Estado da interface | **Zustand**, alimentado pelo processo principal via IPC | — |
| Base local | **SQLite** via `better-sqlite3` no processo principal do Electron, com **Drizzle ORM** e migrações por `drizzle-kit` | Acesso à base só pelo processo principal; a interface usa IPC seguro (`contextIsolation`). O mesmo esquema serve de referência para as tabelas do Supabase |
| Proteção dos dados (RNF-03) | Base SQLite em `app.getPath('userData')`, protegida pelo perfil do usuário do sistema operacional (sem SQLCipher) | Comunicação com a nuvem só via HTTPS |
| Backend / nuvem | **Supabase (D3)**, plano gratuito: PostgreSQL gerenciado, Auth com Google e e-mail/senha, Row Level Security por usuário | — |
| Login Google no desktop | **OAuth com PKCE** do Supabase: o navegador do sistema abre o login e devolve ao app por protocolo próprio (`todolistc://`) ou por servidor local temporário | E-mail/senha usa a API do Supabase Auth diretamente |
| Sessão offline (RF-04) | Token de sessão guardado criptografado com **`safeStorage`** do Electron (ligado à conta do Windows) | Permite abrir o app offline após o primeiro login |
| Sincronização | **Própria, sem biblioteca de terceiros**: fila local de alterações (*outbox*) enviada ao reconectar + *pull* incremental por `updated_at > última_sync`; UUIDs gerados no cliente; *soft delete* (`deleted_at`) | Conflito: vence a alteração mais recente **por campo** (RF-74), o que exige `updated_at` por campo ou um registro de alterações por campo (detalhar no desenho da sincronização). PowerSync/ElectricSQL descartados: adicionariam um serviço com custo e limites próprios (RNF-09) |
| Empacotamento e atualização | `electron-builder` + `electron-updater`, publicando em GitHub Releases | Gratuito; atende RNF-07 |
| Impressão | HTML/CSS com `@page A4` renderizado pela própria janela do app (layout validado no protótipo) | PDF (RF-55) via `webContents.printToPDF`, nativo do Electron |
| Testes e qualidade | **Vitest** (regras de negócio: RN-03, RN-07, conflitos de sync), **Playwright** em modo Electron (ponta a ponta), **ESLint + Prettier** | — |
| Mobile (Etapa 3) | Mesma interface React empacotada com **Capacitor** | Reaproveita o módulo de domínio e a sincronização |

As versões exatas das bibliotecas serão as estáveis no momento da criação do projeto, fixadas no `package.json`.

**Trade-offs aceitos com o Electron:**
- Instalador maior (~80–150 MB) e mais uso de memória do que alternativas nativas — irrelevante para um app de uso pessoal no PC.
- Não gera app mobile. Para a Etapa 3, a interface React pode ser reaproveitada com **Capacitor** (empacota a mesma UI web para Android/iOS), reaproveitando também a lógica de sincronização com o Supabase.
- **Assinatura de código:** sem certificado (pago), o Windows SmartScreen mostra um aviso na instalação. Com a restrição de custo, o MVP sai sem assinatura; avaliar certificado se o app for distribuído a terceiros.

### 8.1 Restrição de custo — plano gratuito do Supabase

Limites do plano gratuito (referência: maio/2026; reconfirmar antes da Etapa 2):

| Limite | Valor | Impacto para o TodoList_C |
|---|---|---|
| Banco PostgreSQL | 500 MB por projeto | Folgado: listas de texto ocupam poucos KB por dia |
| Usuários (Auth) | 50.000 ativos/mês | Folgado |
| Projetos | 2 por organização | Usar 1 para produção e 1 para testes |
| Armazenamento de arquivos | 1 GB | Não usado no MVP |
| **Pausa por inatividade** | Projeto pausado após **1 semana sem uso** | **Risco**: férias ou viagem longa pausam o backend |
| Backups automáticos | Não incluídos no gratuito | Base local + exportação JSON (RNF-08) cobrem |

Mitigações:
- O app é *local-first*: com o backend pausado, continua funcionando e acumula alterações; a sincronização retoma quando o projeto for reativado.
- Agendar um "ping" semanal gratuito (ex.: GitHub Actions) para manter o projeto ativo.
- O app avisa quando a sincronização falha por vários dias seguidos.
- Se o uso crescer, o plano Pro custa US$ 25/mês — fora do escopo atual.

---

## 9. Plano de entrega

### Etapa 1 — Validação de funcionalidades e layout (protótipo clicável)
- Página interativa única, com dados de exemplo dos papers de 03/11 e 04/11.
- Simula: login (fictício), assistente do dia (com botão "avançar um dia" para testar a importação), CRUD de atividades e sub-itens, data futura, seções customizáveis, impressão A4 real pelo navegador, janela "Sobre".
- Sem backend, sem sincronização real (dados em memória). Logo saladaMista e dados do "Sobre" com placeholder (D5).
- **Critério de saída:** o usuário percorre os 5 cenários da seção 2 e aprova o layout da tela e da folha impressa; ajustes registrados numa nova versão deste PRD.

### Etapa 2 — Desenvolvimento do app desktop (MVP)
- Todos os requisitos **M** (e os **S** conforme prazo).
- Autenticação real, base local, sincronização com a nuvem, instalador Windows.
- **Critério de saída:** uso diário real por 2 semanas sem perda de dados e sem montar paper à mão.

### Etapa 3 — App mobile (Android/iOS)
- Mesma conta e mesma base sincronizada; foco em consultar o paper, concluir e criar itens.

---

## 10. Métricas de sucesso

- Tempo para criar o paper do dia: **< 1 min**.
- Pendências perdidas: **0** (nenhum item pendente some sem ser concluído/excluído).
- Conflitos de sincronização com perda de dado: **0**.

---

## 11. Decisões e questões em aberto

### 11.1 Decisões tomadas

| # | Tema | Decisão |
|---|---|---|
| D1 | Sistema operacional | Prioridade no **Windows**; stack multiplataforma (macOS também) |
| D2 | Stack desktop | **Electron + React + TypeScript + Tailwind CSS** (ver seção 8) |
| D3 | Backend | **Supabase**, com restrição de custo → plano gratuito (ver 8.1) |
| D4 | Item desmarcado no assistente | Fica **fora do paper**, sem nova data, na lista "Fora do paper" (RF-12a, RN-09) |
| D5 | Logo saladaMista e dados do "Sobre" | Logo recebido: `logo-salada-mista.jpg` (fundo escuro; usado no login e no "Sobre"). Versão com fundo branco `logo-salada-mista-branco.png`, derivada do original, para o header e o papel impresso. Site e contato seguem como placeholder; definir antes da Etapa 2 |
| D6 | Mais de um PC por usuário | **Sim**, suportado pela sincronização |
| D8 | Edição de papers passados | **Somente leitura** (consulta pela navegação « » na faixa de data, RF-16) |
| D10 | Stack final (Etapa 2) | **Confirmada** (ver seção 8): Electron + electron-vite + React + TypeScript + Tailwind + Zustand; SQLite (`better-sqlite3`) + Drizzle; Supabase gratuito com OAuth PKCE e `safeStorage`; sincronização própria (outbox + pull incremental, LWW por campo); electron-builder/updater; Vitest, Playwright, ESLint + Prettier |
| D9 | Nome da aplicação | **TodoList_C** (nome exibido na interface, na janela "Sobre", no instalador e no executável) |

### 11.2 Questões em aberto

Nenhuma no momento. Novas questões surgirão na validação do protótipo (Etapa 1).

---

## 12. Histórico de revisões

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| 0.1 | 04/11/2026 | Sergio Resende / Claude | Primeira versão após brainstorm |
| 0.2 | 04/11/2026 | Sergio Resende / Claude | Importação sem alteração de texto (edição só no destino, histórico preservado); importação sempre do último paper cadastrado, sem regra de dias úteis; removida Q7 e métrica de dias úteis |
| 0.3 | 04/11/2026 | Sergio Resende / Claude | Decisões D1, D3, D5, D6, D8; restrição de custo (RNF-09) e análise do plano gratuito do Supabase (8.1) |
| 0.4 | 04/11/2026 | Sergio Resende / Claude | D2: stack Electron + React + TypeScript + Tailwind; D4: item desmarcado vai para "Fora do paper" (RF-12a, RN-09) |
| 0.5 | 04/11/2026 | Sergio Resende / Claude | D9: aplicação passa a se chamar **TodoList_C** |
| 0.6 | 04/11/2026 | Sergio Resende / Claude | Logo saladaMista no header da aplicação (RF-60) e no topo da folha impressa (RF-56) |
| 0.7 | 04/11/2026 | Sergio Resende / Claude | D5: logo oficial `logo-salada-mista.jpg` aplicado no protótipo (header, login, "Sobre" e folha impressa) |
| 0.8 | 05/11/2026 | Sergio Resende / Claude | Cores tiradas do logo: faixa de data `#323A3D` e cabeçalho das seções `#4AA05C` (RF-42, RF-51); RF-16 promovido a M, com navegação « » entre os papers |
| 0.9 | 05/11/2026 | Sergio Resende / Claude | Logo com fundo branco (`logo-salada-mista-branco.png`) no header (RF-60) e no rodapé do paper diário (RF-56), no lugar do logo escuro no topo da folha |
| 0.10 | 05/11/2026 | Sergio Resende / Claude | D10: stack final confirmada; seção 8 sem itens em aberto (Drizzle, sincronização própria, OAuth PKCE, `safeStorage`, `printToPDF`, electron-vite, Zustand, Vitest/Playwright/ESLint) |
| 0.11 | 05/11/2026 | Sergio Resende / Claude | Início da Etapa 2: Marco 1 (app Electron local com todo o fluxo do paper, base SQLite, testes de domínio e de ponta a ponta). Próximos marcos: login (Supabase Auth) e sincronização |
