"""Compacta os arquivos volumosos publicados no site estático."""
import gzip
import hashlib
import json
from pathlib import Path

DATA_DIRECTORY = Path('.output/public/data')
MAXIMUM_SITE_BYTES = 1_000_000_000


def compress_public_data(directory=DATA_DIRECTORY):
    manifest_path = directory / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    targets = [*directory.glob('summary-*.json'),
               *sorted((directory / 'members').glob('*.json')),
               *sorted((directory / 'expenses').rglob('*.json'))]
    checksums = manifest['files']

    for source in targets:
        relative = source.relative_to(directory).as_posix()
        compressed = source.with_name(source.name + '.gz')
        content = gzip.compress(source.read_bytes(), compresslevel=9, mtime=0)
        compressed.write_bytes(content)
        source.unlink()
        checksums[relative + '.gz'] = hashlib.sha256(content).hexdigest()
        checksums.pop(relative, None)

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    site_directory = directory.parent
    total_bytes = sum(path.stat().st_size for path in site_directory.rglob('*') if path.is_file())
    if total_bytes >= MAXIMUM_SITE_BYTES:
        raise ValueError(f'Site compactado excede o limite de publicação de 1 GB: {total_bytes:,} bytes')
    print(f'Site compacto pronto: {total_bytes:,} bytes; {len(targets):,} arquivos JSON compactados.')


if __name__ == '__main__':
    compress_public_data()
