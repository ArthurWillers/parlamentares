"""Retry handling for incomplete responses from public data APIs."""
import hashlib
import http.client
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pipeline.http import Client


class Response:
    def __init__(self, body):
        self.body = body
        self.headers = {'ETag': '"snapshot"', 'Last-Modified': 'Tue, 06 Oct 2026 00:00:00 GMT'}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return self.body


class HttpRetryTests(unittest.TestCase):
    def test_incomplete_read_retries_and_only_caches_complete_body(self):
        url = 'https://example.gov.br/expenses.json'
        body = b'{"data": []}'

        with tempfile.TemporaryDirectory() as directory:
            client = Client(cache=Path(directory))
            with patch('pipeline.http.urlopen', side_effect=[
                http.client.IncompleteRead(b'{"data":', 303), Response(body)
            ]) as open_url, patch('pipeline.http.time.sleep'):
                self.assertEqual(client.get(url), body)

            self.assertEqual(open_url.call_count, 2)
            key = hashlib.sha256(url.encode()).hexdigest()
            self.assertEqual((Path(directory) / key).read_bytes(), body)
            metadata = json.loads((Path(directory) / f'{key}.json').read_text())
            self.assertEqual(metadata['sha256'], hashlib.sha256(body).hexdigest())
            self.assertEqual(client.sources[url]['etag'], '"snapshot"')


if __name__ == '__main__':
    unittest.main()
