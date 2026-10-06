from collections import defaultdict


def summarize(records):
    groups = defaultdict(lambda: {'cents': 0, 'count': 0})
    for record in records:
        key = (record['memberId'], record['year'], record['month'], record['party'], record['category'], record['inMandate'])
        groups[key]['cents'] += record['cents']
        groups[key]['count'] += 1
    return [{'memberId': key[0], 'year': key[1], 'month': key[2], 'party': key[3],
             'category': key[4], 'inMandate': key[5], **value} for key, value in sorted(groups.items())]
