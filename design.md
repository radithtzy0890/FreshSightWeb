# DESIGN.md: Fruit Freshness Detector (Segar : Busuk)

> **Archetype**: Playful Neobrutalism × Kinetic Web, tuned for a computer-vision utility app
> **Product**: Web app that classifies a fruit as **SEGAR** or **BUSUK** from a camera feed or an uploaded photo, running in the browser.
> **Spirit**: Fast, trustworthy, tactile, a little playful. A verdict you can read from across the kitchen.
> **How to use**: Put this file in the project root as `design.md`. Any developer, designer, or AI coding agent must read it fully before generating UI, and run the checklist in Section 12 before finishing.

---

## 0. Project Config

```yaml
project_name: "<NamaProject>"
one_line_pitch: "Foto buahnya, AI bilang segar atau busuk dalam hitungan detik."
primary_language: "id"
copy_tone: "energetic, helpful, honest about uncertainty, zero corporate stiffness"
classes: ["segar", "busuk"] # extend as "{buah}_{kondisi}" if multi-fruit
brand_primary: "--yellow"
brand_secondary: "--cobalt"
display_font: "Plus Jakarta Sans"
mono_font: "JetBrains Mono"
motion_library: "framer-motion"
inference: "in-browser (TensorFlow.js, WebGL backend, WASM fallback)"
privacy_mode: "local-only: images never leave the device unless user opts in"
optional_modules:
    [
        hero-shader,
        typing-headline,
        card-deck,
        staggered-tiles,
        scanner-hud,
        verdict-stamp,
        explain-heatmap,
        impact-counter,
    ]
```

### 0.1 Rule Priority

1. **Accessibility and honesty** (contrast, color-blind safety, uncertainty and food-safety disclaimers)
2. **Core tokens** (Sections 2 to 5)
3. **Domain rules** (Sections 7 to 10)
4. **Optional kinetic modules** (Section 6)
5. **Project overrides** (Section 11)

### 0.2 Instructions for AI Coding Agents

- Never invent colors, shadow styles, or border weights. Use the tokens.
- Never use soft blurred shadows, glassmorphism, or gradient blobs.
- **Never convey SEGAR vs BUSUK by color alone.** Always pair color + icon + text label (Section 7.2).
- **Never present a verdict as a food-safety guarantee.** Always show the disclaimer (Section 7.7).
- When unsure, choose thicker borders, harder shadows, bolder type.

---

## 1. Design Philosophy & Anti-Slop

Most AI-generated apps look identical: purple gradient blobs, washed-out slate cards, generic 3-column feature grids. This system rejects that.

1. **Bold geometric hierarchy**: thick ink borders (`2.5px` to `3.5px`), hard zero-blur shadows, crisp corners.
2. **High-voltage palette** on a pure white canvas.
3. **Kinetic, tactile interactions**: springs, press physics, scanner animations.
4. **Human, gamified-lite copy**: short, warm, Indonesian, no thesis-style language.
5. **Trust through clarity**: the verdict, the confidence, and the limits of the model are always visible.
6. **No em dashes (`—`)** in UI copy. Use colons, commas, or hyphens.

### 1.1 Banned Patterns

| Banned                                         | Use instead                                             |
| :--------------------------------------------- | :------------------------------------------------------ |
| Soft blurred shadows                           | Hard offset shadows (`4px 4px 0 #111`)                  |
| Gradient blob backgrounds                      | Flat color blocks, `.stripe-y`, brand-color shaders     |
| Glassmorphism cards                            | Opaque cards with thick ink borders                     |
| Cream or off-white canvas                      | Pure white `#FFFFFF`                                    |
| Red/green-only status                          | Color + icon + word + pattern                           |
| Stock photos of perfect fruit as UI decoration | Flat sticker-style fruit illustrations with ink outline |
| Spinner-only loading                           | Striped skeleton or ink progress bar with a label       |
| Generic 3-column icon grids                    | Card deck, staggered tiles, bento with mixed sizes      |

---

## 2. Color System

### 2.1 Tokens

| Token        | Variable      | Hex       | Tailwind                     |
| :----------- | :------------ | :-------- | :--------------------------- |
| Paper        | `--paper`     | `#FFFFFF` | `bg-paper`                   |
| Paper Subtle | `--paper-2`   | `#F8F8F8` | `bg-paper-2`                 |
| Paper Muted  | `--paper-3`   | `#EEEEEE` | `bg-paper-3`                 |
| Ink          | `--ink`       | `#111111` | `text-ink`, `border-ink`     |
| Yellow       | `--yellow`    | `#FFD000` | `bg-yellow`                  |
| Cobalt       | `--cobalt`    | `#0055FF` | `bg-cobalt`                  |
| Coral        | `--coral`     | `#FF4D4D` | `bg-coral`                   |
| Mint         | `--mint`      | `#00C68E` | `bg-mint`                    |
| Purple       | `--nb-purple` | `#7C3AED` | `bg-nb-purple` (rare accent) |

### 2.2 Domain Semantic Mapping (the heart of this app)

| Meaning                       | Token                       | Hex       | Icon         | Label              | Text color |
| :---------------------------- | :-------------------------- | :-------- | :----------- | :----------------- | :--------- |
| **Segar** (fresh)             | `--fresh` → mint            | `#00C68E` | `Check`      | `SEGAR`            | **ink**    |
| **Busuk** (rotten)            | `--rotten` → coral          | `#FF4D4D` | `X`          | `BUSUK`            | **ink**    |
| **Ragu** (uncertain)          | `--unsure` → yellow         | `#FFD000` | `HelpCircle` | `RAGU`             | ink        |
| **Scanning / live**           | `--scan` → cobalt           | `#0055FF` | `ScanLine`   | `MEMINDAI`         | white      |
| **Tidak ada buah** (no fruit) | `--none` → paper-3 + stripe | `#EEEEEE` | `Ban`        | `TIDAK TERDETEKSI` | ink        |

```css
:root {
    --fresh: var(--mint);
    --rotten: var(--coral);
    --unsure: var(--yellow);
    --scan: var(--cobalt);
    --none: var(--paper-3);
}
```

### 2.3 Contrast and Color-Blind Rules (non-negotiable)

- Mint and coral are hard to tell apart for red-green color-blind users. Therefore **busuk always carries a diagonal stripe overlay** (`.stripe-y`, ink at 10% to 12% opacity) and segar stays flat. Both always show icon + word.
- Mint backgrounds: text is `#111111` (about 8.5:1). Coral backgrounds: text is `#111111` (about 5.8:1). Never white on either for small text.
- Yellow backgrounds: ink text.
- Cobalt backgrounds: white text for bold or large text only.
- Body copy: `text-ink/80` or darker.
- Focus ring: `outline: 3px solid var(--cobalt); outline-offset: 3px;` on every interactive element.
- Respect `prefers-reduced-motion`: disable scanner sweeps, springs, confetti, shaders.

---

## 3. Typography

| Use                           | Font                         | Notes                                                      |
| :---------------------------- | :--------------------------- | :--------------------------------------------------------- |
| Display & headings            | Plus Jakarta Sans 800 to 900 | `tracking-tight` (`-0.03em`), line height `0.95` to `1.15` |
| Body                          | Plus Jakarta Sans 500 to 700 | Line height `1.5` to `1.65`                                |
| Telemetry, confidence, badges | JetBrains Mono 700 to 900    | Always `tabular-nums` so numbers never jitter              |

| Element                          | Size                                                  |
| :------------------------------- | :---------------------------------------------------- |
| Hero title                       | `clamp(2.5rem, 6.5vw, 5.2rem)`                        |
| H2                               | `clamp(2rem, 4.5vw, 3.6rem)`                          |
| H3                               | `clamp(1.25rem, 2.5vw, 1.75rem)`                      |
| **Verdict word** (SEGAR / BUSUK) | `clamp(2.75rem, 9vw, 6rem)`, weight 900               |
| **Confidence number**            | `clamp(2rem, 6vw, 3.5rem)`, mono 900                  |
| Ghost decorative number / `%`    | `clamp(10rem, 20vw, 24rem)`, opacity `0.04` to `0.10` |
| Mono badge                       | `0.7rem` to `0.85rem`, uppercase                      |

---

## 4. Signature Patterns

### 4.1 Shadows (hard, zero blur)

```css
:root {
    --shadow-sm: 3px 3px 0 #111111;
    --shadow-md: 5px 5px 0 #111111;
    --shadow-lg: 7px 7px 0 #111111;
    --shadow-xl: 10px 10px 0 #111111;
    --shadow-y: 5px 5px 0 #ffd000;
    --shadow-r: 6px 6px 0 #ff4d4d;
    --shadow-b: 5px 5px 0 #0055ff;
    --shadow-w: 4px 4px 0 #ffffff;
}
```

### 4.2 Borders

| Element                             | Border                      |
| :---------------------------------- | :-------------------------- |
| Buttons, tags, inputs, small cards  | `border-[2.5px] border-ink` |
| Large cards, headers, scanner frame | `border-[3px] border-ink`   |
| Hero blocks, verdict card, CTA      | `border-[3.5px] border-ink` |

Pick one radius for the project (`0` to `12px`) and use it everywhere.

### 4.3 Stickers, Press Physics, Stripes

```css
.rotated-label {
    transform: rotate(-3deg);
    display: inline-block;
}
.rotated-label-2 {
    transform: rotate(2.5deg);
    display: inline-block;
}

.btn {
    border: 2.5px solid var(--ink);
    box-shadow: var(--shadow-sm);
    transition:
        transform 0.12s ease,
        box-shadow 0.12s ease,
        background-color 0.12s ease;
}
.btn:hover {
    transform: translate(-2px, -2px);
    box-shadow: 5px 5px 0 var(--ink);
}
.btn:active {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 var(--ink);
}

.stripe-y {
    background-image: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 5px,
        rgba(17, 17, 17, 0.07) 5px,
        rgba(17, 17, 17, 0.07) 10px
    );
}
.stripe-busuk {
    /* required overlay for BUSUK surfaces */
    background-image: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 6px,
        rgba(17, 17, 17, 0.12) 6px,
        rgba(17, 17, 17, 0.12) 12px
    );
}
```

Invert-on-hover: white button flips to yellow fill; tiles flip to ink with yellow text and yellow shadow.

---

## 5. Core Components

| Component             | Spec                                                                                                                                                                                                                                                                                                                                                                                                          |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Buttons**           | `btn-yellow` (primary), `btn-ink` (secondary, coral or yellow shadow), `btn-white` (tertiary, invert hover), `btn-mint` (ink text only), `btn-coral` (destructive, e.g. hapus riwayat). Weight 800, min height `44px`.                                                                                                                                                                                        |
| **Cards**             | Opaque, `border-[3px] border-ink`, `--shadow-md` or `--shadow-lg`. Optional accent header strip with mono step number (`01/03`).                                                                                                                                                                                                                                                                              |
| **Tags / pills**      | Mono, uppercase, `border-2 border-ink`. Active pill: ink fill, yellow text.                                                                                                                                                                                                                                                                                                                                   |
| **Inputs / dropzone** | White, `border-[2.5px] border-ink`, `--shadow-sm`. Focus grows shadow to `--shadow-b`. Errors use coral + icon + text.                                                                                                                                                                                                                                                                                        |
| **Navbar**            | Over hero: `bg-paper/95 backdrop-blur-md border-b border-ink/20`. Past hero (`scrollY > innerHeight - 80`): `bg-yellow border-b-[3px] border-ink shadow-[0_4px_0_#111]`, logo box inverts to `bg-ink text-yellow`, active link is an ink chip with yellow text, CTA is `btn-ink` with `shadow-[3px_3px_0_#FF4D4D]`. On mobile prefer a bottom tab bar (Scan, Riwayat, Info) with a raised center Scan button. |
| **Toasts**            | Ink border, hard shadow, accent fill, icon + text.                                                                                                                                                                                                                                                                                                                                                            |
| **Empty state**       | Sticker fruit illustration + one punchy line + one action.                                                                                                                                                                                                                                                                                                                                                    |
| **Section rhythm**    | Alternate `bg-paper` and `bg-paper-2`; each section opens with mono eyebrow + H2 + one sentence; never repeat the same layout twice in a row.                                                                                                                                                                                                                                                                 |

---

## 6. Optional Kinetic Modules

Every module has a static fallback for low-end devices and reduced motion.

| Module             | Use in this app                                                                                                                                                                                                                                                                                                                                                               | Fallback                    |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------- |
| `hero-shader`      | Diagonal square grid canvas behind the hero, yellow cursor glow, edge fade mask.                                                                                                                                                                                                                                                                                              | `.stripe-y` on white        |
| `typing-headline`  | Prefix `"Cek buah "` in ink, rotating phrases: `"segar atau busuk langsung di browser."` (cobalt), `"cukup dengan satu foto."` (coral), `"tanpa upload, privasi aman."` (dark mint `#00875A`). Yellow block cursor.                                                                                                                                                           | First phrase static         |
| `card-deck`        | "Cara Pakai" 3 cards (Foto, Scan, Lihat Hasil). Stacked → spread with `spring`, `stiffness: 175`, `damping: 19`, stagger `0.12s`. Stacked offsets: card 1 `x: 100%, y: 18px, rotate: -7deg, scale: .95`; card 2 `x: 0, y: 4px, rotate: 3deg, scale: 1`; card 3 `x: -100%, y: -14px, rotate: 6deg, scale: 1.03`; all `10px 10px 0 #111`. Includes "Tumpuk Ulang Kartu" button. | Plain responsive grid       |
| `staggered-tiles`  | "Buah yang didukung" sticker tiles, `staggerChildren: 0.03`, invert-on-hover.                                                                                                                                                                                                                                                                                                 | Static grid                 |
| `scanner-hud`      | The camera studio (Section 8).                                                                                                                                                                                                                                                                                                                                                | Upload-only mode            |
| `verdict-stamp`    | The result stamp (Section 7).                                                                                                                                                                                                                                                                                                                                                 | Static badge                |
| `explain-heatmap`  | Optional "Lihat fokus AI" overlay (Section 9). Requires model support.                                                                                                                                                                                                                                                                                                        | Hidden                      |
| `impact-counter`   | Optional lightweight gamification: "Buah terselamatkan dari dibuang: 12". Mono number, mint sticker, ink text. Streak flames and XP are **off by default** for this app; do not add them unless asked.                                                                                                                                                                        | Hidden                      |
| `final-cta-shader` | Optional cobalt/yellow slat waves behind a **100% opaque yellow** CTA card.                                                                                                                                                                                                                                                                                                   | Flat yellow card on stripes |

Confetti, if ever used (e.g. first successful scan), uses only `["#FFD000", "#FF4D4D", "#0055FF", "#00C68E"]` and fires **only on SEGAR**, never on BUSUK.

---

## 7. Verdict System (Result UI)

### 7.1 States and Thresholds

Default thresholds, tune after calibrating the model on real data:

| Condition                                                | State                                                    |
| :------------------------------------------------------- | :------------------------------------------------------- |
| Fruit not found in ROI, or model "background" class wins | `TIDAK TERDETEKSI`                                       |
| `max(P) >= 0.80`                                         | `SEGAR` or `BUSUK`                                       |
| `0.60 <= max(P) < 0.80`                                  | `RAGU` (show leading guess, smaller, with retake advice) |
| `max(P) < 0.60`                                          | `RAGU` + "Ulangi foto" prompt, no leading guess          |
| Image fails quality check (Section 8.4)                  | Block verdict, show fix tip                              |

### 7.2 Verdict Stamp

- Large rotated sticker (`rotate(-3deg)`), `border-[3.5px] border-ink`, `--shadow-lg`.
- Contents: icon + verdict word (3.0 type scale) + confidence number.
- **SEGAR**: mint fill, `Check` icon, flat.
- **BUSUK**: coral fill, `X` icon, `.stripe-busuk` overlay.
- **RAGU**: yellow fill, `HelpCircle` icon.
- Entrance: spring pop (`scale 0.6 → 1`, slight rotate overshoot). Reduced motion: fade only.
- Announce to screen readers: `aria-live="polite"` text like `"Hasil: segar, keyakinan 92 persen."`

### 7.3 Confidence Meter

- Segmented bar of 20 blocks, `border-[3px] border-ink`, filled blocks use the verdict color.
- Mono percentage with `tabular-nums`.
- Below it, two compact rows showing `P(segar)` and `P(busuk)` so the user sees the whole picture, not just the winner.

### 7.4 Result Card Layout (mobile first)

1. Photo thumbnail with ink border and sticker corner label (nama buah, if multi-fruit).
2. Verdict stamp.
3. Confidence meter + probability rows.
4. "Tips" box (Section 7.5).
5. Actions: `Scan lagi` (btn-yellow), `Simpan ke riwayat` (btn-white), `Lihat fokus AI` (btn-ink, if enabled).
6. Disclaimer strip (Section 7.7).

### 7.5 Tips per State

| State            | Tip copy (examples)                                                                |
| :--------------- | :--------------------------------------------------------------------------------- |
| SEGAR            | "Mantap! Simpan di tempat sejuk dan kering biar awet."                             |
| BUSUK            | "Sebaiknya jangan dimakan. Buang atau jadikan kompos."                             |
| RAGU             | "AI-nya ragu. Coba foto ulang dengan cahaya lebih terang dan buah terlihat jelas." |
| TIDAK TERDETEKSI | "Buahnya belum kelihatan. Dekatkan dan taruh di tengah kotak."                     |

### 7.6 Microcopy Bank

| Moment         | Copy                                                 |
| :------------- | :--------------------------------------------------- |
| Scan button    | "Scan buah"                                          |
| Analyzing      | "Lagi ngecek buahnya..."                             |
| SEGAR headline | "Segar banget!"                                      |
| BUSUK headline | "Yah, udah busuk."                                   |
| Low confidence | "Hmm, AI-nya ragu."                                  |
| Camera denied  | "Kamera belum diizinkan. Kamu bisa upload foto aja." |
| Model loading  | "Menyiapkan model AI di browser kamu..."             |
| Privacy stamp  | "Diproses di browser kamu. Foto tidak diunggah."     |

### 7.7 Honesty and Safety Disclaimer (required on every result)

A strip at the bottom of the result card, `border-2 border-ink`, `bg-paper-2`, mono text:

> "Hasil ini perkiraan AI, bukan jaminan keamanan pangan. Kalau ragu, jangan dikonsumsi."

Also: never use words like "aman dimakan" or "pasti" in verdict copy. Say "tampak segar" or "tampak busuk" in secondary text.

---

## 8. Scanner Studio (`scanner-hud`)

### 8.1 Frame and ROI

- Matte dark frame (`#0B1120` or `#111111`), `border-[3px] border-ink`, `--shadow-lg`.
- Center **square ROI** with corner brackets (not a full box), 4px stroke. Bracket color follows state: cobalt (scanning), yellow (stabilizing), mint (segar), coral (busuk).
- Only the ROI crop is sent to the model, resized to the model input size (e.g. 224×224).
- Dim the area outside the ROI at about 45% ink.
- Scan-line sweep animation inside the ROI while in `MEMINDAI` state (cobalt line, 2px).

### 8.2 Input Modes (tabs, pill style)

| Mode     | Behavior                                                                                  |
| :------- | :---------------------------------------------------------------------------------------- |
| `KAMERA` | Live feed, shutter button 64px, optional live prediction                                  |
| `UPLOAD` | Dropzone with dashed ink border, drag and drop, "Pilih foto" button, accepts JPG/PNG/WebP |
| `CONTOH` | 3 to 6 sample fruit photos so users can try without a fruit nearby                        |

### 8.3 Live Prediction Stability

To stop the verdict flickering:

- Smooth probabilities with a moving average over the last `N = 8` frames.
- Commit a live verdict only when the same label wins for `>= 8` consecutive frames **and** smoothed confidence passes the threshold.
- "Stabil" ring: linear or circular progress that fills over `1.0s` while the label is stable, turning from yellow to the verdict color. Auto-capture on completion, or let the user tap the shutter at any time.
- Cap inference to about 10 to 15 FPS on weak devices.

### 8.4 Photo Quality Chips

Three mono chips under the viewfinder, each with status color + icon + word:

| Check  | Good               | Bad                                | Tip                              |
| :----- | :----------------- | :--------------------------------- | :------------------------------- |
| Cahaya | `CAHAYA OK` (mint) | `TERLALU GELAP` / `SILAU` (yellow) | "Cari cahaya yang lebih merata." |
| Fokus  | `FOKUS OK`         | `AGAK BURAM`                       | "Tahan HP sebentar."             |
| Jarak  | `JARAK PAS`        | `TERLALU JAUH`                     | "Dekatkan buahnya ke kotak."     |

Run these before inference (mean luminance, Laplacian variance, fruit area ratio in ROI). Block the verdict and show the tip if a check fails hard.

### 8.5 Telemetry Bar

Docked under the viewfinder, mono, `tabular-nums`:

- **FPS**: green `>= 25`, yellow `15-24`, red `< 15`
- **Latency** in `ms`
- **Confidence** `0-100%`
- **Backend**: `WebGL Aktif` / `WASM` / `Mode Simulasi`
- **Input**: model resolution, e.g. `224×224`

Can be collapsed on mobile behind a "Detail teknis" toggle to keep the screen calm.

### 8.6 Permission and Failure States

| Situation                | UI                                                                                                        |
| :----------------------- | :-------------------------------------------------------------------------------------------------------- |
| Camera permission prompt | Explain before asking: card with camera icon + "Kamera dipakai buat scan, foto tidak disimpan di server." |
| Permission denied        | Switch to `UPLOAD` tab, coral toast + instructions                                                        |
| No camera found          | Same as denied                                                                                            |
| Model fails to load      | Coral card, `Coba lagi` button, offline hint                                                              |
| Slow device              | Auto-lower inference rate, show yellow "Mode hemat" chip                                                  |

---

## 9. Explainability (optional `explain-heatmap`)

- Button `Lihat fokus AI` toggles a Grad-CAM style overlay on the result thumbnail.
- Overlay ramp: transparent → yellow → coral, `opacity: 0.55`, with an ink 2.5px border around the image.
- Legend sticker: "Area merah = bagian yang paling mempengaruhi keputusan AI."
- Always add: "Ini membantu memahami AI, bukan bukti kerusakan."
- If the model cannot produce attention maps, hide the module completely.

---

## 10. Pages and Information Architecture

| Page         | Purpose                                             | Key modules                                                                                         |
| :----------- | :-------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| `/` Landing  | Explain and convert to Scan                         | `hero-shader`, `typing-headline`, `card-deck`, `staggered-tiles`, privacy stamp, `final-cta-shader` |
| `/scan`      | Core experience                                     | `scanner-hud`, quality chips, verdict stamp                                                         |
| `/hasil/:id` | Shareable or reviewable result                      | Result card, tips, optional heatmap                                                                 |
| `/riwayat`   | Past scans                                          | Grid of thumbnail cards, filter pills `SEMUA / SEGAR / BUSUK / RAGU`, `impact-counter`              |
| `/tentang`   | How the model works, accuracy, limits, dataset note | Honest limits card, FAQ, disclaimer                                                                 |

Rules:

- **History is stored locally** (IndexedDB). Never upload images without an explicit opt-in toggle that is off by default.
- Each history card: thumbnail, verdict sticker, confidence, date in mono. Delete uses `btn-coral` with a confirm step.
- The `/tentang` page must state the model's known limits plainly (lighting, fruit varieties it was trained on, false positives and negatives).

---

## 11. Implementation Reference

### 11.1 CSS Foundation

```css
:root {
    --paper: #ffffff;
    --paper-2: #f8f8f8;
    --paper-3: #eeeeee;
    --ink: #111111;
    --yellow: #ffd000;
    --cobalt: #0055ff;
    --coral: #ff4d4d;
    --mint: #00c68e;
    --nb-purple: #7c3aed;

    --fresh: var(--mint);
    --rotten: var(--coral);
    --unsure: var(--yellow);
    --scan: var(--cobalt);
    --none: var(--paper-3);

    --shadow-sm: 3px 3px 0 #111;
    --shadow-md: 5px 5px 0 #111;
    --shadow-lg: 7px 7px 0 #111;
    --shadow-xl: 10px 10px 0 #111;
    --shadow-y: 5px 5px 0 #ffd000;
    --shadow-r: 6px 6px 0 #ff4d4d;
    --shadow-b: 5px 5px 0 #0055ff;
    --shadow-w: 4px 4px 0 #ffffff;
}

html {
    background: var(--paper);
    color: var(--ink);
}
body {
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    font-weight: 500;
    line-height: 1.6;
}
h1,
h2,
h3 {
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.05;
}
.mono {
    font-family: "JetBrains Mono", monospace;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
}

:focus-visible {
    outline: 3px solid var(--cobalt);
    outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}

/* Keep outside @layer so dynamic classes are never purged */
.bg-theme-yellow {
    background-color: #ffd000;
}
.bg-theme-cobalt {
    background-color: #0055ff;
    color: #fff;
}
.bg-theme-coral {
    background-color: #ff4d4d;
    color: #111;
}
.bg-theme-mint {
    background-color: #00c68e;
    color: #111;
}
.bg-theme-ink {
    background-color: #111111;
    color: #fff;
}
```

### 11.2 Tailwind Config

```js
export default {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    safelist: [
        "bg-theme-yellow",
        "bg-theme-cobalt",
        "bg-theme-coral",
        "bg-theme-mint",
        "bg-theme-ink",
        "bg-yellow",
        "bg-cobalt",
        "bg-coral",
        "bg-mint",
        "bg-nb-purple",
    ],
    theme: {
        extend: {
            colors: {
                paper: { DEFAULT: "#FFFFFF", 2: "#F8F8F8", 3: "#EEEEEE" },
                ink: "#111111",
                yellow: "#FFD000",
                cobalt: "#0055FF",
                coral: "#FF4D4D",
                mint: "#00C68E",
                "nb-purple": "#7C3AED",
            },
            fontFamily: {
                display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
                sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
                mono: ["'JetBrains Mono'", "monospace"],
            },
            boxShadow: {
                "nb-sm": "3px 3px 0 #111",
                "nb-md": "5px 5px 0 #111",
                "nb-lg": "7px 7px 0 #111",
                "nb-xl": "10px 10px 0 #111",
                "nb-y": "5px 5px 0 #FFD000",
                "nb-r": "6px 6px 0 #FF4D4D",
                "nb-b": "5px 5px 0 #0055FF",
                "nb-w": "4px 4px 0 #FFFFFF",
            },
            borderWidth: { 2.5: "2.5px", 3.5: "3.5px" },
        },
    },
};
```

### 11.3 Verdict Component Contract (suggested)

```ts
type Verdict = "segar" | "busuk" | "ragu" | "tidak_terdeteksi";

interface ScanResult {
    verdict: Verdict;
    probs: { segar: number; busuk: number }; // 0..1, sum to 1
    confidence: number; // max(probs), 0..1
    fruitLabel?: string; // if multi-fruit
    quality: {
        light: "ok" | "dark" | "glare";
        focus: "ok" | "blur";
        distance: "ok" | "far";
    };
    latencyMs: number;
    createdAt: string; // ISO
}

const VERDICT_STYLE: Record<
    Verdict,
    { bg: string; icon: string; label: string; stripe?: boolean }
> = {
    segar: { bg: "bg-mint", icon: "Check", label: "SEGAR" },
    busuk: { bg: "bg-coral", icon: "X", label: "BUSUK", stripe: true },
    ragu: { bg: "bg-yellow", icon: "HelpCircle", label: "RAGU" },
    tidak_terdeteksi: {
        bg: "bg-paper-3",
        icon: "Ban",
        label: "TIDAK TERDETEKSI",
        stripe: true,
    },
};
```

### 11.4 Recommended Stack

React + Vite (or Next.js), Tailwind CSS, Framer Motion, Lucide icons, TensorFlow.js (WebGL, WASM fallback), React Bits and OGL for shaders, `canvas-confetti` with brand hexes only.

---

## 12. Pre-Merge Checklist

**Foundation**

- [ ] Background is pure white, borders at least `2.5px` ink, shadows hard and zero-blur?
- [ ] Only brand tokens used?

**Verdict and Trust**

- [ ] SEGAR / BUSUK always shown with color + icon + word (never color alone)?
- [ ] BUSUK has the stripe overlay?
- [ ] Mint and coral surfaces use ink text?
- [ ] Confidence number and both class probabilities visible?
- [ ] `RAGU` state exists and is reachable via thresholds?
- [ ] Disclaimer strip present on every result?
- [ ] No copy claims "aman dimakan", "pasti", or "100%"?
- [ ] Confetti fires only on SEGAR (if used)?

**Scanner**

- [ ] Only ROI crop is inferred?
- [ ] Live verdict is smoothed (moving average + consecutive frames)?
- [ ] Quality chips (cahaya, fokus, jarak) run before inference?
- [ ] Camera denied, no camera, and model-load-failed states all handled with an upload fallback?
- [ ] Privacy stamp visible near the scanner?

**Accessibility**

- [ ] Focus ring on all interactive elements, touch targets at least `44px`?
- [ ] `aria-live` announcement for results?
- [ ] Reduced-motion fallback for sweeps, springs, shaders?

**Content and Originality**

- [ ] Copy in Indonesian, energetic, no em dashes?
- [ ] Numbers in mono with `tabular-nums`?
- [ ] No gradient blobs, glassmorphism, or generic 3-column grids?
- [ ] Dynamic Tailwind color classes safelisted or defined outside `@layer`?
