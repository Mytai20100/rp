#!/usr/bin/env python3
"""
Generates packages/index.json for the web UI from control files in /packages/<id>/
"""
import json, os
from pathlib import Path

ROOT    = Path(__file__).parent.parent
PKG_DIR = ROOT / "packages"

def parse_control(path: Path) -> dict:
    fields = {}
    current_key = None
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.startswith(" "):
            if current_key:
                fields[current_key] += "\n" + line.strip()
        elif ":" in line:
            k, _, v = line.partition(":")
            current_key = k.strip()
            fields[current_key] = v.strip()
    return fields

packages = []

for control_path in sorted(PKG_DIR.glob("*/control")):
    pkg_dir = control_path.parent
    pkg_id  = pkg_dir.name
    fields  = parse_control(control_path)

    if not fields.get("Package"):
        continue

    # Screenshots
    ss_dir  = pkg_dir / "screenshots"
    shots   = []
    if ss_dir.is_dir():
        for img in sorted(ss_dir.iterdir()):
            if img.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                shots.append(f"packages/{pkg_id}/screenshots/{img.name}")

    # Icon
    icon = None
    for ext in ("png", "jpg", "jpeg", "webp"):
        icon_path = pkg_dir / f"icon.{ext}"
        if icon_path.exists():
            icon = f"packages/{pkg_id}/icon.{ext}"
            break

    # Description from description.md or control
    desc_md = pkg_dir / "description.md"
    if desc_md.exists():
        raw = desc_md.read_text(encoding="utf-8").strip()
        # First non-heading line as short desc
        short = next((l.strip() for l in raw.splitlines()
                      if l.strip() and not l.startswith("#")), fields.get("Description", ""))
    else:
        short = fields.get("Description", "")

    entry = {
        "id":           fields["Package"],
        "name":         fields.get("Name", pkg_id),
        "version":      fields.get("Version", "1.0"),
        "architecture": fields.get("Architecture", "iphoneos-arm"),
        "section":      fields.get("Section", "Tweaks"),
        "description":  short,
        "author":       fields.get("Author", fields.get("Maintainer", "meomeo")),
        "maintainer":   fields.get("Maintainer", "meomeo"),
        "depends":      fields.get("Depends", ""),
        "icon":         icon,
        "screenshots":  shots,
    }
    packages.append(entry)
    print(f"  ✓ {entry['id']} — {entry['name']} v{entry['version']}")

out = PKG_DIR / "index.json"
out.write_text(json.dumps(packages, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\nDone — {len(packages)} package(s) written to {out.relative_to(ROOT)}")
