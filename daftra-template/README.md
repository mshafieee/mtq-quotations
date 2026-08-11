# Daftra quotation template — Motqinon Tech

Redesign of the Daftra "عرض سعر / Quotation" print template using the Motqinon Tech
brand identity (the previous orange `#ef5b00` is gone entirely).

## Brand palette

| Token | Hex | Used for |
| --- | --- | --- |
| Black | `#01040B` | table header, grand-total bar, sticky footer, body text |
| Violet | `#7B27FF` | "عرض سعر", quote number, FREE pills, bullets, panel markers |
| Cool grey | `#A0A2B1` | card labels, "QUOTATION", footer cities |
| Grey | `#A2A2A2` | English item descriptions, struck-through list prices, row numbers |
| Light | `#EFEFEF` | row separators |

Arabic is set in **Cairo**, pulled from Google Fonts by an `@import` that must stay the first
rule in the `<style>` block. If the PDF renderer has no outbound network the fetch fails
silently and the stack falls back through Sakkal Majalla / Traditional Arabic / GE SS Two /
Noto Naskh Arabic to Tahoma — so confirm on a real PDF that Cairo actually arrives. For a
traditional Naskh instead of a corporate sans, swap `Cairo` for `Amiri` in the `@import` and
in the two font stacks under it.

Latin runs — numbers, IBANs, English item descriptions, the code pills — are pinned to
`"Avenir Next", Arial, Helvetica` so they keep the brand's Latin face instead of borrowing the
Arabic font's Latin glyphs.

## Files → Daftra template sections

| File | Daftra section |
| --- | --- |
| `template.html` | **HTML** (the main body) |
| `header.html` | **Header** — deliberately empty; see the comment inside |
| `footer.html` | **Footer** (the sticky bar printed at the bottom of every page) |

Paste each file's contents into the matching box in Daftra's template editor.

The logo is **not** hardcoded — it still renders through `{%logo%}` / `{%logo-width%}` /
`{%logo-height%}`, so it keeps coming from the website's template settings. It sits at the
top right, the company name beside it, and "عرض سعر / QUOTATION" at the top left, with a
black rule beneath all three.

The logo is capped at 58 px tall / 190 px wide, which suits a square mark. **If the logo
uploaded in Daftra already contains the company name, delete the `.header-brand` block from
the body** — otherwise the name prints twice.

## Layout

1. **Header** — logo (right) · company name (beside it) · عرض سعر / QUOTATION (left) · black
   rule. The name is set as text in `.header-brand` so the header reads correctly even when
   the uploaded logo is only the mark, or fails to load.
2. **Meta cards** — rounded, bordered cards with a small grey label over a bold value:
   - Row 1: `{%invoice_number%}` (violet) · `{%invoice_date%}` · validity.
   - Row 2: `{%client_info%}`, plus the shipping card when Daftra reveals it.
   - Row 3+: `{%custom_fields%}` — Daftra's own table, restyled cell-by-cell into the same
     cards, so Project / Sales Rep / Address and anything else configured picks up the look
     automatically.
   - Last row: CR No. and VAT No.
3. **Items** — `{%items_list%}` with a black rounded header row, alternating violet-tinted
   rows, and hairline separators.
4. **Totals** — Daftra's totals table, pinned to the right at 50 % width; subtotal and VAT on
   a tinted panel, grand total on a black rounded bar with the figure in white.
5. **Terms & technical notes** — two static panels.
6. **Bank details** — Al Rajhi and SAB IBANs.
7. **Sticky footer** — black bar: company (right) · cities (centre) · phone (left).

## Editing text from Daftra's template editor

Every hardcoded string carries a unique `id` and `class="editable-area"`, so it can be edited
in place on the website rather than by re-pasting HTML: the company name and `MOTQINON TECH`,
the `عرض سعر` / `QUOTATION` title, all six meta-card labels, the validity value, the CR and VAT
numbers, both panel headings, both bullet lists, all four bank lines, and the three strings in
the sticky footer.

The bullet lists are `<ul>` elements whose diamond comes from a `:before` pseudo-element, so a
line added or removed in the editor picks up (or drops) its marker automatically — there is no
inner markup for the editor to preserve.

Anything wrapped in `{%…%}` is quotation data, not template text; it is edited on the quotation
itself, not here.

## Things you may want to adjust

- **Validity** is the static string `10 أيام` in the first meta row (it matches the terms
  panel). Swap in a placeholder there if the account exposes one for it.
- **CR No. / VAT No.** are hardcoded (`4031318733`, `312772334500003`) — they are company
  constants, not per-quote values.
- **Terms and technical notes** are static company boilerplate in `template.html`. Per-quote
  notes typed into Daftra still print, via `{%footer%}` in the borderless `.extra-notes`
  block underneath the two panels — it stays invisible when the field is empty.
- **Item columns** are not pinned to fixed widths. `table-layout: auto` sizes each column to
  its content, so whichever columns are switched on in Daftra's item-table settings, the row
  stays organised — the description simply absorbs the slack. The mockup's `#` and `الكود`
  columns are Daftra settings, not template markup; today the account emits
  `البند/الوصف | صورة المنتج | سعر الوحدة | الكمية | المجموع`.
- **Items vs totals** are told apart by position (`:nth-of-type`), never by class. The account
  puts totals-like classes on the *items* table too, and matching those shrank it to half
  width and forced every cell onto a single overflowing line.
- **Per-column summary row** — Daftra prints a `tfoot` row of column sums beneath the items
  (`0.00 / 0 / 0.00` when there is nothing to sum). A commented-out one-liner in the
  stylesheet hides it: search for `tfoot { display: none`.
- **Item code pill** — the black rounded badge renders for `<span class="code-badge">DL-711</span>`
  typed into an item's description, and for a code column when Daftra wraps its value in a
  `<span>`. Bare text falls back to bold monospace; no layout breaks either way.
- **English sub-line** in a description renders muted, LTR and left-aligned when wrapped in
  `<small>` or `<span class="en">`.
- **Free items** — `<span class="free-value">FREE</span>` renders the violet pill and
  `<span class="original-price">3,600</span>` the struck-through list price.
- **Client card** is half-width, as in the mockup. Its row always carries a second cell to
  hold that width; Daftra's `#shipping_options` toggle now sits on the *card* inside that
  cell, so the left half stays blank until a shipping address is used, then fills with it.
  To let the client card span the full row instead, move `id="shipping_options"` and its
  `style="display:none;"` back onto the surrounding `.meta-cell`.

## Previewing changes

`preview.html` is generated — it feeds sample Daftra output through the real `template.html`
and `footer.html`, so it always exercises the shipped stylesheet:

```
node daftra-template/build-preview.js
```

Then open `daftra-template/preview.html` in a browser (print preview shows the A4 result).

## Rendering constraints

Daftra prints through wkhtmltopdf (QtWebKit), so the template deliberately avoids flexbox,
CSS variables and grid — every column is `display: table`. Page-break guards keep item rows,
the totals block and the notes panels from splitting across pages, and
`print-color-adjust: exact` keeps the black and violet fills in the PDF.
