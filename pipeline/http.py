"""Cliente HTTP com cache auditável; erros nunca viram resposta vazia."""
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class Client:
    def __init__(self, cache=Path('.cache/pipeline'), offline=False, reuse_cache=False):
        self.cache = cache
        self.offline = offline
        self.reuse_cache = reuse_cache
        self.sources = {}
        cache.mkdir(parents=True, exist_ok=True)

    def get(self, url):
        key = hashlib.sha256(url.encode()).hexdigest()
        path = self.cache / key
        metadata_path = self.cache / (key + '.json')
        previous = json.loads(metadata_path.read_text()) if metadata_path.exists() else None
        if self.offline or (self.reuse_cache and previous and path.exists()):
            if not previous or not path.exists():
                raise ValueError(f'Cache ausente para {url}')
            body = path.read_bytes()
            if hashlib.sha256(body).hexdigest() != previous['sha256']:
                raise ValueError(f'Cache corrompido: {url}')
            self.sources[url] = previous
            if previous.get('httpStatus') == 404:
                raise HTTPError(url, 404, 'Not Found (cached)', None, None)
            return body
        headers = {'User-Agent': 'Parlamentares/1.0 (public financial data)', 'Accept': '*/*'}
        if previous and path.exists():
            if previous.get('etag'):
                headers['If-None-Match'] = previous['etag']
            if previous.get('lastModified'):
                headers['If-Modified-Since'] = previous['lastModified']
        for attempt in range(4):
            try:
                with urlopen(Request(url, headers=headers), timeout=90) as response:
                    body = response.read()
                    metadata = {'url': url, 'fetchedAt': datetime.now(timezone.utc).isoformat(),
                                'sha256': hashlib.sha256(body).hexdigest(),
                                'etag': response.headers.get('ETag'),
                                'lastModified': response.headers.get('Last-Modified')}
                tmp = path.with_suffix('.tmp')
                tmp.write_bytes(body)
                os.replace(tmp, path)
                metadata_path.write_text(json.dumps(metadata))
                self.sources[url] = metadata
                return body
            except HTTPError as exc:
                if exc.code == 404:
                    body = exc.read()
                    metadata = {'url': url, 'httpStatus': 404, 'fetchedAt': datetime.now(timezone.utc).isoformat(), 'sha256': hashlib.sha256(body).hexdigest()}
                    path.write_bytes(body)
                    metadata_path.write_text(json.dumps(metadata))
                    self.sources[url] = metadata
                    raise
                if exc.code == 304 and previous and path.exists():
                    body = path.read_bytes()
                    if hashlib.sha256(body).hexdigest() != previous['sha256']:
                        raise ValueError(f'Cache corrompido: {url}')
                    previous['fetchedAt'] = datetime.now(timezone.utc).isoformat()
                    metadata_path.write_text(json.dumps(previous))
                    self.sources[url] = previous
                    return body
                if exc.code not in (429, 500, 502, 503, 504) or attempt == 3:
                    raise
            except (URLError, TimeoutError):
                if attempt == 3:
                    raise
            time.sleep(2 ** attempt)
        raise RuntimeError(f'Falha de coleta: {url}')

    def json(self, url):
        return json.loads(self.get(url), parse_float=Decimal)


def as_list(value):
    return value if isinstance(value, list) else [value] if value else []
