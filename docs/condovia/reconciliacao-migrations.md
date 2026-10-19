# Reconciliação de migrations

Consulta realizada em 19/10/2026, somente leitura. Nenhuma migration foi aplicada, reparada ou alterada em Supabase remoto.

## Presença por ambiente

`Git main`, `Git homolog` e `Local` indicam a existência do arquivo na referência ou no diretório de trabalho original. Quando a versão diverge, a versão efetivamente registrada pelo Supabase aparece entre parênteses.

| Versão / nome | Git main | Git homolog | Local | Homologação | Produção |
|---|---:|---:|---:|---:|---:|
| `20261006230000_import_batches` | sim | sim | sim (editado) | sim (`20261009023645`) | sim (`20261006230000`) |
| `20261013000000_p9_1_finance_payables` | não | não | sim | sim (`20261013172602`) | não |
| `20261013010000_p9_2_finance_receivables` | não | não | sim | sim (`20261013175951`) | não |
| `20261013020000_p9_4_finance_bills` | não | não | sim | sim (`20261013195622`) | não |
| `20261013030000_import_preview_cleanup` | não | não | sim | sim (`20261013204354`) | não |
| `20261013201000_resolve_relationship_import_keys` | não | não | sim | não | não |
| `20261013211835_people_list_by_condominium` | não | não | não | sim | não |
| `20261013213303_people_contacts_and_deduplication` | não | não | não | sim | não |
| `20261013213832_fix_people_import_digest` | não | não | não | sim | não |
| `20261013214455_enable_pgcrypto_for_people_import` | não | não | não | sim | não |
| `20261013214944_remove_database_digest_from_people_import` | não | não | não | sim | não |
| `20261013220103_optimize_people_name_search` | não | não | não | sim | não |
| `20261013220113_trigram_people_name_search` | não | não | não | sim | não |
| `20261013220329_store_normalized_cpf_on_people_import` | não | não | não | sim | não |
| `20261014005505_fix_confirm_resident_occupancy_type` | não | não | não | sim | não |
| `20261014012415_optimize_relationship_read_policies` | não | não | não | sim | não |
| `20261014012806_optimize_direct_condominium_permission_path` | não | não | não | sim | não |
| `20261014013222_allow_condominium_people_relationship_reads` | não | não | não | sim | não |
| `20261014013342_add_authorized_relationship_people_lookup` | não | não | não | sim | não |
| `20261014015353_add_relationship_units_lookup` | não | não | não | sim | não |
| `20261014020059_sort_people_by_display_name` | não | não | não | sim | não |
| `20261014020550_add_relationship_list_performance_indexes` | não | não | não | sim | não |
| `20261014115426_add_people_cpf_search` | não | não | não | sim | não |
| `20261014120305_add_condominium_unit_filter_lookup` | não | não | não | sim | não |
| `20261014120556_add_condominium_structure_filter_lookup` | não | não | não | sim | não |
| Migrations anteriores comuns (`001`–`035` e timestamps anteriores) | sim | sim | sim | sim | sim |

Produção foi consultada pelo projeto `bmaglizdavsrwbenzenp`; homologação pelo projeto `kgvbmisocqmsxcibpumq`. A produção não contém as migrations P9 nem as posteriores de pessoas/relacionamentos.

## Comparação dos SQLs

- P9.1: `20261013000000` e homologação `20261013172602` são equivalentes byte a byte.
- P9.2: `20261013010000` e homologação `20261013175951` são equivalentes byte a byte.
- P9.4: `20261013020000` e homologação `20261013195622` são equivalentes após normalizar somente a quebra de linha final.
- Limpeza de preview: `20261013030000` e homologação `20261013204354` são equivalentes após normalizar somente a quebra de linha final.
- `20261006230000_import_batches`: o arquivo de `origin/main` corresponde ao SQL registrado na homologação como `20261009023645`; o arquivo local editado diverge. O arquivo histórico não foi renomeado nem alterado.

As migrations equivalentes foram renomeadas apenas nos worktrees dos PRs para os números registrados na homologação. O descompasso de `import_batches` fica pendente de `supabase migration repair`, mediante aprovação explícita.

## Migrations de pessoas e dependências

As migrations `people_list_by_condominium`, contatos/deduplicação, digest/pgcrypto, CPF normalizado e busca por nome/CPF são dependências de `feat/imports-hardening` e da evolução da listagem em `feat/people-relationships-filters`. As migrations de políticas, lookups, ordenação e índices de relacionamentos são dependências de `feat/people-relationships-filters`. `fix_confirm_resident_occupancy_type` é dependência de `feat/imports-hardening`.

Essas migrations existem somente na homologação e não foram recriadas nem aplicadas neste passo; a reconciliação deve ser feita em PR próprio antes de promover a base.

## Migration nova para a divergência local

Foi preparada `20261019120000_import_people_duplicate_updates.sql`, com `CREATE OR REPLACE FUNCTION public.confirm_import_batch(uuid)`. Ela preserva o comportamento publicado da migration histórica e adiciona atualização de duplicados de pessoas, CPF e e-mail. É idempotente quanto à definição da função e não altera a migration original.

## Repairs propostos — não executados

Somente após aprovação, revisar o estado do histórico com comandos equivalentes a:

```sh
supabase migration repair --linked --status applied 20261009023645
supabase migration repair --linked --status reverted 20261006230000
```

Os comandos acima são apenas proposta. Não foram executados, e nenhum `db push`, `migration up` ou alteração remota foi realizado.
