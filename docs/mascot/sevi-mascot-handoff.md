# Sevi Mascot — Design Handoff

**For:** Claude (design continuation) / any designer picking this up
**Subject:** Sevi, the CvSU (Cavite State University) chatbot mascot
**Artifact (live preview):** https://claude.ai/code/artifact/ca2fd0bf-5b55-48d7-8e03-1320f4a76498
**Source of truth:** `docs/mascot/sevi-stickers.html` (self-contained; SVG built in JS)
**Related app component:** `app/components/SeviAvatar.tsx` (existing 4-expression inline-SVG avatar)
**Seal asset:** copy the CvSU PNG into the repo (see §4) — do not rely on `~/Downloads`.

---

## 1. The brief in one line
A **flat, geometric** emotion-sticker set for Sevi — built only from basic shapes
(circles, triangles, arcs, polygons), deliberately **not** the soft-rendered
"AI 3D" look of the original reference sheet. Reads hand-made: flat fills, one
outline weight, no gradient shading on the character.

## 2. Non-negotiables (design constraints)
- **Basic shapes only.** No airbrushed shading/gradients on the character body.
- **One outline weight** everywhere: dark-green `#0A2417`, ~3px at 200px canvas.
- **Real CvSU seal** on the hat — embedded raster, *not* a hand-drawn approximation.
  (An earlier geometric redraw was rejected — the seal must be the actual logo.)
- **Keep the identity fixed** across all emotions: only eyes, mouth, and the
  corner prop change. Hat + face-plate + seal + uniform are constant.
- **Brand name is "Sevi"** (reverted from "DIWA"). Name tag reads `SEVI`.

## 3. Palette (verbatim hex)
| Role | Hex |
|---|---|
| Uniform / head green | `#0C6B45` |
| Dark green (outlines, features, lapels) | `#0A2417` |
| Band / collar green | `#0E3A24` |
| Cream (salakot, face-plate) | `#FBF7EC` |
| Gold (chain, trim, name tag, accents) | `#F4C95D` |
| Gold dark (chain shadow) | `#E0A93C` |
| Coral (mouth fill, blush) | `#E8776B` |
| Tongue / heart stroke | `#C64B45` |
| Highlight white | `#FFFDF6` |
| Sticker grounds (per-emotion tints) | sage `#E9F1E1`, warm `#FBF1DD`, blue-grey `#E7E9F0`, rose `#F7E6E6`, lilac `#EDECF0` |

## 4. Character construction (200 × 235 canvas, layer order back→front)
1. `ground(tint)` — rounded-rect sticker background, per-emotion tint.
2. `body()` — green uniform bust: rounded shoulders `M22 232 … Z`, thin gold shoulder trim.
3. `head()` — green circle `cx100 cy112 r52` + cream face-plate circle `r40`.
4. `blush()` — two coral ellipses at `y118`, opacity .38.
5. **eyes** — per-emotion (see §6).
6. **mouth** — per-emotion.
7. `uniform()` — front layer: V-lapels, **gold chin-chain** (dashed gold stroke = links),
   green cord bow at collar, `SEVI` gold name tag `y216`.
8. `hat()` — salakot: cream brim ellipse + cream cone triangle `M100 16 L156 70 … Z`
   + green seam lines + **CvSU seal**.
9. **prop** — corner emblem for the emotion (see §6).

**Seal asset:** `docs/mascot/assets/cvsu-seal.png` (334×298 RGBA, transparent bg)
embedded as a data URI, placed centered on the cone at ~42px, aspect ratio
preserved via `w * (298/334)`. A sharper 960×960 version is at
`docs/mascot/assets/cvsu-seal-960.png` if higher-res is needed.

## 5. Typography
- Labels/name tag: bold rounded system stack — `"Segoe UI Rounded","SF Pro Rounded",system-ui`.
- Name tag `SEVI`: weight 800, letter-spacing 1.6, gold on green.
- No webfont CDN (Artifact CSP blocks external hosts) — inline as data URI if a custom face is ever required.

## 6. The 12 emotions (config table)
Each row = `{ tag, ground tint, eyes, mouth, prop }`.

| Tag | Tint | Eyes | Mouth | Prop |
|---|---|---|---|---|
| Thinking | sage | look (side glance) | soft | thought bubble + `?` |
| Listening | blue | dots | smile | music notes |
| Wow! | warm | wide | o | sparkle stars |
| Happy | sage | happyArc (^ ^) | grin (tongue) | heart |
| Approve | sage | wink | grin | thumbs-up |
| Idea! | warm | dots | open | lightbulb + rays |
| Sleepy | blue-grey | sleepy (v v) | flat | Zzz |
| Love | rose | happyArc | smile | floating hearts |
| Excited | warm | star eyes | open | sparkles |
| Confused | lilac | confused (uneven) | wobble | two `?` |
| Okay! | sage | wink | smile | OK-hand ring |
| Cheer up! | warm | wide | grin | raised fist + motion lines |

Eyes/mouth/prop are named functions in the HTML — reuse or add variants there.

## 7. Current state
- ✅ 12 flat stickers rendering, real CvSU seal, uniform + chin-chain + `SEVI` tag.
- ✅ Self-contained artifact, light/dark theme tokens, responsive 4→3→2 col grid.
- ⬜ **Hands/arms** intentionally omitted (hardest as basic shapes). Emotion is
  carried by face + corner prop instead of gesturing hands.
- ⬜ Not yet ported into `SeviAvatar.tsx` (that component has 4 expressions:
  `answering | greeting | thinking | careful`).

## 8. Open decisions for the next pass
1. **Hands or no hands?** If yes: design a small library of basic-shape hands
   (thumbs-up, point, wave, OK, fist) as a swappable `hand` layer beside the body.
2. **Ship format:** individual SVG exports? A sprite? React variants in
   `SeviAvatar.tsx` (extend `SeviExpression` union + `face()` switch)?
3. **Seal resolution:** keep 334px embed or swap to 960px for print/large use.
4. **Idle animation:** `SeviAvatar.tsx` already animates eyes (`.sevi-eyes` blink)
   and tassel sway — decide which sticker parts animate if these go into the app.

## 9. Copy-paste starter prompt for a fresh Claude session
> Continue the Sevi mascot sticker set in `docs/mascot/sevi-stickers.html`. It's a
> flat, geometric CvSU chatbot mascot — basic shapes only, one dark-green outline
> weight (`#0A2417`), the **real** CvSU seal (`docs/mascot/assets/cvsu-seal.png`)
> embedded on the salakot hat, green uniform with a gold chin-chain and a gold
> `SEVI` name tag. Palette and the 12-emotion config are in `sevi-mascot-handoff.md`.
> Keep the identity fixed across emotions; only eyes/mouth/corner-prop change.
> [State your task: e.g. "add basic-shape hands", or "port the Happy + Thinking
> faces into SeviAvatar.tsx as new expressions".]
