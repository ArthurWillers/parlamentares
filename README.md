# Parlamentares

Site para consultar despesas da cota parlamentar de deputados federais e senadores brasileiros, com filtros por Casa, parlamentar, partido, estado e período.

## Estado atual

O projeto está na preparação da base técnica: Nuxt UI, TypeScript, geração estática e verificações no CI. A página ainda é a demonstração do template; a coleta de dados e as telas de gastos ainda não foram implementadas. Não há publicação nem analytics configurados.

O escopo inicial é exclusivamente despesas da cota parlamentar. Esses valores não representam todo o custo de um mandato. Proposições, votações, salários e demais benefícios ficam fora desta primeira versão.

## Stack e arquitetura

- Nuxt 4, Vue e TypeScript estrito.
- Nuxt UI e Tailwind CSS, com componentes e tema compartilhados.
- Python para a futura coleta, normalização e agregação dos dados.
- GitHub Actions para verificações e, futuramente, atualização diária.
- Cloudflare Pages para hospedagem estática e Cloudflare Web Analytics para acessos.

Fluxo planejado: fontes oficiais → coleta em Python → validação e agregação → JSONs estáticos → geração do site → publicação na Cloudflare.

O navegador consumirá arquivos publicados com o site. As consultas às fontes oficiais acontecerão no processamento, antes da publicação. Se a coleta ou a validação falhar, a última versão publicada deve continuar disponível.

## Desenvolvimento local

Use Node.js 24 (versão adotada no CI) e o pnpm indicado no campo `packageManager` do `package.json` (atualmente `12.9.1`). Mantenha o `pnpm-lock.yaml`; não misture gerenciadores de pacotes.

Se `pnpm` estiver disponível:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Se aparecer `pnpm: command not found`, é possível usar a versão fixada sem instalação global:

```bash
npm exec --yes --package=pnpm@12.9.1 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@12.9.1 -- pnpm dev
```

O servidor de desenvolvimento fica em `http://localhost:3000`. O erro do scaffolding por falta do pnpm não exige recriar o projeto: basta instalar as dependências.

## Verificações e geração estática

```bash
pnpm lint
pnpm typecheck
pnpm generate
```

Ou execute `pnpm check` para realizar as três verificações em sequência. Os comandos também podem ser executados com o mesmo prefixo `npm exec --yes --package=pnpm@12.9.1 --` usado acima.

`pnpm generate` produz o site estático em `.output/public`. Para conferir localmente o resultado gerado, execute `pnpm preview` após a geração. O comando `pnpm build` permanece disponível para o build padrão do Nuxt; a publicação deste projeto deve usar `generate`.

O CI executa instalação com lockfile congelado, lint, checagem de tipos e geração estática em pushes e pull requests. Ele ainda não coleta dados nem publica o site.

## Cloudflare Pages

Quando configurarmos a publicação, use:

- Versão do Node.js: `24`.
- Comando de build: `pnpm generate`.
- Diretório publicado: `.output/public`.

O site será inteiramente estático, sem depender de Functions ou de um servidor Nuxt em produção. Rotas com parâmetros precisarão ter suas páginas enumeradas para pré-renderização. Ative Cloudflare Web Analytics no painel do Pages quando o projeto estiver publicado.

Na etapa de automação da coleta, o workflow deverá validar os dados e gerar o site antes de publicar. Credenciais de publicação ficarão nos GitHub Actions secrets, nunca no código ou nos arquivos públicos.

## Fontes oficiais

- [Câmara — API e arquivos de dados abertos](https://dadosabertos.camara.leg.br/swagger/api.html).
- [Senado — catálogo de dados abertos](https://www12.senado.leg.br/dados-abertos).
- [Senado — despesas da CEAPS](https://www12.senado.leg.br/dados-abertos/conjuntos?grupo=senadores&portal=Administrativo).

Categorias e regras das duas Casas devem preservar sua origem. Comparações precisam explicar o período considerado, a atribuição partidária e o tratamento de ajustes. Dados indisponíveis não devem aparecer como gasto zero.

## Próximos passos

1. Definir o contrato versionado dos JSONs e a metodologia de despesas.
2. Coletar e validar um ano de dados de Câmara e Senado.
3. Gerar resumos e detalhes divididos por Casa, parlamentar e ano.
4. Construir a primeira tela de gastos com dados reais.
5. Automatizar a atualização diária e a publicação.

Leia [AGENTS.md](./AGENTS.md) antes de alterar o projeto. O código usa licença MIT, preservando a atribuição do template Nuxt UI.
