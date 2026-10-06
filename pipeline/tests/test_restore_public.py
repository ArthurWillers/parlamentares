"""Snapshot restore integrity tests using local in-memory responses."""
import gzip
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from unittest.mock import patch

from pipeline.collect import publish, verify_output
from pipeline.compress_public import compress_public_data
from pipeline.restore_public import restore_public_snapshot


class RestorePublicTests(unittest.TestCase):
    def test_restores_and_validates_compressed_published_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            published_data = root / 'published' / 'data'
            output = root / 'working' / 'data'
            member = {
                'id': 'camara:42', 'name': 'Pessoa de teste', 'chamber': 'deputados',
                'party': 'PARTIDO', 'state': 'DF', 'photoUrl': None,
                'sourceUrl': 'https://dadosabertos.camara.leg.br/api/v2/deputados/42',
                'current': True, 'mandate': None, 'affiliations': []
            }
            publish(published_data, {'camara:42': member}, [], {2026: []},
                    {'schemaVersion': '1.1.0', 'years': [2026], 'coverage': []})
            compress_public_data(published_data)
            published = {path.relative_to(root / 'published').as_posix(): path.read_bytes()
                         for path in (root / 'published').rglob('*') if path.is_file()}

            def open_published(request, timeout):
                del timeout
                return io.BytesIO(published[urlsplit(request.full_url).path.lstrip('/').removeprefix('project/')])

            with patch('pipeline.restore_public.urlopen', side_effect=open_published):
                manifest = restore_public_snapshot('https://example.test/project/', output)

            self.assertEqual(manifest['profileIds'], ['camara:42'])
            self.assertEqual(verify_output(output)['schemaVersion'], '1.1.0')
            self.assertEqual(json.loads((output / 'members.json').read_text())[0]['id'], 'camara:42')
            self.assertEqual((output / 'expenses' / 'camara:42' / '2026.json').read_text(), '[]')

    def test_checksum_failure_preserves_existing_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'data'
            output.mkdir()
            (output / 'manifest.json').write_text('{"previous":true}')
            manifest = {'schemaVersion': '1.1.0', 'files': {'members.json': '0' * 64}}
            responses = {
                '/project/data/manifest.json': json.dumps(manifest).encode(),
                '/project/data/members.json': b'[]'
            }

            def open_published(request, timeout):
                del timeout
                return io.BytesIO(responses[urlsplit(request.full_url).path])

            with patch('pipeline.restore_public.urlopen', side_effect=open_published), self.assertRaisesRegex(ValueError, 'Checksum publicado divergente'):
                restore_public_snapshot('https://example.test/project/', output)

            self.assertEqual(json.loads((output / 'manifest.json').read_text()), {'previous': True})


if __name__ == '__main__':
    unittest.main()
