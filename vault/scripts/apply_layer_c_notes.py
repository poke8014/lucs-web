"""
Apply Layer C `removal_notes[]` refresh to src/data/plants.json.

The v0 removal_notes (3–5 bullets per plant) pre-date the WRIC + UC IPM wiki
rollout. The wiki bodies (vault/plants/*.md) now carry concrete herbicide
dilutions, timing windows, and what-doesn't-work warnings. This script folds
that material into removal_notes[] for the 38 annotated plants in a single
idempotent pass — same DATA-dict pattern as apply_layer_b_fields.py.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLANTS_JSON = REPO / "src" / "data" / "plants.json"

# slug -> list[str] of bullets for removal_notes[]
NOTES: dict[str, list[str]] = {
    "acacia-dealbata": [
        "Seedlings hand-pull; saplings extract with a weed wrench when soil is moist — any root fragment left behind suckers.",
        "Cut established trees at ground level and paint the stump within minutes with Garlon 4 Ultra 20–25% in oil carrier, or 25% glyphosate in water. Cutting without herbicide produces a thicket of root suckers.",
        "The spreading root system can send up shoots well after the parent is gone — watch the surrounding area for at least one growing season before replanting.",
        "Don't burn alone — fire stimulates seedling recruitment.",
    ],
    "ailanthus-altissima": [
        "Never cut tree-of-heaven without an herbicide plan — uncut roots throw up a thicket of suckers, often worse than the original tree.",
        "Most effective treatment is stem injection (\"drill and fill\") with undiluted imazapyr — 1 ml per hack, one hack per 3 inches of stem diameter, mid-June to mid-September.",
        "Cut-stump alternative: paint with Garlon 4 Ultra 20–25% in oil, or undiluted glyphosate concentrate, within minutes of cutting.",
        "Suckers can appear up to 50 ft from the felled tree — track and re-treat new shoots for 1–2 years.",
        "Don't move soil from infested sites — root fragments establish elsewhere.",
    ],
    "alliaria-petiolata": [
        "Hand-pull or dig before May seed set — the S-shaped taproot wants to snap, so loosen soil first and ease plants up so root fragments don't stay behind.",
        "On heavy clay, switch to a digging tool — pull-snapped roots resprout.",
        "Second-year bolted plants come out easily by the stem; pull them before pods ripen.",
        "If mowing, cut as low as practical — too high lets flowering stalks form from below the cut, too late scatters seed pods.",
        "5-year seedbank — one missed year of seed set creates several years of follow-up.",
    ],
    "arundo-donax": [
        "Every rhizome fragment regrows — mechanical removal must extract the whole rhizome mass, not just the visible canes.",
        "Cut all canes near the base with a chainsaw, then paint each fresh stump within 1–2 minutes with undiluted glyphosate concentrate — WRIC's gold-standard recipe, near-complete control with no resprouts.",
        "Foliar follow-up on regrowth at 6–8 ft: 2% v/v glyphosate mid-summer to fall, after flowering. Plan 2–3 years of treatment for larger stands.",
        "Don't compost or pile cut canes — every node re-roots in moist soil. Chip or burn on site.",
        "Giant reed doesn't produce viable seed in North America — every infestation traces back to a transplanted rhizome or stem fragment.",
    ],
    "avena-fatua": [
        "Mow once at boot stage (late April / May in the Bay Area) — just after flower initiation, before seed maturity.",
        "Hand-pull small infestations when soil is moist — plants come up easily.",
        "On tilled ground, till once in spring to trigger germination, then till again to kill the seedlings.",
        "Don't burn after seed has dropped — that clears competition and worsens next year's stand.",
        "Cold-climate biotypes carry 10+ year seedbanks — plan multi-year sweeps even after a clean year.",
    ],
    "brassica-nigra": [
        "Hand-pull or hoe before pods ripen — soil moist makes the work easy.",
        "Keep tillage shallow — deep tillage buries seed where the 50-year seedbank survives much longer.",
        "Foliar 2,4-D at 1–2 pt/acre on small actively-growing plants is cheap and effective; glyphosate gives only fair control on mustards.",
        "Don't burn alone — the fire-mustard feedback increases next year's stand. Reseed with competitive cover after clearing.",
        "Plan for decades, not seasons — black mustard's deeply buried seed is one of the longest-lived in the inventory.",
    ],
    "bromus-diandrus": [
        "Mow at boot stage (April) shortly after flower initiation but before awns harden — cut to ~2 inches.",
        "Hand-pull or hoe small patches in early spring while plants are young.",
        "Repeated mowing every 3 weeks suppresses populations where herbicide isn't acceptable.",
        "A well-timed burn before seeds mature can knock back the population — burning after seed drop makes things worse.",
        "Reseed cleared sites with competitive perennial grasses; bare ground refills from the seedbank.",
    ],
    "bromus-madritensis-ssp-rubens": [
        "Mow at boot stage shortly after flower initiation, before seed maturity — same window as ripgut brome, slightly earlier.",
        "Hand-pull or hoe small patches in early spring before awns harden.",
        "Don't lead with burning — red brome matures early, so most burns post-date seed dispersal and make the next year worse.",
        "For larger infestations, use a 2–3 year integrated program: spring burn → winter reseed natives → early spring herbicide.",
        "Clean equipment between sites; seeds cling to clothing, fur, and tires.",
    ],
    "bromus-tectorum": [
        "Mow at boot stage just after flower initiation, before seeds harden — cut to ~2 inches.",
        "Hand-pull or hoe small patches in early spring while plants are young.",
        "Don't burn first — cheatgrass matures early and a single burn typically increases populations next year.",
        "Reseed with native perennial grasses immediately after any clearing; bare post-fire ground is the condition cheatgrass thrives in.",
        "Long-term outlook in heavily invaded sites is slowing the cheatgrass-fire feedback, not eradication.",
    ],
    "carduus-pycnocephalus": [
        "Hand-pull or hoe rosettes when soil is moist and spines are still soft — sever the root below the soil surface.",
        "Mow just as plants bolt and are about to flower — too early lets them regrow, too late scatters seed.",
        "Plants bloom asynchronously over 4–7 weeks; a single mow rarely catches everything — repeat weekly across the bloom window.",
        "2–3 years of zero seed set can substantially deplete the population — short seedbank is the lever.",
    ],
    "carpobrotus-edulis": [
        "Roll up large mats like a carpet — labor-intensive but selective and very effective.",
        "Critical: every node re-roots on damp soil. Flip pulled mats upside-down to dry, or remove from site; leave one and you'll repeat the work.",
        "Burying completely with soil kills the plant — useful in dune-restoration contexts where sand is being replaced.",
        "Foliar 1.5–2% glyphosate + 1% surfactant via shielded sprayer or wiper minimizes off-target damage.",
        "After clearing, also remove the dead-debris layer — it carries iceplant and other weed seeds and enriches sandy soil.",
    ],
    "centaurea-solstitialis": [
        "Hand-pull / hoe / string-trim at early flowering — easy to spot, lower leaves senesced, and dispersal hasn't started. Detach all aboveground material; even a 2-inch piece with attached leaves can recover.",
        "Mow only when 2–5% of seedheads are in bloom, cutting below the lowest branches — too early stimulates regrowth, too late scatters seed.",
        "Aminopyralid (Milestone) 4–5 oz/acre is the most effective herbicide; clopyralid and 2,4-D on rosettes are cheaper alternatives.",
        "Burn at very early flowering for 2–3 consecutive years to deplete the seedbank — burning at any other time enhances starthistle.",
        "Keep horses off infested pastures — starthistle causes nigropallidal encephalomalacia (\"chewing disease\").",
    ],
    "cirsium-vulgare": [
        "Hand-pull, hoe, or dig rosettes before bolting — sever the root below the soil surface; leave no leaves attached or the crown regrows.",
        "Mow immediately before flowering or when plants are just starting to flower — too early regrows, too late goes to seed.",
        "Foliar aminopyralid (Milestone) 3–5 oz/acre on rosettes is the most effective herbicide; 2,4-D works and is cheaper.",
        "Plants bloom asynchronously — a single mow rarely catches all plants; repeat across the season.",
        "Short seedbank (~3 years) means 3 years of zero seed set substantially knocks down infestations.",
    ],
    "clematis-vitalba": [
        "Sever climbing vines at ground level and again at chest height — leave the aerial parts to die back in place; ripping live vines off bark damages the tree.",
        "Dig out every root and stem fragment — debris left on damp soil re-roots from any node.",
        "Don't mow — fragments scatter and regenerate.",
        "Foliar glyphosate (cut-stem or foliar) is the standard residential option; triclopyr 0.5–1% is the broadleaf-selective alternative where desirable grasses are underneath.",
        "Wind-dispersed seed means even a clean property re-infests from neighbors — plan ongoing seedling sweeps.",
    ],
    "conium-maculatum": [
        "Toxicity is the first concern: gloves, long sleeves, no eating or touching your face during work. Wash hands and tools after every session.",
        "Hand-dig the entire taproot; pull first-year rosettes in winter / early spring while soil is moist.",
        "Don't burn — alkaloid toxins go into the smoke. Don't graze; even dried plant material stays toxic for years.",
        "Cutting alone is ineffective — plants throw up new seed stalks in the same season.",
        "Expect a ~3 year seedbank — repeated mowing after bolting but before flowering depletes taproot reserves when digging isn't feasible.",
    ],
    "cortaderia-jubata": [
        "Wear heavy leather gloves and long sleeves — the leaf margins cut skin like razors.",
        "Cut foliage low with a chainsaw or weed-eater first, then dig the entire crown and top section of roots with a Pulaski or mattock.",
        "Detached plants re-root on moist soil — flip them upside-down to dry, or haul off-site.",
        "Foliar glyphosate works after flowering when reserves move to rhizomes: 8% v/v low-volume is the best-tested rate; 2% v/v spot is the lighter option.",
        "Every plant produces seed without a mate (apomixis) — one missed plume seeds a 20-mile radius.",
    ],
    "cortaderia-selloana": [
        "Same playbook as jubatagrass — heavy leather gloves, chainsaw the foliage, dig out the entire crown and roots.",
        "Detached plants re-root on moist soil — flip upside-down or remove from site.",
        "Foliar glyphosate after flowering (late summer / fall) is the most consistent control: 8% v/v low-volume, or 33–50% via wiper on every tiller.",
        "Plants are dioecious — older nursery stock was all female and slow to spread, but newer seed-grown stock seeds prolifically once a male is nearby.",
    ],
    "cotoneaster-pannosus": [
        "Seedlings and small plants hand-pull; established shrubs need cut-stump herbicide — partial root removal alone resprouts.",
        "Cut close to the ground, then paint the stump within minutes with undiluted Garlon 4 Ultra or Garlon 3A. Late-summer / fall timing translocates herbicide into the roots.",
        "Glyphosate at 40–100% concentrate is the alternative on the stump.",
        "Birds disperse seed widely — eradicating one plant doesn't prevent re-establishment from neighborhood ornamental plantings. Plan annual seedling sweeps.",
    ],
    "cynara-cardunculus": [
        "Dig out a large portion of the deep taproot — anything left regrows. Mattock, post-hole digger, or shovel; the depth is the labor.",
        "Cut flowering stems before maturity to interrupt seed input, even when you can't dig the whole root.",
        "Foliar aminopyralid (Milestone) 5–7 oz/acre in winter to spring before bolting — most effective chemical option; clopyralid and triclopyr also work on rosettes.",
        "One-pass disturbance is worse than none — bulldozing fragments roots and spreads the plant. Plan a controlled multi-pass approach.",
        "Don't burn alone — kills the standing dead but not the perennial taproot.",
    ],
    "cynodon-dactylon": [
        "Pull every rhizome and stolon — the canonical fragments-regenerate weed; tilling without follow-through propagates it.",
        "Till in dry summer weather to expose rhizomes to sun-drying or freezing. Apply no water during drying.",
        "Don't mow short — high mowing (~3 inches) actually shifts the competitive balance against Bermuda grass.",
        "Foliar glyphosate at 2% v/v spot in late spring through summer when plants are actively growing — don't mow for 2–3 weeks before spraying so there's more leaf area for uptake.",
        "Solarize small patches under clear plastic over moist soil for 6+ weeks in summer — rhizomes concentrated in the top 2 inches are within heat range.",
    ],
    "cytisus-scoparius": [
        "Pull seedlings and plants under ~3 ft with a weed wrench when soil is moist — no herbicide needed for those.",
        "Cut established shrubs at ground level at the start of the dry season (late spring) and paint the stump within minutes with Garlon 4 Ultra 1:4 in water (~20%) or 25% glyphosate. Cutting without herbicide produces vigorous resprouts.",
        "Foliar option for active growth (late summer / early fall): triclopyr ester 0.75–1.5% + surfactant, or 1.5–2% glyphosate of 41% concentrate.",
        "Work before pods ripen (typically May) so you don't broadcast seed while cutting.",
        "Don't burn — fire triggers seedbank germination. Plan annual seedling sweeps for at least a decade.",
    ],
    "cytisus-striatus": [
        "Manage identically to Scotch broom — same hand-pull / wrench / cut-stump playbook.",
        "Cut at the start of the dry season; paint the stump within minutes with Garlon 4 Ultra 1:4 in water (~20%) or 25% glyphosate.",
        "Foliar option (active growth): triclopyr ester 0.75–1.5% + surfactant, or 1.5–2% glyphosate of 41% concentrate.",
        "Soil disturbance triggers the long-lived seedbank — favor cut-stump over digging.",
        "Don't burn — the seedbank germinates after fire.",
    ],
    "delairea-odorata": [
        "A stem fragment as small as 1 inch with a node regenerates — every piece must come off-site or onto an impermeable surface to dry.",
        "Use the \"rug rolling\" technique on large patches: cut all stems at ground level and roll the canopy up like a rug. Belowground tissue still needs follow-up.",
        "Don't mow — fragments scatter and regenerate.",
        "Foliar option: 1–2% glyphosate v/v, or 1% glyphosate + 0.5% triclopyr + silicone surfactant for better control. Late summer / early fall is the best window.",
        "Don't let plant material soak in waterways — releases pyrrolizidine alkaloids that kill fish.",
    ],
    "dipsacus-fullonum": [
        "Dig or hand-pull rosettes before bolting — sever the root below the soil surface; leaves left attached let the crown regrow.",
        "Plan a 4–6 year horizon — annual control until the seedbank meaningfully depletes.",
        "Mowing alone often fails — the root crown resprouts and reflowers. Frequent repeated mows can work if regrowth never sets seed.",
        "Foliar aminopyralid (Milestone) or clopyralid (Transline) on rosettes gives >90% control in trials; glyphosate at 1.5% v/v works where no residual is wanted.",
        "Don't bring home dried teasel heads from cut-flower or craft sources unless they're confirmed sterile.",
    ],
    "foeniculum-vulgare": [
        "Cut flowering stalks first and bag them — once down, the digging is faster and seed set is interrupted.",
        "Dig the entire taproot and crown: the root snaps cleanly an inch or two below the crown when pulled, so go 6–12 inches deep. Any crown tissue left resprouts.",
        "Triclopyr is the standard herbicide for fennel: spot foliar 0.5–1% Garlon 4 Ultra + surfactant on fully developed leaves *before* flowering — late February to early March in CA.",
        "Don't burn alone — plants recover quickly; a fall burn followed by 2 years of spring herbicide is what works.",
        "Don't graze — most livestock won't eat fennel and the few that do help spread seed.",
    ],
    "genista-monspessulana": [
        "Hand-pulling rarely works once plants are established — use a weed wrench for anything past seedling stage.",
        "Cut shrubs in spring before flowering (April–May in the Bay Area) — French broom flowers earlier than Scotch, so the energy-depletion window is earlier. Paint each cut stump within minutes with Garlon 4 Ultra 20% v/v in water or 25% glyphosate.",
        "Foliar (active growth, April–July): triclopyr ester 0.75–1.5% + surfactant, or 1.5–2% glyphosate of 41% concentrate.",
        "Don't burn alone — adds competitive nutrients and the seedbank germinates after fire.",
        "Plan a decade of annual seedling sweeps; the seedbank persists 30+ years.",
    ],
    "hedera-canariensis": [
        "Pull every runner on ground cover — each node re-roots on damp soil. Bag, don't compost; stems re-root in finished compost.",
        "For climbing trees, sever at ground level and chest height — leave aerial parts to die in place and fall in the next hot/dry period.",
        "Don't mow — fragments scatter and regenerate.",
        "Cut-stump herbicide: undiluted Garlon 3A (or 33% in water), Garlon 4 Ultra 20% v/v in water, or 25% glyphosate. For large vines climbing trees, drill-and-fill with 100% Garlon.",
        "Sap causes contact dermatitis in ~10% of people — gloves and long sleeves are standard.",
    ],
    "hedera-helix": [
        "On ground cover, pull every runner — each node re-roots. Bag cuttings; stems survive home compost and re-root in the finished pile.",
        "For climbing trees, cut at ground level and chest height with a saw, then leave the aerial parts to die back; don't rip them off the bark.",
        "Don't mow or cut-and-leave — fragments scatter and regenerate. This contradicts a common landscaper instinct.",
        "Cut-stump herbicide: undiluted Garlon 3A (or 33% in water), Garlon 4 Ultra 20% v/v, or 25% glyphosate. Drill-and-fill for large mature vines on trees.",
        "Sap causes contact dermatitis in ~10% of people; berries and foliage are toxic if ingested in quantity.",
    ],
    "hirschfeldia-incana": [
        "Pull or cultivate seedlings before seeds develop — this perennial leaves a root crown that can resprout, so dig the crown thoroughly.",
        "Treat shortpod mustard as a different problem from black or garlic mustard — chlorsulfuron, which works on most mustards, explicitly fails on this species.",
        "Glyphosate at 1–2 pt/acre only suppresses, not controls — plan repeat applications and combine with manual removal.",
        "Catch seedlings early; established plants are much harder to knock back.",
    ],
    "horderum-murinum": [
        "Hand-pull or hoe small patches before awns harden — once seedheads dry, work becomes painful and pets pick up \"foxtails.\"",
        "Mow at ripe-seed stage before seeds disperse — a well-timed burn at the same stage is unusually effective for this species (a single burn knocks cover from 90% to <5% for ~3 years).",
        "For pet-friendly yards, clip seedheads before they dry — sharp awns lodge in paws, ears, and noses.",
        "Tillage works on emerged plants but stimulates more germination — pair with herbicide follow-up.",
    ],
    "lepidium-latifolium": [
        "Pepperweed is a rhizome problem, not a taproot problem — root fragments as small as 0.5–1 inch regenerate, and roots spread 10+ ft laterally. Mechanical-only removal almost never works on established stands.",
        "The proven sequence: mow at the bolting / flower-bud stage, then apply herbicide to resprouts once they reach flower bud again. Bud-stage timing matters; earlier applications largely fail.",
        "Foliar chlorsulfuron (Telar) 1–2.6 oz/acre is the most effective herbicide per UC IPM — 1–3 years of >90% control. Glyphosate 1.5–2% v/v spot is the standard residential option, then wait 2–6 months and re-treat resprouts.",
        "For tarping, the cover must extend 10+ ft past the visible patch to catch lateral roots — and stay down for 2 full growing seasons.",
        "Don't till — fragmenting roots disperses the plant. Clean equipment after any work in infested areas.",
    ],
    "oncosiphon-piluliferum": [
        "Hand-pull in winter or early spring before seed set; plants come up easily when soil is moist.",
        "Wear gloves, long sleeves, and a dust mask — contact dermatitis and respiratory irritation are common; pollen is allergenic.",
        "Bag pulled material — seeds disperse easily during disposal, and home compost won't kill them.",
        "Don't mow — bloom is asynchronous and dust release in dry weather is severe.",
        "Stop-spread priority in SoCal — eradicate small infestations now and plan 5 years of seedling sweeps; report new sightings to the county Ag Commissioner.",
    ],
    "oxalis-pes-caprae": [
        "Bermuda buttercup forms a chain of small bulbs underground — every bulblet left behind regrows. Dig in autumn when fresh bulbs are easy to spot and the rosette is just emerging.",
        "Sift soil through hardware cloth in heavily infested beds — pulling foliage alone takes years to deplete bulb reserves.",
        "Pulling foliage during bloom (Jan–Mar) weakens bulbs before the autumn dig.",
        "Solarize cleared beds under clear plastic over moist soil for 4+ weeks in June–August before replanting.",
        "Don't compost garden trimmings with Oxalis — bulbs survive home compost piles.",
    ],
    "pennisetum-setaceum": [
        "Hand-pull seedlings; uproot bunchgrass clumps with shovel, pick, or mattock for plants with basal diameter >6 in.",
        "Cut and bag the inflorescences first if present — every plant is a seed source (apomictic).",
        "Repeat removal at 1–2 month intervals through the growing season; seedlings keep emerging.",
        "Don't mow — the plant regrows from the base. Don't burn — density often increases after a fire.",
        "Foliar glyphosate 1–2% v/v at flowering, or grass-selective fluazifop / sethoxydim — glyphosate is less consistent for this species, so expect repeat applications.",
    ],
    "rubus-armeniacus": [
        "Cut all canes back to stubs with loppers — leather sleeves required, the thorns shred standard garden gloves.",
        "Dig every woody root crown with a Pulaski or mattock — cutting alone produces a denser thicket the next season.",
        "Trace every cane tip that touched soil and dig the rooted node; each is a new crown.",
        "Cut-stump herbicide on stubs (within minutes): Garlon 4 Ultra 1:4 in water (~20%) or 25% glyphosate. Or foliar 1–1.5% glyphosate in late summer / early fall after flowering.",
        "Bag canes for landfill — chipping or home composting scatters live nodes that re-root.",
    ],
    "spartium-junceum": [
        "Hand-pull seedlings only; weed wrench or saw for established plants.",
        "Cut at ground level at the end of the dry season, then paint the stump within minutes with Garlon 4 Ultra 20% v/v in water or undiluted Garlon 3A, or 25–50% glyphosate.",
        "Foliar option (late summer / early fall): triclopyr ester 0.75–1.5% + surfactant, or 1.5–2% glyphosate of 41% concentrate.",
        "Stems stay nearly leafless — flag cut stumps so you can find resprouts in subsequent visits.",
        "Don't burn — seedbank germinates after fire. Plan 10+ years of annual seedling sweeps.",
    ],
    "ulex-europaeus": [
        "Spines puncture standard gloves — wear heavy leather gloves and eye protection.",
        "Hand-pull seedlings only. For established shrubs, cut at ground level before flowering, then paint the stump within minutes with Garlon 4 Ultra 25% in oil, undiluted Garlon 3A, or undiluted glyphosate concentrate.",
        "Foliar (active growth, late summer / early fall): triclopyr ester 0.5–2% + surfactant, or 1.5–2% glyphosate of 41% concentrate.",
        "Work in spring or shortly after winter rain — pods explode in summer heat and broadcast seed while you cut.",
        "Don't burn alone — burning triggers a flush of seedling germination from the 30-year seedbank.",
    ],
    "vinca-major": [
        "Hand-pull every stem, node, and stolon — vinca is sterile in CA so the entire infestation is connected; repeated removal over multiple years finally clears it.",
        "Don't mow — stem fragments root on damp soil and re-establish in days.",
        "Bag cuttings; stems re-root in finished compost.",
        "Foliar option: glyphosate 25% v/v low-volume or triclopyr (Garlon 4 Ultra) 25% v/v low-volume — spring applications give the best control with triclopyr.",
        "Riparian sites: fragments wash downstream and lodge; check downstream areas for years after upstream clearing.",
    ],
}


def main() -> None:
    plants = json.loads(PLANTS_JSON.read_text())
    known_slugs = {p["slug"] for p in plants}
    annotated_slugs = {p["slug"] for p in plants if p.get("removal_method")}

    missing = sorted(s for s in NOTES if s not in known_slugs)
    if missing:
        raise SystemExit(f"Slugs not found in plants.json: {missing}")

    not_annotated = sorted(s for s in NOTES if s not in annotated_slugs)
    if not_annotated:
        raise SystemExit(
            f"Slugs in NOTES that lack removal_method (Layer A): {not_annotated}"
        )

    uncovered = sorted(annotated_slugs - set(NOTES))
    if uncovered:
        raise SystemExit(
            f"Annotated plants missing from NOTES (Layer C must cover all 38): {uncovered}"
        )

    updated = 0
    for plant in plants:
        slug = plant["slug"]
        if slug in NOTES:
            plant["removal_notes"] = list(NOTES[slug])
            updated += 1

    PLANTS_JSON.write_text(
        json.dumps(plants, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Refreshed removal_notes[] for {updated} / {len(plants)} plants.")
    bullet_counts = [len(NOTES[s]) for s in NOTES]
    print(
        f"Bullet count: min={min(bullet_counts)}, "
        f"max={max(bullet_counts)}, "
        f"avg={sum(bullet_counts) / len(bullet_counts):.1f}"
    )


if __name__ == "__main__":
    main()
