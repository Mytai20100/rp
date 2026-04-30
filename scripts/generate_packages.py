#!/usr/bin/env python3
"""
Scans /packages for .deb files and generates:
  - Packages / Packages.gz / Release at repo ROOT (Sileo & Cydia expect these here)
  - Mirrored copies in repo/
"""
import gzip, hashlib, subprocess
from pathlib import Path

ROOT    = Path(__file__).parent.parent
PKG_DIR = ROOT / "packages"
REPO    = ROOT / "repo"
REPO.mkdir(exist_ok=True)

def _parse_control_text(text: str) -> dict:
    fields, current_key = {}, None
    for line in text.splitlines():
        if line.startswith((" ", "\t")):
            if current_key:
                fields[current_key] += "\n" + line
        elif ":" in line:
            k, _, v = line.partition(":")
            current_key = k.strip()
            fields[current_key] = v.strip()
    return fields

def get_deb_control(deb_path: Path) -> dict:
    try:
        r = subprocess.run(["dpkg-deb", "-f", str(deb_path)],
                           capture_output=True, text=True, check=True)
        return _parse_control_text(r.stdout)
    except Exception:
        pass
    ctrl = deb_path.parent / "control"
    return _parse_control_text(ctrl.read_text(errors="ignore")) if ctrl.exists() else {}

def file_hashes(path: Path):
    import hashlib
    md5, sha1, sha256 = hashlib.md5(), hashlib.sha1(), hashlib.sha256()
    data = path.read_bytes()
    for h in (md5, sha1, sha256): h.update(data)
    return md5.hexdigest(), sha1.hexdigest(), sha256.hexdigest(), len(data)

entries = []
for deb in sorted(PKG_DIR.rglob("*.deb")):
    fields = get_deb_control(deb)
    if not fields.get("Package"):
        print(f"  ⚠ Skipping {deb.name}"); continue
    md5, sha1, sha256, size = file_hashes(deb)
    block = [f"{k}: {v}" for k, v in fields.items() if v]
    block += [
        f"Filename: {deb.relative_to(ROOT).as_posix()}",
        f"Size: {size}",
        f"MD5sum: {md5}",
        f"SHA1: {sha1}",
        f"SHA256: {sha256}",
    ]
    entries.append("\n".join(block))
    print(f"  ✓ {fields['Package']} {fields.get('Version','?')}")

packages_text = "\n\n".join(entries) + ("\n" if entries else "")

release_text = """\
Origin: meomeo
Label: meomeo
Suite: stable
Version: 1.0
Codename: ios
Architectures: iphoneos-arm iphoneos-arm64
Components: main
Description: meomeo iOS Tweaks Repository
"""

def write_all(dest: Path):
    (dest / "Packages").write_text(packages_text, encoding="utf-8")
    with gzip.open(dest / "Packages.gz", "wb") as f:
        f.write(packages_text.encode())
    (dest / "Release").write_text(release_text, encoding="utf-8")

write_all(ROOT)   # ← root (Sileo/Cydia look here)
write_all(REPO)   # ← /repo/ mirror

print(f"\nDone — {len(entries)} package(s) indexed.")
