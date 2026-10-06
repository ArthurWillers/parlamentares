<script setup lang="ts">
useSeoMeta({
  title: 'Fontes e metodologia | Parlamentares',
  description: 'De onde vêm os dados de despesas, subsídios e fundos partidários e como eles serão apresentados.'
})

const sources = [
  {
    eyebrow: 'Câmara dos Deputados',
    title: 'Cota parlamentar (CEAP)',
    detail: 'A Câmara publica despesas de cota desde 2008. O arquivo anual inclui categoria, fornecedor, identificador de CPF/CNPJ, documento fiscal e informações do parlamentar. Alguns registros podem vir sem identificador ou com identificadores técnicos; a origem será preservada.',
    coverage: 'API e arquivos anuais',
    href: 'https://dadosabertos.camara.leg.br/swagger/api.html',
    link: 'Abrir API e downloads'
  },
  {
    eyebrow: 'Senado Federal',
    title: 'Cota parlamentar (CEAPS)',
    detail: 'A CEAPS está disponível em CSV e serviço web, com atualização diária. É uma fonte separada da CEAP da Câmara; categorias, regras de reembolso e campos devem ser mapeados sem apagar a classificação original.',
    coverage: 'CSV e serviço web',
    href: 'https://www12.senado.leg.br/dados-abertos/conjuntos?grupo=senadores&portal=Administrativo',
    link: 'Abrir catálogo do Senado'
  },
  {
    eyebrow: 'Senado Federal',
    title: 'Saúde, viagens e outros benefícios',
    detail: 'Há conjuntos específicos para despesas de saúde, passagens fora da cota e outros benefícios. O relatório de saúde consultado não individualiza despesas nem identifica prestadores por proteção à intimidade; a cobertura não permite atribuir esses valores a cada senador.',
    coverage: 'Cobertura varia por benefício',
    href: 'https://www12.senado.leg.br/transparencia/sen/sis/despesas-com-assistencia-a-saude-de-senadores-e-ex-senadores',
    link: 'Ver relatório de saúde'
  },
  {
    eyebrow: 'Câmara dos Deputados',
    title: 'Remuneração e viagens oficiais',
    detail: 'O portal da Câmara oferece consulta à remuneração dos deputados e informações de viagens oficiais, além de cota, moradia e outras verbas. São trilhas distintas; o projeto precisa conferir formato, histórico e individualização de cada conjunto antes de compará-los.',
    coverage: 'Consultas e relatórios',
    href: 'https://www.camara.leg.br/transparencia/gastos-parlamentares/',
    link: 'Abrir gastos parlamentares'
  },
  {
    eyebrow: 'Câmara dos Deputados',
    title: 'Folha remuneratória',
    detail: 'A consulta nominal reúne fichas financeiras pagas pela Câmara, incluindo deputados em exercício e aposentados. Esse valor efetivamente pago deve ficar separado do subsídio previsto em tabela e das despesas reembolsadas.',
    coverage: 'Consulta nominal e relatórios',
    href: 'https://www2.camara.leg.br/transparencia/recursos-humanos/remuneracao',
    link: 'Abrir área de remuneração'
  },
  {
    eyebrow: 'Senado Federal',
    title: 'Subsídio e remuneração',
    detail: 'O portal do Senado publica remuneração/subsídio de senadores ativos e aposentados. Esse valor será mantido separado de cotas e reembolsos, com a periodicidade e o detalhamento informados pela fonte.',
    coverage: 'Dados publicados pelo Senado',
    href: 'https://www12.senado.leg.br/transparencia/prestacao-de-contas/paginas/remuneracao-e-subsidio-recebidos',
    link: 'Ver página de remuneração do Senado'
  },
  {
    eyebrow: 'TSE',
    title: 'Prestação anual dos partidos',
    detail: 'O TSE publica arquivos anuais das prestações de contas partidárias. Os valores descrevem as contas da organização e devem ser exibidos em uma comparação partidária própria, sem serem atribuídos ao parlamentar.',
    coverage: 'Contas partidárias anuais',
    href: 'https://dadosabertos.tse.jus.br/group/prestacao-de-contas-partidarias',
    link: 'Abrir dados abertos do TSE'
  },
  {
    eyebrow: 'TSE',
    title: 'Contas eleitorais, FP e FEFC',
    detail: 'As prestações de contas eleitorais identificam despesas e recursos de campanha, incluindo Fundo Partidário e FEFC. A relação com uma candidatura e o ano eleitoral precisam permanecer explícitos; campanha não é gasto do mandato parlamentar.',
    coverage: 'Arquivos por eleição',
    href: 'https://dadosabertos.tse.jus.br/dataset/380e5337-a918-4013-a987-b92920527087/resource/0ab5db94-6aeb-4d1b-b214-e6f9cb5ca712',
    link: 'Ver arquivos do TSE'
  }
]

const principles = [
  ['Identidade estável', 'Junções por identificador da Casa, nunca apenas pelo nome. Filiação partidária deve respeitar a data da despesa.'],
  ['Período com cobertura', '“Mandato” usa as datas daquele mandato e só soma registros disponíveis. Uma coleta parcial aparece como parcial, nunca como total.'],
  ['Sem registro não é zero', 'Dado ausente, não individualizado ou coleta incompleta terá estado próprio, sem ser convertido em gasto zero.'],
  ['Origem preservada', 'A categoria e o identificador originais ficam disponíveis. Agregados devem reconciliar com as despesas publicadas.'],
  ['Consulta cadastral auxiliar', 'Se houver CNPJ/CPF publicado, uma consulta cadastral opcional poderá acrescentar contexto. Ela não modifica a despesa nem substitui a fonte oficial.']
]
</script>

<template>
  <main class="sources-page">
    <p class="breadcrumbs">
      <NuxtLink to="/">Visão geral</NuxtLink><span aria-hidden="true">/</span> Fontes e metodologia
    </p>

    <header class="sources-intro">
      <p class="intro-kicker">
        Transparência também é mostrar limites
      </p>
      <h1>De onde vem cada número.</h1>
      <p>Este projeto vai reunir arquivos públicos das Casas Legislativas e do TSE. As integrações ainda não foram implementadas: os números nas outras telas são apenas demonstrações fictícias.</p>
      <span class="integration-status"><i aria-hidden="true" /> Fontes mapeadas · coleta em desenvolvimento</span>
    </header>

    <section
      class="source-cards"
      aria-label="Fontes públicas"
    >
      <article
        v-for="source in sources"
        :key="source.title"
        class="source-card"
      >
        <header>
          <span>{{ source.eyebrow }}</span><UIcon
            name="i-lucide-arrow-up-right"
            aria-hidden="true"
          />
        </header>
        <h2>{{ source.title }}</h2>
        <p>{{ source.detail }}</p>
        <footer>
          <span>{{ source.coverage }}</span><a
            :href="source.href"
            target="_blank"
            rel="noreferrer"
          >{{ source.link }} <UIcon
            name="i-lucide-external-link"
            aria-hidden="true"
          /></a>
        </footer>
      </article>
    </section>

    <section
      class="methodology-section"
      aria-labelledby="methodology-title"
    >
      <div class="methodology-title-block">
        <span
          class="methodology-icon"
          aria-hidden="true"
        ><UIcon name="i-lucide-scale" /></span>
        <div>
          <p class="intro-kicker">
            Regras de leitura
          </p><h2 id="methodology-title">
            Como vamos tratar os dados
          </h2>
        </div>
      </div>
      <dl class="principle-list">
        <div
          v-for="[title, description] in principles"
          :key="title"
        >
          <dt>{{ title }}</dt><dd>{{ description }}</dd>
        </div>
      </dl>
    </section>

    <section class="profile-image-note">
      <div
        class="disclosure-icon"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-image" />
      </div>
      <div>
        <h2>Fotos dos parlamentares</h2>
        <p>Os serviços da Câmara e do Senado incluem URLs de foto para parlamentares. Os perfis usarão a imagem oficial quando a fonte fornecer um endereço válido; até lá, a prévia usa apenas iniciais fictícias.</p>
        <div class="source-photo-links">
          <a
            href="https://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/obterdeputados"
            target="_blank"
            rel="noreferrer"
          >Fotos da Câmara <UIcon
            name="i-lucide-external-link"
            aria-hidden="true"
          /></a>
          <a
            href="https://www12.senado.leg.br/dados-abertos/legislativo/parlamentares/senadores-em-exercicio/info/webservice-de-senadores-em-exercicio"
            target="_blank"
            rel="noreferrer"
          >Fotos e mandatos do Senado <UIcon
            name="i-lucide-external-link"
            aria-hidden="true"
          /></a>
        </div>
      </div>
    </section>

    <footer class="sources-footer">
      <p>Dados oficiais são publicados por cada instituição. Este site é independente e não representa a Câmara, o Senado ou o TSE.</p>
      <NuxtLink to="/">Voltar à visão geral <UIcon
        name="i-lucide-arrow-right"
        aria-hidden="true"
      /></NuxtLink>
    </footer>
  </main>
</template>
