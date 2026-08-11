# Daftra quotation template — Motqinon Tech

Redesign of the Daftra "عرض سعر / Quotation" print template using the Motqinon Tech
brand identity (the previous orange `#ef5b00` is gone entirely).

## Brand palette

| Token | Hex | Used for |
| --- | --- | --- |
| Black | `#01040B` | table header, grand-total bar, sticky footer, body text |
| Violet | `#7B27FF` | "عرض سعر", quote number, FREE pills, bullets, panel markers |
| Cool grey | `#A0A2B1` | card labels, English half of bilingual labels |
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
| `template.html` | **HTML** (the main body) — quotation template |
| `contract22.html` | **HTML** — contract template, uploaded as a second Daftra template |
| `header.html` | **Header** — deliberately empty; see the comment inside |
| `footer.html` | **Footer** (the sticky bar printed at the bottom of every page) |

Paste each file's contents into the matching box in Daftra's template editor. The contract is
a separate template: give it `contract22.html` as its HTML and the same `footer.html`, so both
documents carry the same sticky bar.

The logo is **not** hardcoded — it still renders through `{%logo%}` / `{%logo-width%}` /
`{%logo-height%}`, so it keeps coming from the website's template settings. It sits at the
top right, the Arabic company name beside it, and "عرض سعر" at the top left, with a black rule
beneath all three.

The logo is capped at 78 px tall / 250 px wide, which suits a square mark. **If the logo
uploaded in Daftra already contains the company name, delete the `.header-brand` block from
the body** — otherwise the name prints twice.

## Layout

1. **Header** — logo (right) · company name in Arabic (beside it) · عرض سعر (left) · black
   rule. Arabic only: the English company name and the word QUOTATION are both gone. The name
   is set as text in `.header-brand` so the header reads correctly even when the uploaded logo
   is only the mark, or fails to load.
2. **Meta cards** — rounded, bordered cards with a small grey label over a bold value:
   - Row 1: `{%invoice_number%}` (violet) · `{%invoice_date%}` · validity.
   - Row 2: `{%client_info%}`, plus the shipping card when Daftra reveals it.
   - Row 3+: `{%custom_fields%}` — Daftra's own table, restyled cell-by-cell into the same
     cards, so Project / Sales Rep / Address and anything else configured picks up the look
     automatically.
   - Last row: CR No. and VAT No.
3. **Items** — `{%items_list%}` with a black rounded header row, alternating violet-tinted
   rows, and hairline separators.
4. **Totals** — Daftra's totals table, pushed to the **left** at 50 % width so it sits under
   the price columns; subtotal and VAT on a tinted panel, grand total on a black rounded bar
   with the figure in white.
5. **Bottom row** — bank accounts (right) facing terms & conditions (left). The terms panel
   lands directly under the totals; the bank panel is headed الحسابات البنكية with Al Rajhi
   first, then SAB. The technical-notes panel has been removed.
6. **Sticky footer** — black bar: company (right) · phone + الإدارة (left).

## Editing text from Daftra's template editor

Every hardcoded string carries a unique `id` and `class="editable-area"`, so it can be edited
in place on the website rather than by re-pasting HTML: the company name, the `عرض سعر` title,
all seven meta-card labels, the validity value, the CR and VAT numbers, the terms heading and
its bullet list, all four bank lines, and `الإدارة` plus the company name and phone in the
sticky footer.

The terms list is a `<ul>` whose diamond comes from a `:before` pseudo-element, so a line added
or removed in the editor picks up (or drops) its marker automatically — there is no inner markup
for the editor to preserve.

Anything wrapped in `{%…%}` is quotation data, not template text; it is edited on the quotation
itself, not here.

## Things you may want to adjust

- **Validity** is the static string `10 أيام` in the first meta row (it matches the terms
  panel). Swap in a placeholder there if the account exposes one for it.
- **CR No. / VAT No.** are hardcoded (`4031318733`, `312772334500003`) — they are company
  constants, not per-quote values.
- **Terms and conditions** are static company boilerplate in `template.html`. Per-quote notes
  typed into Daftra still print, via `{%footer%}` in the borderless `.extra-notes` block
  underneath the panel — it stays invisible when the field is empty.
- **The footer is self-contained.** wkhtmltopdf renders the footer section as its own
  document, inheriting nothing from the HTML section — so `footer.html` carries its own Cairo
  `@import`, the full Arabic-capable font stack, *and* its own margin reset. Without the font
  stack the bar falls back to a Latin-only face and the Arabic company name silently drops out
  of the PDF; without `html, body { margin: 0 }` the renderer's default ~8 px body margin pushes
  the bar down out of the strip reserved for it and the bottom gets clipped. The bar is 30 px
  tall against a 20 mm bottom page margin, which leaves headroom for both.
- **Item table boundaries** — cells carry a left border (`#EFEFEF` in the body, `#33333C` in the
  black header) to draw vertical column rules; the last cell in each row drops it so no line is
  painted on the outer left edge.
- **The item-code column** is held at 9 % and `white-space: nowrap`, so a code like `POE-24+2`
  cannot break across two lines. A `:not(.item-description):not(.description)` guard keeps the
  rule off accounts whose first column is the description instead.
- **Totals sit on the left**, under the price columns. Daftra emits the totals table inside
  `{%items_list%}`, so it can only be positioned with margins — `margin-right: auto` does it.
- **The footer's `الإدارة` and phone are inline-blocks on purpose.** As plain inline text the
  digits join the Arabic run beside them and bidi reorders the pair, printing the number to the
  *left* of `الإدارة`; `unicode-bidi: embed` does not help, because the embedding still nests
  inside that run. As inline-blocks both are neutral objects and stay in source order.
  `footer.html` is shared with the contract template, so this change reaches both.
- **Item columns** are not pinned to fixed widths. `table-layout: auto` sizes each column to
  its content, so whichever columns are switched on in Daftra's item-table settings, the row
  stays organised — the description simply absorbs the slack. The mockup's `#` and `الكود`
  columns are Daftra settings, not template markup; today the account emits
  `البند | الوصف | صورة المنتج | سعر الوحدة | الكمية | المجموع`.
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

## The contract template (`contract22.html`)

Same identity as the quotation — Cairo, the five brand colours, the rounded cards, the black
item-table header and grand-total bar, the violet diamonds — applied to the contract the
quotation app generates (`index.html`, `buildContract`) and to the wording in `contract.txt`.

Document order: header · contract no + date · title block · الطرف الأول (with `{%client_info%}`,
`{%client_address%}` and the custom-field cards) · الطرف الثاني (static supplier details) ·
تمهيد · eight numbered articles, with `{%items_list%}` and its totals inside المادة (2) ·
bank box · `{%footer%}` notes · two signature cards · sticky footer.

Points worth knowing:

- **Amounts in words (تفقيط)** cannot be computed by a template — Daftra does no arithmetic.
  المادة (4) therefore states the 50 / 40 / 10 % split and refers to the grand total in
  المادة (2) rather than restating figures. Type the written total into the document's Notes
  field in Daftra and it prints, justified, just above the signatures.
- **Article 2 is the one section allowed to break across pages** (`page-break-inside: auto`),
  because it carries the item table. Every other article, the bank box and the signature block
  stay whole.
- **Signature rules are height-locked** (`.sign-co` 32 px, `.sign-rep` 15 px) so both sit at the
  same level whether the client's name runs to one line or two.
- **The company stamp** is the image the quotation app uses. If the PDF renderer cannot reach
  `lh3.googleusercontent.com` the image collapses silently and the signature line still prints;
  delete the `.sign-stamp` block to sign and stamp by hand instead.
- **Supplier details and the payment account** track the current `index.html`: رياض احمد بحير,
  جوال 0532799924, and Al Rajhi (`شركة متقنون تك للتجارة` / `2010 0001 0006 0866 08470` /
  `SA56 8000 0201 6080 1660 8470`) in place of the earlier SABB account. All are
  `editable-area`, so they can be corrected on the website without re-pasting.
- **Client CR / VAT card / mobile / signatory** print as cards under the first party. A template
  cannot invent per-contract values, so create them in Daftra as custom fields on the contract,
  named exactly `السجل التجاري`, `البطاقة الضريبية`, `جوال`, `ممثل الطرف الأول` — the same set
  `index.html` records. If the account exposes direct client placeholders, drop them into the
  first-party sentence instead.
- **The transfer QR** that `index.html` prints beside the bank details needs a public URL or a
  `data:` URI to work in a template; a commented-out `.bank-qr` block sits under the bank box
  ready for it.
- **53 editable areas**, same convention as the quotation: every heading, article body, bank
  line and signature label can be edited from Daftra rather than by re-pasting HTML.

## Previewing changes

`preview.html` and `contract-preview.html` are generated — they feed sample Daftra output
through the real templates and `footer.html`, so they always exercise the shipped stylesheet:

```
node daftra-template/build-preview.js
node daftra-template/build-contract-preview.js
```

Then open the generated file in a browser (print preview shows the A4 result). The contract
sample uses the seven-line quotation from `contract.txt`, which runs to roughly two and a half
A4 pages — enough to exercise the page-break rules.

## Rendering constraints

Daftra prints through wkhtmltopdf (QtWebKit), so the template deliberately avoids flexbox,
CSS variables and grid — every column is `display: table`. Page-break guards keep item rows,
the totals block and the notes panels from splitting across pages, and
`print-color-adjust: exact` keeps the black and violet fills in the PDF.
