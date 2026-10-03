# CondoVia P3.9 — Correções finais e revalidação dirigida

**Resultado:** P3 validado localmente; 119 critérios implementados e 1 parcial não bloqueador (#106). Nenhuma etapa P4 foi iniciada.

## Escopo concluído

- **#102 — seleção/cadastro integrado:** fluxo único de busca entre pessoas vinculadas ao condomínio, seleção existente ou cadastro e retorno ao vínculo original. O retorno preserva o condomínio/unidade e o tipo de relação; pessoa recém-criada fica selecionada.
- **#110 — interface responsiva:** 8 superfícies avaliadas em 3 breakpoints (24 combinações). O tablet usa cards nas listas de pessoas, moradores, proprietários e unidades. Formulários permanecem em duas colunas no tablet e desktop e passam a uma coluna no mobile. Botões pequenos e ações de lista respeitam o alvo mínimo de 44 px; pesquisa no cabeçalho também tem 44 px. O drawer mobile abre e fecha.
- **#118 — vínculo vencido:** na fixture local “João Controle Expirado P38”, a ocupação terminou em 01/10/2026. Em 03/10/2026, conta e membership seguem ativas, não há vínculo elegível, o dossiê administrativo apresenta o alerta e a conta de controle vê “Minhas Unidades” vazia. O histórico permanece. O cenário futuro original da unidade A/102 foi conferido e continua intacto: João atual até 01/11/2026 e Maria a partir de 01/11/2026.
- **#106 — parcial não bloqueador:** falhas seguras e mensagens neutras continuam sem expor erro SQL bruto; mapeamento completo de constraints para mensagens específicas fica registrado como débito de UX.

## Fluxos verificados para #102

| Fluxo | Verificação |
|---|---|
| A — pessoa existente | Busca tenant-scoped, seleção e criação de vínculo de propriedade concluídas. |
| B — nova pessoa / proprietário | Cadastro iniciado no vínculo, retorno ao condomínio com a pessoa selecionada e vínculo concluído. |
| C — nova pessoa / morador | Cadastro retornou à unidade original com pessoa e unidade pré-selecionadas; ocupação concluída. |
| D — nova pessoa / responsabilidade financeira | Retorno à unidade e pessoa preservados; sucessão futura concluída sem conceder unidade à pessoa financeira. |
| E — cancelar cadastro | “Cancelar e voltar ao vínculo” retorna ao contexto original sem criar pessoa ou vínculo. |
| F — isolamento entre condomínios | Busca por pessoa exclusiva do Condo B no Condo A não retorna resultados. Teste unitário também rejeita caminhos de retorno externos ou fora da allowlist. |

O teste `src/lib/condominium/person-return.test.ts` cobre os caminhos permitidos de retorno para moradores, proprietários e unidade específica, além da rejeição de rota externa/mismatched e preservação apenas dos parâmetros permitidos.

## Matriz visual/responsiva (#110)

Viewports: desktop **1440×900** (>=1280), tablet **768×900** (768–1279) e mobile **390×844** (<=767), conforme o Design System aprovado. Cada superfície foi aberta nos três viewports. Todas as 24 combinações passaram sem overflow horizontal; a menor altura observada dos botões de ação ficou em 44 px.

| Superfície | Desktop | Tablet | Mobile |
|---|---|---|---|
| Pessoas | tabela | cards | cards |
| Nova pessoa | formulário em 2 colunas | formulário em 2 colunas | formulário em 1 coluna |
| Dossiê da pessoa (inclui acesso/convite) | leitura e formulários em 2 colunas | leitura e formulários em 2 colunas | leitura e formulários em 1 coluna |
| Moradores | tabela | cards | cards |
| Proprietários | tabela | cards | cards |
| Unidades | tabela | cards | cards |
| Dossiê da unidade | painéis e formulários em 2 colunas | painéis e formulários em 2 colunas | painéis e formulários em 1 coluna |
| Formulários de vínculo | 2 colunas | 2 colunas | 1 coluna |

No mobile, o drawer abriu com overlay e fechou pelo controle “Fechar menu”. O diálogo de confirmação de morador principal foi acionado em 390 px e cancelado; a relação não foi gravada. A busca no cabeçalho, filtros, cartões e botões continuaram acessíveis sem rolagem horizontal.

## Validação de #118 e integridade temporal

- A fixture expirada é sintética e local; o relógio da aplicação não foi manipulado e nenhuma regra de produção foi falsificada.
- A ocupação histórica encerrou em 01/10/2026 e continua visível no dossiê. Conta e membership não foram encerradas automaticamente.
- A conta de controle autenticou e abriu “Minhas Unidades”, que mostrou estado vazio; o dossiê de administração indicou conta ativa, membership ativa, ausência de relação elegível e alerta administrativo.
- A fixture original de sucessão em A/102 foi apenas consultada e não alterada: ocupação de João termina em 01/11/2026; Maria inicia nessa data. A sucessão financeira correspondente também permanece.
- Evidências locais da checagem da fixture em `docs/p3.8/evidence/p39-118-admin-expired.jpg` e `docs/p3.8/evidence/p39-118-resident-no-units.jpg`.

## Testes finais

| Comando | Resultado |
|---|---|
| `pnpm db:test` | PASS — 214 assertions nos arquivos SQL/RLS (`p2_condominium.sql`, `p3_people_relationships.sql`, `rls_isolation.sql`). |
| `pnpm test` | PASS — 16 testes em 4 arquivos, incluindo 4 testes de caminho seguro de retorno. |
| `pnpm lint` | PASS. |
| `pnpm typecheck` | PASS. |
| `pnpm build` | PASS — compilação e 23 páginas estáticas concluídas. |
| `git diff --check` | PASS. |

`db:test` precisou iniciar o stack Supabase local pelo Docker após a primeira tentativa constatar que a porta local estava sem serviço. A execução final conectou ao banco local; nenhuma migration remota, configuração Auth, Vercel ou GitHub foi alterada nesta etapa.

## Estado e limites

- Status da matriz P3 após esta etapa: **119 IMPLEMENTED, 1 PARTIAL (#106), 0 bloqueadores**.
- Migrations 013–015 permanecem locais e não aplicadas remotamente. Nenhum commit ou push foi feito.
- A etapa limita-se a P3.9. P4 não começou.
- O débito de UX #106 permanece; não bloqueia o aceite local sob a classificação aprovada na gate anterior.
