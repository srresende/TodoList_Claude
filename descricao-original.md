# Descrição original do aplicativo — TodoList

> Transcrição do documento "Descrição do aplicativo - TodoList.docx" (recebido em 04/11/2026).

Quero construir um aplicativo que rode no PC e que gerencie a lista de atividades pessoais e profissionais do dia a dia. Deve ser um aplicativo que rode no PC e não dependa de acesso pelo browser para isso. Deve ter uma base local e remota, para que possa funcionar offline e possa sincronizar com a web quando se conectar. Deve necessitar autenticação que pode ser via Email/senha do Google ou criação de um email e senha para a aplicação.

Diariamente pode haver atividades pessoais ou profissionais cadastradas, então você precisa poder criar, excluir ou dar como concluída uma atividade. Você deve poder criar também uma atividade com data futura e que só deve aparecer na relação do dia (futuro). Todo dia haverá a possibilidade de imprimir uma folha, em formato A4, que apresente as atividades daquele dia como no exemplo abaixo.

No primeiro acesso do dia, será necessário criar o paper/lista do dia, que deve importar os itens que não foram concluídos do dia anterior, incluídas as atividades que foram planejadas e ter a opção de incluir novas. Em qualquer momento deve ser possível criar, excluir ou dar como concluída uma atividade do paper/lista.

Quero construir no mínimo em 2 etapas: a primeira quero validar apenas as funcionalidades e layout e numa segunda fazer o desenvolvimento da aplicação.

Em algum ponto da aplicação precisa ter o logo horizontal da saladaMista que abra uma janela "Sobre", com os dados e versão da aplicação.

Numa segunda fase, pode ser desenvolvida outra versão que rode em smartphone (Android ou iOS).

---

## Exemplo 1 — Paper de 03/11/2026

**Atividades DXC**
- Thadeu.viagem bh
- Ibm.oportunidades
- Ronaldo.contrato
- Duva.software testes
- Zouain.opx network
- Emerson.app os
- Agenda
  - Amanda
  - Fabricio
  - Tati
  - Kaio
  - Darbely
  - Leo
  - Jonas
  - Andre

**Atividades Pessoais**
- Habilitacao detran
- Contato Safra => Conta Internacional
- Caixa econômica => Baixa e fechamento da conta
- Banco do Brasil => Transferência e fechamento da conta
- BRB Mengo => Fechamento da conta
- XP => Fechamento da conta
- Inter => Fechamento da conta
- IBMR
- Pagamento Light

## Exemplo 2 — Paper de 04/11/2026 (dia seguinte)

**Atividades DXC**
- Assuntos Thadeu
- Revisão SFDC
- Ibm oportunidades
- Cobrar Ronaldo - contrato
- Governança SFDC
- Duva software testes
- Agenda
  - Andre
  - Amanda
  - 10/11 14:30
    - Leo
    - Kaio
    - Gustavo
  - Jonas
  - Darbely
  - Fabricio
  - Tati

**Atividades Pessoais**
- Habilitacao detran (quinta 13:00)
- Contato Safra => Conta Internacional
- Caixa econômica => Baixa e fechamento da conta
- Banco do Brasil => Transferência e fechamento da conta
- IBMR

## Layout visual dos exemplos

- Faixa de data no topo, fundo laranja escuro (~#C55A11), texto branco em negrito, centralizado.
- Cada seção é uma caixa com borda preta grossa; cabeçalho da seção em faixa amarela/âmbar (~#FFC000), texto preto em negrito.
- Itens com marcador "●" no 1º nível, "○" no 2º nível (e "■" no 3º nível no exemplo 2).
- Espaço em branco ao final de cada caixa (para anotações à mão).
