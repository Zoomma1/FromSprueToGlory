#!/usr/bin/env python3
"""
parse-arcturus.py — Fetch and parse Arcturus5404/miniature-paints data
Outputs data/arcturus-paints.json in FSTG import format

Source: https://github.com/Arcturus5404/miniature-paints (MIT License)

Usage: python scripts/parse-arcturus.py
       (run from server/ directory)
"""

import subprocess
import base64
import json
import re
from pathlib import Path

BRANDS = {
    "AK.md": "ak-interactive",
    "Army_Painter.md": "army-painter",
    "Citadel_Colour.md": "citadel",
    "Duncan.md": "duncan",
    "GreenStuffWorld.md": "green-stuff-world",
    "Monument.md": "monument-hobby",
    "P3.md": "p3",
    "Scale75.md": "scale75",
    "Tamiya.md": "tamiya",
    "Vallejo.md": "vallejo",
    "Liquitex.md": "liquitex",
}


def fetch_file(filename: str) -> str:
    result = subprocess.run(
        ["gh", "api", f"repos/Arcturus5404/miniature-paints/contents/paints/{filename}", "--jq", ".content"],
        capture_output=True,
        text=True,
        check=True,
    )
    return base64.b64decode(result.stdout.strip()).decode("utf-8")


def detect_type(set_name: str) -> str:
    s = set_name.lower()
    if "contrast" in s:
        return "CONTRAST"
    if "shade" in s or "wash" in s or "dip" in s:
        return "SHADE"
    if "layer" in s:
        return "LAYER"
    if "base" in s:
        return "BASE"
    if "dry" in s:
        return "DRY"
    if "air" in s:
        return "AIR"
    if "technical" in s:
        return "TECHNICAL"
    if "ink" in s:
        return "INK"
    if "primer" in s or "spray" in s:
        return "PRIMER"
    if "varnish" in s:
        return "VARNISH"
    if "texture" in s:
        return "TEXTURE"
    if "metallic" in s or "metal" in s:
        return "METALLIC"
    return "OTHER"


def parse_table(content: str, brand_slug: str) -> list[dict]:
    paints = []
    headers: list[str] | None = None

    for line in content.split("\n"):
        if not line.startswith("|"):
            headers = None
            continue

        cells = [c.strip() for c in line.split("|")[1:-1]]

        if headers is None:
            if "Name" in cells:
                headers = [c.lower() for c in cells]
            continue

        # Skip separator rows (|---|---|...|)
        if all(re.match(r"^:?-+:?$", c) for c in cells if c):
            continue

        if len(cells) < len(headers):
            continue

        row = dict(zip(headers, cells))
        name = row.get("name", "").strip()
        # Normalize typographic apostrophes/quotes to ASCII straight apostrophe
        name = name.replace("‘", "'").replace("’", "'").replace("ʼ", "'")
        if not name:
            continue

        try:
            r, g, b = int(row["r"]), int(row["g"]), int(row["b"])
            hex_val = f"#{r:02X}{g:02X}{b:02X}"
        except (KeyError, ValueError):
            hex_val = None

        paints.append(
            {
                "name": name,
                "brandSlug": brand_slug,
                "range": row.get("set", "").strip(),
                "type": detect_type(row.get("set", "")),
                "code": row.get("code", "").strip() or None,
                "hex": hex_val,
            }
        )

    return paints


def main() -> None:
    all_paints: list[dict] = []

    for filename, brand_slug in BRANDS.items():
        print(f"Fetching {filename}...", end=" ", flush=True)
        content = fetch_file(filename)
        paints = parse_table(content, brand_slug)
        print(f"{len(paints)} paints")
        all_paints.extend(paints)

    print(f"\nTotal: {len(all_paints)} paints across {len(BRANDS)} brands")

    output_path = Path(__file__).parent.parent / "data" / "arcturus-paints.json"
    output_path.write_text(json.dumps(all_paints, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Written to {output_path}")


if __name__ == "__main__":
    main()
