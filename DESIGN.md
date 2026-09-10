---
name: Cosmic Hearth
colors:
  surface: '#0e1223'
  surface-dim: '#0e1223'
  surface-bright: '#34384b'
  surface-container-lowest: '#090d1e'
  surface-container-low: '#171b2c'
  surface-container: '#1b1f30'
  surface-container-high: '#25293b'
  surface-container-highest: '#303446'
  on-surface: '#dee1f9'
  on-surface-variant: '#bfc8cd'
  inverse-surface: '#dee1f9'
  inverse-on-surface: '#2c2f42'
  outline: '#899297'
  outline-variant: '#40484d'
  surface-tint: '#8ad0f1'
  primary: '#bce8ff'
  on-primary: '#003546'
  primary-container: '#89cff0'
  on-primary-container: '#005974'
  inverse-primary: '#0d6683'
  secondary: '#d3bdf3'
  on-secondary: '#382854'
  secondary-container: '#4f3e6c'
  on-secondary-container: '#c1ace1'
  tertiary: '#ffd8dd'
  on-tertiary: '#52202b'
  tertiary-container: '#feb1be'
  on-tertiary-container: '#7b404c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bee9ff'
  primary-fixed-dim: '#8ad0f1'
  on-primary-fixed: '#001f2a'
  on-primary-fixed-variant: '#004d65'
  secondary-fixed: '#ecdcff'
  secondary-fixed-dim: '#d3bdf3'
  on-secondary-fixed: '#23123d'
  on-secondary-fixed-variant: '#4f3e6c'
  tertiary-fixed: '#ffd9de'
  tertiary-fixed-dim: '#ffb2bf'
  on-tertiary-fixed: '#380b17'
  on-tertiary-fixed-variant: '#6d3541'
  background: '#0e1223'
  on-background: '#dee1f9'
  surface-variant: '#303446'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  title-md:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Space Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.08em
spacing:
  pixel-unit: 2px
  space-2xs: 4px
  space-xs: 8px
  space-sm: 12px
  space-md: 16px
  space-lg: 24px
  space-xl: 32px
  space-2xl: 48px
  space-3xl: 64px
  gutter-mobile: 16px
  gutter-desktop: 24px
  container-max: 1200px
---

## Brand & Style

This design system channels the nostalgic, introspective warmth of an isometric pixel art room floating across the cosmos. It bridges cozy low-fi storytelling with tactile 16-bit RPG mechanics, evoking calm wonder, late-night curiosity, and emotional sanctuary.

The core visual identity marries retro game user interfaces with modern pixel-perfect precision:
- **Atmospheric Starscape:** Deep midnight voids punctuated by glowing moonlit highlights and gentle cyan bioluminescence.
- **Tactile Pixel Nostalgia:** Crisp, unblurred stepped borders, beveled window frames reminiscent of classic inventory menus, and subtle ambient backlights that simulate moonbeams pouring through a floating dormer window.
- **Intimate Warmth:** Balance between cold cosmic blues (#0b0e1b, #4d6594) and grounded, domestic accents (rosy mauve, lavender dusk, warm tea-table wood tones).
- **Style Archetype:** Modern Pixel/Retro-Chic with high-clarity typography. Interface elements behave like floating game HUD panels, tactile inventory slots, and story dialogue boxes.

## Colors

The color palette draws directly from starry nocturnal skies, moonlit periwinkle interiors, and cozy hearth touches:

- **Primary (`#89cff0` - Moonbeam Cyan):** Used for focal action states, interactive selections, glowing borders, active dialogue highlights, and illuminated item indicators.
- **Secondary (`#a38fc2` - Slumber Lavender):** Used for secondary controls, passive skill indicators, tags, subheadings, and subtle UI frame borders.
- **Tertiary (`#f2a6b3` - Cozy Rose / Warm Hearth):** Used for affection markers, health indicators, alert pings, quest objectives, and interactive comfort points.
- **Neutral Base (`#0b0e1b` to `#131728` - Cosmic Void & Deep Indigo):** The deep canvas foundation mimicking infinite starlight space, with layered panels progressing through dark slate wood (`#242038`) and shadowed periwinkle (`#36415f`).

### Functional Palettes & Accents
- **Wood Shadow Neutral:** `#2b1e2c` (used for inner panel frames, grounded furniture surfaces).
- **Periwinkle Midtone:** `#4d6594` (used for standard window chrome, muted item badges, and inactive slot fills).
- **Starlight High-Contrast White:** `#f5f7ff` (for crisp dialogue body text and pixel sparkles).

## Typography

To guarantee both the cozy, retro terminal charm of classic escape rooms and pristine legibility across complex inventory screens, this system pairs **Space Grotesk** (headlines), **Inter** (narrative and body copy), and **Space Mono** (item stats, hotkeys, status tags, and mini dialogue prompts).

- **Headlines & Titles:** Rendered in `Space Grotesk`. Geometric yet warm, giving titles a crafted, quirky indie identity without the legibility penalties of low-res pixel fonts at large scale.
- **Narrative & Dialogue:** Rendered in `Inter` with slightly elevated line height (`1.5` to `1.6`) to evoke comfortable bedtime reading and effortless UI navigation.
- **Stats & Metadata:** Rendered in `Space Mono` uppercase. Evokes 8-bit text entry, inventory grid counts (`x04`), and game clock timestamps.

## Layout & Spacing

The layout is anchored on an integer-based **4px baseline rhythm** with a fundamental **2px atomic subgrid**, honoring authentic pixel art raster rules while adapting cleanly across fluid viewports.

### Grid & Structure
- **Desktop & Canvas Viewports (>=1024px):** 12-column layout with 24px gutters, max container width of 1200px. Sidebar HUDs and floating inspector panels lock to fixed modular units (e.g., 320px inventory drawer, 400px dialogue sheet).
- **Tablet (768px - 1023px):** 8-column layout with 20px gutters. UI floating elements condense to collapsible edge drawers.
- **Mobile (<768px):** 4-column layout with 16px margins. HUD slots reposition to bottom navigation bars and full-width sheet overlays.
- **Pixel Clamping:** All padding, margins, and card boundaries must be integer multiples of 4px (or 2px for tight inset borders) to prevent anti-aliasing sub-pixel blurs.

## Elevation & Depth

Rather than conventional smooth drop shadows, this design system builds depth through **layered tonal borders, stepped pixel bevels, and ambient celestial luminescences**:

1. **Level 0 (Starfield Backdrop):** Flat canvas `#0b0e1b` dotted with twinkling starlight glyphs and nebular radial gradients (`radial-gradient(circle at 80% 20%, #1e2b4f 0%, #0b0e1b 70%)`).
2. **Level 1 (Docked Rooms & Windows):** Surfaces filled with `#131728` or `#1b2238`, surrounded by a dual-step outline: a 2px outer border of `#24314f` and an inner 1px inset highlight of `#4d6594`.
3. **Level 2 (Floating HUD Windows & Item Boxes):** Surfaces filled with `#1f2845`, bounded by a sharp 2px border in `#4d6594`, backed by an ambient cyan halo: `box-shadow: 0 0 16px rgba(137, 207, 240, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)`.
4. **Level 3 (Modals, Overlays, and Tooltips):** Deep indigo fill (`#15192c`) wrapped in an active Moonbeam Cyan frame (`#89cff0`), supported by high-contrast directional pixel drops: `box-shadow: 4px 4px 0px 0px #060810, 0 0 24px rgba(137, 207, 240, 0.3)`.

## Shapes

In true retro pixel art and isometric game fashion, the primary roundedness level is **0 (Sharp)**:
- Every element utilizes crisp 90-degree corners or intentional stepped "pixel corners" created through nested stepped borders (`clip-path` or stepped 2px box-shadow cutouts).
- For selected cozy badges or soft pill tags, a strict minimum radius of 2px or complete pixel stepping is enforced. Circular avatars or circular status indicators should be rendered via 8-bit octagonal silhouettes or sharp squares with indented corners.

## Components

### Buttons
- **Primary Action (Moonbeam Glow):** Background in `#4d6594`, top/left bevel in `#89cff0`, bottom/right bevel in `#232f48`. Text in `#ffffff` Space Mono uppercase. On hover, background shifts to `#5c79b1` with an outer 2px glow of `rgba(137, 207, 240, 0.5)`. Active/pressed state translates 2px down and swaps bevel shadows for an indented effect.
- **Secondary (Slumber Purple):** Background `#242038`, border 2px solid `#a38fc2`, text `#d5c7ee`. Hover triggers a lavender halo.
- **Ghost/Pixel Button:** Transparent background, 2px dashed or solid `#4d6594` border, text `#89cff0`.

### Inventory & Item Cards
- Surface background `#171e33` with a 2px outer border `#2e3d62`.
- Standardized grid cell (48x48px or 64x64px) with an inner recessed inset shadow (`inset 2px 2px 0 #0b0e1b`).
- Equipped or selected state wraps the card in a pulsing `#89cff0` outline with a corner pixel diamond indicator.

### Dialogue Boxes & Narrative Cards
- Wide horizontal aspect ratio with a dedicated character avatar portrait framed in dark slate wood (`#2b1e2c`) on the left.
- Dialogue text rendered in `#f5f7ff` with animated typewriter text delivery.
- Prompt arrow or blinking cursor rendered as an 8x8px cyan pixel chevron (`▼`) pulsating at the bottom-right corner.

### Input Fields & Search Bars
- Background `#0f1424` with 2px inset border `#2b3756`.
- Placeholder text in `#4d6594`. Typed text in crisp `#89cff0`.
- Focus state activates an intense 2px solid outline `#89cff0` accompanied by a soft celestial aura `0 0 12px rgba(137, 207, 240, 0.25)`.

### Chips, Tags & Badges
- Compact rectangular badges with 2px solid borders.
- **Quest Badge:** Border `#f2a6b3`, fill `rgba(242, 166, 179, 0.12)`, text `#f2a6b3`.
- **System / Room Info:** Border `#4d6594`, fill `rgba(77, 101, 148, 0.2)`, text `#89cff0`.

### Checkboxes & Radio Controls
- Square pixel toggles (16x16px).
- Checkbox: Crisp square with 2px border in `#4d6594`. Checked state fills the center with a 6x6px solid `#89cff0` pixel block.
- Radio: Sharp diamond silhouette (rotated square) in `#4d6594` filled with a nested lavender diamond when active.