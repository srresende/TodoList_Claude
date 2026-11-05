# Brainstorm — TodoList (saladaMista)

Data: 04/11/2026 · Participantes: Sergio Resende + Claude

## 1. O que os dois exemplos revelam (comparando 03/11 → 04/11)

| Observação | Implicação para o produto |
|---|---|
| "Zouain.opx network", "Emerson.app os", "BRB Mengo", "XP", "Inter", "Pagamento Light" sumiram em 04/11 | Foram concluídos (ou excluídos) e **não** são importados no dia seguinte |
| "Assuntos Thadeu", "Revisão SFDC", "Governança SFDC" apareceram | Itens novos criados no dia, ou planejados com data futura |
| "Thadeu.viagem bh" → "Assuntos Thadeu"; "Ronaldo.contrato" → "Cobrar Ronaldo - contrato" | É preciso **editar o texto** de um item já existente |
| A ordem da Agenda mudou (Andre subiu para o topo) | É preciso **reordenar** itens |
| "Agenda" é um item-grupo com filhos (pessoas) | Hierarquia: item pai + sub-itens |
| "10/11 14:30 > Leo, Kaio, Gustavo" (3º nível) | Com o limite de 2 níveis, vira um sub-item "10/11 14:30 – Leo, Kaio, Gustavo" |
| "Habilitacao detran (quinta 13:00)" | Hoje a hora é escrita no texto; campo próprio de hora/lembrete fica para o backlog |
| Seção "Atividades DXC" em vez de "Profissional" | Categorias precisam ser **customizáveis** |
| Espaço em branco no fim de cada caixa | A folha impressa é usada para anotações à mão — manter área livre |

## 2. Decisões tomadas no brainstorm

1. **Categorias customizáveis** — o usuário cria, renomeia, ordena e arquiva seções. Padrão inicial: "Profissional" e "Pessoal".
2. **Hierarquia de 2 níveis** — item e sub-item. Não há sub-item de sub-item.
3. **Etapa 1 = protótipo clicável** — página interativa com dados locais simulando o fluxo real, para validar funcionalidades e layout antes do desenvolvimento.
4. **Importação sem alteração** — os itens pendentes vêm exatamente como estavam; se for o caso, o usuário altera o texto no paper de destino.
5. **Sem regra de dias úteis** — a importação é sempre do último paper cadastrado; pode haver dias sem paper gerado.
6. **Recursos extras (lembrete, recorrência, drag-and-drop entre seções, histórico/busca)** — sem preferência → ficam no backlog, fora do MVP. Edição de texto e reordenação simples entram no MVP porque aparecem nos exemplos.

## 3. Ideias levantadas (backlog / para avaliar depois)

- Campo opcional de data/hora com notificação do Windows ("quinta 13:00").
- Atividades recorrentes ("Pagamento Light" todo mês).
- Contador "em aberto há N dias" para itens que vêm sendo arrastados dia após dia.
- Histórico: navegar pelos papers de dias anteriores e buscar atividades concluídas.
- Arrastar itens entre seções.
- Exportar o paper do dia em PDF ou enviar por e-mail.
- Tema escuro.
- Atalhos de teclado para criar/concluir rapidamente (uso intenso no PC).
- Etapa 3: app mobile (Android/iOS) usando a mesma conta e a mesma sincronização.

## 4. Questões em aberto

Ver a seção "Questões em aberto" do PRD.md.
