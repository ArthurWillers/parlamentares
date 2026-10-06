from concurrent.futures import ThreadPoolExecutor
from datetime import date
from urllib.error import HTTPError
from pipeline.http import as_list
from pipeline.normalize.common import cents, iso_date, official_url, party_at, in_mandate

LEGIS = 'https://legis.senado.leg.br/dadosabertos'
ADMIN = 'https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores'


def registry(client):
    rows = client.json(LEGIS + '/senador/lista/atual.json')['ListaParlamentarEmExercicio']['Parlamentares']['Parlamentar']
    ids = {'senado:' + row['IdentificacaoParlamentar']['CodigoParlamentar'] for row in rows}
    if len(ids) < 70 or len(ids) != len(rows):
        raise ValueError('Cadastro atual do Senado incompleto ou duplicado')
    return ids


def annual_rows(client, year):
    url = ADMIN + f'/despesas_ceaps/{year}'
    rows = client.json(url, cache_days=client.historical_cache_days(year))
    if not isinstance(rows, list) or not rows:
        raise ValueError(f'CEAPS vazia ou contrato inválido: {year}')
    return rows, url


def profiles(client, ids, current, years):
    def collect(key):
        source_id = key.split(':')[1]
        base = LEGIS + '/senador/' + source_id
        cache_days = 0 if key in current else 365
        identification = client.json(base + '.json', cache_days=cache_days)['DetalheParlamentar']['Parlamentar']['IdentificacaoParlamentar']
        data = client.json(base + '/filiacoes.json', cache_days=cache_days)['FiliacaoParlamentar']['Parlamentar']
        affiliations = [{'start': row['DataFiliacao'], 'end': row.get('DataDesfiliacao'),
                         'party': row['Partido']['SiglaPartido']}
                        for row in as_list(data.get('Filiacoes', {}).get('Filiacao')) if row.get('DataFiliacao')]
        data = client.json(base + '/mandatos.json', cache_days=cache_days)['MandatoParlamentar']['Parlamentar']
        mandates = []
        for row in as_list(data.get('Mandatos', {}).get('Mandato')):
            exercises = [item for item in as_list(row.get('Exercicios', {}).get('Exercicio'))
                         if item.get('DataInicio') and item['DataInicio'] <= date.today().isoformat()]
            if not exercises:
                continue
            start = min(item['DataInicio'] for item in exercises)
            end = row.get('SegundaLegislaturaDoMandato', row['PrimeiraLegislaturaDoMandato'])['DataFim']
            # Definitive final exercise may end before the constitutional term.
            if all(item.get('DataFim') for item in exercises):
                end = max(item['DataFim'] for item in exercises)
            mandates.append({'start': start, 'end': end, 'partial': True, 'state': row.get('UfParlamentar')})
        mandate = max(mandates, key=lambda item: item['start']) if mandates else None
        state = identification.get('UfParlamentar') or (mandate.get('state') if mandate else None) or ''
        if mandate:
            mandate.pop('state', None)
        resources = []
        resource_coverage = []
        # Endpoint é individualizado pelo CódigoParlamentar na própria URL.
        for year in years:
            url = ADMIN + f'/{source_id}/recursos-utilizados?ano={year}'
            try:
                response = client.json(url, cache_days=client.historical_cache_days(year))
            except HTTPError as exc:
                if exc.code != 404:
                    raise
                resource_coverage.append({'year': year, 'status': 'unavailable', 'sourceUrl': url, 'reason': 'O endpoint individual não publica recursos para este cadastro (HTTP 404).'})
                continue
            resource_coverage.append({'year': year, 'status': 'collected', 'sourceUrl': url})
            if response.get('statusCode') != 200 or not isinstance(response.get('data'), list):
                raise ValueError('Contrato de recursos do Senado mudou')
            for item in response['data']:
                if item['ano'] != year:
                    raise ValueError('Ano de recursos divergente')
                for expense in item.get('gastosNaoInclusos', {}).get('despesas', []):
                    resources.append({'year': year, 'type': expense['recurso'], 'cents': cents(expense['valor']),
                                      'sourceUrl': url, 'granularity': 'annual'})
        return key, {'id': key, 'name': identification['NomeParlamentar'], 'chamber': 'senadores',
                     'party': identification.get('SiglaPartidoParlamentar') or 'Não informado',
                     'state': state,
                     'photoUrl': official_url(identification.get('UrlFotoParlamentar')),
                     'sourceUrl': official_url(identification.get('UrlPaginaParlamentar')) or base + '.json',
                     'current': key in current, 'mandate': mandate, 'affiliations': affiliations,
                     'otherResources': resources, 'otherResourcesCoverage': resource_coverage}
    with ThreadPoolExecutor(max_workers=4) as executor:
        return dict(executor.map(collect, sorted(ids)))


def normalize(rows, year, members, source_url):
    records = []
    for row in rows:
        if row['ano'] != year or row['mes'] not in range(1, 13):
            raise ValueError('Competência CEAPS inválida')
        member_id = 'senado:' + str(row['codSenador'])
        member = members[member_id]
        issued_at = iso_date(row['data'])
        records.append({'id': 'senado:' + str(row['id']), 'memberId': member_id,
                        'year': year, 'month': row['mes'], 'cents': cents(row['valorReembolsado']),
                        'category': row['tipoDespesa'] or 'Categoria não informada pela fonte', 'categoryOriginal': row['tipoDespesa'], 'categoryCode': None,
                        'party': party_at(member['affiliations'], issued_at, year, row['mes']), 'partyReported': None,
                        'inMandate': in_mandate(member['mandate'], year, row['mes']),
                        'supplier': row['fornecedor'], 'supplierId': row['cpfCnpj'] or None,
                        'issuedAt': issued_at, 'documentId': str(row['id']), 'documentNumber': row['documento'],
                        'documentType': row['tipoDocumento'], 'documentUrl': None, 'portalUrl': None,
                        'sourceUrl': source_url, 'sourceRecord': str(row['id']), 'description': row['detalhamento']})
    return records
