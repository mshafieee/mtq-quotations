# Daftra quotation template — Motqinon Tech

Redesign of the Daftra "عرض سعر / Quotation" print template using the Motqinon Tech
brand identity (the previous orange `#ef5b00` is gone entirely).

## Brand palette

| Token | Hex | Used for |
| --- | --- | --- |
| Black | `#01040B` | table header, grand-total bar, sticky footer, body text |
| Violet | `#7B27FF` | "عرض سعر", quote number, FREE pills, bullets, grand-total figure |
| Cool grey | `#A0A2B1` | card labels, "QUOTATION", footer cities |
| Grey | `#A2A2A2` | English item descriptions, struck-through list prices, row numbers |
| Light | `#EFEFEF` | row separators |

Type is `"Avenir Next", Tahoma, Arial, sans-serif` — Avenir Next when the renderer has it,
Tahoma as the Arabic-safe fallback (wkhtmltopdf will normally land on Tahoma).

## Files → Daftra template sections

| File | Daftra section |
| --- | --- |
| `template.html` | **HTML** (the main body) |
| `header.html` | **Header** — deliberately empty; see the comment inside |
| `footer.html` | **Footer** (the sticky bar printed at the bottom of every page) |

Paste each file's contents into the matching box in Daftra's template editor.

The logo is **not** hardcoded — it still renders through `{%logo%}` / `{%logo-width%}` /
`{%logo-height%}`, so it keeps coming from the website's template settings. It sits at the
top right; "عرض سعر / QUOTATION" sits at the top left, with a black rule beneath both.

## Layout

1. **Header** — logo (right) · عرض سعر / QUOTATION (left) · black rule.
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
   a tinted panel, grand total on a black rounded bar with the figure in violet.
5. **Terms & technical notes** — two static panels.
6. **Bank details** — Al Rajhi and SAB IBANs.
7. **Sticky footer** — black bar: company (right) · cities (centre) · phone (left).

## Things you may want to adjust

- **Validity** is the static string `10 أيام` in the first meta row (it matches the terms
  panel). Swap in a placeholder there if the account exposes one for it.
- **CR No. / VAT No.** are hardcoded (`4031318733`, `312772334500003`) — they are company
  constants, not per-quote values.
- **Terms and technical notes** are static company boilerplate in `template.html`. Per-quote
  notes typed into Daftra still print, via `{%footer%}` in the borderless `.extra-notes`
  block underneath the two panels — it stays invisible when the field is empty.
- **Item columns** are sized for `# | code | description | unit price | qty | total`. If the
  account's item table still emits an image column instead of `#`, the alternative widths are
  in a comment at the bottom of the stylesheet.
- **Item code pill** — the black rounded badge applies when Daftra wraps the code in a
  `<span>`. When it emits bare text the cell falls back to bold monospace, which still reads
  correctly; no layout breaks either way.
- **English sub-line** in a description renders muted, LTR and left-aligned when wrapped in
  `<small>` or `<span class="en">`.
- **Free items** — `<span class="free-value">FREE</span>` renders the violet pill and
  `<span class="original-price">3,600</span>` the struck-through list price.
- **Client card** spans the full row while shipping is hidden. For a half-width card, give
  `.meta-row` a second `<div class="meta-cell last"></div>` spacer.

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
