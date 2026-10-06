"""python -m pipeline.collect [--start-year 2018] [--end-year YYYY] [--offline]."""
import argparse
import hashlib
import json
import os
import shutil
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from pipeline.http import Client
from pipeline.sources import camara, senado
from pipeline.aggregate.expenses import summarize
from pipeline.validate.integrity import validate


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def publish(destination, members, records, summaries, metadata):
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='.financial-data-', dir=destination.parent))
    backup = destination.with_name('.data-previous')
    try:
        profiles = []
        for member in sorted(members.values(), key=lambda row: row['id']):
            profiles.append({key: value for key, value in member.items() if key not in ('affiliations', 'otherResources', 'otherResourcesCoverage')})
            write_json(staging / 'members' / (member['id'] + '.json'), member)
        write_json(staging / 'members.json', profiles)
        for year, rows in summaries.items():
            write_json(staging / f'summary-{year}.json', rows)
        grouped = defaultdict(list)
        for row in records:
            grouped[(row['memberId'], row['year'])].append(row)
        # Um arquivo vazio significa fonte coletada com sucesso, sem registros publicados.
        for member_id in members:
            for year in metadata['years']:
                write_json(staging / 'expenses' / member_id / f'{year}.json',
                           sorted(grouped[(member_id, year)], key=lambda row: (row['month'], row['id'])))
        write_json(staging / 'index.json', {key: value for key, value in metadata.items() if key != 'sources'})
        metadata['files'] = {str(path.relative_to(staging)): hashlib.sha256(path.read_bytes()).hexdigest()
                             for path in sorted(staging.rglob('*.json'))}
        metadata['profileIds'] = sorted(members)
        write_json(staging / 'manifest.json', metadata)
        verify_output(staging)
        if backup.exists():
            shutil.rmtree(backup)
        if destination.exists():
            os.replace(destination, backup)
        try:
            os.replace(staging, destination)
        except BaseException:
            if backup.exists():
                os.replace(backup, destination)
            raise
        if backup.exists():
            shutil.rmtree(backup)
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def verify_output(directory):
    manifest = json.loads((directory / 'manifest.json').read_text())
    if manifest['schemaVersion'] != '1.1.0':
        raise ValueError('Schema desconhecido')
    for relative, expected in manifest['files'].items():
        if Path(relative).is_absolute() or '..' in Path(relative).parts:
            raise ValueError('Caminho de manifesto inválido')
        if hashlib.sha256((directory / relative).read_bytes()).hexdigest() != expected:
            raise ValueError(f'Checksum inválido: {relative}')
    members = {row['id']: row for row in json.loads((directory / 'members.json').read_text())}
    if sorted(members) != manifest['profileIds']:
        raise ValueError('Perfis não reconciliam com manifesto')
    for member_id, member in members.items():
        profile = json.loads((directory / 'members' / (member_id + '.json')).read_text())
        if profile['id'] != member_id or any(profile.get(key) != value for key, value in member.items()):
            raise ValueError('Perfil detalhado diverge do cadastro')
        validate([], [], {member_id: profile})
    for year in manifest['years']:
        records = []
        for member_id in members:
            details = json.loads((directory / 'expenses' / member_id / f'{year}.json').read_text())
            if any(row['memberId'] != member_id or row['year'] != year for row in details):
                raise ValueError('Arquivo detalhado contém parlamentar ou ano divergente')
            records.extend(details)
        summary = json.loads((directory / f'summary-{year}.json').read_text())
        validate(records, summary, members)
        for coverage in manifest['coverage']:
            if coverage['year'] == year:
                house_rows = [row for row in records if members[row['memberId']]['chamber'] == coverage['chamber']]
                if coverage['records'] != len(house_rows) or coverage['cents'] != sum(row['cents'] for row in house_rows):
                    raise ValueError('Cobertura não reconcilia com detalhes')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start-year', type=int, default=2018)
    parser.add_argument('--end-year', type=int, default=datetime.now(timezone.utc).year)
    parser.add_argument('--resume', action='store_true', help='Desenvolvimento: reutiliza cache e busca apenas URLs ausentes')
    parser.add_argument('--offline', action='store_true', help='Reprocessa exclusivamente o cache, sem nova coleta')
    parser.add_argument('--output', type=Path, default=Path('public/data'))
    args = parser.parse_args()
    if not 2018 <= args.start_year <= args.end_year <= datetime.now(timezone.utc).year:
        parser.error('Intervalo suportado: 2018 até o ano corrente')
    years = list(range(args.start_year, args.end_year + 1))
    client = Client(offline=args.offline, reuse_cache=args.resume)
    current_deputies = camara.registry(client)
    current_senators = senado.registry(client)
    raw = {}
    for year in years:
        print(f'Coletando CEAP/CEAPS {year}...', flush=True)
        raw[('deputados', year)] = camara.annual_rows(client, year)
        raw[('senadores', year)] = senado.annual_rows(client, year)
    deputy_ids = set(current_deputies)
    senator_ids = set(current_senators)
    for (chamber, _year), (rows, _url) in raw.items():
        if chamber == 'deputados':
            deputy_ids.update('camara:' + row['ideCadastro'] for row in rows if row['ideCadastro'])
        else:
            senator_ids.update('senado:' + str(row['codSenador']) for row in rows)
    print(f'Coletando perfis/históricos: {len(deputy_ids)} deputados e {len(senator_ids)} senadores...', flush=True)
    members = camara.profiles(client, deputy_ids, current_deputies)
    print('Históricos da Câmara completos. Coletando Senado e recursos fora da cota...', flush=True)
    members.update(senado.profiles(client, senator_ids, current_senators, years))
    records = []
    summaries = {}
    coverage = []
    for year in years:
        year_records = []
        for chamber in ('deputados', 'senadores'):
            rows, url = raw[(chamber, year)]
            unattributed = {'records': 0, 'cents': 0}
            if chamber == 'deputados':
                normalized, unattributed = camara.normalize(rows, year, members, url)
            else:
                normalized = senado.normalize(rows, year, members, url)
            year_records.extend(normalized)
            coverage.append({'chamber': chamber, 'year': year, 'status': 'collected',
                             'ongoing': year == datetime.now(timezone.utc).year,
                             'sourceUrl': url, 'records': len(normalized),
                             'cents': sum(row['cents'] for row in normalized),
                             'latestMonth': max(row['month'] for row in normalized),
                             'unattributed': unattributed})
        summaries[year] = summarize(year_records)
        validate(year_records, summaries[year], members)
        records.extend(year_records)
    validate(records, [row for summary in summaries.values() for row in summary], members)
    for member in members.values():
        if member['mandate']:
            member['mandate']['partial'] = (member['mandate']['start'] < f'{years[0]}-01-01'
                                            or member['mandate']['end'] > datetime.now(timezone.utc).date().isoformat()
                                            or member['mandate']['start'][-2:] != '01')
    metadata = {'schemaVersion': '1.1.0', 'generatedAt': datetime.now(timezone.utc).isoformat(),
                'collectionMode': 'cached' if args.offline or args.resume else 'live', 'years': years,
                'coverage': coverage, 'sources': sorted(client.sources.values(), key=lambda row: row['url']),
                'methodologyUrl': '/fontes', 'remuneration': {'status': 'not-integrated',
                'reason': 'Não foi validado um vínculo por identificador entre folhas de remuneração e cadastros parlamentares.'}}
    publish(args.output, members, records, summaries, metadata)
    print(f'Publicado localmente: {len(members)} perfis, {len(records)} despesas validadas.', flush=True)


if __name__ == '__main__':
    main()
