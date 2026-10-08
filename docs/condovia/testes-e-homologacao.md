# Plano de testes e homologação

## Camadas

- Unitário: Vitest para queries, componentes e regras isoladas.
- Banco: testes pgTAP/RLS quando o Supabase local estiver disponível.
- Aplicação: ESLint, TypeScript e build.
- E2E: Playwright com contas sintéticas locais, sem credenciais pessoais.
- Visual: screenshots por tela, perfil, estado e 390×844, 768×900, 1280×900 e 1440×900.

## Critérios

- **PASS:** execução concluída e evidência compatível com o critério.
- **FAIL:** defeito comprovado, com artefato e causa registrada.
- **NÃO VERIFICADO:** bloqueio de ambiente, autenticação, dados, referência ou viewport.

PASS estrutural não equivale a aprovação visual. Baselines não devem ser atualizadas automaticamente.

## Procedimento E2E local

1. Confirmar Supabase local e contas sintéticas privadas.
2. Executar `pnpm build` e iniciar `next start` em `127.0.0.1`.
3. Executar o teste direcionado apropriado.
4. Para regressão visual, usar `pnpm exec playwright test tests/e2e/visual-regression.spec.ts` sem `--update-snapshots`.
5. Preservar evidências de diferenças e separar falha do produto de falha de ambiente.
