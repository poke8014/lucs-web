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

    # --- UC IPM residential weeds (May 2026 cleanup-plan scope expansion) ---
    # Wiki-grounded notes sourced from vault/plants/*.md Remove sections.
    "convolvulus-arvensis": [
        "Catch seedlings within the first 3–4 weeks after germination — once perennial root buds form, mechanical removal stops working.",
        "Light-blocking covers (cardboard + 4–6 in mulch, or landscape fabric with full edge overlap) are the most effective non-chemical control — but complete death takes 3–5 years and bindweed finds every seam.",
        "Don't till casually — 2-inch root fragments regenerate and one-pass tillage scatters them across the bed.",
        "Glyphosate 2% v/v on actively growing plants in fall is the systemic chemical option; paint onto leaves resting on newspaper to keep it off desirables.",
        "60-year seedbank — plan an integrated multi-year program (prevent seed → reduce reserves → shade out → spot herbicide). No single-season fix exists.",
    ],
    "cuscuta-pentagona": [
        "Native dodder: catch yellow-orange seedlings within the 5–10 day window before haustoria embed in a host. Hand-pull or shallow-cultivate while plants are still rootless.",
        "Once attached, prune the host plant 1/8–1/4 inch below the dodder attachment point — pulling only the dodder leaves embedded haustoria that regenerate new dodder.",
        "Don't drop pulled dodder on healthy hosts — fragments form fresh attachments. Bag and dispose in trash, do not compost.",
        "Japanese dodder (*C. japonica*, thicker spaghetti-like stems, attacks trees/shrubs) is under California eradication program — don't try to control it yourself; call your county Agricultural Commissioner.",
        "Solarization fails on dodder seed (hard coat); composting is actually more effective because piles reach higher temperatures. Trifluralin preemergent works in chronic-infestation beds.",
        "20+ year seedbank — long-term commitment in any infested site.",
    ],
    "euphorbia-maculata": [
        "Wear gloves — milky white sap is a skin / eye irritant and is toxic to grazing animals.",
        "Hand-pull young plants before 5-week germination-to-seed cycle completes. Plants often break at the stem; get the taproot when possible.",
        "Don't bother mowing — plants grow flat below the blade.",
        "2+ inches of organic mulch (3–4 in for coarse bark) is the most effective non-chemical control — spurge seeds need light.",
        "Solarization is highly effective: clear plastic over moist soil, 4–6 weeks during July–August. Don't cultivate afterward — brings up deeper seeds.",
        "Postemergent home-gardener options: 2,4-D/MCPP/dicamba combinations on small seedlings only (mature plants resist), triclopyr (Turflon), spot glyphosate in non-turf areas.",
    ],
    "galium-aparine": [
        "Hand-pull or hoe when soil is damp, in early spring before plants flower — comes up easily before stems sprawl.",
        "Don't cut at 2–3 inches — UC IPM notes that cutting at that height actually increases biomass production up to 30% vs. uncut. Pull fully or leave alone.",
        "Mulch (bark, wood chips, leaf litter, gravel) reduces seedling emergence; light inhibits germination on the surface.",
        "Home-gardener postemergents: glyphosate (broad-spectrum), 2,4-D / dicamba / MCPA (partial), clove-oil burndown on young plants.",
        "Brush pets after walks through bedstraw-infested areas — hook hairs on stems and fruit are the introduction vector to clean yards.",
        "Short ~3-year seedbank — consistent prevention of seed set substantially clears infestations.",
    ],
    "isatis-tinctoria": [
        "Hand-hoe through the crown rather than pulling — stems break off because of the 5+ ft taproot, leaving the crown to resprout.",
        "If flowers or seedpods are present, uproot, bag, and remove from site — some seeds germinate even from green pods.",
        "Mowing delays flowering but plants typically resprout; need 1–2 more cuts before they fail to set seed.",
        "Postemergent (before flowering): 2,4-D at 1% spot solution on seedlings/rosettes, or 2-3 qt/acre. Chlorsulfuron (licensed-only) is more effective. 2,4-D + chlorsulfuron combination is highly effective.",
        "California-specific: fall treatments work less well than in other states due to dry late-season weather limiting herbicide uptake.",
        "8+ year seedbank — commit to 2–3 years of repeated removal in any infested area.",
    ],
    "kyllinga-brevifolia": [
        "Catch new patches small and grub them out — dig the entire plant including all rhizomes. Monitor for several months afterward.",
        "Don't casually hoe or cultivate — chopping fragments rhizomes into pieces that re-establish. Hoeing followed by irrigation is essentially propagation.",
        "Fix overwatering — wet conditions favor kyllinga. Reduce irrigation or improve drainage in low spots.",
        "Landscape fabric with full overlap (covered with bark to slow UV breakdown) is the durable bed option. Organic mulch alone is generally not effective — rhizomes push through.",
        "In turf: halosulfuron in two sequential applications is the most effective postemergent per UC IPM. Spot glyphosate kills surrounding turf — leaves bare spots needing overseeding.",
        "Once kyllinga reaches ~40% of turf, eradication is impractical — plan complete renovation rather than chasing patches.",
    ],
    "malva-parviflora": [
        "Pull or hoe while plants have four or fewer true leaves — once the taproot lignifies (within weeks), hand removal stops working.",
        "Don't mow — plants have viable buds on stems below the blade. Common mallow's prostrate habit is especially mower-resistant.",
        "Shallow cultivation that severs the taproot below the soil line is effective when plants are young and numerous.",
        "3+ inches of bark or wood-chip mulch suppresses germination — maintain depth as it breaks down.",
        "Glyphosate is ineffective on mallow — one of the few weeds it doesn't control. Plan mechanical removal as the primary tactic.",
        "Solarization and flaming also don't work; remove plants before the 15-day flower-to-seed window completes.",
    ],
    "paspalum-dilatatum": [
        "Dig out young plants before they form rhizomes or seed. Mature clumps also dig, but rhizome fragments left behind regrow — dig generously around the visible plant.",
        "Don't bother mowing — flowering stalks grow flat enough to escape mower blades.",
        "Maintain competitive turf at optimum mowing height with consistent irrigation; dallisgrass invades low-maintenance lawns with infrequent deep watering.",
        "Selective postemergent options are licensed-applicator-only (foramsulfuron, thiencarbazone, sulfosulfuron) and require 3 applications across 2–3 years.",
        "Cool-season turf: essentially no selective option. Fluazifop (Fusilade II) on fine/tall fescue only.",
        "Spot glyphosate is the practical homeowner option — kills surrounding turf, leaves bare spots needing overseeding. For severe infestations, full renovation is more efficient than spot-treating dozens of clumps.",
    ],
    "pennisetum-clandestinum": [
        "Catch new patches small — once established, kikuyu is one of the hardest weeds in California to dislodge.",
        "Don't cultivate/hoe casually — chopping rhizomes scatters fragments that re-root, especially if irrigation follows. The hoeing-then-watering sequence is essentially propagation.",
        "Strong landscape fabric with full edge overlap can work; organic mulch alone is too permeable — kikuyu pushes rhizomes through.",
        "Solarization (clear plastic, moist soil, 4–6 weeks in mid-July to mid-September) works inland; unlikely to work coastally because seasonal fog limits heat.",
        "In ornamental beds: hand-pull + spot glyphosate. Sethoxydim and fluazifop are grass-selective home-gardener options that won't harm broadleaf ornamentals.",
        "If ≥40% of the lawn is kikuyu, UC IPM advises maintaining it as the turf species rather than fighting it — that's how hard it is to dislodge.",
    ],
    "phytolacca-americana": [
        "Pull young plants by hand at the seedling stage; dig established plants with a shovel for the large fleshy taproot — easier in spring/fall when soil is moist.",
        "Bag ripe berries before removing mature plants — every berry is a packet of seeds viable up to 50 years. Don't compost — seeds survive home compost.",
        "All parts toxic (saponins + oxalates) — wear gloves, avoid touching your face, keep children and curious pets away from the berries.",
        "Don't burn — smoke from toxic plant material is hazardous.",
        "Foliar herbicides (April–August, actively growing): glyphosate 2–3% spray-to-wet (~2.5–4 oz of 41% per gallon), or triclopyr 0.75–1% (~1–1.25 oz of 61% per gallon, broadleaf-selective). Use amine forms over 80°F.",
        "Monitor below trees, fence rows, and bird perches — bird-dispersed seed establishes new plants under canopies year after year.",
    ],
    "plantago-major": [
        "Hand-pull or dig mature plants — must remove the entire crown (and taproot for buckhorn) or it regenerates.",
        "Don't bother mowing — the rosette and seed stalks both stay too low to be cut.",
        "Address the underlying soil condition: broadleaf plantain → compaction + alkalinity + low N; buckhorn → dry + low fertility. Fix the soil and competitive grass outcompetes plantain.",
        "Postemergent turf herbicides (best in fall): 2,4-D works best for mature plants — repeat applications often needed. Triclopyr, dicamba, MCPA, mecoprop, carfentrazone, mesotrione also work.",
        "Quinclorac gives fair control on buckhorn, poor on broadleaf.",
        "2–4 in organic mulch (or fabric + cover mulch) controls seedlings; reapply as it degrades.",
    ],
    "poa-annua": [
        "Pull or hoe solitary plants before they seed; open spots quickly re-flush from the seedbank so monitor and remove repeatedly.",
        "2–3 in organic mulch (or fabric + bark) suppresses germination — seeds need light.",
        "Maintain dense competitive turf with deep + infrequent irrigation. Annual bluegrass thrives in thin or overwatered lawns.",
        "Preemergent (a few weeks before fall germination, when soil temps drop below 70°F): benefin, bensulide, dithiopyr, oryzalin, oxadiazon, pendimethalin, prodiamine — multiple home-gardener-available options.",
        "Postemergent options are limited; most that work are licensed-applicator + warm-season-turf only (foramsulfuron, sulfosulfuron, trifloxysulfuron).",
        "In severe infestations, complete renovation (kill everything with glyphosate, replant in late spring/summer with competitive turf, fall preemergent) is often more effective than chasing the weed.",
    ],
    "polygonum-aviculare": [
        "Aerate or loosen compacted soil — the highest-leverage move, because knotweed only thrives where compaction has killed off competitors.",
        "Reduce traffic with fences/hedges; install rock or pavement where foot traffic is unavoidable.",
        "Hand-pull or hoe with a swivel hoe — the taproot lifts cleanly when soil is moist.",
        "3–4 in coarse organic mulch (or fabric + bark/rock) prevents seedling establishment. Avoid finely-shredded mulch — seeds germinate in it.",
        "Postemergent home-gardener herbicides on young plants (under 3 in diameter): glyphosate, pelargonic acid, 2,4-D. Dicamba in turf only.",
        "Knotweed is a host for parasitic dodder and powdery mildew — extra reason to keep it out of vegetable beds.",
    ],
    "portulaca-oleracea": [
        "Hand-pull seedlings when small — easiest after an irrigation when soil is moist.",
        "Don't leave pulled or hoed plants on damp soil — stems re-root within days. Remove from site or dry on a hard surface before disposal. Bag plants with flowers already forming.",
        "3+ in organic mulch (porous fabric for irrigated beds) starves seeds of light — purslane germinates only at the surface.",
        "Solarization (clear plastic over moist soil, July–August) is one of the most effective non-chemical controls. Don't cultivate afterward — brings up deeper seeds.",
        "In turf: dicamba, MCPP, 2,4-D, MSMA are effective home-gardener postemergents. In ornamental beds, mulch + spot glyphosate.",
        "240,000 seeds per plant + 5–40 year viability — prevention is the primary tool. Clean equipment between infested and clean beds.",
    ],
    "salsola-tragus": [
        "Pull young plants while small, before stems lignify and leaves get spiny. Wear gloves at later stages — plant material causes skin irritation.",
        "Mow at first bloom to prevent seed set — timing is critical (too early → regrowth; too late → seeds form).",
        "Don't disturb soil in already-vacant areas — loose soil is exactly what Russian thistle needs to germinate. Plant competitive desirable vegetation.",
        "Dispose of mature tumbleweeds against fences/structures before they break loose in fall — clearing them removes the fire hazard and prevents next year's seed dispersal.",
        "Flame weeding seedlings/rosettes after rain (high humidity, wet vegetation) is effective. Never with dry surroundings — major fire risk.",
        "Russian thistle has evolved resistance to chlorsulfuron, sulfometuron, and glyphosate within a few years of repeated single-herbicide use — rotate modes of action. Short 1–2 year seedbank is the long-term lever.",
    ],
    "senecio-vulgaris": [
        "Eliminate plants before they flower. Even pulled or cut plants can mature seeds from open flowers — bag flowering plants and remove from the site rather than leaving on the ground.",
        "Hand-pull, hoe, or shallow-cultivate while plants are young. Monitor from early fall through early summer.",
        "Coarse, medium-size, 3+ in mulch is highly effective. Avoid fine mulches (sawdust) — they absorb water and become a seedbed. Synthetic fabrics block soil seedbank but not wind-blown seeds landing on top.",
        "Spot glyphosate or diquat on small plants in beds — shield the sprayer. Glyphosate is the only edible-crop-compatible option of the two.",
        "Keep horses, cattle, and pigs away from infested areas — pyrrolizidine alkaloids cause chronic liver damage in repeated small doses.",
        "One-year seedbank means two or three years of consistent removal substantially clears an infestation. Re-infestation from wind-blown neighborhood seeds is normal — plan ongoing seedling sweeps.",
    ],
    "stellaria-media": [
        "Control before flowering — the 5–6 week germination-to-seed cycle gives a narrow window. Monitor from late fall onward.",
        "Hand-pull, hoe, or cultivate while soil is dry and plants are small. If soil is moist and plants are large, remove plant debris from the site — stems re-root from nodes in damp ground.",
        "Solarization (clear plastic over moist soil, late summer) kills the seedbank. Don't disturb the soil afterward — brings up deeper seeds.",
        "2+ in organic mulch (or fabric + cover) suppresses germination.",
        "Preemergent (late fall / early winter, before germination): benefin, dithiopyr, oryzalin, pendimethalin, prodiamine, trifluralin.",
        "7–8 year seedbank depletes 95% with consistent prevention of seed set. Each clean year compounds.",
    ],
    "taraxacum-officinale": [
        "Grub out solitary plants with a dandelion knife before they seed — get all the taproot you can. Root sections as short as 1 in regenerate.",
        "Repeated hand-pulling alone is usually futile — buds on remaining root segments regenerate.",
        "Don't bother mowing — basal rosette sits below the mower blade.",
        "3+ in wood chip / bark mulch or landscape fabric blocks light to germinating seeds.",
        "Turf-safe postemergents: 2,4-D, dicamba, MCPA, mecoprop combinations (weed-and-feed). Triclopyr is also effective but don't use on Bermudagrass.",
        "Spot-paint glyphosate on leaves in mulched beds; combine with isoxaben / indaziflam / dithiopyr preemergent to clean up the seedbank. Wind-dispersed seed travels miles — expect ongoing seedling sweeps every spring and fall.",
    ],
    "toxicodendron-diversilobum": [
        "Safety first: washable cotton gloves over plastic gloves, long sleeves, long pants, closed shoes. Wash all clothing/tools/pets after — urushiol persists for months on surfaces.",
        "Don't burn poison-oak — urushiol disperses in smoke, severe respiratory hazard.",
        "Don't mow — mowers aerosolize urushiol particles. Same exposure hazard as burning.",
        "Hand-pull or grub when soil is moist (early spring or late fall) — remove the entire plant including roots. Dry hard soil → stems snap and rootstocks vigorously resprout.",
        "Foliar (late spring–early summer, actively growing): glyphosate 2% spray-to-wet (2.5 oz of 41% per gallon), or triclopyr ester 1–5% with seed oil for better penetration. Over 80°F use amine triclopyr or glyphosate, not ester.",
        "Cut-stump: cut, then paint within minutes with concentrated triclopyr ester (1:4 with seed oil), undiluted triclopyr amine 8%, or 41% glyphosate diluted 1:1 in water. Re-treat when new shoots reach ~2 ft.",
        "Poison-oak is a valuable native in wildland settings — only remove where it poses a safety/access problem (near homes, trails, play areas).",
    ],
    "tribulus-terrestris": [
        "Pull plants before they produce seed (before or at flowering) — taproot is younger and softer at this stage. Soil moist makes it cleanest.",
        "Sweep up dropped burrs after pulling — pat a piece of carpet against the ground to collect them. Pet paws and bicycle tires are the dispersal vectors.",
        "Don't bother mowing — plants grow flat to the ground.",
        "3+ in organic mulch or fabric suppresses germination, but burrs dropped on top of the mulch can establish from the surface because of the deep taproot — combine mulch with burr cleanup.",
        "Two introduced weevils (*Microlarinus lareynii* seed-eater + *M. lypriformis* stem-borer) provide effective control when working together. Often available free at established release sites from your county Agricultural Commissioner.",
        "Home-gardener postemergent: 2,4-D, glyphosate, dicamba on young plants. 5-year seedbank — persistent monitoring is the long-term play.",
    ],
    "trifolium-repens": [
        "Annual clovers (black medic, burclover, sweetclovers): hand-pull, hoe, or cultivate before seed set. Easy at the seedling stage.",
        "Perennial clovers (white, strawberry): dig out the connected rooted-stem clump. Glyphosate at high rates suppresses but rarely eradicates.",
        "3–4 in organic mulch (or fabric + bark) blocks seedlings; thicker (4–6 in) layers smother existing plants.",
        "Composting and solarization are less effective than for other weeds — the hard seed coat tolerates heat and survives composting. Plan multi-year control.",
        "A green clover patch in a yellow lawn signals low nitrogen — fix the fertility balance first. Increase N (1 lb actual N per 1,000 sq ft per active-growth month); reduce phosphorus.",
        "Cool-season turf postemergent: triclopyr (also mecoprop, dicamba). Warm-season turf: mecoprop and dicamba; don't use triclopyr (damages warm-season grasses). 2,4-D injures but doesn't control — skip it.",
    ],
    "urtica-urens": [
        "Gloves and long sleeves are non-negotiable — stinging hairs cause irritant dermatitis in everyone, not just allergic individuals. Sting symptoms can last 12+ hours.",
        "Burning nettle (annual): hand-pull or hoe before plants set seed. Straightforward with gloves on.",
        "Stinging nettle (perennial, often native *U. dioica*): remove the entire rhizome, or the plant regrows. Don't cultivate casually — chopping rhizomes spreads the patch.",
        "Close mowing prevents fruit development but doesn't kill the plants. Repeated cultivation works on stinging nettle if persistent across multiple seasons.",
        "Stinging nettle hosts native butterflies (red admiral, satyr comma, Milbert's tortoiseshell) — for naturalistic gardens, leaving a patch in a remote moist corner is a legitimate native-plant choice. Remove only where safety/access matters.",
        "Don't compost in livestock-accessible areas without thorough drying — sting hairs persist on dried plant material.",
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
            f"Annotated plants missing from NOTES (Layer C must cover every plant with a removal_method): {uncovered}"
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
