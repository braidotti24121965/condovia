# CondoVia P1: mapeamento e estratégia incremental

## Estado de origem verificado

- As migrations versionadas `001`–`006` correspondem ao histórico remoto aplicado. Elas são imutáveis neste pacote.
- O Supabase remoto não possui registros em `people`, `user_accounts` ou nas memberships verificadas. As tabelas `roles` e `permissions` contêm os seeds da migration `006`.
- O modelo atual usa `people.status = active | suspended | archived`, `user_accounts.status = active | suspended | closed`, `roles.scope` e códigos singulares de condomínio. A aplicação consulta esses nomes e códigos.
- As policies atuais concedem leitura de `people` para a pessoa associada à conta; funções `SECURITY DEFINER` resolvem conta, contexto e permissão; o frontend mantém apenas um identificador de contexto em cookie HttpOnly. Esses mecanismos permanecem como baseline até substituições validadas.

## Mapeamento de compatibilidade

| Modelo atual | Modelo P1 | Tratamento incremental |
| --- | --- | --- |
| `people.status`: `active`, `suspended`, `archived` | `active`, `inactive`, `anonymized` | Expandir o CHECK para aceitar também `inactive` e `anonymized`. Preservar `suspended` e `archived`; não converter nenhum deles. A remoção dos estados legados exige uma etapa futura explícita após mapear seus registros e consumidores. |
| Sem `people.birth_date` | `birth_date` opcional | Adicionar coluna nullable, sem backfill. |
| `user_accounts.status`: `active`, `suspended`, `closed` | `invited`, `active`, `suspended`, `disabled` | Expandir o CHECK, mantendo `closed` sem conversão. `invited` e `disabled` serão estados explícitos; regras de acesso permanecem deny-by-default. |
| `people` ligado a `auth.users` por `user_accounts` | `auth.users → user_accounts → people` | Preservar FKs e a identidade Supabase Auth. Nenhuma senha será armazenada no domínio. |
| Documento armazenado como `document_hash` | Número normalizado e metadados | Preservar hash e registros atuais; adicionar campo nullable para número normalizado e metadados. Não é possível reconstruir o número a partir de hash, portanto não haverá backfill. |
| Telefone `phone_e164`, verificação por `verified_at` | Telefone normalizado, tipo, WhatsApp e verificação | Manter `phone_e164` como representação normalizada atual; adicionar tipo/WhatsApp/`is_verified` com sincronização compatível com `verified_at`. |
| E-mail `email`, verificação por `verified_at` | E-mail normalizado e verificado | Preservar o valor atual; introduzir representação normalizada e `is_verified` compatível com `verified_at`. Índices parciais impedirão mais de um contato primário por pessoa. |
| Convite ligado a `client_id`, `token_hash`, estados `pending/accepted/expired/revoked` | Convite por pessoa, tipo, escopo, aceite e autor | Manter campos e estados atuais; adicionar dados opcionais com FKs explícitas e `accepted_at`. Tipos novos são `condominium`, `administrator`, `platform`; quando informados exigem exatamente o contexto correspondente. `invitation_type = NULL` permanece permitido para registros legados. CHECKs de tipo/estado/escopo são `NOT VALID` para tolerar legado, mas valem para novas gravações. `token_hash` permanece hash; nenhum token bruto será introduzido. |
| Memberships com unicidade permanente por par e status/intervalo temporal | Múltiplos períodos históricos sem sobreposição entre períodos ativos | Remover unicidade permanente e validar por trigger que períodos `active` do mesmo par não se sobreponham. A vigência é o intervalo semiaberto `[starts_at, ends_at)`; acesso só existe quando `status = 'active'`, `starts_at <= now()` e `ends_at` é nulo ou futuro. Um período ativo já expirado não impede novo período posterior. Adicionar intervalo temporal que falta em `administrator_condominium_access`; preservar todos os registros. |
| `roles.scope` | `roles.scope_type` explícito | Adicionar `scope_type` em paralelo, com trigger de sincronização e rejeição de divergências. Manter `scope` para código legado. A retirada do campo legado fica fora deste pacote. |
| `role_assignments` com FKs `condominium_id`, `administrator_id` e `platform_scope` | Escopo referencial explícito e exatamente um escopo válido | Preservar FKs e CHECK existentes; reforçar validação para consultar `scope_type` sincronizado. Não introduzir `scope_type + scope_id`. |
| Roles `condominium.resident_owner` e `condominium.resident_tenant` | Role P1 `condominium.resident` | Criar role canônica separada e tabela de equivalência explicitamente limitada aos dois códigos legados. Não renomear códigos nem editar assignments existentes. Equivalência é mecanismo de compatibilidade da migration, não mecanismo normal de RBAC; a aplicação não tem escrita e o trigger rejeita outros pares. |
| `administrator.manager`, `platform.admin`, `platform.support` | `administrator_manager`, `platform_admin`, `support` | Preservar os códigos atuais, pois já representam esses papéis. Não inserir aliases redundantes. |
| `condominium.read`, `condominium.manage`, `profile.read_self` | `condominiums.read`, `condominiums.manage`, leitura pessoal | Preservar os códigos atuais e inserir permissions canônicas distintas. Registrar equivalências explícitas: leitura/gestão de condomínio são correspondências de código; `profile.read_self` equivale somente a `people.read_self`, nunca a `people.read`. |
| Sem auditoria administrativa mínima | Eventos administrativos auditáveis | Criar trilha append-only sem senha, token bruto, segredo ou chave. Registrar convites, mudanças de memberships, role assignments, overrides e suspensão/reativação de conta. |

## Migrations propostas

1. `007_identity_compatibility.sql`: campos nullable/metadados de identidade, CHECKs com estados novos e legados, contatos primários, convites e comentários de transição.
2. `008_membership_history.sql`: intervalos ausentes, substituição de unicidade permanente por trava transacional e trigger que rejeitam sobreposição entre períodos `active`, e índices de consulta temporal.
3. `009_rbac_scope_and_seeds.sql`: `scope_type` sincronizado, equivalências de roles/permissions e seeds idempotentes dos códigos P1 que ainda faltam.
4. `010_authorization_rls_audit.sql`: helpers compatíveis com códigos equivalentes, correções de escopo temporal/conta suspensa, policies deny-by-default necessárias, trilha de auditoria e grants mínimos.

Cada migration será transacional quando suportado, incremental e sem `DELETE`, conversão de `archived`/`closed`, reescrita de migration aplicada ou aplicação remota nesta etapa. As migrations locais serão testadas por reset limpo antes de qualquer decisão sobre o banco remoto.

## Impacto a validar antes de qualquer aplicação remota

- Constraints: CHECKs de status, escopo exato e consistência entre `scope`/`scope_type`.
- Índices: unicidade parcial de membership ativa, contatos primários e lookup temporal.
- Triggers: sincronização de status de verificação, escopo de role e eventos auditáveis.
- Functions: precedência de `DENY`, aliases de permission, conta ativa, membership em vigor e isolamento tenant.
- RLS/grants: nenhuma seleção de contexto ou equivalência de código pode conceder acesso fora do membership e escopo reais; tabelas de equivalência/auditoria precisam de acesso mínimo.
- Aplicação: chamadas atuais que consultam `scope`, roles e permissions devem continuar funcionais durante a compatibilidade.

## Itens deliberadamente não inferidos

- `archived` não significa `anonymized`; `closed` não significa `disabled`.
- Membership `active` só concede acesso dentro do intervalo semiaberto `[starts_at, ends_at)`; `suspended` e `ended` não concedem acesso, ainda que a janela temporal não tenha expirado. O trigger serializa gravações por par e impede sobreposição entre linhas ativas; a transição de status não apaga o período anterior.
- `profile.read_self` não concede descoberta de pessoas de um tenant.
- Não existe matriz de grants para `administrator.operator` no estado de origem; seu seed começará sem grants adicionais. Qualquer ampliação depende de regra de negócio aprovada.
- Não haverá criação de memberships, convite, gestão de usuários ou telas de módulos posteriores como parte dessa migração estrutural.

## Validação local prevista

- Testes pgTAP direcionados para estados legados/novos, transição sem conversão, FKs/escopo, equivalências sem ampliação, memberships históricas e índice ativo único.
- Teste específico de descoberta cross-tenant de `people` e dos cenários A–J do pacote P1.
- Testes Vitest para contexto único/múltiplo/ausente, filtro de escopo e seleção de contexto sem autoridade no frontend.
- Em seguida lint, typecheck e build. A migration remota não será aplicada antes desses resultados e de uma revisão final do diff.
