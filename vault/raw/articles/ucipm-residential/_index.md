# UC IPM Pest Notes — per-species weed pages (residential)

Source: UC Statewide Integrated Pest Management Program (UC ANR / UC Cooperative Extension).
Landing page: <https://ipm.ucanr.edu/PMG/PESTNOTES/>

Each entry is a Pest Note covering one species or a small taxonomic group as
encountered in California **home gardens, landscapes, and lawns**. These are
peer-reviewed UC publications, residential-focused — the right tier for the
Sunshower cleanup-plan app's target audience.

Scraped to markdown by [vault/scripts/scrape_ucipm.py](../../../scripts/scrape_ucipm.py).
Output filename per entry: `<slug>.md` where slug is the title kebab-cased.

## Pest Notes (28 species / species groups)

- [annual-bluegrass.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7464.html) — Annual Bluegrass (*Poa annua*)
- [brooms.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74147.html) — Brooms (*Cytisus*, *Genista*, *Spartium*, *Ulex*)
- [burning-and-stinging-nettles.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74146.html) — Burning & Stinging Nettles (*Urtica*)
- [catchweed-bedstraw.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74154.html) — Catchweed Bedstraw (*Galium aparine*)
- [chickweeds.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74129.html) — Chickweeds (*Stellaria*, *Cerastium*)
- [clovers.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7490.html) — Clovers (*Trifolium*)
- [common-groundsel.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74130.html) — Common Groundsel (*Senecio vulgaris*)
- [common-knotweed.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7484.html) — Common Knotweed (*Polygonum aviculare*)
- [common-purslane.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7461.html) — Common Purslane (*Portulaca oleracea*)
- [creeping-woodsorrel-and-bermuda-buttercup.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7444.html) — Creeping Woodsorrel & Bermuda Buttercup (*Oxalis corniculata*, *Oxalis pes-caprae*)
- [dallisgrass.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7491.html) — Dallisgrass (*Paspalum dilatatum*)
- [dandelion.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7469.html) — Dandelion (*Taraxacum officinale*)
- [dodder.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7496.html) — Dodder (*Cuscuta*)
- [dyers-woad.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74175.html) — Dyer's Woad (*Isatis tinctoria*)
- [field-bindweed.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7462.html) — Field Bindweed (*Convolvulus arvensis*)
- [green-kyllinga.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7459.html) — Green Kyllinga (*Kyllinga brevifolia*)
- [kikuyugrass.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7458.html) — Kikuyugrass (*Pennisetum clandestinum*)
- [mallows.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74127.html) — Mallows (*Malva*)
- [perennial-pepperweed.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74121.html) — Perennial Pepperweed (*Lepidium latifolium*)
- [plantains.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7478.html) — Plantains (*Plantago*)
- [poison-hemlock.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74162.html) — Poison Hemlock (*Conium maculatum*)
- [poison-oak.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7431.html) — Poison Oak (*Toxicodendron diversilobum*) — native, included for removal-method reference only
- [pokeweed.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74173.html) — Pokeweed (*Phytolacca americana*)
- [puncturevine.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn74128.html) — Puncturevine (*Tribulus terrestris*)
- [russian-thistle.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7486.html) — Russian Thistle (*Salsola tragus*)
- [spotted-spurge-and-other-spurges.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7445.html) — Spotted Spurge & Other Spurges (*Euphorbia*)
- [wild-blackberries.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7434.html) — Wild Blackberries (*Rubus*)
- [yellow-starthistle.md](https://ipm.ucanr.edu/PMG/PESTNOTES/pn7402.html) — Yellow Starthistle (*Centaurea solstitialis*)

## Overlap with current 38-plant annotated set

Pest Notes here that directly cover an already-annotated plant in
[`src/data/plants.json`](../../../../src/data/plants.json):

| Plant in plants.json                  | UC IPM Pest Note                            |
|---------------------------------------|---------------------------------------------|
| *Cytisus scoparius* (Scotch broom)    | Brooms                                      |
| *Cytisus striatus* (Portuguese broom) | Brooms                                      |
| *Genista monspessulana* (French broom)| Brooms                                      |
| *Spartium junceum* (Spanish broom)    | Brooms                                      |
| *Ulex europaeus* (gorse)              | Brooms                                      |
| *Centaurea solstitialis*              | Yellow Starthistle                          |
| *Conium maculatum*                    | Poison Hemlock                              |
| *Lepidium latifolium*                 | Perennial Pepperweed                        |
| *Oxalis pes-caprae*                   | Creeping Woodsorrel & Bermuda Buttercup     |
| *Rubus armeniacus*                    | Wild Blackberries                           |

The remaining ~18 Pest Notes cover horticultural weeds not currently in our
Cal-IPC–derived inventory (e.g. dandelion, mallows, plantains, field
bindweed). These are queued for **future inventory expansion** — common
residential weeds homeowners want to remove that Cal-IPC doesn't track
because they aren't wildland invasives.
