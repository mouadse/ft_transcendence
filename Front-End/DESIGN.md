# Design System: Clay-Artisanal Fitness
**Unified Design System — Priority: Clay (Original_desing.md)**

---

## 1. Visual Theme & Atmosphere

Clay's website is a warm, playful celebration of color that treats B2B data enrichment like a craft rather than an enterprise chore. This design language is built on a foundation of warm cream backgrounds (`#faf9f7`) and oat-toned borders (`#dad4c8`, `#eee9df`) that give every surface the tactile quality of handmade paper. Against this artisanal canvas, a vivid swatch palette explodes with personality — Matcha green, Slushie cyan, Lemon gold, Ube purple, Pomegranate pink, Blueberry navy, and Dragonfruit magenta — each named like flavors at a juice bar, not colors in an enterprise UI kit.

The creative north star is **"The Kinetic Craft"** — departing from clinical, high-performance rigidity to embrace a tactile, editorial experience that feels human-made. The system balances "Artisanal Warmth" (creamy textures and hand-drawn qualities) with "Playful Precision" (aggressive typography and physics-based motion). This design system breaks the standard "SaaS grid" by utilizing intentional asymmetry, oversized pill shapes, and a high-contrast relationship between ultra-tight display type and technical mono-spaced labels. It is designed to feel like a high-end wellness journal—sophisticated yet vibrantly alive.

**Key Characteristics:**
- Warm cream canvas (`#faf9f7`) with oat-toned borders (`#dad4c8`) — artisanal, not clinical
- Named swatch palette: Matcha, Slushie, Lemon, Ube, Pomegranate, Blueberry, Dragonfruit
- Roobert font with 5 OpenType stylistic sets — quirky geometric character with artisanal warmth
- Playful hover animations: rotateZ(-8deg) + translateY(-80%) + hard offset shadow
- Space Mono for code and technical labels
- Generous border radius: 24px cards, 40px sections, 1584px pills
- Mixed border styles: solid + dashed in the same interface
- Multi-layer shadow with inset highlight: `0px 1px 1px` + `-1px inset` + `-0.5px`
- Signature 3-Layer Shadow: Every primary card must use hard-offset + inset highlight + dashed/solid border

---

## 2. Color Palette & Roles

### Primary
- **Clay Black** (`#000000`): Text, headings, pricing card text
- **Pure White** (`#ffffff`): Card backgrounds, button backgrounds, inverse text
- **Warm Cream** (`#faf9f7`): Page background — the warm, paper-like canvas (non-negotiable)
- **Ink** (`#2e2f2e`): A soft, organic charcoal for maximum legibility (alternative to pure black)

### Swatch Palette — Named Colors

**Matcha (Green)**
- **Matcha 300** (`#84e7a5`): Light green accent
- **Matcha 600** (`#078a52`): Mid green
- **Matcha 800** (`#02492a`): Deep green for dark sections
- **Matcha Primary** (`#38671a`): Primary green accent

**Slushie (Cyan)**
- **Slushie 500** (`#3bd3fd`): Bright cyan accent
- **Slushie 800** (`#0089ad`): Deep teal
- **Slushie (Tertiary)** (`#5d3fd3`): Tertiary accent variant

**Lemon (Gold)**
- **Lemon 400** (`#f8cc65`): Warm pale gold
- **Lemon 500** (`#fbbd41`): Primary gold
- **Lemon 700** (`#d08a11`): Deep amber
- **Lemon 800** (`#9d6a09`): Dark amber
- **Lemon Background** (`#f9f2e5`): Background-leaning lemon

**Ube (Purple)**
- **Ube 300** (`#c1b0ff`): Soft lavender
- **Ube 800** (`#43089f`): Deep purple
- **Ube 900** (`#32037d`): Darkest purple
- **Ube Primary** (`#b4a5ff`): Primary purple accent

**Pomegranate (Pink/Red)**
- **Pomegranate 400** (`#fc7981`): Warm coral-pink
- **Pomegranate (Error)** (`#b02500`): Error state red

**Blueberry (Navy Blue)**
- **Blueberry 800** (`#01418d`): Deep navy
- **Blueberry Primary** (`#3a03b1`): Primary blueberry

**Dragonfruit (Magenta)**
- Vibrant magenta accent (swatch color for sections)

### Neutral Scale (Warm)
- **Warm Silver** (`#9f9b93`): Secondary/muted text, footer links
- **Warm Charcoal** (`#55534e`): Tertiary text, dark muted links
- **Dark Charcoal** (`#333333`): Link text on light backgrounds

### Surface & Border
- **Oat Border** (`#dad4c8`): Primary border — warm, cream-toned structural lines (mandatory)
- **Oat Light** (`#eee9df`): Secondary lighter border
- **Cool Border** (`#e6e8ec`): Cool-toned border for contrast sections
- **Dark Border** (`#525a69`): Border on dark sections
- **Light Frost** (`#eff1f3`): Subtle button background (at 0% opacity on hover)

### Badges
- **Badge Blue Bg** (`#f0f8ff`): Blue-tinted badge surface
- **Badge Blue Text** (`#3859f9`): Vivid blue badge text
- **Focus Ring** (`rgb(20, 110, 245) solid 2px`): Accessibility focus indicator

### Shadows
- **Clay Shadow** (`rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px`): Multi-layer with inset highlight — the signature
- **Hard Offset** (`rgb(0,0,0) -7px 7px`): Hover state — playful hard shadow
- **Artisanal Shadow Stack** (3-layer):
  1. Downward Cast: `-7px 7px` in solid or high-opacity black/ink
  2. Upward Inset Highlight: Soft, white or cream internal glow on top-left inner edge
  3. Subtle Edge: 2px solid or dashed border in `#dad4c8` (Oat)

### The "No-Line" Rule & Layering
- **Prohibition of 1px Solid Borders:** Do not use standard 1px lines to divide sections. Boundaries must be defined by shifts in background color (e.g., a `surface-container-low` section sitting on a `surface` background).
- **Nesting Depth:** Use surface tiers to create physical hierarchy. A `surface-container-lowest` card should sit atop a `surface-container-low` parent container to create a "nested paper" effect.
- **Dashed Accents:** To evoke an artisanal, "tailored" feel, use dashed borders for non-interactive decorative containers or secondary info-boxes using the Oat-toned token.

---

## 3. Typography Rules

### Font Families
- **Primary**: `Roobert`, fallback: `Arial`
- **Monospace**: `Space Mono`
- **OpenType Features**: `"ss01"`, `"ss03"`, `"ss10"`, `"ss11"`, `"ss12"` on all Roobert text (display uses all 5; body/UI uses `"ss03"`, `"ss10"`, `"ss11"`, `"ss12"`)

### Display & Headlines (Roobert)
- **The Aggressive Crop:** Large headings (80px+) must utilize a negative letter-spacing of `-3.2px`.
- **Stylistic Character:** Enable OpenType sets `ss01, ss03, ss10, ss11, ss12` to unlock unique geometric alternates that give the brand its signature "custom" look.
- **Scale:**
  - `Display-Lg`: 3.5rem (80px) — Tight tracking, aggressive line-height, all 5 stylistic sets
  - `Display-Secondary`: 60px (3.75rem) — 600 weight, line-height 1.00, letter-spacing -2.4px, all 5 sets

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display Hero | Roobert | 80px (5.00rem) | 600 | 1.00 (tight) | -3.2px | All 5 stylistic sets |
| Display Secondary | Roobert | 60px (3.75rem) | 600 | 1.00 (tight) | -2.4px | All 5 stylistic sets |
| Section Heading | Roobert | 44px (2.75rem) | 600 | 1.10 (tight) | -0.88px to -1.32px | All 5 stylistic sets |
| Card Heading | Roobert | 32px (2.00rem) | 600 | 1.10 (tight) | -0.64px | All 5 stylistic sets |
| Headline-Lg | Roobert | 2rem (32px) | 600 | 1.10 | -0.64px | All 5 stylistic sets |
| Feature Title | Roobert | 20px (1.25rem) | 600 | 1.40 | -0.4px | All 5 stylistic sets |
| Sub-heading | Roobert | 20px (1.25rem) | 500 | 1.50 | -0.16px | 4 stylistic sets (no ss01) |
| Body Large | Roobert | 20px (1.25rem) | 400 | 1.40 | normal | 4 stylistic sets |
| Body | Roobert | 18px (1.13rem) | 400 | 1.60 (relaxed) | -0.36px | 4 stylistic sets |
| Body Standard | Roobert | 16px (1.00rem) | 400 | 1.50 | normal | 4 stylistic sets |
| Body Medium | Roobert | 16px (1.00rem) | 500 | 1.20–1.40 | -0.16px to -0.32px | 4–5 stylistic sets |
| Button | Roobert | 16px (1.00rem) | 500 | 1.50 | -0.16px | 4 stylistic sets |
| Button Large | Roobert | 24px (1.50rem) | 400 | 1.50 | normal | 4 stylistic sets |
| Button Small | Roobert | 12.8px (0.80rem) | 500 | 1.50 | -0.128px | 4 stylistic sets |
| Nav Link | Roobert | 15px (0.94rem) | 500 | 1.60 (relaxed) | normal | 4 stylistic sets |
| Caption | Roobert | 14px (0.88rem) | 400 | 1.50–1.60 | -0.14px | 4 stylistic sets |
| Small | Roobert | 12px (0.75rem) | 400 | 1.50 | normal | 4 stylistic sets |
| Uppercase Label | Roobert | 12px (0.75rem) | 600 | 1.20 (tight) | 1.08px | `text-transform: uppercase`, 4 sets |
| Badge | Roobert | 9.6px | 600 | — | — | Pill badges |

### Technical Labels (Space Mono)
- **The Blueprint Look:** All metadata, labels, and micro-copy must use Space Mono.
- **Styling:** Always Uppercase, letter-spacing +1px. This contrasts the organic nature of Roobert with a sense of "tracked data."

### Typography Principles
- **Five stylistic sets as identity**: The combination of `"ss01"`, `"ss03"`, `"ss10"`, `"ss11"`, `"ss12"` on Roobert creates a distinctive typographic personality. `ss01` is reserved for headings and emphasis — body text omits it, creating a subtle hierarchy through glyph variation.
- **Aggressive display compression**: -3.2px at 80px, -2.4px at 60px — the most compressed display tracking alongside the most generous body spacing (1.60 line-height), creating dramatic contrast.
- **Weight 600 for headings, 500 for UI, 400 for body**: Clean three-tier system where each weight has a strict role.
- **Uppercase labels with positive tracking**: 12px uppercase at 1.08px letter-spacing creates the systematic wayfinding pattern.

---

## 4. Component Stylings

### Buttons (The "Bounce" Component)

**Primary (Pill-Shaped)**
- Shape: Pill (48px radius or 1584px)
- Background: Matcha (`#38671a` or `#078a52`)
- Text: Ink (`#2e2f2e`) or White (on dark backgrounds)
- Padding: 6.4px 12.8px (or context-specific)
- Hover Animation:
  - `rotateZ(-8deg)`
  - `translateY(-4px)` (or `-80%` for high-impact transitions)
  - Engage the hard offset shadow: `box-shadow: -7px 7px 0px rgb(0,0,0)`
  - Background shifts to contrasting swatch color
- Focus: `rgb(20, 110, 245) solid 2px` outline

**White Solid**
- Background: `#ffffff`
- Text: `#000000`
- Padding: 6.4px
- Border: Optional `1px solid #dad4c8`
- Hover: Oat or swatch color background, animated rotation + shadow
- Use: Primary CTA on colored sections

**Transparent with Hover Animation**
- Background: transparent (`rgba(239, 241, 243, 0)`)
- Text: `#000000`
- Padding: 6.4px 12.8px
- Border: none (or `1px solid #717989` for outlined variant)
- Hover: background shifts to swatch color (e.g., `#434346`), text to white, `rotateZ(-8deg)`, `translateY(-80%)`, hard shadow `rgb(0,0,0) -7px 7px`
- Focus: `rgb(20, 110, 245) solid 2px` outline

**Ghost Outlined**
- Background: transparent
- Text: `#000000`
- Padding: 8px
- Border: `1px solid #717989`
- Radius: 4px
- Hover: dragonfruit swatch color, white text, animated rotation

### Input Fields
- **Styling:** No bottom-only lines. Use a full-pill or 24px rounded container.
- **State:** When focused, the border shifts from Oat (`#dad4c8`) to a 2px solid Matcha (`#38671a`).
- Text: `#000000`
- Border: `1px solid #717989`
- Radius: 4px (standard), 24px (pill variant)
- Focus: `rgb(20, 110, 245) solid 2px` outline

### Cards & Containers
- Background: `#ffffff` on cream canvas
- Border: `1px solid #dad4c8` (warm oat) or `1px dashed #dad4c8`
- Radius:
  - Sharp (4px): Ghost buttons, inputs
  - Standard (8px): Small cards, images, links
  - Badge (11px): Tag badges
  - Card (12px): Standard cards, buttons
  - Feature (24px): Feature cards, images, panels
  - Section (40px): Large sections, footer, containers
  - Pill (1584px): CTAs, pill-shaped buttons
- Shadow: 
  - **Clay Shadow (Level 1):** `rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px`
  - **Or 3-Layer Artisanal Stack:**
    1. Downward cast: `-7px 7px` in solid black/ink
    2. Inset highlight: Soft white/cream on top-left
    3. Dashed border: `2px dashed #dad4c8`
- Colorful section backgrounds using swatch palette (matcha, slushie, ube, lemon)

### Lists & Dividers
- **The Divider Ban:** Never use horizontal lines to separate list items. Use vertical "breathing room" (32px minimum) or subtle background-tone alternating (zebra-striping with `surface-container-low`).
- **Visual Soul:** Apply a very subtle radial gradient to large hero cards, transitioning from `primary` to `primary-container` to avoid "flatness."

### New Component: The "Activity Sticker"
- Small, circular or pill-shaped badges that float at slight angles (3-5 degrees) over images or cards, mimicking physical stickers on a fitness journal.

### Navigation
- Sticky top nav on cream background
- Roobert 15px weight 500 for nav links
- Clay logo left-aligned
- CTA buttons right-aligned with pill radius
- Border bottom: `1px solid #dad4c8`
- Mobile: hamburger collapse at 767px

### Image Treatment
- Product screenshots in white cards with oat borders
- Colorful illustrated sections with swatch background colors
- 8px–24px radius on images
- Full-width colorful section backgrounds

### Distinctive Components

**Swatch Color Sections**
- Full-width sections with swatch-colored backgrounds (matcha green, slushie cyan, ube purple, lemon gold, dragonfruit magenta)
- White text on dark swatches, black text on light swatches
- Each section tells a distinct product story through its color

**Playful Hover Buttons**
- Rotate -8deg + translate upward on hover
- Hard offset shadow (`-7px 7px`) instead of soft blur
- Background transitions to contrasting swatch color
- Creates a physical, toy-like interaction quality

**Dashed Border Elements**
- Dashed borders (`1px dashed #dad4c8`) alongside solid borders
- Used for secondary containers and decorative elements
- Adds a hand-drawn, craft-like quality

---

## 5. Elevation, Depth & Shapes

### The Signature 3-Layer Shadow
Every primary card or floating element must utilize this specific stack:
1. **Downward Cast:** A hard-offset shadow (`-7px 7px`) in solid or high-opacity black/ink.
2. **Upward Inset Highlight:** A soft, white or cream internal glow on the top-left inner edge to simulate thickness.
3. **Subtle Edge:** A 2px solid or dashed border in `#dad4c8` (Oat).

### Depth & Elevation Levels

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, cream canvas | Page background |
| Clay Shadow (Level 1) | `rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px` | Cards, buttons — multi-layer with inset highlight |
| Hover Hard (Level 2) | `rgb(0,0,0) -7px 7px` | Hover state — playful hard offset shadow |
| Focus (Level 3) | `rgb(20, 110, 245) solid 2px` | Keyboard focus ring |

**Shadow Philosophy**: Clay's shadow system is uniquely three-layered: a downward cast (`0px 1px 1px`), an upward inset highlight (`0px -1px 1px inset`), and a subtle edge (`0px -0.5px 1px`). This creates a "pressed into clay" quality where elements feel both raised AND embedded — like a clay tablet where content is stamped into the surface. The hover hard shadow (`-7px 7px`) is deliberately retro-graphic, referencing print-era drop shadows and adding physical playfulness.

### Geometry
- **Pill Shapes:** Mandatory for all Buttons and Chips — embodies the playful, artisanal nature.
- **Generous Radii:**
  - `xl` (3rem/48px): Section containers.
  - `lg` (2rem/32px): Primary content cards.
  - `md` (1.5rem/24px): Small UI elements.
  - `pill` (1584px): Buttons and CTAs.

### Decorative Depth
- Full-width swatch-colored sections create dramatic depth through color contrast
- Dashed borders add visual texture alongside solid borders
- Product illustrations with warm, organic art style

---

## 6. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 1px, 2px, 4px, 6.4px, 8px, 12px, 12.8px, 16px, 18px, 20px, 24px, 32px

### Grid & Container
- Max content width centered
- Feature sections alternate between white cards and colorful swatch backgrounds
- Card grids: 2–3 columns on desktop
- Full-width colorful sections break the grid
- Footer with generous 40px radius container

### Whitespace Philosophy
- **Warm, generous breathing**: The cream background provides a warm rest between content blocks. Spacing is generous but not austere — it feels inviting, like a well-set table.
- **Color as spatial rhythm**: The alternating swatch-colored sections create visual rhythm through hue rather than just whitespace. Each color section is its own "room."
- **Craft-like density inside cards**: Within cards, content is compact and well-organized, contrasting with the generous outer spacing.
- **Intentional Asymmetry:** Offset headings to the left while keeping body text centered, or vice-versa, to break the standard "SaaS grid."

---

## 7. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile Small | <479px | Single column, tight padding |
| Mobile | 479–767px | Standard mobile, stacked layout |
| Tablet | 768–991px | 2-column grids, condensed nav |
| Desktop | 992px+ | Full layout, 3-column grids, expanded sections |

### Touch Targets
- Buttons: minimum 6.4px + 12.8px padding for adequate touch area
- Nav links: 15px font with generous spacing
- Mobile: full-width buttons for easy tapping

### Collapsing Strategy
- Hero: 80px → 60px → smaller display text
- Navigation: horizontal → hamburger at 767px
- Feature sections: multi-column → stacked
- Colorful sections: maintain full-width but compress padding
- Card grids: 3-column → 2-column → single column

### Image Behavior
- Product screenshots scale proportionally
- Colorful section illustrations adapt to viewport width
- Rounded corners maintained across breakpoints

---

## 8. Do's and Don'ts

### Do:
✓ Use warm cream (`#faf9f7`) as the page background — the warmth is the identity (non-negotiable)
✓ Apply all 5 OpenType stylistic sets on Roobert headings: `"ss01", "ss03", "ss10", "ss11", "ss12"`
✓ Use the named swatch palette (Matcha, Slushie, Lemon, Ube, Pomegranate, Blueberry, Dragonfruit) for section backgrounds
✓ Apply the playful hover animation: `rotateZ(-8deg)`, `translateY(-80%)`, hard shadow `-7px 7px`
✓ Use warm oat borders (`#dad4c8`) — not neutral gray
✓ Mix solid and dashed borders for visual variety
✓ Use generous radius: 24px for cards, 40px for sections, 1584px for pills
✓ Use weight 600 exclusively for headings, 500 for UI, 400 for body
✓ Embrace asymmetry and intentional layout breaks
✓ Exaggerate type — let Roobert be the hero
✓ Use tonal shifts: layer cream on oat on white to create depth without clutter

### Don't:
✗ Don't use cool gray backgrounds — the warm cream (`#faf9f7`) is non-negotiable
✗ Don't use neutral gray borders (`#ccc`, `#ddd`) — always use the warm oat tones
✗ Don't mix more than 2 swatch colors in the same section
✗ Don't skip the OpenType stylistic sets — they define Roobert's character
✗ Don't use subtle hover effects — the rotation + hard shadow is the signature interaction
✗ Don't use small border radius (<12px) on feature cards — the generous rounding is structural
✗ Don't use standard shadows (blur-based) — Clay uses hard offset and multi-layer inset
✗ Don't forget the uppercase labels with 1.08px tracking — they're the wayfinding system
✗ Don't use clinical blue or medical-teal — use Blueberry or Slushie for cool tones
✗ Don't use 90-degree corners — everything is softened, rounded, and approachable
✗ Don't use 1px solid borders for section dividers — use color shifts or dashed borders

---

## 9. Agent Prompt Guide

### Quick Color Reference
- **Background:** Warm Cream (`#faf9f7`)
- **Text:** Clay Black (`#000000`) or Ink (`#2e2f2e`)
- **Secondary text:** Warm Silver (`#9f9b93`)
- **Border:** Oat Border (`#dad4c8`)
- **Green accent:** Matcha 600 (`#078a52`) or Matcha (`#38671a`)
- **Cyan accent:** Slushie 500 (`#3bd3fd`)
- **Gold accent:** Lemon 500 (`#fbbd41`)
- **Purple accent:** Ube 800 (`#43089f`) or Ube (`#b4a5ff`)
- **Pink accent:** Pomegranate 400 (`#fc7981`)
- **Navy accent:** Blueberry 800 (`#01418d`)

### Example Component Prompts
- "Create a hero on warm cream (#faf9f7) background. Headline at 80px Roobert weight 600, line-height 1.00, letter-spacing -3.2px, OpenType 'ss01 ss03 ss10 ss11 ss12', black text. Subtitle at 20px weight 400, line-height 1.40, #9f9b93 text. Two buttons: matcha pill with hover animation (rotateZ -8deg, translateY -80%, hard shadow -7px 7px), and white solid pill."
- "Design a colorful section with Matcha 800 (#02492a) or Slushie 500 (#3bd3fd) background. Heading at 44px Roobert weight 600, letter-spacing -1.32px, white text. Body at 18px weight 400, line-height 1.60, light text. White card inset with oat border (#dad4c8), 24px radius, 3-layer shadow."
- "Build a button with playful hover: default transparent background, black text, 16px Roobert weight 500. On hover: background shifts to swatch color (Matcha, Slushie, or other), text white, transform rotateZ(-8deg) translateY(-80%), hard shadow rgb(0,0,0) -7px 7px."
- "Create a card: white background, 1px solid #dad4c8 border (or dashed variant), 24px radius. Shadow: multi-layer (rgba(0,0,0,0.1) 0px 1px 1px, inset highlight, edge dashed). Title at 32px Roobert weight 600, letter-spacing -0.64px."
- "Design an uppercase label: 12px Roobert weight 600, text-transform uppercase, letter-spacing 1.08px, OpenType 'ss03 ss10 ss11 ss12'."

### Iteration Guide
1. Start with warm cream (#faf9f7) — never cool white
2. Swatch colors are for full sections, not small accents — go bold with matcha, slushie, ube, lemon
3. Oat borders (#dad4c8) everywhere — dashed variants for decoration
4. OpenType stylistic sets are mandatory — they make Roobert look like Roobert
5. Hover animations are the signature — rotation + hard shadow, not subtle fades
6. Generous radius: 24px cards, 40px sections, 1584px pills — nothing looks sharp or corporate
7. Three weights: 600 (headings), 500 (UI), 400 (body) — strict roles
8. Embrace asymmetry and break the grid intentionally
9. Use multi-layer shadows for depth and the "clay" tactile feel
10. Activity stickers and floating elements add artisanal character

---

**Last Updated:** 2026-04-09  
**Design System Version:** Clay-Artisanal Fitness v1.0 (Unified)  
**Source Priority:** Original_desing.md (Clay) + DESIGN.md (Artisanal Fitness)
