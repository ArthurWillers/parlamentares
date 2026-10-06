"""Dinheiro exato e junções temporais conservadoras."""
import calendar
import re
from datetime import date
from decimal import Decimal, InvalidOperation, localcontext

MAX_SAFE_INTEGER = 2 ** 53 - 1
UNKNOWN_PARTY = 'Sem atribuição verificável'


def cents(value, brazilian=False):
    if value is None or value == '':
        raise ValueError('Valor monetário ausente')
    if isinstance(value, (float, bool)):
        raise ValueError('Dinheiro precisa ser string, Decimal ou inteiro')
    text = str(value).strip()
    if brazilian:
        text = text.replace('.', '').replace(',', '.')
    try:
        value_decimal = Decimal(text)
        with localcontext() as context:
            context.prec = max(28, len(value_decimal.as_tuple().digits) + 3)
            amount = value_decimal * 100
    except InvalidOperation as exc:
        raise ValueError(f'Dinheiro inválido: {value}') from exc
    if not amount.is_finite() or amount != amount.to_integral_value():
        raise ValueError(f'Precisão monetária inválida: {value}')
    result = int(amount)
    if abs(result) > MAX_SAFE_INTEGER:
        raise ValueError('Dinheiro excede limite seguro de JavaScript')
    return result


def official_url(value):
    return value.replace('http://', 'https://', 1) if value else None


def iso_date(value):
    if not value:
        return None
    result = str(value)[:10]
    date.fromisoformat(result)
    return result


def party_at(affiliations, issued_at, year, month):
    start = f'{year:04}-{month:02}-01'
    end = f'{year:04}-{month:02}-{calendar.monthrange(year, month)[1]:02}'
    if issued_at:
        start = end = issued_at
    parties = {item['party'] for item in affiliations
               if item['start'] <= start and (not item['end'] or item['end'] >= end)}
    return next(iter(parties)) if len(parties) == 1 else UNKNOWN_PARTY


def in_mandate(mandate, year, month):
    if not mandate:
        return False
    start = f'{year:04}-{month:02}-01'
    end = f'{year:04}-{month:02}-{calendar.monthrange(year, month)[1]:02}'
    # Sem dia da competência, não atribuir meses de fronteira pela data da nota.
    return mandate['start'] <= start and end <= mandate['end']


def supplier_key(identifier, expense_id):
    digits = re.sub(r'\D', '', identifier or '')
    # Ausentes e identificadores técnicos ficam separados por registro.
    if len(digits) not in (11, 14) or int(digits) <= 7:
        return 'unidentified:' + expense_id
    return digits
