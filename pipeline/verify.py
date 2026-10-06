from pathlib import Path
from pipeline.collect import verify_output

if __name__ == '__main__':
    manifest = verify_output(Path('public/data'))
    print(f"Dados validados: schema {manifest['schemaVersion']}, {len(manifest['profileIds'])} perfis.")
