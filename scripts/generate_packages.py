#!/usr/bin/env python3
"""
Scans /packages for .deb files and generates repo/Packages + repo/Packages.gz
"""
import os, gzip, hashlib, subprocess, shutil
from pathlib import Path

ROOT    = Path(__file__).parent.parent
PKG_DIR = ROOT / "packages"
REPO    = ROOT / "repo"
REPO.mkdir(exist_ok=True)

def get_deb_control(deb_path: Path) -> dict:
    """Extract control fields from a .deb file."""
    try:
        result = subprocess.run(
            ["dpkg-deb", "-f", str(deb_path)],
            capture_output=True, text=True, check=True
        )
        fields = {}
        current_key = None
        for line in result.stdout.splitlines():
            if line.startswith(" "):
                if current_key:
                    fields[current_key] += "\n" + line
            elif ":" in line:
                k, _, v = line.partition(":")
                current_key = k.strip()
                fields[current_key] = v.strip()
        return fields
    except Exception:
        # Fallback: read control file next to .deb
        control_path = deb_path.parent / "control"
        if not control_path.exists():
            return {}
        fields = {}
        current_key = None
        for line in control_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.startswith(" "):
                if current_key:
                    fields[current_key] += "\n" + line
            elif ":" in line:
                k, _, v = line.partition(":")
                current_key = k.strip()
                fields[current_key] = v.strip()
        return fields

def file_hashes(path: Path):
    md5    = hashlib.md5()
    sha1   = hashlib.sha1()
    sha256 = hashlib.sha256()
    data = path.read_bytes()
    for h in (md5, sha1, sha256):
        h.update(data)
    return md5.hexdigest(), sha1.hexdigest(), sha256.hexdigest(), len(data)

entries = []

for deb in sorted(PKG_DIR.rglob("*.deb")):
    fields = get_deb_control(deb)
    if not fields:
        print(f"  ⚠ Skipping {deb} — no control data")
        continue

    md5, sha1, sha256, size = file_hashes(deb)
    rel_path = deb.relative_to(ROOT).as_posix()

    block = []
    for k, v in fields.items():
        block.append(f"{k}: {v}")
    block.append(f"Filename: {rel_path}")
    block.append(f"Size: {size}")
    block.append(f"MD5sum: {md5}")
    block.append(f"SHA1: {sha1}")
    block.append(f"SHA256: {sha256}")
    entries.append("\n".join(block))
    print(f"  ✓ {deb.name}")

packages_text = "\n\n".join(entries) + ("\n" if entries else "")
packages_path = REPO / "Packages"
packages_path.write_text(packages_text, encoding="utf-8")

with gzip.open(REPO / "Packages.gz", "wb") as f:
    f.write(packages_text.encode("utf-8"))

print(f"\nDone — {len(entries)} package(s) indexed.")
