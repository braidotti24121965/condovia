# CondoVia — regras obrigatórias de interface

Estas regras fazem parte do design system e se aplicam a toda tela nova ou alterada. Não criar exceções locais sem orientação expressa do responsável.

- Botões usam o componente `Button` e os tokens existentes. Texto em uma linha, largura determinada pelo conteúdo, sem comprimir botões em uma coluna estreita. Quando falta espaço, mover a ação para outra linha. Nunca quebrar o texto para caber no grid.
- Formulários com grid devem reservar espaço para a ação: `.cv-form-grid > .button` ocupa a linha inteira e mantém largura intrínseca. Grupos de ações precisam de gap e wrap; formulários consecutivos precisam de espaçamento.
- Combos usam `ContentSelect` de `src/components/ui/form-controls.tsx`: medir a maior opção da lista completa, incluindo placeholder, fonte, padding e seta. Recalcular quando a lista muda. Limitar à largura disponível sem esticar o campo para preencher a tela.
- Datas usam `DateInput`: exibição e digitação `dd/mm/aaaa`, calendário acessível, validação de data real e envio ISO `aaaa-mm-dd`, sem conversão de fuso.
- CPF, CNPJ, telefone e e-mail usam `FormattedInput`. CPF/CNPJ com pontuação; CNPJ preserva letras. Telefone com DDD e máscara de 10/11 dígitos. E-mail usa tipo email, exemplo de formato, validação nativa e normalização ao sair do campo.
- Navegação interna deve identificar permanentemente a tela atual com `aria-current="page"` e destaque visual contrastante, inclusive em rotas de detalhes. Foco temporário não substitui seleção ativa.
- Verificar geometria em desktop, tablet e celular: botões em uma linha, sem sobreposição, controles dentro da tela. Checks de código não equivalem à validação visual.
- Alterações devem reutilizar componentes e regras compartilhados. Não introduzir outro design system nem modificar lógica de negócio para ajustar apresentação.

Referência: `docs/condovia-padronizacao-largura-campos.md`.
