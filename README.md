# Parlamentares

Site para consultar despesas e informações financeiras públicas relacionadas ao exercício do mandato de deputados federais e senadores brasileiros, com recortes por Casa, parlamentar, partido, estado e período.

## Estado atual

O projeto tem uma prévia responsiva com visão geral, rankings, perfis individuais e uma página de fontes e metodologia. Filtros são compartilháveis na URL. Nomes, partidos, fornecedores, categorias e valores da prévia são fictícios e identificados na interface; não representam dados oficiais. A coleta de dados ainda não foi implementada. Não há publicação nem analytics configurados.

O escopo em evolução reúne dados financeiros que possam ser atribuídos com segurança ao mandato: cotas, subsídios/remuneração e outros reembolsos ou benefícios publicados. Cada tipo ficará separado, com fonte e cobertura próprias; não serão somados como um custo único quando a metodologia não permitir comparação. Os dados do Fundo Partidário e do Fundo Especial de Financiamento de Campanha (FEFC), do TSE, serão uma visão à parte de contas partidárias/eleitorais, sem atribuição ao gasto pessoal do parlamentar. Proposições e votações continuam fora do escopo.

## Stack e arquitetura

- Nuxt 4, Vue e TypeScript estrito.
- Nuxt UI e Tailwind CSS, com componentes e tema compartilhados.
- Python para a futura coleta, normalização e agregação dos dados antes da publicação.
- GitHub Actions para verificações e, futuramente, atualização diária.
- Cloudflare Pages para hospedagem estática e Cloudflare Web Analytics para acessos.

Fluxo planejado: fontes oficiais → coleta em Python → validação e agregação por tipo de dado → JSONs estáticos → geração do site → publicação na Cloudflare. A consulta opcional a dados cadastrais de fornecedores poderá complementar um CNPJ publicado pela fonte, mas não modificará o registro original nem será necessária para mostrar despesas.

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

- [Câmara — API e arquivos de dados abertos](https://dadosabertos.camara.leg.br/swagger/api.html): despesas da CEAP e dados dos deputados, incluindo URL de foto. O guia da [estrutura dos arquivos CEAP](https://dadosabertos.camara.leg.br/howtouse/2023-12-26-dados-ceap.html) descreve fornecedor e CPF/CNPJ e ressalva registros sem identificador ou com valores técnicos.
- [Senado — catálogo de dados abertos](https://www12.senado.leg.br/dados-abertos), incluindo [CEAPS](https://www12.senado.leg.br/dados-abertos/conjuntos?grupo=senadores&portal=Administrativo), assistência à saúde, passagens e outros benefícios. A cobertura e o nível de individualização variam; por exemplo, o relatório de [despesas de saúde](https://www12.senado.leg.br/transparencia/sen/sis/despesas-com-assistencia-a-saude-de-senadores-e-ex-senadores) não identifica senador nem prestador em alguns dados publicados.
- [Senado — dados abertos de senadores em exercício](https://www12.senado.leg.br/dados-abertos/legislativo/parlamentares/senadores-em-exercicio/info/webservice-de-senadores-em-exercicio): identificação do senador, filiação, foto oficial e informações de mandatos.
- [Senado — remuneração e subsídio](https://www12.senado.leg.br/transparencia/prestacao-de-contas/paginas/remuneracao-e-subsidio-recebidos): fonte remuneratória será tratada à parte dos reembolsos e despesas de cota.
- [TSE — prestação de contas partidárias](https://dadosabertos.tse.jus.br/group/prestacao-de-contas-partidarias) e dados de [contas eleitorais com Fundo Partidário e FEFC](https://dadosabertos.tse.jus.br/dataset/380e5337-a918-4013-a987-b92920527087/resource/0ab5db94-6aeb-4d1b-b214-e6f9cb5ca712). São contas de partidos e campanhas, não gastos do mandato individual.

Categorias e regras das duas Casas devem preservar sua origem. Comparações precisam explicar o período considerado, a atribuição partidária e o tratamento de ajustes. A visualização por mandato deve usar os limites temporais de cada mandato e mostrar cobertura parcial quando houver. Dados indisponíveis, não individualizados ou de coleta incompleta não devem aparecer como gasto zero. Ranking de menor valor significa somente menor valor publicado no mesmo recorte e cobertura; não mede qualidade ou eficiência.

## Próximos passos

1. Definir contratos versionados para cada conjunto, mantendo despesas da cota, remuneração, benefícios e contas partidárias em coleções distintas.
2. Implementar coletores e validações para CEAP e CEAPS, incluindo dinheiro em centavos, documentos/identificadores e reconciliação dos agregados.
3. Mapear outras fontes remuneratórias e de benefícios, publicando apenas valores individualizados com cobertura documentada.
4. Criar uma visão separada para prestações de contas do TSE e adicionar testes de integridade e metodologia.
5. Ligar a interface aos arquivos publicados e remover as fixtures demonstrativas.
6. Automatizar a atualização e a publicação estática.

Leia [AGENTS.md](./AGENTS.md) antes de alterar o projeto. O código usa licença MIT, preservando a atribuição do template Nuxt UI.
