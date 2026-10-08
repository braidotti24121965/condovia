# Operação, backup e implantação

## Implantação

1. Revisar diff e estado do Git.
2. Executar checks necessários no escopo alterado.
3. Publicar branch/PR conforme aprovação.
4. Confirmar checks do GitHub e Preview Vercel.
5. Integrar somente após aprovação explícita.
6. Confirmar deployment Production associado ao novo commit de `main`.

Não executar deploy manual para substituir o fluxo oficial nem promover Preview para Production sem decisão registrada.

## Backup e recuperação

- Manter backup fora do Git, com acesso restrito e checksum SHA-256.
- Diferenciar backup lógico `public` de cobertura integral de Auth, Storage e configurações externas.
- Validar restauração em ambiente isolado antes de qualquer operação destrutiva.
- Testar contagens, constraints, integridade referencial, usuários protegidos, memberships e cadastros estruturais.
- Exclusões operacionais exigem IDs, dependências, transação controlada e rollback em caso de divergência.

## Limpeza de dados

Limpeza inaugural é operação excepcional: preservar identidades, permissões, históricos, auditoria, RLS, triggers, estruturas e unidades. Não usar TRUNCATE, desativação de triggers ou `session_replication_role`.

## Rollback

Em aplicação: reverter pelo PR/commit aprovado, nunca editar migrations aplicadas. Em dados: usar backup validado e procedimento específico; não presumir que rollback de código restaure dados.
