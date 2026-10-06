export type Chamber = 'deputados' | 'senadores'
export type ExpensePeriod = 'ano' | 'mandato' | 'q1' | 'q2' | 'q3' | 'q4'

export const expenseCategories = [
  'Divulgação da atividade',
  'Passagens e locomoção',
  'Veículos e combustíveis',
  'Hospedagem e alimentação'
] as const

export type ExpenseCategory = typeof expenseCategories[number]

export interface PreviewParliamentarian {
  id: string
  name: string
  chamber: Chamber
  party: string
  state: string
  monthlyCents: number[]
  categoryShares: Record<ExpenseCategory, number>
}

/**
 * Fixture exclusiva da prévia visual. Nomes, partidos e valores são inventados;
 * não representam parlamentares, filiações nem despesas oficiais.
 */
export const previewParliamentarians: PreviewParliamentarian[] = [
  {
    id: 'demo-dep-01', name: 'Deputada Ana Exemplo', chamber: 'deputados', party: 'Partido Exemplo A', state: 'BA',
    monthlyCents: [3_140_000, 2_860_000, 3_420_000, 2_970_000, 3_180_000, 3_650_000, 3_290_000, 3_010_000, 3_540_000, 3_260_000, 3_730_000, 3_410_000],
    categoryShares: { 'Divulgação da atividade': 30, 'Passagens e locomoção': 28, 'Veículos e combustíveis': 24, 'Hospedagem e alimentação': 18 }
  },
  {
    id: 'demo-dep-02', name: 'Deputado Bruno Exemplo', chamber: 'deputados', party: 'Partido Exemplo B', state: 'SP',
    monthlyCents: [2_640_000, 2_930_000, 3_080_000, 2_810_000, 2_760_000, 3_120_000, 2_950_000, 3_360_000, 2_880_000, 3_110_000, 3_250_000, 2_970_000],
    categoryShares: { 'Divulgação da atividade': 24, 'Passagens e locomoção': 34, 'Veículos e combustíveis': 27, 'Hospedagem e alimentação': 15 }
  },
  {
    id: 'demo-dep-03', name: 'Deputada Clara Exemplo', chamber: 'deputados', party: 'Partido Exemplo A', state: 'PE',
    monthlyCents: [2_380_000, 2_750_000, 2_610_000, 2_920_000, 3_170_000, 2_850_000, 3_080_000, 2_740_000, 3_260_000, 3_010_000, 2_890_000, 3_330_000],
    categoryShares: { 'Divulgação da atividade': 36, 'Passagens e locomoção': 25, 'Veículos e combustíveis': 19, 'Hospedagem e alimentação': 20 }
  },
  {
    id: 'demo-dep-04', name: 'Deputado Diego Exemplo', chamber: 'deputados', party: 'Partido Exemplo C', state: 'AM',
    monthlyCents: [3_460_000, 3_120_000, 3_770_000, 3_580_000, 3_240_000, 3_910_000, 3_620_000, 3_480_000, 3_950_000, 3_710_000, 4_020_000, 3_660_000],
    categoryShares: { 'Divulgação da atividade': 21, 'Passagens e locomoção': 43, 'Veículos e combustíveis': 22, 'Hospedagem e alimentação': 14 }
  },
  {
    id: 'demo-dep-05', name: 'Deputada Eva Exemplo', chamber: 'deputados', party: 'Partido Exemplo B', state: 'MG',
    monthlyCents: [2_570_000, 2_830_000, 2_740_000, 3_060_000, 2_920_000, 3_280_000, 3_110_000, 2_980_000, 3_370_000, 3_140_000, 3_460_000, 3_220_000],
    categoryShares: { 'Divulgação da atividade': 28, 'Passagens e locomoção': 26, 'Veículos e combustíveis': 31, 'Hospedagem e alimentação': 15 }
  },
  {
    id: 'demo-dep-06', name: 'Deputado Felipe Exemplo', chamber: 'deputados', party: 'Partido Exemplo C', state: 'CE',
    monthlyCents: [2_910_000, 3_260_000, 3_040_000, 3_490_000, 3_210_000, 3_670_000, 3_380_000, 3_150_000, 3_740_000, 3_520_000, 3_860_000, 3_590_000],
    categoryShares: { 'Divulgação da atividade': 25, 'Passagens e locomoção': 31, 'Veículos e combustíveis': 25, 'Hospedagem e alimentação': 19 }
  },
  {
    id: 'demo-dep-07', name: 'Deputado Gil Exemplo', chamber: 'deputados', party: 'Partido Exemplo A', state: 'RJ',
    monthlyCents: [2_420_000, 2_710_000, 2_590_000, 2_840_000, 3_020_000, 2_930_000, 3_160_000, 2_870_000, 3_210_000, 3_060_000, 3_330_000, 3_110_000],
    categoryShares: { 'Divulgação da atividade': 32, 'Passagens e locomoção': 23, 'Veículos e combustíveis': 29, 'Hospedagem e alimentação': 16 }
  },
  {
    id: 'demo-dep-08', name: 'Deputada Helena Exemplo', chamber: 'deputados', party: 'Partido Exemplo B', state: 'RS',
    monthlyCents: [2_750_000, 2_980_000, 3_120_000, 2_960_000, 3_280_000, 3_050_000, 3_440_000, 3_180_000, 3_530_000, 3_290_000, 3_610_000, 3_370_000],
    categoryShares: { 'Divulgação da atividade': 27, 'Passagens e locomoção': 29, 'Veículos e combustíveis': 26, 'Hospedagem e alimentação': 18 }
  },
  {
    id: 'demo-sen-01', name: 'Senador Ivo Exemplo', chamber: 'senadores', party: 'Partido Exemplo A', state: 'GO',
    monthlyCents: [4_230_000, 3_970_000, 4_450_000, 4_180_000, 4_610_000, 4_320_000, 4_780_000, 4_510_000, 4_940_000, 4_660_000, 5_020_000, 4_790_000],
    categoryShares: { 'Divulgação da atividade': 26, 'Passagens e locomoção': 32, 'Veículos e combustíveis': 24, 'Hospedagem e alimentação': 18 }
  },
  {
    id: 'demo-sen-02', name: 'Senadora Joana Exemplo', chamber: 'senadores', party: 'Partido Exemplo C', state: 'MT',
    monthlyCents: [3_810_000, 4_120_000, 3_960_000, 4_370_000, 4_090_000, 4_540_000, 4_280_000, 4_710_000, 4_430_000, 4_860_000, 4_590_000, 4_980_000],
    categoryShares: { 'Divulgação da atividade': 34, 'Passagens e locomoção': 29, 'Veículos e combustíveis': 20, 'Hospedagem e alimentação': 17 }
  },
  {
    id: 'demo-sen-03', name: 'Senador Kelvin Exemplo', chamber: 'senadores', party: 'Partido Exemplo B', state: 'PR',
    monthlyCents: [3_620_000, 3_940_000, 4_280_000, 3_980_000, 4_360_000, 4_110_000, 4_570_000, 4_240_000, 4_690_000, 4_420_000, 4_830_000, 4_560_000],
    categoryShares: { 'Divulgação da atividade': 23, 'Passagens e locomoção': 35, 'Veículos e combustíveis': 25, 'Hospedagem e alimentação': 17 }
  },
  {
    id: 'demo-sen-04', name: 'Senadora Lia Exemplo', chamber: 'senadores', party: 'Partido Exemplo C', state: 'PA',
    monthlyCents: [4_010_000, 4_340_000, 4_110_000, 4_580_000, 4_290_000, 4_720_000, 4_460_000, 4_910_000, 4_650_000, 5_070_000, 4_820_000, 5_180_000],
    categoryShares: { 'Divulgação da atividade': 29, 'Passagens e locomoção': 36, 'Veículos e combustíveis': 18, 'Hospedagem e alimentação': 17 }
  }
]

export const brazilianStates = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
  ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins']
] as const
