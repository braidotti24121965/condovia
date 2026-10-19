# Reconciliação de migrations e roteiro de produção

Status: documento revisado em 2026-10-19. Nenhum comando deste roteiro foi executado em produção.

## Estado conhecido

O PR #49 foi incorporado à `main` por squash. A branch `feat/imports-hardening` deve ser usada no ensaio e na aplicação somente após confirmar que aponta para o trabalho atualizado com o commit `a518b35`.

Na homologação, a correção de permissão cujo arquivo no Git é:

```text
20261019100000_fix_direct_permission_requires_active_membership.sql
```

foi registrada pelo conector com a versão `20261019183001`. Portanto, há um descompasso entre Git (`20261019100000`) e o histórico da homologação (`20261019183001`). O repair correspondente é apenas uma proposta e não foi executado:

```bash
supabase migration repair --linked --status reverted 20261019183001
supabase migration repair --linked --status applied 20261019100000
```

Executar esse repair somente após confirmar que o SQL aplicado é exatamente o conteúdo da migration do Git e mediante autorização específica. Não usar repair para alterar o estado do banco sem antes confirmar o estado real da função.

## Roteiro de produção — preparação, sem execução

Projeto de produção: `bmaglizdavsrwbenzenp`.

### 1. Pré-condições e backup

Antes da janela, confirmar no painel Supabase:

- que o plano possui backup diário;
- se PITR está habilitado e qual é a janela de retenção;
- que o backup mais recente está concluído e restaurável.

Usar `pg_dump` versão 17 ou superior e validar o arquivo antes da janela:

```bash
pg_dump --version
pg_dump "$PROD_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file="condovia-production-$(date +%Y%m%d-%H%M).dump"

pg_restore --list condovia-production-YYYYMMDD-HHMM.dump > \
  condovia-production-YYYYMMDD-HHMM.restore-list.txt
```

Antes do `db push`, salvar a definição atual das duas funções em arquivo local:

```sql
select pg_get_functiondef('public.has_permission(text,uuid)'::regprocedure);
select pg_get_functiondef('public.confirm_import_batch(uuid)'::regprocedure);
```

Também registrar a confirmação do backup diário/PITR no relatório da janela.

### 2. Ensaio obrigatório contra produção

O ensaio deve partir da branch `feat/imports-hardening` atualizada com `a518b35`, que contém o conjunto do #49. Estando essa branch vinculada ao projeto de produção, executar somente:

```bash
supabase db push --linked --dry-run
```

Conferir que a saída contém exatamente estas 23 migrations, em ordem cronológica por versão:

```text
20261013204354_import_preview_cleanup.sql
20261013211835_people_list_by_condominium.sql
20261013213303_people_contacts_and_deduplication.sql
20261013213832_fix_people_import_digest.sql
20261013214455_enable_pgcrypto_for_people_import.sql
20261013214944_remove_database_digest_from_people_import.sql
20261013220103_optimize_people_name_search.sql
20261013220113_trigram_people_name_search.sql
20261013220329_store_normalized_cpf_on_people_import.sql
20261014005505_fix_confirm_resident_occupancy_type.sql
20261014012415_optimize_relationship_read_policies.sql
20261014012806_optimize_direct_condominium_permission_path.sql
20261014013222_allow_condominium_people_relationship_reads.sql
20261014013342_add_authorized_relationship_people_lookup.sql
20261014015353_add_relationship_units_lookup.sql
20261014020059_sort_people_by_display_name.sql
20261014020550_add_relationship_list_performance_indexes.sql
20261014115426_add_people_cpf_search.sql
20261014120305_add_condominium_unit_filter_lookup.sql
20261014120556_add_condominium_structure_filter_lookup.sql
20261019100000_fix_direct_permission_requires_active_membership.sql
20261019110000_resolve_relationship_import_keys.sql
20261019120000_import_people_duplicate_updates.sql
```

São 23: `20261013204354` (#47), as 19 recuperadas (#49), `20261019100000` (#49) e `20261019110000`/`20261019120000` (#47). Se aparecer `20261011000000_maintenance_complete.sql`, a produção ainda não tem a entrega integral de Manutenção: abortar e tratar separadamente.

Qualquer migration adicional aborta a janela. Em especial, não podem aparecer migrations P9/financeiro. Se a lista não for exatamente essa, não executar o `db push`; corrigir a branch ou o vínculo e repetir o dry-run.

### 3. Aplicação real

Depois do backup, do dry-run aprovado e da autorização explícita para a data e o horário, a aplicação será um único comando a partir da branch validada — não uma aplicação separada “#49 depois #47”:

```bash
supabase db push --linked
```

Esse comando não deve ser executado antes da aprovação da janela.

### 4. Verificações pós-aplicação

Confirmar o histórico aplicado:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

Confirmar as oito funções esperadas, sem usar `to_regprocedure`:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'list_people_for_condominium',
    'list_relationship_people',
    'list_relationship_units',
    'list_units_for_condominium',
    'list_structures_for_condominium',
    'resolve_relationship_import_keys',
    'confirm_import_batch',
    'has_permission'
  );
```

Resultado esperado: 8 linhas. Confirmar também que a definição de `has_permission` contém o join com `public.condominium_memberships` e as condições de vínculo ativo, incluindo `status = 'active'`, início vigente e término nulo ou futuro.

Teste funcional obrigatório em produção:

1. Login com um usuário ativo.
2. Abrir Moradores.
3. Abrir Unidades.
4. Confirmar que o usuário ativo mantém acesso e que as listas carregam sem erro.

### 5. Rollback

Em caso de falha, interromper a janela e preservar logs, saída do `db push`, lista de migrations e consultas pós-aplicação. Não fazer rollback apenas com `migration repair`.

- Se o banco estiver inconsistente, restaurar o backup validado ou usar PITR conforme o procedimento aprovado pelo Supabase.
- Se a aplicação tiver concluído e apenas a aplicação apresentar erro, corrigir a causa com uma nova migration revisada; não editar migrations aplicadas.
- Qualquer repair de histórico exige confirmação de que o estado físico do banco já corresponde ao estado pretendido e autorização separada.

## Ordem de promoção

1. Executar backup e dry-run do conjunto único acima.
2. Com autorização de janela, executar o único `supabase db push`.
3. Executar as verificações SQL e o teste funcional autenticado.
4. Registrar commit, branch, deployment, horário, resultado e qualquer divergência.

Nenhum comando de produção foi executado durante a revisão deste documento.

## Diagnóstico somente leitura da produção — migrations P8

Consulta realizada contra a produção em 2026-10-19. Não foram executados `migration repair`, `db push` ou SQL de escrita.

### Versões remotas sem arquivo local equivalente

| Versão remota | Nome remoto | Statements | Arquivo Git candidato | Resultado normalizado |
|---|---|---:|---|---|
| `20261008232457` | `p8_1_maintenance_foundation` | 1 | `20261008000000_p8_1_maintenance_foundation.sql` | divergente |
| `20261009011713` | `p8_1_fix_maintenance_settings_audit` | 1 | `20261008010000_p8_1_fix_maintenance_settings_audit.sql` | divergente |
| `20261009011720` | `p8_2_maintenance_requests` | 1 | `20261009000000_p8_2_maintenance_requests.sql` | divergente |
| `20261009205711` | `p8_3_maintenance_work_orders` | 1 | `20261010000000_p8_3_maintenance_work_orders.sql` | divergente |
| `20261009205716` | `maintenance_complete` | 1 | `20261011000000_maintenance_complete.sql` | divergente |

Comparação feita normalizando sequências de espaços/quebras de linha e removendo a quebra final. Os hashes MD5 normalizados foram:

| Par | SQL remoto | Arquivo Git | Tamanho remoto | Tamanho Git |
|---|---|---|---:|---:|
| foundation | `1a36e8c97e8d047ef4148714acb7b470` | `865e9d12bb7399c103318b14c100d4c2` | 9797 | 9804 |
| settings audit | `419e5970a0e58b00fc77363a55d9eb4f` | `c497236906ecd90ffd9aa1de59087604` | 1418 | 1418 |
| requests | `e65edc641ff4af9da143a8f50eaa9b4c` | `5d5ba07208a0ce2abc013f18cb84a6ff` | 17195 | 17244 |
| work orders | `ba45a358a64b1a96b56bc0822adf9650` | `3a5d122438441a24f183b84164eed77c` | 25660 | 25696 |
| maintenance complete | `ff52c53941d8101bdface72475ac24c4` | `497417337fc81c54125d0bdf5bdf608e` | 70396 | 70515 |

As cinco versões Git candidatas (`20261008000000`, `20261008010000`, `20261009000000`, `20261010000000`, `20261011000000`) não aparecem no histórico de produção. O restante do histórico de produção bate com as versões/nomes da `main` no diagnóstico de presença; não foi identificada outra divergência de versão além dos cinco pares P8 acima e dos descompassos de migrations já documentados anteriormente. A equivalência de SQL desses cinco pares não pode ser presumida pelos nomes: todos foram classificados como divergentes.

### Repairs propostos

Não há repair seguro para os cinco pares, pois os SQLs divergem. Portanto, nenhum dos comandos abaixo deve ser executado:

```bash
# NÃO EXECUTAR: pares divergentes
```

Para cada par divergente, a proposta é criar uma migration nova, posterior à última migration de produção, que contenha apenas a diferença necessária após revisão funcional e teste local. Não substituir nem renomear migrations já aplicadas.

Para referência, o formato de repair que seria usado somente para um par comprovadamente equivalente é:

```bash
supabase migration repair --db-url "$PROD_DB_URL" --status reverted <versão_remota>
supabase migration repair --db-url "$PROD_DB_URL" --status applied <versão_git>
```

Nenhum comando de repair foi executado.

### Dry-run esperado após reconciliação

Depois de uma reconciliação aprovada — com migrations novas para as divergências, sem P9/financeiro — o dry-run deverá listar exatamente as 23 migrations do roteiro de produção. Nesta execução, o dry-run não atingiu esse estado: ele parou informando que as cinco versões remotas não possuem arquivos locais correspondentes.

## Revisão detalhada dos cinco pares P8 — somente leitura

Revisão posterior realizada em 2026-10-19. O SQL de cada `statements` remoto foi comparado integralmente com o arquivo Git candidato. A conferência bruta confirmou igualdade byte a byte nos cinco pares; portanto os diffs completos sem `-w` também são vazios:

```text
20261008232457 vs 20261008000000_p8_1_maintenance_foundation.sql: (sem diff)
20261009011713 vs 20261008010000_p8_1_fix_maintenance_settings_audit.sql: (sem diff)
20261009011720 vs 20261009000000_p8_2_maintenance_requests.sql: (sem diff)
20261009205711 vs 20261010000000_p8_3_maintenance_work_orders.sql: (sem diff)
20261009205716 vs 20261011000000_maintenance_complete.sql: (sem diff)
```

Hashes pedidos (MD5 após remoção de todo whitespace; linha remota e linha Git, respectivamente):

```text
20261008232457 / 20261008000000_p8_1_maintenance_foundation.sql
2c4bb3fe5c97e77114256bb11fd799af
2c4bb3fe5c97e77114256bb11fd799af

20261009011713 / 20261008010000_p8_1_fix_maintenance_settings_audit.sql
9ab97818aba17201deda4c31445c0660
9ab97818aba17201deda4c31445c0660

20261009011720 / 20261009000000_p8_2_maintenance_requests.sql
c8b837b7606c02dc22859125d82b45aa
c8b837b7606c02dc22859125d82b45aa

20261009205711 / 20261010000000_p8_3_maintenance_work_orders.sql
1e178919ea5b3dfebe35afb36ed73e6d
1e178919ea5b3dfebe35afb36ed73e6d

20261009205716 / 20261011000000_maintenance_complete.sql
bbb9aae89e9ed50b5004023be144c614
bbb9aae89e9ed50b5004023be144c614
```

Classificação: os cinco pares não têm diferença cosmética nem semântica; a comparação sem `-w` ficou vazia em todos. Não foi necessário consultar objetos específicos do catálogo, pois não há alteração de tabela, coluna, constraint, índice, função, policy ou grant entre os SQLs comparados.

### Fingerprint P8 — primeira leitura (superada; ver revisão abaixo)

Após a atualização para `7246153`, os arquivos `supabase/checks/fingerprint_p8.sql` e `supabase/checks/fingerprint_p8_esperado.txt` foram encontrados. A consulta foi executada somente em leitura contra a produção e comparada com o esperado.

O diff não é vazio. A saída tem 153 linhas esperadas e 153 linhas produzidas. O resultado por categoria foi:

```text
columns:     divergente (20/20 objetos)
constraints: divergente (20/20 objetos)
function:    divergente (49/49 objetos)
grants:      igual (20/20 objetos)
indexes:     divergente (20/20 objetos)
policy:      divergente (39/39 objetos)
```

As linhas de `grants` coincidem com o arquivo de referência. As divergências nas demais categorias são diferenças de fingerprint de schema e não podem ser tratadas como variação de permissões do ambiente. O diff completo produzido foi preservado no resultado da consulta desta execução; não foi criado nem commitado qualquer arquivo com dados de produção.

Conclusão: a produção não está idêntica ao fingerprint esperado do Git. A janela de produção fica bloqueada para investigação dos objetos divergentes. Não executar os repairs, `db push` ou qualquer escrita até identificar se as diferenças são alterações diretas legítimas, estado de referência desatualizado ou problema de aplicação.

### Proposta de repair — não executar

Como os cinco pares são byte a byte equivalentes, a proposta de repair permanece válida quanto ao conteúdo SQL, mas não foi executada. A execução continua condicionada à disponibilização e conferência do fingerprint P8. Estes comandos são apenas documentação e não foram executados:

```bash
supabase migration repair --db-url "$PROD_DB_URL" --status reverted 20261008232457
supabase migration repair --db-url "$PROD_DB_URL" --status applied 20261008000000

supabase migration repair --db-url "$PROD_DB_URL" --status reverted 20261009011713
supabase migration repair --db-url "$PROD_DB_URL" --status applied 20261008010000

supabase migration repair --db-url "$PROD_DB_URL" --status reverted 20261009011720
supabase migration repair --db-url "$PROD_DB_URL" --status applied 20261009000000

supabase migration repair --db-url "$PROD_DB_URL" --status reverted 20261009205711
supabase migration repair --db-url "$PROD_DB_URL" --status applied 20261010000000

supabase migration repair --db-url "$PROD_DB_URL" --status reverted 20261009205716
supabase migration repair --db-url "$PROD_DB_URL" --status applied 20261011000000
```

Após esses repairs, sem aplicar qualquer SQL, a saída esperada do `supabase db push --db-url "$PROD_DB_URL" --dry-run` é exatamente a lista de 23 migrations do roteiro, sem P9/financeiro e sem as cinco versões remotas antigas.

Correção do registro anterior: a afirmação de hashes divergentes estava incorreta. A rechecagem solicitada, com whitespace removido e também com comparação bruta sem `-w`, confirmou igualdade nos cinco pares.


### Fingerprint P8 — revisão final: produção idêntica ao Git

Revisão em 2026-10-19 com a saída bruta publicada em `supabase/checks/fingerprint_p8_producao.txt` (commit `6a17126`), gerada em produção (PostgreSQL 17.11, `en_US.UTF-8`).

- `cmp supabase/checks/fingerprint_p8_esperado.txt supabase/checks/fingerprint_p8_producao.txt`: arquivos idênticos byte a byte.
- Comparação item a item pelo nome do objeto: 153/153 iguais (45 funções, 28 policies, 20 tabelas em colunas, 20 em constraints, 20 em índices, 20 em grants). Nenhum objeto exclusivo de um dos lados.

A conclusão anterior de "divergência real" decorreu de erro na comparação executada naquele momento, não de diferença no banco. Com os cinco pares P8 equivalentes no SQL e o schema de produção idêntico ao gerado pela `main`, os dez repairs propostos acima são seguros quanto ao estado físico do banco. A execução continua dependendo de autorização explícita da janela.
