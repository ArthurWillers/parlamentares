# Regras do projeto

## Objetivo e escopo

- Consulta pública de despesas da cota parlamentar de deputados federais e senadores.
- Interface em português do Brasil, com filtros por Casa, parlamentar, partido, estado e período.
- A primeira versão cobre somente gastos. Não adicionar proposições, votações, autenticação ou demais benefícios sem uma mudança explícita de escopo.
- Consultar o README para distinguir recursos implementados de decisões planejadas.

## Arquitetura

- Usar Nuxt 4 estável, Vue, TypeScript estrito, Nuxt UI e Tailwind CSS.
- Publicação inteiramente estática: `pnpm generate`, saída `.output/public`.
- Não introduzir dependência de servidor em produção, APIs em `server/`, banco de dados, Functions ou renderização dinâmica.
- Rotas parametrizadas precisam de entradas de pré-renderização conhecidas; a geração deve funcionar sem servidor em produção.
- Coleta e processamento em Python, executados antes da publicação. Não consultar APIs oficiais diretamente dos componentes ou do navegador.
- Usar as convenções de diretórios do Nuxt. Não criar camadas, classes ou abstrações sem necessidade concreta.

## Responsabilidades

- `app/pages/`: composição de páginas e uso das rotas.
- `app/components/`: apresentação e interação; sem normalização de fontes oficiais.
- `app/composables/`: leitura dos JSONs publicados e estado dos filtros; refletir filtros compartilháveis na URL.
- `app/utils/`: funções puras e formatação.
- `app/assets/css/` e `app/app.config.ts`: estilos, tokens e configuração visual compartilhados.
- `pipeline/sources/`: futuros coletores independentes para Câmara e Senado.
- `pipeline/normalize/`: conversão das fontes ao contrato comum.
- `pipeline/aggregate/`: agregados de despesas por período, parlamentar e partido.
- `pipeline/validate/`: integridade, cobertura e consistência dos agregados.
- `schemas/`: contratos versionados dos arquivos públicos.
- `public/data/`: saída gerada para o navegador. Não editar dados manualmente.
- Criar diretórios do processamento apenas quando houver implementação; o pipeline ainda não existe.

## Integridade dos dados

- Usar IDs estáveis com namespace da Casa. Não usar nomes como chave de junção.
- Representar dinheiro em centavos inteiros; converter a entrada com aritmética decimal exata e conferir limites seguros para JavaScript.
- Preservar categoria original, origem e identificador da despesa. Mapeamentos entre Casas devem ser explícitos e documentados.
- Documentar qual data define o período, como ajustes/estornos são tratados e como duplicatas são identificadas.
- Não descartar valores negativos nem remover registros apenas por terem valores e fornecedores iguais.
- Atribuição partidária histórica precisa de regra verificável; não usar o partido atual silenciosamente para despesas anteriores.
- Não confundir dado ausente, coleta incompleta e zero.
- Publicar fonte, cobertura, horário da coleta em ISO 8601 com fuso, versão do schema e metodologia.
- Agregados devem reconciliar com os detalhes. Filtros locais só podem combinar granularidades publicadas e validadas.
- Não apresentar despesas da cota como todo o custo do mandato nem gastos como medida de qualidade parlamentar.
- Nunca apresentar dados inventados como oficiais. Fixtures devem ser identificadas e isoladas.
- Falha de coleta ou validação impede a nova publicação; preservar a versão válida anterior.

## Interface

- Reutilizar componentes Nuxt UI e centralizar escolhas visuais no tema.
- Manter textos em português, moeda BRL e datas adequadas ao público brasileiro.
- Garantir navegação por teclado, foco visível, rótulos de formulário e layout responsivo.
- Tratar carregamento, ausência de resultados e falha de leitura separadamente.
- Ler as skills de frontend relevantes ao criar ou reformular telas. Não substituir uma consulta de dados por uma landing page promocional.

## Ferramentas e verificações

- Usar Node.js 24 e o pnpm fixado em `package.json`; preservar e atualizar o lockfile com esse gerenciador.
- Não introduzir nightly ou trocar/adicionar dependências sem necessidade concreta explicada.
- Não desabilitar tipos ou lint para fazer uma alteração passar. Evitar `any` e supressões de erros.
- Antes de concluir alterações de aplicação/configuração, executar `pnpm lint`, `pnpm typecheck` e `pnpm generate`.
- Para o pipeline, adicionar testes de invariantes e casos de dinheiro, ajustes, junções e agregação. Testes não devem depender de chamadas à API ao vivo.
- Não adicionar testes que apenas reproduzem a implementação ou exigir testes de aplicação para alterações exclusivamente documentais.
- Nunca versionar segredos, caches, arquivos brutos volumosos ou diretórios de build. Manter atribuições da licença.
- Não marcar recursos planejados como concluídos; relatar verificações que não puderam ser executadas.
