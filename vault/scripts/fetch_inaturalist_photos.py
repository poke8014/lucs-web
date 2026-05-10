#!/usr/bin/env python3
"""Fetch top CC0/CC-BY iNaturalist photos for every plant in vault/plants/.

Idempotent: skips plants whose metadata.json already has >= PER_PLANT photos.
Photos and a metadata.json land in vault/raw/assets/inaturalist/<slug>/.

Usage:
    python3 vault/scripts/fetch_inaturalist_photos.py            # all plants
    python3 vault/scripts/fetch_inaturalist_photos.py <slug>...  # subset
    python3 vault/scripts/fetch_inaturalist_photos.py --allow-duplicate-users <slug>...
        Top-up mode: relax the unique-photographer constraint and append
        any new photos to existing metadata.json. Use for slugs stuck at
        <PER_PLANT photos due to scarce CC contributors.
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLANTS_DIR = ROOT / "vault" / "plants"
ASSETS_DIR = ROOT / "vault" / "raw" / "assets" / "inaturalist"
USER_AGENT = "lucs-web pollinator-vault (theluc04@yahoo.com)"
LICENSES = "cc0,cc-by"
PER_PLANT = 5
SIZE = "large"  # iNat sizes: square, small, medium, large, original
REQUEST_DELAY_S = 0.4  # be polite to iNat (~150 req/min ceiling, target well under)


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def get_json(url: str) -> dict:
    return json.loads(http_get(url).decode("utf-8"))


def parse_scientific_name(md_path: Path) -> str:
    text = md_path.read_text()
    m = re.search(r"^scientific_name:\s*(.+)$", text, re.MULTILINE)
    if m:
        return m.group(1).strip()
    return md_path.stem.replace("-", " ").capitalize()


def _strip_subspecies_qualifiers(name: str) -> str:
    # "Bromus madritensis ssp. rubens" -> "Bromus madritensis rubens"
    # "Tamarix parviflora plant" -> "Tamarix parviflora"
    tokens = [t for t in re.split(r"\s+", name) if t.lower() not in {
        "ssp", "ssp.", "subsp", "subsp.", "var", "var.", "plant",
    }]
    return " ".join(tokens)


def _query_taxa(query: str) -> list[dict]:
    # No rank filter: lets iNat resolve synonyms (e.g. Eichhornia -> Pontederia)
    # and match subspecies/varieties.
    url = (
        "https://api.inaturalist.org/v1/taxa"
        f"?q={urllib.parse.quote(query)}&is_active=true"
    )
    return (get_json(url).get("results") or [])


def _best_taxon_match(query: str, results: list[dict]) -> int | None:
    """Pick the right taxon from iNat search results.

    iNat returns synonyms with a `matched_term` showing what string they
    matched on. A result with `matched_term == query` (case-insensitive) is
    the canonical synonym mapping — even when the current accepted name has
    a different genus (e.g. Brassica nigra -> Mutarda nigra). Without this
    check, we can land on a *different* species that shares one of the
    synonym tokens (e.g. Hirschfeldia incana matches via "Brassica nigra
    incana" but is a different plant).
    """
    q = query.lower()
    # Exact name match wins
    for r in results:
        if r.get("name", "").lower() == q:
            return r["id"]
    # Then exact matched_term match (synonym map)
    for r in results:
        if (r.get("matched_term") or "").lower() == q:
            return r["id"]
    # Then matched_term that starts with our query — handles iNat's
    # autonym expansion (e.g. "Fallopia japonica" -> matched_term
    # "Fallopia japonica japonica" pointing at Reynoutria japonica).
    for r in results:
        if (r.get("matched_term") or "").lower().startswith(q + " "):
            return r["id"]
    # Then any result whose name shares the genus
    genus = query.split()[0].lower()
    for r in results:
        if r.get("name", "").split()[0].lower() == genus:
            return r["id"]
    return None


def find_taxon_id(name: str) -> int | None:
    # Pass 1: original name (handles common case + iNat synonym map)
    hit = _best_taxon_match(name, _query_taxa(name))
    if hit:
        return hit

    # Pass 2: strip ssp/var qualifiers (our hyphenated subspecies slugs)
    cleaned = _strip_subspecies_qualifiers(name)
    if cleaned != name:
        hit = _best_taxon_match(cleaned, _query_taxa(cleaned))
        if hit:
            return hit

    # Pass 3: just genus + species
    short = " ".join(cleaned.split()[:2])
    if short and short != cleaned:
        hit = _best_taxon_match(short, _query_taxa(short))
        if hit:
            return hit

    return None


def get_parent_species_id(taxon_id: int) -> int | None:
    data = get_json(f"https://api.inaturalist.org/v1/taxa/{taxon_id}")
    results = data.get("results") or []
    if not results:
        return None
    taxon = results[0]
    if taxon.get("rank") == "species":
        return None  # already a species — no parent fallback worthwhile
    # ancestry is a slash-delimited chain ending at the taxon's parent;
    # walk back until we find a species-rank ancestor.
    ancestry = (taxon.get("ancestry") or "").split("/")
    for ancestor_id in reversed([a for a in ancestry if a]):
        ad = get_json(f"https://api.inaturalist.org/v1/taxa/{ancestor_id}").get("results") or []
        if ad and ad[0].get("rank") == "species":
            return int(ancestor_id)
    return None


def fetch_observations(taxon_id: int, target_n: int, broaden: bool = False) -> list[dict]:
    # popular=true surfaces faved obs first. For obscure taxa (rare invasives)
    # there may be zero popular obs — fall back to any research-grade obs.
    # `broaden=True` (used by top-up mode) merges both pools to maximize the
    # candidate set for slugs whose popular pool is exhausted.
    base = (
        "https://api.inaturalist.org/v1/observations"
        f"?taxon_id={taxon_id}"
        f"&photo_license={LICENSES}"
        "&quality_grade=research"
        "&order=desc&order_by=votes"
        f"&per_page={max(target_n * 4, 30)}"
    )
    popular = get_json(base + "&popular=true").get("results") or []
    if not popular or broaden:
        time.sleep(REQUEST_DELAY_S)
        any_obs = get_json(base).get("results") or []
        # Preserve popular-first ordering, append any non-popular not already in.
        seen = {o["id"] for o in popular}
        merged = list(popular) + [o for o in any_obs if o["id"] not in seen]
        return merged
    return popular


def pick_photos(
    observations: list[dict],
    n: int,
    allow_duplicate_users: bool = False,
    excluded_photo_ids: set[int] | None = None,
) -> list[dict]:
    seen_photo_ids: set[int] = set(excluded_photo_ids or set())
    seen_users: set[str] = set()
    out: list[dict] = []
    # First pass: at most one photo per observation, prefer photo diversity
    for obs in observations:
        for p in obs.get("photos", []):
            if p["id"] in seen_photo_ids:
                continue
            if p.get("license_code") not in ("cc0", "cc-by"):
                continue
            user = (obs.get("user") or {}).get("login") or ""
            # First pass: skip if we already have a photo from this user
            # (unless the caller has opted into duplicates).
            if not allow_duplicate_users and user in seen_users:
                continue
            seen_photo_ids.add(p["id"])
            seen_users.add(user)
            out.append(_photo_record(obs, p))
            break  # next observation
        if len(out) >= n:
            return out
    # Second pass: relax the unique-user constraint to fill remaining slots
    for obs in observations:
        if len(out) >= n:
            break
        for p in obs.get("photos", []):
            if p["id"] in seen_photo_ids:
                continue
            if p.get("license_code") not in ("cc0", "cc-by"):
                continue
            seen_photo_ids.add(p["id"])
            out.append(_photo_record(obs, p))
            if len(out) >= n:
                break
    return out


def _photo_record(obs: dict, p: dict) -> dict:
    # iNat URLs come back as .../photos/<id>/square.jpg — swap segment for SIZE.
    url = re.sub(r"/(square|small|medium|large|original)\.", f"/{SIZE}.", p["url"])
    return {
        "photo_id": p["id"],
        "license": p["license_code"],
        "attribution": p.get("attribution", ""),
        "url": url,
        "observation_id": obs["id"],
        "observation_url": f"https://www.inaturalist.org/observations/{obs['id']}",
        "observed_on": obs.get("observed_on"),
        "place_guess": obs.get("place_guess"),
        "user_login": (obs.get("user") or {}).get("login"),
    }


def download(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        return
    dest.write_bytes(http_get(url))


def process_plant(slug: str, name: str, allow_duplicate_users: bool = False) -> str:
    out_dir = ASSETS_DIR / slug
    metadata_path = out_dir / "metadata.json"

    existing_meta: dict = {}
    existing_photos: list[dict] = []
    if metadata_path.exists():
        try:
            existing_meta = json.loads(metadata_path.read_text())
            existing_photos = existing_meta.get("photos", []) or []
            if len(existing_photos) >= PER_PLANT:
                return f"skip ({len(existing_photos)} already)"
        except json.JSONDecodeError:
            existing_meta = {}
            existing_photos = []

    needed = PER_PLANT - len(existing_photos)
    excluded_photo_ids = {p["photo_id"] for p in existing_photos}

    # Reuse the resolved taxon when topping up to keep photos_taxon_id stable
    # and avoid re-paying the synonym-lookup API cost.
    taxon_id = existing_meta.get("taxon_id")
    used_taxon_id = existing_meta.get("photos_taxon_id") or taxon_id
    fallback = bool(existing_meta.get("photos_from_parent_species"))
    if not taxon_id:
        taxon_id = find_taxon_id(name)
        time.sleep(REQUEST_DELAY_S)
        if not taxon_id:
            return "no taxon"
        used_taxon_id = taxon_id

    fetch_taxon = used_taxon_id or taxon_id
    obs = fetch_observations(fetch_taxon, PER_PLANT, broaden=allow_duplicate_users)
    time.sleep(REQUEST_DELAY_S)
    photos = pick_photos(
        obs,
        needed,
        allow_duplicate_users=allow_duplicate_users,
        excluded_photo_ids=excluded_photo_ids,
    )
    if not photos and not existing_photos:
        # Subspecies/varieties often have zero observations. Fall back to
        # the parent species — its photos still help with field ID.
        parent = get_parent_species_id(taxon_id)
        time.sleep(REQUEST_DELAY_S)
        if parent and parent != taxon_id:
            obs = fetch_observations(parent, PER_PLANT)
            time.sleep(REQUEST_DELAY_S)
            photos = pick_photos(
                obs,
                needed,
                allow_duplicate_users=allow_duplicate_users,
                excluded_photo_ids=excluded_photo_ids,
            )
            if photos:
                used_taxon_id = parent
                fallback = True
    if not photos:
        if existing_photos:
            return f"no new photos ({len(existing_photos)} already)"
        return f"no CC photos (taxon {taxon_id})"

    out_dir.mkdir(parents=True, exist_ok=True)
    start_index = len(existing_photos) + 1
    saved = list(existing_photos)
    for offset, p in enumerate(photos):
        idx = start_index + offset
        ext = os.path.splitext(urllib.parse.urlparse(p["url"]).path)[1] or ".jpg"
        filename = f"{slug}_{idx:02d}_inat-{p['photo_id']}{ext}"
        dest = out_dir / filename
        try:
            download(p["url"], dest)
            p["filename"] = filename
            saved.append(p)
            time.sleep(REQUEST_DELAY_S)
        except Exception as e:
            print(f"    download failed for {p['url']}: {e}", file=sys.stderr)

    metadata_path.write_text(json.dumps({
        "scientific_name": name,
        "taxon_id": taxon_id,
        "photos_taxon_id": used_taxon_id,
        "photos_from_parent_species": fallback,
        "fetched_at": time.strftime("%Y-%m-%d"),
        "license_filter": LICENSES,
        "image_size": SIZE,
        "source": "iNaturalist API v1 (research-grade, popular)",
        "photos": saved,
    }, indent=2) + "\n")
    new_count = len(saved) - len(existing_photos)
    if existing_photos:
        return f"added {new_count} (now {len(saved)})"
    suffix = " (parent-species fallback)" if fallback else ""
    return f"saved {len(saved)}{suffix}"


def main() -> None:
    args = list(sys.argv[1:])
    allow_duplicate_users = False
    if "--allow-duplicate-users" in args:
        allow_duplicate_users = True
        args.remove("--allow-duplicate-users")

    if args:
        plants = [PLANTS_DIR / f"{slug}.md" for slug in args]
        plants = [p for p in plants if p.exists()]
    else:
        plants = sorted(PLANTS_DIR.glob("*.md"))

    if not plants:
        print("No plant pages found")
        return

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    width = len(str(len(plants)))
    summary: dict[str, int] = {}
    for i, md in enumerate(plants, 1):
        slug = md.stem
        name = parse_scientific_name(md)
        try:
            result = process_plant(slug, name, allow_duplicate_users=allow_duplicate_users)
        except Exception as e:
            result = f"error: {e}"
        bucket = result.split(" ")[0]
        summary[bucket] = summary.get(bucket, 0) + 1
        print(f"[{i:>{width}}/{len(plants)}] {slug:<45} {result}")

    print("\nSummary:")
    for k, v in sorted(summary.items(), key=lambda kv: -kv[1]):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
