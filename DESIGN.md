---
name: Square & Multiply
description: Cryptography procedures replayed on a rotor rim and a punched tape.
colors:
  brass: "#d2a54c"
  brass-deep: "#9c7630"
  alice: "#86b8de"
  bob: "#71c4aa"
  eve: "#f2806a"
  focus: "#f0c86a"
  enamel: "#2a3531"
  enamel-deep: "#222b28"
  enamel-line: "#3d4a45"
  bakelite: "#141617"
  bakelite-edge: "#24282a"
  ink: "#ece4cf"
  ink-2: "#b4b09f"
  ink-3: "#a09f90"
  tape: "#e6d8a2"
  tape-ink: "#2b2720"
  tape-dim: "#b9ad80"
  deck-ink: "#ece4cf"
  deck-dim: "#87877a"
  deck-line: "#3a4044"
  deck-brass: "#d2a54c"
  brass-light: "#74520c"
  brass-deep-light: "#6b4b10"
  alice-light: "#245d8a"
  bob-light: "#17735a"
  eve-light: "#b4381c"
  focus-light: "#74520c"
  enamel-light: "#dfe4de"
  enamel-deep-light: "#d2d8d1"
  enamel-line-light: "#b9c2ba"
  bakelite-light: "#1b1e1f"
  bakelite-edge-light: "#2c3133"
  ink-light: "#1c2320"
  ink-2-light: "#4a5550"
  ink-3-light: "#5a645e"
  tape-light: "#ecdfab"
  tape-ink-light: "#26221b"
  tape-dim-light: "#c2b582"
typography:
  display:
    fontFamily: "'STIX Two Text', 'Cambria Math', 'Times New Roman', serif"
    fontSize: "clamp(2.125rem, 1.4rem + 2vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontFeature: "lnum, tnum"
  headline:
    fontFamily: "'STIX Two Text', 'Cambria Math', 'Times New Roman', serif"
    fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.2
    fontFeature: "lnum, tnum"
  title:
    fontFamily: "'STIX Two Text', 'Cambria Math', 'Times New Roman', serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "lnum, tnum"
  body:
    fontFamily: "'STIX Two Text', 'Cambria Math', 'Times New Roman', serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "lnum, tnum"
  label:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.02em"
  numeral:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1
  wordmark:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  caption:
    fontFamily: "'Courier Prime', 'Courier New', monospace"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.3
  chip:
    fontFamily: "'Courier Prime', 'Courier New', monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1
rounded:
  chip: "3px"
  scrub: "4px"
  notch: "6px"
  pill: "999px"
  round: "50%"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
  space-7: "48px"
  space-8: "64px"
  strip-h: "64px"
  scenes-h: "44px"
  deck-h: "116px"
components:
  mode-notch:
    textColor: "{colors.ink-3}"
    typography: "{typography.numeral}"
    rounded: "{rounded.notch}"
    padding: "10px 14px 12px"
  mode-notch-active:
    textColor: "{colors.ink}"
  scene-link:
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
    padding: "6px 0"
  scene-link-active:
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.tape-ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.chip}"
    padding: "7px 10px 6px"
  chip-pressed:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.bakelite}"
  scrub:
    textColor: "{colors.brass}"
    rounded: "{rounded.scrub}"
    padding: "0 0.06em"
  size-switch:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    width: "30px"
    height: "28px"
  size-switch-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.enamel}"
  lang-select:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "34px"
    padding: "0 10px 0 9px"
  deck:
    backgroundColor: "{colors.bakelite}"
    textColor: "{colors.deck-ink}"
    height: "{spacing.deck-h}"
  tape:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.tape-ink}"
    height: "84px"
  tape-caption:
    typography: "{typography.caption}"
    padding: "0 24px 0 16px"
  deck-control:
    textColor: "{colors.deck-ink}"
    rounded: "{rounded.round}"
    size: "40px"
  lever:
    backgroundColor: "{colors.deck-brass}"
    width: "64px"
    height: "84px"
  ledger:
    typography: "{typography.title}"
    width: "560px"
  ledger-row-now:
    textColor: "{colors.brass}"
---

# Design System: Square & Multiply

## Overview

**Creative North Star: "Rotor Rim & Punched Tape"**

Every modulus is a rotor rim and every procedure advances one punch of tape. The page is a single instrument, not a document: a dark enamel slate, a bakelite rim engraved with ivory residues, a brass index pin, and a strip of punched tape running along a bakelite deck with an advance lever. Text is sparse; the figure, the formula, and the working table carry the meaning, and one short typed caption names the step.

State is a mark, never a paragraph: a punched hole is done, a notched frame is current, a blank frame is ahead. One brass stroke per step says "this is what just moved". Formulas are the controls: numbers inside them are dragged in place, and digits roll to their new value instead of cross-fading.

On desktop (901px and up) the whole instrument fits one viewport with no page scroll; on narrower screens the board stacks and the deck sticks to the bottom edge. The default scheme is dark; a light scheme swaps the enamel and ink but keeps the deck and rotor rim bakelite.

**Key Characteristics:**
- Three faces with fixed jobs: math face for computed values, engraved condensed face for chrome and numerals, typewriter face for tape captions and chips.
- Brass is a signal, not a brand color.
- Flat enamel; depth comes from tonal layers (enamel, deeper enamel face, bakelite rim and deck).
- Motion lands on the rendered final state and is safe to interrupt.
- Figure geometry never scales with the text-size switch.

## Colors

A muted enamel-and-bakelite ground with ivory ink, one warm metal signal, and three party colors that are always labelled. Light-scheme values carry the `-light` suffix and replace their counterparts under `prefers-color-scheme: light`; the four `deck-*` tokens have no light counterpart because the deck is bakelite in both schemes.

### Primary
- **Index Brass** (`brass`): the single active stroke of the current step. In the rotor: the index pin, the current jump arc, the current peg, the engraved numeral it lands on, a hit target. In the working table: the current row, a used cell, a punched mark. On the tape: the current frame is tinted brass at 26% over tape. In the chrome: the pin under the active mode notch and the punched hole of the active topic. In the formula: scrub inputs that belong to no party, and the answer. Also the text selection background.
- **Worn Brass** (`brass-deep`): the rim of the rotor reading window only.
- **Lever Brass** (`deck-brass`): the lever arm on the deck; fixed across schemes so the lever reads on bakelite in light mode.

### Secondary
- **Alice Enamel Blue** (`alice`): Alice's numbers, pegs, and markers.
- **Bob Verdigris** (`bob`): Bob's numbers, pegs, and markers.
- **Eve Signal Red** (`eve`): Eve's numbers and pegs, warnings, and the stage error.

### Neutral
- **Enamel Slate** (`enamel`): page ground.
- **Deep Enamel** (`enamel-deep`): rotor face inside the rim; peg outlines.
- **Enamel Rule** (`enamel-line`): hairlines under the strip, ledger header rule, pill outlines, scrollbars.
- **Bakelite** (`bakelite`): rotor rim band, hub, reading window, deck, punched holes, the notches cut into the current tape frame.
- **Bakelite Edge** (`bakelite-edge`): rim edge rings and the lever slot.
- **Ivory Ink** (`ink`, `ink-2`, `ink-3`): primary text; secondary text and jump arcs at rest; operators, ledger headers, inactive notches and links, ticks.
- **Tape Paper** (`tape`, `tape-ink`, `tape-dim`): the tape strip and chips, their typed ink, and the dimmed paper tone.
- **Deck Ink** (`deck-ink`, `deck-dim`, `deck-line`): text, step counter, and control rings on the bakelite deck; also the engraved rim numerals, which always sit on bakelite.
- **Focus Amber** (`focus`): the 2px focus outline, offset 3px.

### Named Rules
**The Single Stroke Rule.** Inside a figure, the tape, or the working table, brass marks exactly one thing: the stroke the current step just made. Everything already done reverts to ink; everything ahead is blank.

**The Alice Is Blue Rule.** Alice is enamel blue, not brass. She was moved off brass so a party color can never be mistaken for the active stroke. No party ever wears brass.

**The Labelled Party Rule.** Alice, Bob, and Eve colors always travel with a name or label; color is never the only carrier.

**The Bakelite Deck Rule.** The deck and the rotor rim are bakelite in both schemes, so engraved numerals and deck text use the fixed `deck-*` tokens, not the scheme ink.

## Typography

**Display Font:** STIX Two Text (with Cambria Math, Times New Roman, serif)
**Label Font:** Barlow Condensed (with Arial Narrow, sans-serif)
**Typed Font:** Courier Prime (with Courier New, monospace)

**Character:** A book math face for every computed value, an engraved instrument condensed face for everything that labels the machine, and a typewriter face that types the step caption onto the tape. Body digits are lining and tabular everywhere.

### Hierarchy
- **Display** (`display`): the live formula at the top left. Steps down to the headline size at 900px and to title size at 600px.
- **Headline** (`headline`): large results and the bit row (bits use the engraved face at 600).
- **Title** (`title`): working-table cells and worked lines; line height 1.2 in the table, 1.35 in worked lines.
- **Body** (`body`): ground text; line height rises to 1.7 for Japanese, Korean, Chinese, and Hindi.
- **Label** (`label`): mode names, ledger headers, the language select (600), scene links (500 at body size, 0.01em).
- **Numeral** (`numeral`): the mode notch number. The rotor engraves residues in the same face at 600, sized by modulus (16px up to n = 8, down to 7.5px above 45) in SVG units.
- **Wordmark** (`wordmark`): the name, 1.125rem below 900px.
- **Caption** (`caption`): the typed tape caption, clamped to 3 lines (4 below 900px, at 0.9375rem). One step smaller for CJK and Devanagari.
- **Chip** (`chip`): preset labels.

### Per-language stacks
Latin languages keep the three faces. Other scripts append a face that carries their glyphs after each world face:
- Japanese: BIZ UDPGothic (math, engraved), BIZ UDGothic (typed).
- Korean: Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR.
- Chinese: PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC.
- Hindi: Noto Sans Devanagari.
- Greek: engraved becomes Fira Sans Extra Condensed, typed becomes Fira Mono; math stays STIX Two Text.

### Named Rules
**The Three Faces Rule.** Math face for anything computed, engraved face for anything that labels the machine, typed face only on tape paper (captions and chips). Never swap jobs.

**The Text Size Rule.** The text-size switch sets the root to 87.5%, 100%, or 118.75%. All type scales in rem; rotor and lever geometry stay in px and do not scale.

## Layout

The body is a four-row grid: strip (`strip-h`), scene links (`scenes-h`), board (fills), deck (`deck-h`). At 901px and up the body is exactly 100dvh and nothing scrolls except the working table.

- **Board, above 1240px:** two columns at 5fr / 6fr. Left: formula above the working table. Right: the figure (rotor) spanning both rows. Column gap `space-7`, row gap `space-5`, padding `space-6 space-6 space-5`. The rotor is a square up to 560px, bounded by the height left after strip, scenes, deck, and 64px.
- **901 to 1240px:** columns go 1fr / 1fr, gaps and padding drop one step (`space-6` column gap, `space-5 space-5 space-4` padding), and inactive mode notches show only their numeral.
- **900px and below:** rows size to content. The strip wraps; the mode notches take a full-width row of their own, spread edge to edge. The board stacks formula, figure, working table. Rotor is min(100%, 520px, 62dvh). The deck is sticky at the bottom, `deck-h` becomes 92px, the tape window grows to 96px, and controls drop to a row beneath the tape with the step counter at the left.
- **600px and below:** the rotor shrinks to min(100%, 300px, 32dvh) so the working table stays next to it; presets move below the table; table cells may wrap; mode names swap to short labels at 0.6875rem with a 44px minimum notch width.
- **Coarse pointers:** scene links, chips, and scrubs get larger hit padding.
- **Tape position:** the current frame is held at 22% of the tape window width (6% below 600px), with 48 blank leader frames each side and a 16px fade at both window edges.
- **Spacing rhythm:** a 4px base scale (`space-1` to `space-8`); worked blocks in the table are separated by `space-4`.

## Elevation & Depth

Flat. There are no drop shadows. Depth is tonal: the enamel ground, a deeper enamel rotor face, then bakelite for the rim and the deck, which reads as the machine's housing. The only shadow in the vocabulary is a 1px inset ring that draws an unpunched hole on the tape.

### Shadow Vocabulary
- **Unpunched hole** (`box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tape-ink) 16%, transparent)`): an empty hole on a tape frame that is still ahead.

### Named Rules
**The Flat Enamel Rule.** Surfaces never cast shadows. A thing becomes current by changing color or getting a mark, not by rising; the 1px nudge on a chip is press feedback, not elevation.

## Shapes

Circles and hairlines. The rotor is concentric rings (rim band 26 units wide, edge rings at 1 unit) with a downward triangular brass pin. Tape holes, scene marks, ledger marks, deck controls, and pegs are circles. The current tape frame has triangular notches cut into its top and bottom edges. Corners elsewhere are small: chips 3px, scrubs and the reading window 4px, mode notches 6px; the text-size switch and language select are full pills. Rules are 1px solid lines; dashed only between tape frames and on rotor targets.

## Components

### Mode Notches
Engraved numerals 0 to 4 with names, at the right of the strip. Inactive notches are `ink-3`, hover and active go to `ink`. The active notch gets a 7px brass triangle (the index pin) at its bottom edge that grows from scaleY(0) to 1 over `dur-short`.

### Scene Links
A scrolling row of topic links in the engraved face. Each carries an 8px circular mark: an outline when inactive, a punched brass hole when active.

### Presets (Chips)
Typed tape labels for example values: tape paper, tape ink, 3px corners. Hover lifts 1px, press sinks 1px (`dur-micro`). A pressed or on toggle chip fills brass with bakelite text.

### Scrub Numbers
A number inside a formula that you drag sideways, step with arrow keys, or double-click (tap on touch) to type. Brass by default, or Alice, Bob, or Eve when it belongs to a party. A 2px underline in its own color marks it at rest; dotted end brackets appear on hover and drag; dragging adds a 14% tint; typing shows a 2px outline; a rejected value shakes 4px for 0.5s.

### Rotor
An SVG rim with residues mod n engraved in ivory on bakelite, ticks up to n = 120, and engravings thinned above n = 60. The rim turns so the current value sits under the fixed brass pin; a 76 by 28 reading window above the pin shows the value. Jumps are curved arcs bowing toward the hub: `ink-2` at 55% opacity at rest, brass at 2 units when current. Pegs are 5.5-unit circles in ink or a party color, brass when current. Numerals flip on the lower half to stay upright.

### Ledger (Working Table)
Math-face table, max 560px, rows separated by a half-strength enamel rule. Headers in the engraved face, right-aligned except the first column. Rows ahead are blank (transparent text), the current row is brass, dim cells are `ink-3`. Punched marks are 9px circles: outline when off, brass when on.

### Tape Deck
A bakelite bar holding the tape window, the back and play controls, the lever, and the step counter. The tape is five-hole paper tape: each frame punches its step number in binary, with a smaller sprocket hole between. Done frames are punched, frames ahead show empty ringed holes, and the current frame widens to hold the typed caption on a brass tint with notches top and bottom. Clicking any other frame jumps to that step. Back and play are 40px ringed circles (36px below 900px) that scale to 0.94 on press.

### Lever
The advance control at the right of the deck: a brass arm in a bakelite slot. Hover tilts it 8deg; each advance pulls it to 38deg and back over 420ms. Next also responds to the right arrow and space, back to the left arrow, play to P.

### Text-Size Switch and Language Select
Two pills in the strip outlined in `enamel-line`. The size switch shows three "A"s at 12, 15, and 19px; the pressed one fills ink with enamel text. The language select is a native select styled in the engraved face with a globe icon and a drawn caret; the pill takes the focus outline.

### Motion
- Easing: `ease-out` cubic-bezier(0.16, 1, 0.3, 1) for arrivals; `ease-in-out` cubic-bezier(0.65, 0, 0.35, 1) for drawn strokes, flights, pulses, and the lever. `dur-micro` 120ms for press feedback, `dur-short` 220ms for state changes.
- Step animations default to 520ms; strokes draw and values fly over 700ms; the rotor turns over 900ms; the tape slides over 520ms; captions are written left to right over 700ms after 120ms. Long sequences stagger within a 900ms budget at no more than 90ms per item. Play advances every 2100ms.

**The Final State First Rule.** Each step renders its final state into the DOM, then attaches "from" animations with backwards fill. Finishing every running animation lands exactly on the rendered state, so stepping back, jumping, and fast clicking are always safe.

**The Rolling Digits Rule.** Changing numbers roll through intermediate values with a cubic ease-out; they never cross-fade.

**The Forward Rotor Rule.** The rotor only turns forward, adding whole laps when needed, like a real rotor.

**The Reduced Motion Rule.** With reduced motion, every step animation becomes a 150ms linear opacity fade, rolling numbers jump straight to their final value, and CSS transitions and keyframes drop to 1ms. Steps read correctly with no motion at all.

## Do's and Don'ts

### Do:
- **Do** keep brass on the single active stroke of each figure, tape, and table; return finished strokes to ink.
- **Do** give every party color a visible name or label.
- **Do** put inputs inside the formula as scrub numbers.
- **Do** render the final state first and animate from the previous one with backwards fill.
- **Do** use the `deck-*` tokens for anything drawn on bakelite, in both schemes.
- **Do** keep figure geometry in px so the text-size switch only scales type.

### Don't:
- **Don't** put a party (Alice, Bob, Eve) in brass, or put brass on two strokes in the same figure.
- **Don't** cross-fade digits; roll them.
- **Don't** add drop shadows or raise panels on a layer; the world is flat enamel.
- **Don't** use the typed face off tape paper, or the engraved face for computed values.
- **Don't** add sliders or separate input fields for values that live in a formula.
- **Don't** spin the rotor backward.
