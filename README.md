# 🐾 meomeo

> iOS tweak repository compatible with Cydia & Sileo.

## Add Repository

```
https://mytai20100.github.io/rp/
```

Open Cydia / Sileo → Sources → Edit → Add → paste URL above.

## Structure

```
/
├── index.html              # Web UI
├── styles.css
├── script.js
├── packages/
│   ├── index.json          # Auto-generated web index
│   └── com.meomeo.*/       # One folder per tweak
│       ├── control         # Debian control file
│       ├── description.md
│       ├── icon.png
│       ├── screenshots/
│       └── package.deb
├── repo/
│   ├── Packages            # Auto-generated APT index
│   ├── Packages.gz
│   └── Release
└── .github/workflows/
    └── deploy.yml          # Build & deploy pipeline
```

## Adding a Tweak

1. Create `packages/com.yourname.tweakname/`
2. Add `control`, `description.md`, `icon.png`, `package.deb`
3. Push to `main` — GitHub Actions rebuilds & deploys automatically

### Minimal `control` template

```
Package: com.yourname.tweakname
Name: TweakName
Version: 1.0.0
Architecture: iphoneos-arm
Description: Short description here
Maintainer: yourname <you@example.com>
Author: yourname
Section: Tweaks
Depends: mobilesubstrate
```

## Local Development

```bash
python3 scripts/generate_packages.py
python3 scripts/generate_json.py
python3 -m http.server 8000
```

## Setup GitHub Pages

1. Repo Settings → Pages → Source: **GitHub Actions**
2. Push to `main` to trigger first deploy
