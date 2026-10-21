# Decisões ativas — contexto para agentes (Claude, Codex e equipe)

Leia este documento antes de qualquer alteração no módulo de portaria. Ele registra o que já foi decidido e o que não pode ser desfeito sem nova decisão. Atualize-o junto com cada PR relevante.

Última atualização: 21/10/2026.

## Ambientes e deploy

- Homologação: `https://homolog-condovia.kynovia.com.br`, ligada à branch `homolog`. Banco: projeto Supabase `condovia-homolog` (`kgvbmisocqmsxcibpumq`).
- Produção: `https://condovia.kynovia.com.br`. **Não publicar em produção** sem autorização explícita.
- Deploy de validação: preview, nunca `vercel deploy --prod` (ver `operacao-e-implantacao.md`).
- Fluxo: branch a partir de `origin/homolog` → PR para `homolog` → **integração só com aprovação explícita** do responsável → validação no domínio de homologação.
- Não commitar `.env.local`, `node_modules`, cache `.next` nem capturas de tela.

## Regras de código (módulo de portaria)

- Interface: seguir o `AGENTS.md` (componentes `Button`, tokens `--cv-*`, `.cv-form-actions`, `.cv-field-error` para erro, sem cor fixa).
- Não criar migration sem necessidade. Os códigos de retirada e a chave da DC-e foram resolvidos **sem migration**.
- Segredos: nunca no cliente, nunca em log, nunca no repositório. Variáveis ficam no painel da Vercel (ambiente Preview para homologação).

## Passe de visitante (QR de autorização)

- O token do passe é aleatório, guardado só como hash SHA-256 (`pass_token_hash`). O QR mostra o token, não o ID da autorização.
- Gerar novo QR invalida o anterior. O QR só existe enquanto a tela está aberta: sem token em memória, é preciso gerar de novo.
- A página pública `/pass/[token]` mostra visitante, unidade e validade. **Não** mostra observações nem IDs internos.
- Consulta na portaria: `checkVisitorPassAction`, somente leitura.
- Registro de entrada: `registerEntryAction` → RPC `register_access_entry`. Entrada duplicada é recusada pelo banco.

## Leitura de QR pela câmera

- Decodificação com **jsQR** em JavaScript, em qualquer navegador. Não usar `BarcodeDetector` (o nativo do Chrome não leu QR de tela de celular no teste).
- Gerador de QR: biblioteca `qrcode` (MIT) através do adaptador `QrCode` em `src/lib/gatehouse/qrcode.ts`. O gerador próprio antigo produzia códigos que leitores não liam; foi removido.
- Teste obrigatório de ida e volta: gerar com o projeto, decodificar com `decodeQrFrame`.

## Liberação automática pelo passe

- Na validação da portaria, a leitura pela câmera registra a entrada **sozinha** quando o passe está ativo, a autorização foi localizada e há ponto de acesso ativo (`canAutoRegisterEntry`).
- Passes agendados, expirados ou inválidos nunca são registrados automaticamente.
- Consulta por link colado continua exigindo o botão "Registrar entrada".

## Encomendas

- Recebimento: o botão "Ler QR da etiqueta" preenche as observações com `Chave DC-e: <44 dígitos>` (quando o QR for o da DC-e) ou com `Código da etiqueta: <texto>`. O recebimento só é salvo com o clique em "Confirmar Recebimento". Sem migration.
- Retirada: decidido que o morador recebe um **código de retirada assinado** (ID da encomenda + validade de 7 dias, HMAC-SHA256 com `PACKAGE_PICKUP_SECRET`). Nada é guardado no banco. Gerar novo código **não** invalida o anterior; ambos valem até o prazo ou até a retirada (a encomenda deixa de estar `received`).
- Regra de código: `src/lib/gatehouse/package-pickup.ts`, com testes.
- A área do morador mostra o QR de retirada (PR #74, em revisão).
- A **liberação na portaria** pelo código ainda não está implementada.

## Pendências conhecidas

- PR #74 (QR de retirada no morador): classes `cv-modal-backdrop`/`cv-modal-panel` inexistentes no CSS; remover `condoName` sem uso; avaliar restringir a geração do código aos moradores da unidade.
- Liberação de encomenda na portaria com o código (verificar assinatura, prazo e status `received`, depois marcar como retirada com forma de prova "código de retirada").
- Padronizar o leitor de QR do passe e o da etiqueta em um componente único (`qr-camera-reader` já existe e é reutilizável).

## Preferências da equipe

- Mudanças que afetam o ambiente compartilhado (migrations, deploys, integração na `homolog`, dados de teste) só com autorização explícita.
- Passo a passo: uma etapa aprovada por vez.
- Dados de teste criados no homolog (visitante "Visitante Teste QR Homolog", "Portaria Teste QR", "Portaria Teste 2") podem ser mantidos ou removidos somente se a equipe pedir.
