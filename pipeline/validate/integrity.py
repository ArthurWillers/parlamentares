from collections import Counter
from pipeline.normalize.common import MAX_SAFE_INTEGER


def safe_money(value):
    if isinstance(value, bool) or not isinstance(value, int) or abs(value) > MAX_SAFE_INTEGER:
        raise ValueError('Centavos fora do contrato')


def validate(records, summary, members):
    seen = set()
    detail_totals, summary_totals = Counter(), Counter()
    detail_counts, summary_counts = Counter(), Counter()
    for row in records:
        if row['id'] in seen:
            raise ValueError(f"Identificador de despesa duplicado: {row['id']}")
        seen.add(row['id'])
        if row['memberId'] not in members or not row['id'].startswith(row['memberId'].split(':')[0] + ':'):
            raise ValueError('Junção inválida de parlamentar/Casa')
        if row['month'] not in range(1, 13) or not row['category'] or not row['sourceUrl']:
            raise ValueError('Registro sem competência, categoria ou origem')
        chamber = members[row['memberId']].get('chamber')
        if chamber == 'deputados' and not str(row.get('portalUrl') or '').startswith(
            'https://www.camara.leg.br/cota-parlamentar/sumarizado?'
        ):
            raise ValueError('Despesa da Câmara sem link para consulta oficial')
        if chamber == 'senadores' and row.get('portalUrl') is not None:
            raise ValueError('Despesa do Senado com link de portal da Câmara')
        safe_money(row['cents'])
        key = (row['memberId'], row['year'], row['month'], row['party'], row['category'], row['inMandate'])
        detail_totals[key] += row['cents']
        detail_counts[key] += 1
    for row in summary:
        safe_money(row['cents'])
        key = (row['memberId'], row['year'], row['month'], row['party'], row['category'], row['inMandate'])
        summary_totals[key] += row['cents']
        summary_counts[key] += row['count']
    # Comparar dicts, inclusive grupos com soma zero.
    if dict(detail_totals) != dict(summary_totals) or dict(detail_counts) != dict(summary_counts):
        raise ValueError('Agregados não reconciliam com detalhes')
    for member in members.values():
        for resource in member.get('otherResources', []):
            safe_money(resource['cents'])
    safe_money(sum(row['cents'] for row in records))
