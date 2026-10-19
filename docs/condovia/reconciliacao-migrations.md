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

Conferir que a saída contém exatamente estas 22 migrations, em ordem cronológica por versão:

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
