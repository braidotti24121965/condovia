# CondoVia P3.8 — Gate final de validação local

Data: 2026-10-03
Escopo: validação local do P3; sem promoção de migrations ou publicação.

## Resultado executivo

O código P3 foi validado localmente. Os testes SQL/RLS passaram (**214/214 assertions**), os testes de aplicação passaram (**12/12**), e lint, typecheck, build e `git diff --check` passaram. A matriz oficial tem **116 critérios IMPLEMENTED e 4 PARTIAL; nenhum NOT IMPLEMENTED**. O gate funcional demonstrado ficou parcial por quatro critérios listados abaixo. Não considero o aceite integral concluído enquanto esses itens permanecerem parciais.

As migrations locais P3 são 013, 014 e 015. As migrations 001–012 não foram alteradas. A única correção adicional neste gate foi atualizar uma assertion antiga em `supabase/tests/rls_isolation.sql`: a migration 015 dá SELECT restrito para auditoria sob RLS, e o teste agora verifica que `actor_auth_user_id` não pode ser lido por usuários autenticados comuns. Não houve mudança de policy nem ampliação dos grants.

## Isolamento e Auth local

- O app de teste foi executado em `http://127.0.0.1:3000`; o Supabase de teste usou exclusivamente `http://127.0.0.1:15421`. A cópia temporária do app excluiu `.env*`; a compilação final também foi feita numa cópia sem `.env*`.
- Na configuração efetiva do container Supabase local, o provider Email estava habilitado e o signup público desabilitado (`GOTRUE_EXTERNAL_EMAIL_ENABLED=true`, `GOTRUE_DISABLE_SIGNUP=true`). Login com usuário provisionado passou. Signup público retornou `signup_disabled`, e a consulta administrativa local confirmou que nenhum usuário novo foi criado.
- Para viabilizar o teste, uma configuração temporária foi aplicada somente ao Supabase local e restaurada no arquivo versionado ao terminar. `supabase/config.toml` permaneceu byte a byte igual ao original. Ao reiniciar o container com a configuração versionada original, o provider local volta ao valor nela definido; para repetir o Golden Path será necessário reaplicar a configuração temporária local documentada nos registros desta validação.
- Nenhuma chamada deliberada ao Supabase remoto foi feita durante esta etapa. Não houve migration remota, commit, push, alteração Vercel, deploy ou mudança de produção.

## Golden Paths e adversarial

| Fluxo | Resultado | Evidência e limite |
|---|---|---|
| A — Fernando | PASS | Pessoa, CPF válido, contatos, ownership A/101 100%, occupancy owner primary, responsabilidade financeira, convite/ativação, login e unidade própria foram demonstrados pela aplicação. Screenshot: [golden-a-resident.jpg](evidence/golden-a-resident.jpg). O login final usou senha sintética de fixture local já ativada. |
| B — Maria e João | PASS | Maria em A/102; João como tenant primary e responsável financeiro; convite, ativação e login. João viu A/102 e seus próprios vínculos; URLs do dossiê de Maria e catálogo administrativo não revelaram dados privados. Screenshots: [golden-b-resident.jpg](evidence/golden-b-resident.jpg), [resident-catalog-denied.jpg](evidence/resident-catalog-denied.jpg). |
| C — sucessão | PARTIAL | Pela interface, a occupancy de João foi encerrada com efetividade futura em 01/11/2026, preservada como histórico, e Maria foi programada como próxima responsável financeira; a membership de João permaneceu ativa. O aviso de membership sem vínculo elegível foi confirmado num controle separado já expirado: [golden-c-financial-succession.jpg](evidence/golden-c-financial-succession.jpg), [expired-membership-warning.jpg](evidence/expired-membership-warning.jpg). Como a data efetiva ainda é futura nesta validação, não foi possível provar na interface que o próprio João perde a unidade após 01/11 sem avançar artificialmente o relógio ou alterar a data do cenário. |
| Adversarial | PASS com ressalva de cobertura | UUID conhecido da pessoa exclusiva do Condo B respondeu 404 quando aberta no contexto A; RLS SQL também testou isolamento cross-tenant. Resident não abriu o catálogo e não viu dados privados de Maria. Troca A→B não reteve visualmente os dados antigos. Usuário de controle com somente responsabilidade financeira autenticou-se, mas “Minhas Unidades” mostrou “Nenhuma unidade vinculada”: [context-b-no-old-data.jpg](evidence/context-b-no-old-data.jpg), [finance-only-no-unit.jpg](evidence/finance-only-no-unit.jpg). |

O contexto A usado no teste do UUID é uma conta administrativa com acesso aos dois condomínios para testar a troca de contexto; por isso, a prova de bloqueio A→B vem também dos testes SQL/RLS, não desse perfil administrativo isoladamente.

## Testes e inspeções finais

| Verificação | Resultado |
|---|---|
| `pnpm db:test` | PASS — 3 arquivos, 214 assertions: isolamento 62, P2 condomínio 66, P3 relacionamentos/auditoria 86. |
| `pnpm test` | PASS — 3 arquivos, 12 testes (contexto 5, catálogo 4, formatação 3). |
| `pnpm lint` | PASS. |
| `pnpm typecheck` | PASS. |
| `pnpm build` | PASS — build de produção em cópia temporária sem `.env*`. |
| `git diff --check` | PASS. |
| Bundle cliente | Inspecionados 44 arquivos JS; nenhum mencionou service role. A cópia de build não continha `.env.local`. Isso é uma busca textual do bundle, não uma auditoria de segurança completa. |
| Migrations | 001–012 sem diff; 013–015 locais e não promovidas. |

## Matriz oficial P3.6 — 120 critérios

`IMPLEMENTED` significa que há implementação e/ou evidência local associada ao critério. Para cada item parcial, a razão e o bloqueador estão explícitos.

| # | Status | Evidência | Motivo / bloqueador se parcial |
|---:|---|---|---|
| 1 | IMPLEMENTED | Migrations locais 013–015. | — |
| 2 | IMPLEMENTED | `git diff` não contém migrations 001–012. | — |
| 3 | IMPLEMENTED | Sequência 013, 014, 015. | — |
| 4 | IMPLEMENTED | Migrations e fluxos reutilizam tabelas P1 existentes. | — |
| 5 | IMPLEMENTED | `person_condominium_links` e policies de 013/014. | — |
| 6 | IMPLEMENTED | Cadastro de pessoa sem CPF pela UI. | — |
| 7 | IMPLEMENTED | Validação/normalização de CPF; assertions P3. | — |
| 8 | IMPLEMENTED | Índice/constraint de unicidade global e teste P3. | — |
| 9 | IMPLEMENTED | Deduplicação tenant-scoped sem CPF; teste P3. | — |
| 10 | IMPLEMENTED | Edição posterior e validação de CPF; teste P3. | — |
| 11 | IMPLEMENTED | Conflito não faz merge; testes P3. | — |
| 12 | IMPLEMENTED | Alteração auditada; dossiê local e assertions P3. | — |
| 13 | IMPLEMENTED | Identity reused por pessoa vinculada em outro condomínio. | — |
| 14 | IMPLEMENTED | Resolução tenant-scoped e RLS; suíte P3. | — |
| 15 | IMPLEMENTED | Guardas de pessoa inativa em 014; teste SQL. | — |
| 16 | IMPLEMENTED | RPC/trigger bloqueia inativação com relação vigente. | — |
| 17 | IMPLEMENTED | Histórico permite inativação quando elegível. | — |
| 18 | IMPLEMENTED | `unit_ownerships` temporal, migration 014. | — |
| 19 | IMPLEMENTED | Ownership com coproprietários e percentual; SQL. | — |
| 20 | IMPLEMENTED | Sem limite de unidades por pessoa; schema 014. | — |
| 21 | IMPLEMENTED | CHECK de percentual nulo ou (0,100]; SQL. | — |
| 22 | IMPLEMENTED | Constraint de percentuais sobrepostos; SQL. | — |
| 23 | IMPLEMENTED | Regra de não sobreposição da mesma pessoa/unidade; SQL. | — |
| 24 | IMPLEMENTED | Datas passadas, atuais e futuras suportadas. | — |
| 25 | IMPLEMENTED | Encerramento atualiza vigência e preserva linha anterior. | — |
| 26 | IMPLEMENTED | Encerramentos usam `ends_at`, sem DELETE normal. | — |
| 27 | IMPLEMENTED | `unit_occupancies` temporal, migration 014. | — |
| 28 | IMPLEMENTED | Tipos owner/tenant/family_member/dependent/other e CHECK. | — |
| 29 | IMPLEMENTED | Vínculos em múltiplas unidades suportados. | — |
| 30 | IMPLEMENTED | Regra de overlap por pessoa/unidade; SQL. | — |
| 31 | IMPLEMENTED | Occupancy owner exige ownership compatível; SQL. | — |
| 32 | IMPLEMENTED | Ownership não cria occupancy automaticamente. | — |
| 33 | IMPLEMENTED | Índice/constraint de primary vigente por unidade. | — |
| 34 | IMPLEMENTED | Sucessão de primary futura sem sobreposição; SQL. | — |
| 35 | IMPLEMENTED | Troca transacional por operação controlada. | — |
| 36 | IMPLEMENTED | Encerramento preserva linha histórica; Golden C. | — |
| 37 | IMPLEMENTED | `unit_financial_responsibilities` temporal. | — |
| 38 | IMPLEMENTED | Responsável financeiro não exige ser owner/resident. | — |
| 39 | IMPLEMENTED | Constraint temporal evita overlap; SQL. | — |
| 40 | IMPLEMENTED | Responsável atual e sucessor futuro coexistem; Golden C. | — |
| 41 | IMPLEMENTED | Troca por RPC/transação. | — |
| 42 | IMPLEMENTED | Finance-only não recebe unidade; prova UI e SQL. | — |
| 43 | IMPLEMENTED | Vigências tratadas como intervalos semiabertos. | — |
| 44 | IMPLEMENTED | CHECK temporal exige fim posterior ao início. | — |
| 45 | IMPLEMENTED | Datas passadas/presentes/futuras suportadas. | — |
| 46 | IMPLEMENTED | “Hoje” calculado com timezone do condomínio na UI. | — |
| 47 | IMPLEMENTED | Condomínio deriva e valida com a unidade. | — |
| 48 | IMPLEMENTED | Trigger rejeita transferência tenant por UPDATE. | — |
| 49 | IMPLEMENTED | FKs/guardas impedem unidade de outro condomínio. | — |
| 50 | IMPLEMENTED | Unidade inativa bloqueia novos vínculos; SQL. | — |
| 51 | IMPLEMENTED | Unidade blocked permite operação administrativa prevista. | — |
| 52 | IMPLEMENTED | under_construction permite ownership e rejeita occupancy. | — |
| 53 | IMPLEMENTED | Exclusion constraints/locks protegem conflitos concorrentes. | — |
| 54 | IMPLEMENTED | Permissions P3 sem substituir `people.read/manage`. | — |
| 55 | IMPLEMENTED | Grants para syndic e manager verificados por SQL. | — |
| 56 | IMPLEMENTED | Doorman sem permissão de catálogo P3; RLS SQL. | — |
| 57 | IMPLEMENTED | Resident sem catálogo administrativo geral; UI. | — |
| 58 | IMPLEMENTED | Admin autorizado vê pessoas do próprio contexto. | — |
| 59 | IMPLEMENTED | Admin A não lista pessoa exclusiva B; SQL/UI. | — |
| 60 | IMPLEMENTED | UUID B direto resulta 404 no contexto A. | — |
| 61 | IMPLEMENTED | Busca não atravessa RLS; isolamento SQL. | — |
| 62 | IMPLEMENTED | Contatos de outro tenant não revelados; RLS SQL. | — |
| 63 | IMPLEMENTED | Resident consulta a própria pessoa. | — |
| 64 | IMPLEMENTED | Dados próprios autorizados e auditoria do dossiê. | — |
| 65 | IMPLEMENTED | Resident não consulta dados privados de terceiro; RLS/UI. | — |
| 66 | IMPLEMENTED | Resident consulta próprios vínculos; Golden A/B. | — |
| 67 | IMPLEMENTED | Ownership/occupancy vigente descobre a unidade própria. | — |
| 68 | IMPLEMENTED | Finance-only não recebe “Minhas Unidades”; UI/SQL. | — |
| 69 | IMPLEMENTED | Tenant RLS depende de acesso explícito; isolamento SQL. | — |
| 70 | IMPLEMENTED | Conta suspensa/membership encerrada bloqueiam autorização. | — |
| 71 | IMPLEMENTED | RLS habilitado nas tabelas novas; migrations 013/014. | — |
| 72 | IMPLEMENTED | Sem policy de DELETE de histórico para authenticated. | — |
| 73 | IMPLEMENTED | Resolução/criação global somente via RPC privilegiada. | — |
| 74 | IMPLEMENTED | RPC exige sessão, tenant e `people.manage`. | — |
| 75 | IMPLEMENTED | Operação não oferece lookup global de CPF. | — |
| 76 | IMPLEMENTED | Conflitos retornam resposta neutra; teste de UI. | — |
| 77 | IMPLEMENTED | SECURITY DEFINER P3 define search_path vazio/seguro. | — |
| 78 | IMPLEMENTED | EXECUTE de funções privilegiadas revogado de PUBLIC/anon. | — |
| 79 | IMPLEMENTED | EXECUTE concedido a authenticated somente onde necessário. | — |
| 80 | IMPLEMENTED | Busca no bundle: zero ocorrências de service role em 44 JS. | — |
| 81 | IMPLEMENTED | Invitation/account/membership P1 reutilizados. | — |
| 82 | IMPLEMENTED | Pessoa elegível convidada como `condominium.resident`. | — |
| 83 | IMPLEMENTED | Finance-only não pode receber convite resident. | — |
| 84 | IMPLEMENTED | Conta existente reutilizada no convite. | — |
| 85 | IMPLEMENTED | Convite não confirma participação em outro tenant. | — |
| 86 | IMPLEMENTED | Fim de vínculo não encerra membership automaticamente. | — |
| 87 | IMPLEMENTED | Membership sem relação elegível gera aviso administrativo. | — |
| 88 | IMPLEMENTED | Auditoria de alterações da pessoa; dossiê local. | — |
| 89 | IMPLEMENTED | Audit de documentos/contatos sem payload sensível excessivo. | — |
| 90 | IMPLEMENTED | Audit de ownership/occupancy/finance; SQL P3. | — |
| 91 | IMPLEMENTED | RPC preserva `auth.uid()` do ator; assertions P3. | — |
| 92 | IMPLEMENTED | Metadata de audit sem token/senha/secret; código P3. | — |
| 93 | IMPLEMENTED | Menu Pessoas, Moradores e Proprietários. | — |
| 94 | IMPLEMENTED | Sem item separado para responsáveis financeiros. | — |
| 95 | IMPLEMENTED | Lista de pessoas tem busca, filtros e paginação. | — |
| 96 | IMPLEMENTED | CPF mascarado na listagem; teste/UI. | — |
| 97 | IMPLEMENTED | Criar e editar pessoa pela aplicação; Golden A/B. | — |
| 98 | IMPLEMENTED | Dossiê reúne perfil, contatos, acesso e histórico. | — |
| 99 | IMPLEMENTED | Moradores deriva de `unit_occupancies`. | — |
| 100 | IMPLEMENTED | Proprietários deriva de `unit_ownerships`. | — |
| 101 | IMPLEMENTED | Dossiê da unidade apresenta owners/residents/financeiro. | — |
| 102 | PARTIAL | Seleção existente funciona; não há fluxo único de busca com ações integradas “Selecionar/Cadastrar”. | Bloqueador: SIM — fluxo aprovado ainda não oferece essa sequência completa. |
| 103 | IMPLEMENTED | Confirmação antes de tornar occupancy primary; UI. | — |
| 104 | IMPLEMENTED | Confirmação explicita data efetiva; Golden C. | — |
| 105 | IMPLEMENTED | UI mostra Atual/Próximo para responsabilidade financeira. | — |
| 106 | PARTIAL | Erro SQL não é exposto e UI mostra mensagem neutra, mas a violação não é mapeada para uma mensagem de domínio específica. | Bloqueador: NÃO — falha segura e legível, com débito de UX. |
| 107 | IMPLEMENTED | Ações de escrita dependem de permissionamento. | — |
| 108 | IMPLEMENTED | URL de pessoa fora do contexto não revela existência; 404. | — |
| 109 | IMPLEMENTED | Loading, vazio, sem resultados, erro e sem permissão presentes. | — |
| 110 | PARTIAL | “Minhas Unidades” foi verificada a 390×844 sem overflow; não foi feita inspeção completa de páginas e componentes em desktop/tablet/mobile contra o Design System nesta etapa. | Bloqueador: SIM — cobertura responsiva/visual global incompleta. |
| 111 | IMPLEMENTED | Resident vê apenas unidade ligada a occupancy/ownership elegível. | — |
| 112 | IMPLEMENTED | Resident vê tipos próprios de vínculo; telas A/B. | — |
| 113 | IMPLEMENTED | UI resident não oferece diretório completo. | — |
| 114 | IMPLEMENTED | Troca de contexto limpa dados visuais do contexto anterior. | — |
| 115 | IMPLEMENTED | Convite conecta person/account/membership/role sem duplicação observada. | — |
| 116 | IMPLEMENTED | Golden A ponta a ponta concluído localmente. | — |
| 117 | IMPLEMENTED | Golden B e verificações de privacidade concluídos. | — |
| 118 | PARTIAL | Encerramento e sucessão futuros foram salvos pela UI; aviso de vínculo expirado foi provado em conta de controle. | Bloqueador: SIM — ainda não foi observado o próprio João após a data efetiva futura de 01/11/2026. |
| 119 | IMPLEMENTED | UUID conhecido, catálogo resident, terceiro privado, troca de contexto e finance-only verificados com SQL/UI. | — |
| 120 | IMPLEMENTED | Regressão P1/P2 passou; migrations 001–012 intactas. | — |

## PARTIALs e bloqueadores restantes

| Critério | Bloqueador | Próxima validação necessária |
|---:|---|---|
| 102 | SIM | Confirmar/implementar fluxo integrado de buscar pessoa, selecionar existente ou cadastrar nova, dentro do escopo autorizado. |
| 106 | NÃO | Se exigido para aceite visual, mapear constraints conhecidas a mensagens de domínio sem exibir erro SQL bruto. |
| 110 | SIM | Fazer inspeção responsiva/visual das telas P3 em desktop, tablet e mobile, usando os tokens/componentes do Design System aprovado. |
| 118 | SIM | Após 01/11/2026, validar João sem avançar artificialmente o relógio; alternativamente, aprovar um método de teste temporal controlado que preserve o histórico. |

## Git e integridade do escopo

- Branch: `main`; HEAD: `23c37035645aaada4eb0d7b66207fa1ac04b21ac`.
- Sem commit ou push.
- Working tree contém o pacote P3 preexistente em validação, as migrations locais 013–015 e este relatório/evidências. Migration 001–012 não aparece no diff. Nenhuma alteração P4 foi iniciada.
- As evidências usam fixtures sintéticas locais; não incluem senhas, tokens ou chaves.

## Encerramento

Resultado do gate: **PARCIAL** pelos critérios 102, 110 e 118; o critério 106 também permanece parcial, sem bloquear por segurança. P3 continua exclusivamente local: migrations 013–015 não foram aplicadas no Supabase remoto. Nenhuma publicação foi feita. Aguarda-se aprovação antes de qualquer promoção ou pacote posterior.
