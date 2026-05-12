"""
Apply per-plant removal_method + removal_notes to src/data/plants.json.

One-shot data migration. Idempotent: re-running overwrites the annotation
fields for the listed slugs and ensures all other plants carry the schema
fields with null/empty defaults. No other plant fields are touched.

Vocabulary and source attribution: see
vault/synthesis/invasive-removal-methods.md
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTS_JSON = REPO / "src" / "data" / "plants.json"

# Canonical method keys (closed vocabulary, mirrors RemovalMethod in types.ts).
METHODS = {
    "hand_pull",
    "dig_taproot",
    "cut_stump_herbicide",
    "cane_cut_dig_crown",
    "pull_vine_dig_crown",
    "dig_rhizome_complete",
    "dig_bulb_complete",
    "sheet_mulch_smother",
    "mow_before_seed",
    "solarize_summer",
}

# slug -> (method, notes)
DATA: dict[str, tuple[str, list[str]]] = {
    # --- Woody trees / large shrubs ---
    "acacia-dealbata": (
        "cut_stump_herbicide",
        [
            "Resprouts vigorously from cut stumps and from root suckers — paint the cut surface with concentrated glyphosate or triclopyr within minutes of cutting.",
            "Seedbank persists for decades; expect seedlings for many years after the parent tree is gone.",
            "Do not chip without bagging — fresh fragments can re-root in moist soil.",
        ],
    ),
    "ailanthus-altissima": (
        "cut_stump_herbicide",
        [
            "Cutting alone triggers an explosion of root suckers — never cut without immediately treating the stump with triclopyr.",
            "Smaller stems can be basal-bark treated without cutting first.",
            "Wear gloves: the sap is a skin irritant and the crushed leaves smell foul.",
        ],
    ),
    "cotoneaster-pannosus": (
        "cut_stump_herbicide",
        [
            "Resprouts from the base and from root crowns; cut-stump and paint with herbicide, or grub the crown out entirely.",
            "Birds eat and spread the berries — survey 50+ feet downwind each year for seedlings.",
            "Closely related C. franchetii and C. lacteus are managed identically.",
        ],
    ),

    # --- Brooms (group of 5; cut-stump is the workhorse for established plants) ---
    "cytisus-scoparius": (
        "cut_stump_herbicide",
        [
            "Pull seedlings and young plants under 3 ft with a weed wrench when soil is moist — no herbicide needed for those.",
            "Cut established plants close to the ground and paint the stump with glyphosate; cutting without painting guarantees vigorous resprouts.",
            "Seedbank can last 60–80 years — flag the site for annual seedling sweeps for at least a decade.",
            "Work before pods ripen (typically May) so you don't broadcast seed while working.",
        ],
    ),
    "cytisus-striatus": (
        "cut_stump_herbicide",
        [
            "Manage identically to Scotch broom: weed-wrench small plants, cut-stump and paint older stems.",
            "Long-lived seedbank — plan multi-year follow-up sweeps.",
        ],
    ),
    "genista-monspessulana": (
        "cut_stump_herbicide",
        [
            "French broom resprouts more aggressively than Scotch — stump painting is more important here, not less.",
            "Soft stems pull easily when young; a weed wrench works up to ~4 ft tall.",
            "Cut just before flowering peak (typically April) to limit seed input that year.",
        ],
    ),
    "spartium-junceum": (
        "cut_stump_herbicide",
        [
            "Stems are nearly leafless and rush-like — cut-stump with concentrated glyphosate is the dependable approach.",
            "Frequently survives a single cut; treat any green resprout the following season.",
        ],
    ),
    "ulex-europaeus": (
        "cut_stump_herbicide",
        [
            "Gorse spines puncture leather — wear thick gloves and eye protection.",
            "Cut-stump with triclopyr; expect resprouts and re-treat at year 1 and year 2.",
            "Pods explode in summer heat, scattering seed — work in spring or shortly after a winter rain.",
        ],
    ),

    # --- Vines & climbers (sever then excavate rooted crowns) ---
    "hedera-helix": (
        "pull_vine_dig_crown",
        [
            "Sever vines climbing trees at chest height and again at ankle height — leave the aerial parts to die in place rather than ripping them off the bark.",
            "On the ground, pull or dig every rooted node; any fragment touching soil re-roots.",
            "Bag, don't compost — stems survive home compost piles and re-root in the finished pile.",
        ],
    ),
    "hedera-canariensis": (
        "pull_vine_dig_crown",
        [
            "Treated identically to English ivy but stems are thicker — use loppers for trunk-climbers.",
            "Faster ground spread; re-survey at 6-month intervals after pulling.",
        ],
    ),
    "delairea-odorata": (
        "pull_vine_dig_crown",
        [
            "Cape-ivy spreads almost entirely vegetatively — every node and root fragment must be lifted, not yanked.",
            "Do not rake or pull aggressively: snapping stems seeds the site with fragments.",
            "Bag all material and landfill — never green-bin or compost.",
        ],
    ),
    "clematis-vitalba": (
        "pull_vine_dig_crown",
        [
            "Sever main vines from the root crown, then trace each rooted layer outward — old man's beard layers wherever stems touch soil.",
            "Excavate the woody root crown; the plant resprouts otherwise.",
            "Wind-dispersed feathery seeds — work before seed set in late summer.",
        ],
    ),

    # --- Brambles ---
    "rubus-armeniacus": (
        "cane_cut_dig_crown",
        [
            "Cut all canes back to stubs, then mattock or dig out each woody root crown — cutting alone produces a denser thicket.",
            "Cane tips that touch soil re-root as new crowns; trace and dig every tip-rooted node.",
            "Wear leather sleeves; thorns shred standard gardening gloves.",
            "Bag canes for landfill — chipping or home composting can scatter live nodes.",
        ],
    ),

    # --- Tall taprooted biennials/perennials ---
    "foeniculum-vulgare": (
        "dig_taproot",
        [
            "The taproot snaps cleanly an inch below the crown when pulled — dig 6–12 inches deep to lift the full crown.",
            "Resprouts from any remaining crown tissue; flag and re-dig stragglers next season.",
            "Cut flowering stalks first and bag — once stalks are down the digging is faster and seed set is interrupted.",
        ],
    ),
    "conium-maculatum": (
        "dig_taproot",
        [
            "All parts toxic — wear gloves and long sleeves, avoid touching your face, and wash tools and clothes after the session.",
            "Biennial: hand-pull first-year rosettes; dig the taproot on second-year flowering plants before seed set.",
            "Do not burn or chip — smoke and dust carry the alkaloids.",
        ],
    ),
    "cynara-cardunculus": (
        "dig_taproot",
        [
            "Massive woody taproot — dig deep and sever cleanly below the crown.",
            "Spines on leaves and bracts; wear eye protection.",
            "Cut and bag flower heads first; heads continue to mature seed after cutting.",
        ],
    ),
    "lepidium-latifolium": (
        "dig_taproot",
        [
            "Pepperweed spreads from deep rhizomes as well as the taproot — repeated digging in the same spot is normal for 3+ seasons.",
            "Even small root fragments resprout; sift soil where practical and bag all debris.",
            "Cutting flowers slows seed input but does not weaken the rhizome — pair cutting with digging.",
        ],
    ),
    "dipsacus-fullonum": (
        "dig_taproot",
        [
            "Biennial — first-year rosettes hand-pull easily; once a flowering stalk appears, dig the taproot.",
            "Spiny seedheads cling to clothing and equipment — bag heads before they dry.",
        ],
    ),

    # --- Thistles ---
    "centaurea-solstitialis": (
        "dig_taproot",
        [
            "Yellow starthistle has a sharp taproot — sever 2–4 inches below the crown with a shovel.",
            "Work before mid-bloom; once spines harden, mechanical control becomes painful and seed is already maturing.",
            "Seedbank lasts 3–10 years; plan multi-year follow-up.",
        ],
    ),
    "carduus-pycnocephalus": (
        "dig_taproot",
        [
            "Italian thistle bolts fast in spring — catch rosettes early, before stems lignify.",
            "Sever the taproot below the crown; cutting at ground level lets crowns resprout.",
            "Wear eye protection — flower heads bristle with stiff spines.",
        ],
    ),
    "cirsium-vulgare": (
        "dig_taproot",
        [
            "Biennial — first-year rosettes pull easily after rain; flowering stalks need a shovel through the crown.",
            "Plumes carry seed long distances — bag heads rather than leaving cut stalks on site.",
        ],
    ),

    # --- Annual mustards / herbs (hand-pull) ---
    "brassica-nigra": (
        "hand_pull",
        [
            "Pull when soil is moist and before pods yellow — once pods are tan, seed is already viable.",
            "Annual: a single clean pass in early spring plus a follow-up sweep can eliminate seed input for the year.",
        ],
    ),
    "hirschfeldia-incana": (
        "hand_pull",
        [
            "Short-pod mustard re-grows from the crown if cut — uproot rather than mow.",
            "Multi-flush bloomer; expect to revisit the site every 3–4 weeks through spring.",
        ],
    ),
    "alliaria-petiolata": (
        "hand_pull",
        [
            "Biennial — pull rosettes any time, dig bolting plants before seed set.",
            "Bag and landfill: cut stalks finish maturing viable seed inside the pile, so don't compost.",
        ],
    ),
    "oncosiphon-piluliferum": (
        "hand_pull",
        [
            "Stinknet is severely allergenic — wear gloves, long sleeves, and a respirator on dry days; the dust triggers asthma and rashes.",
            "Pull when soil is moist and bag immediately; do not mow or weed-whack dry plants.",
            "Aggressive new invader — report sightings to your county ag commissioner.",
        ],
    ),

    # --- Annual grasses (mow before seed; group of 5) ---
    "bromus-diandrus": (
        "mow_before_seed",
        [
            "Mow or weed-whack at the late boot stage — just as awns emerge but before they harden.",
            "Once awns turn tan, cutting re-seeds the site; time the work carefully.",
            "Mulch heavily after the spring flush to shade out next year's seedbank.",
        ],
    ),
    "bromus-tectorum": (
        "mow_before_seed",
        [
            "Cheatgrass dries to a fire hazard by May — clear before the dry-down window.",
            "Seedbank is shallow but dense; aggressive shading with mulch or a cover crop accelerates depletion.",
        ],
    ),
    "bromus-madritensis-ssp-rubens": (
        "mow_before_seed",
        [
            "Red brome shares cheatgrass's wildfire risk — same urgency window.",
            "Mow at boot stage; flame-weeding can substitute on small bare patches.",
        ],
    ),
    "avena-fatua": (
        "mow_before_seed",
        [
            "First-pass mow in March/April catches the bulk of bolters.",
            "A second pass 3–4 weeks later catches stragglers from late tillers.",
            "Spikelets are barbed — clean shoes and gear before leaving the site.",
        ],
    ),
    "horderum-murinum": (
        "mow_before_seed",
        [
            "Foxtail awns embed in pets' ears, paws, and gums — clear before plants dry, especially around walkways.",
            "Mow at boot stage; once awns are tan, mowing scatters them.",
        ],
    ),

    # --- Clumping / rhizomatous perennials ---
    "arundo-donax": (
        "dig_rhizome_complete",
        [
            "Every node and rhizome fragment re-roots — never chip or leave cuttings on bare soil.",
            "Mature stands resist hand-digging; cut-stump with concentrated glyphosate on freshly-cut canes is the practical method, repeated annually for 2–3 years.",
            "Pile cut material on a tarp and bag for landfill — do not green-bin.",
        ],
    ),
    "cortaderia-jubata": (
        "dig_rhizome_complete",
        [
            "Cut and bag flower plumes first — each plume carries hundreds of thousands of wind-dispersed seeds.",
            "Excavate the entire root mass with a shovel or mattock; partial digs trigger vigorous regrowth.",
            "Plume edges are razor-sharp — wear long sleeves and eye protection.",
        ],
    ),
    "cortaderia-selloana": (
        "dig_rhizome_complete",
        [
            "Managed identically to jubatagrass.",
            "Often planted as an ornamental — confirm the entire clump before digging, including drift from neighboring landscaped plantings.",
        ],
    ),
    "pennisetum-setaceum": (
        "dig_rhizome_complete",
        [
            "Fountain grass spreads by seed and from clump fragments — extract the entire crown.",
            "Cut and bag flower heads before digging; mature seed dispersal is wind-driven and prolific.",
        ],
    ),
    "cynodon-dactylon": (
        "dig_rhizome_complete",
        [
            "Bermuda grass spreads by stolons above ground and rhizomes below — both must be lifted completely.",
            "Fragments as small as half an inch re-root; sheet-mulch alone often fails — combine with summer solarization.",
        ],
    ),

    # --- Mat-forming groundcovers ---
    "carpobrotus-edulis": (
        "sheet_mulch_smother",
        [
            "Iceplant rolls back like a heavy carpet — start at one edge and peel toward the other, lifting the entire mat.",
            "Stems hold water for weeks — drain on a tarp before bagging, or solarize the mat in place under clear plastic.",
            "Re-survey the lifted area for 12 months; broken stems re-root from any soil contact.",
        ],
    ),
    "vinca-major": (
        "sheet_mulch_smother",
        [
            "Cardboard plus 4–6 inches of mulch, kept in place 9–12 months — periwinkle is patient.",
            "Trace runners under the cardboard at the perimeter; new shoots surface where the mulch is thinnest.",
            "Stems re-root from every node — don't drag debris through clean areas.",
        ],
    ),

    # --- Bulb chains ---
    "oxalis-pes-caprae": (
        "dig_bulb_complete",
        [
            "Bermuda buttercup forms a chain of small bulbs underground — every bulblet left behind regrows.",
            "Sift soil through hardware cloth in heavily infested beds; foliar work alone fails.",
            "Pull foliage during bloom (Jan–Mar) to weaken the bulbs, then dig in the following autumn when fresh bulbs are easy to spot.",
        ],
    ),
}


def main() -> None:
    assert all(m in METHODS for (m, _) in DATA.values()), "unknown method key in DATA"

    plants = json.loads(PLANTS_JSON.read_text())
    known_slugs = {p["slug"] for p in plants}
    missing = sorted(s for s in DATA if s not in known_slugs)
    if missing:
        raise SystemExit(f"Slugs not found in plants.json: {missing}")

    filled = 0
    for plant in plants:
        slug = plant["slug"]
        if slug in DATA:
            method, notes = DATA[slug]
            plant["removal_method"] = method
            plant["removal_notes"] = notes
            filled += 1
        else:
            plant.setdefault("removal_method", None)
            plant.setdefault("removal_notes", [])

    PLANTS_JSON.write_text(
        json.dumps(plants, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Annotated {filled} / {len(plants)} plants with removal_method + removal_notes.")
    by_method: dict[str, int] = {}
    for plant in plants:
        m = plant.get("removal_method")
        if m:
            by_method[m] = by_method.get(m, 0) + 1
    for m in sorted(by_method):
        print(f"  {m}: {by_method[m]}")


if __name__ == "__main__":
    main()
