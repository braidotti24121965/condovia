# CondoVia — Padronização e ajuste inteligente da largura dos campos

## OBJETIVO

Revisar e corrigir o dimensionamento dos campos de formulário do **CondoVia**, eliminando campos desnecessariamente largos e tornando a interface mais compacta, proporcional, organizada e visualmente consistente.

O ajuste deve seguir integralmente o **design system já existente no CondoVia**.

Não criar um novo padrão visual apenas para resolver o problema de largura dos campos.

A solução deve priorizar componentes reutilizáveis e regras globais sempre que tecnicamente adequado, evitando correções isoladas e repetitivas em cada tela.

---

## 1. CAMPOS DO TIPO BOX / SELECT / DROPDOWN / COMBOBOX

Para campos que possuem uma lista fechada de opções:

- Select
- Dropdown
- Combobox
- Campos equivalentes com opções predefinidas

A largura visual do campo deve ser definida considerando a **maior opção de texto existente naquela lista**.

Adicionar somente o espaço necessário para:

- texto da maior opção;
- padding horizontal;
- seta ou ícone do componente;
- bordas;
- pequena margem de segurança.

### Exemplo

Se um campo possuir as opções:

`Ativo`  
`Inativo`  
`Aguardando aprovação`

a largura do campo deve ser suficiente para acomodar confortavelmente:

`Aguardando aprovação`

O campo **não deve ocupar toda a largura disponível da tela** apenas porque está dentro de uma coluna ou container maior.

Evitar o uso indiscriminado de:

`width: 100%`

ou:

`w-full`

quando o conteúdo não justificar essa largura.

Nenhuma opção poderá ficar cortada, sobreposta ou ilegível.

---

## 2. CAMPOS COM CONTEÚDO PREVISÍVEL

Campos cujo formato ou tamanho máximo é conhecido devem possuir largura proporcional ao conteúdo esperado.

Aplicar especialmente para:

- Telefone
- Celular
- CPF
- CEP
- Data de nascimento
- Outras datas
- Número do imóvel
- Número da unidade
- Bloco
- Torre
- Andar
- UF
- Código
- Siglas
- Status
- Valores monetários
- Percentuais
- Campos numéricos curtos

### Exemplos de referência

Telefone:

`(11) 99999-9999`

CPF:

`000.000.000-00`

CEP:

`13320-000`

Data de nascimento:

`24/12/1965`

UF:

`SP`

Unidade:

`102`

Andar:

`12`

Esses campos devem possuir espaço suficiente para exibir confortavelmente seu conteúdo completo, considerando também padding e elementos visuais do componente.

Porém, **não devem ocupar toda a largura do formulário** quando isso não for necessário.

---

## 3. CAMPOS QUE PODEM UTILIZAR MAIOR LARGURA

Campos cujo conteúdo possui tamanho naturalmente variável podem utilizar mais espaço.

Exemplos:

- Nome completo
- E-mail
- Endereço
- Complemento
- Observações
- Descrições
- Textos livres
- Informações adicionais

Mesmo nesses casos, evitar largura excessiva quando ela não trouxer benefício para a utilização da tela.

A largura deve ser determinada pela natureza da informação e pelo contexto do formulário.

---

## 4. DADOS DAS UNIDADES DOS MORADORES

Revisar especificamente os campos relacionados às **unidades vinculadas aos moradores**, pois atualmente vários deles estão demasiadamente grandes.

Aplicar largura proporcional ao conteúdo real de cada informação.

Revisar campos como:

- Condomínio
- Bloco
- Torre
- Unidade
- Apartamento
- Casa
- Número
- Andar
- Tipo de unidade
- Situação da unidade
- Status
- Outros códigos ou identificadores relacionados à unidade

Campos curtos como:

`Bloco`

`Torre`

`Unidade`

`Andar`

`Número`

`Status`

não devem ocupar individualmente uma coluna inteira quando não houver necessidade.

Quando houver espaço horizontal suficiente, organizar campos relacionados na mesma linha.

### Exemplo conceitual

Em vez de:

`Bloco     [                         A                         ]`

`Unidade   [                        102                        ]`

`Andar     [                         1                         ]`

utilizar uma composição proporcional, semelhante a:

`Bloco [ A ]    Unidade [ 102 ]    Andar [ 1 ]    Status [ Ativo ]`

O exemplo é apenas conceitual. A implementação final deve respeitar os componentes, espaçamentos e padrões visuais já existentes no CondoVia.

---

## 5. APROVEITAMENTO DO ESPAÇO HORIZONTAL

Após reduzir corretamente a largura dos campos, reorganizar os formulários para aproveitar melhor o espaço disponível.

Campos relacionados e de pequena largura podem permanecer lado a lado.

Por exemplo:

`CEP | Número | Complemento`

ou:

`Telefone | Data de nascimento`

ou:

`Bloco | Unidade | Andar | Status`

Não deixar grandes áreas vazias simplesmente porque um campo anteriormente ocupava 100% da largura.

Ao mesmo tempo, não compactar excessivamente a interface.

Manter espaçamento adequado entre:

- labels;
- inputs;
- grupos de campos;
- seções;
- botões.

---

## 6. RESPONSIVIDADE

Não utilizar larguras fixas que prejudiquem telas menores.

A solução deve funcionar corretamente em:

- desktop;
- notebook;
- tablet;
- smartphone.

Implementar comportamento responsivo utilizando, conforme a arquitetura existente:

- `min-width`;
- `max-width`;
- largura baseada no conteúdo;
- flexbox;
- CSS Grid;
- breakpoints existentes no projeto;
- wrapping automático dos campos.

Em telas maiores, priorizar largura proporcional ao conteúdo.

Em telas menores, permitir que os campos sejam reorganizados ou passem a ocupar maior largura quando isso melhorar a usabilidade.

Um campo compacto em desktop pode ocupar 100% da largura em mobile quando necessário.

---

## 7. PADRONIZAÇÃO DOS CAMPOS

Não resolver o problema criando larguras arbitrárias diferentes em cada tela.

Primeiro verificar se o CondoVia possui componentes reutilizáveis para:

- Input
- Select
- Combobox
- Date
- Phone
- CPF
- CEP
- Number
- FormField
- componentes equivalentes.

Sempre que possível, implementar o comportamento no componente reutilizável ou no design system existente.

Caso seja necessário trabalhar com categorias de largura, utilizar uma abordagem conceitualmente semelhante a:

`field-xs`

Para:
- UF
- andar
- códigos muito curtos

`field-sm`

Para:
- CEP
- número
- unidade
- bloco
- torre

`field-md`

Para:
- telefone
- CPF
- datas

`field-lg`

Para:
- nome
- e-mail
- endereço

`field-auto`

Para:
- selects dimensionados de acordo com a maior opção disponível.

Esses nomes são apenas exemplos.

**Não criar obrigatoriamente essas classes.**

Primeiro verificar a arquitetura atual do CondoVia e utilizar a solução mais coerente com o design system existente.

---

## 8. PRESERVAR O DESIGN SYSTEM DO CONDOVIA

Esta alteração **não deve criar um novo padrão visual**.

Preservar:

- tipografia;
- cores;
- bordas;
- border-radius;
- sombras;
- altura dos campos;
- labels;
- ícones;
- espaçamentos;
- estados de hover;
- estados de focus;
- estados de erro;
- mensagens de validação;
- comportamento dos componentes;
- padrão visual geral do CondoVia.

O objetivo é corrigir **dimensionamento e distribuição espacial**, e não redesenhar os formulários.

---

## 9. NÃO ALTERAR FUNCIONALIDADES

Não alterar:

- regras de negócio;
- banco de dados;
- migrations;
- APIs;
- contratos de API;
- validações;
- máscaras;
- permissões;
- autenticação;
- autorização;
- nomes dos campos;
- estrutura dos dados;
- comportamento funcional existente.

A alteração deve ficar restrita ao necessário para:

**layout + dimensionamento + organização + responsividade dos campos.**

Se durante a análise for identificada a necessidade de alteração funcional ou estrutural para implementar o ajuste, **não executar automaticamente**.

Informar primeiro o problema encontrado e o impacto.

---

## 10. ANALISAR ANTES DE ALTERAR

Antes de modificar código:

1. Identificar os componentes de formulário reutilizados pelo CondoVia.
2. Identificar onde as larguras atuais estão sendo definidas.
3. Localizar usos de `width: 100%`, `w-full`, grids, flexbox ou outras regras responsáveis pelos campos excessivamente largos.
4. Identificar quais ajustes podem ser feitos nos componentes-base.
5. Identificar quais telas realmente precisam de ajustes específicos.
6. Verificar o comportamento responsivo atual.
7. Verificar se existem componentes duplicados fazendo a mesma função.
8. Não realizar refatorações fora do escopo desta solicitação.

Após a análise, apresentar um **plano curto de implementação antes de alterar o código**.

---

## 11. ESCOPO INICIAL DE REVISÃO

Priorizar inicialmente as telas e componentes relacionados a:

- Pessoas
- Moradores
- Unidades
- Dados pessoais
- Dados de contato
- Endereços
- Vínculos entre moradores e unidades

Depois verificar outros formulários do CondoVia que utilizem os mesmos componentes.

Se a correção no componente compartilhado resolver automaticamente outras telas, aproveitar essa reutilização.

Evitar alterar manualmente dezenas de páginas quando uma correção no componente-base resolver o problema de forma consistente.

---

## 12. CRITÉRIOS DE ACEITE

Após a implementação:

- Nenhum campo curto deve permanecer desnecessariamente largo.
- Telefone deve possuir largura proporcional ao formato esperado.
- CPF deve possuir largura proporcional ao formato esperado.
- CEP deve possuir largura proporcional ao formato esperado.
- Datas devem possuir largura proporcional ao formato esperado.
- Campos numéricos curtos devem ser compactos.
- Campos de unidade, bloco, torre e andar devem ser compactos.
- Selects devem acomodar integralmente sua maior opção.
- Não deve haver texto cortado.
- Não deve haver sobreposição de campos.
- Labels devem continuar legíveis.
- Mensagens de validação devem continuar funcionando.
- Campos relacionados devem aproveitar melhor o espaço horizontal.
- Não devem existir grandes espaços vazios provocados por campos artificialmente largos.
- O layout deve permanecer responsivo.
- Mobile deve continuar funcional.
- O design system atual do CondoVia deve ser preservado.
- Nenhuma regra de negócio deve ser alterada.
- Nenhuma funcionalidade existente deve ser quebrada.

---

## 13. TESTES

Após implementar:

1. Executar testes direcionados primeiro.
2. Validar visualmente as telas alteradas.
3. Testar diferentes tamanhos de viewport.
4. Testar selects utilizando a maior opção disponível.
5. Testar telefone, CPF, CEP e datas.
6. Testar os dados das unidades dos moradores.
7. Verificar mensagens de erro e validação.
8. Confirmar que campos não ficam cortados em resoluções menores.
9. Confirmar que alterações em componentes compartilhados não causaram regressões em outras telas.

Não executar refatorações adicionais fora do escopo apenas porque foram identificadas durante a análise.

---

## 14. ENTREGA

Ao finalizar, apresentar um resumo contendo:

- componentes modificados;
- telas afetadas;
- regra de dimensionamento adotada;
- quais correções foram feitas globalmente;
- quais correções precisaram ser específicas;
- testes executados;
- resultado dos testes;
- eventuais limitações ou pendências.

O resultado esperado é uma interface do **CondoVia mais compacta, proporcional e organizada**, eliminando campos excessivamente grandes sem prejudicar legibilidade, usabilidade, responsividade ou o design system existente.

Essa versão também deixa explícito para o agente **analisar primeiro os componentes compartilhados**, em vez de sair alterando campo por campo. Isso é importante no CondoVia para evitar que a mesma correção tenha que ser repetida em Pessoas, Moradores e Unidades.

## Regras permanentes de implementação — 09/10/2026

As regras são obrigatórias para telas novas e alteradas e estão registradas também em `AGENTS.md`.

| Elemento | Implementação obrigatória |
|---|---|
| Botões | `Button`, texto em uma linha, largura intrínseca e espaço reservado no grid; ações mudam de linha quando necessário. |
| Combos | `ContentSelect`, maior opção medida com a fonte real, incluindo placeholder, padding e seta; máximo limitado ao espaço disponível. |
| Datas | `DateInput`, máscara dd/mm/aaaa, data real válida, calendário e submissão ISO sem fuso. |
| CPF/CNPJ | `FormattedInput`, pontuação durante digitação; CNPJ mantém caracteres alfanuméricos. |
| Telefone | `FormattedInput`, DDD e máscara de fixo/celular, limite correspondente ao formato. |
| E-mail | `FormattedInput`, tipo email, exemplo nome@dominio.com.br, validação e normalização ao perder foco. |
| Navegação | Destaque persistente em azul institucional e `aria-current="page"`; rotas de detalhes mantêm a seção ativa. |

Os controles compartilhados ficam em `src/components/ui/form-controls.tsx`. O CSS dos botões protege a linha do texto; o grid reserva a linha da ação. Nunca reduzir o botão a uma coluna de formulário para fazê-lo caber. A navegação da manutenção usa fundo azul suave e seleção em azul institucional com acento da marca.

Verificação desta correção: as nove telas do menu foram renderizadas com os componentes reais e dados sintéticos em 1440, 768 e 390 pixels (27 combinações). A checagem de geometria confirmou texto dos botões em uma linha, ausência de controles fora da tela e uma única seção ativa. As capturas de desktop foram inspecionadas; Documentos também foi inspecionada no celular. Digitação de telefone/CNPJ e conversão/validação de datas foram verificadas no navegador. Isso comprova o layout e os controles na prévia isolada; não substitui os testes funcionais autenticados de produção.
