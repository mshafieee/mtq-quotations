/*
 * Builds daftra-template/preview.html from template.html + footer.html.
 *
 * The sample values below imitate the markup Daftra substitutes into each
 * {%placeholder%}, so the preview exercises the real stylesheet — nothing is
 * styled twice. Run:  node daftra-template/build-preview.js
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const stickyFooter = fs.readFileSync(path.join(dir, 'footer.html'), 'utf8');

/* Inline SVG stand-in for the logo Daftra serves from template settings. */
const logo = 'data:image/svg+xml;base64,' + Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <rect x="0" y="0" width="56" height="56" rx="13" fill="#01040B"/>
  <rect x="18" y="18" width="20" height="20" rx="4" fill="#7B27FF"/>
</svg>`).toString('base64');

/* Stand-in for the product thumbnail Daftra puts in the image column. */
const thumb = 'data:image/svg+xml;base64,' + Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
  <rect width="60" height="60" rx="6" fill="#EFEFEF"/>
  <rect x="10" y="16" width="40" height="26" rx="3" fill="#A0A2B1"/>
</svg>`).toString('base64');

/* {%custom_fields%} — Daftra emits a plain table of label/value pairs. */
const customFields = `
<table cellpadding="0" cellspacing="0">
  <tr>
    <td><label>المشروع / PROJECT</label>فندق عين مكة</td>
    <td><label>الموقع / SITE</label>مكة المكرمة</td>
  </tr>
  <tr>
    <td><label>نطاق العمل / SCOPE</label>توريد وتركيب وبرمجة</td>
    <td><label>رقم الاتصال / CONTACT</label>0553 279 9924</td>
  </tr>
</table>`;

const money = (v) => `${v} <span class="cur">ر.س</span>`;
const was = (v) => `<span class="original-price">${v}</span>`;
const free = '<span class="free-value">FREE</span>';

/* Column set actually emitted by the account today:
   البند | الوصف | صورة المنتج | سعر الوحدة | الكمية | المجموع, plus a per-column summary
   row in <tfoot>, then the real totals as a separate table.class="total-table". */
const rows = [
  ['1', 'POE-24+2',
    'قفل فندقي إلكتروني ببطاقات RF ام1 ار اف، يدعم القراءة والكتابة والتشفير، يعمل بـ 4 بطاريات AAA، إنذار انخفاض البطارية.',
    'RF M1 electronic hotel lock, aluminium reader &amp; handle, 4&times;AAA batteries, low-battery alarm.',
    '225', '400', was('150,000') + money('90,000')],
  ['2', 'ENC-1',
    'جهاز إنكودر لبرمجة كروت مايفير الذكية، يدعم القراءة والكتابة والتشفير، يتيح تخصيص البيانات على البطاقات للاستخدام في أنظمة التحكم في الدخول والفنادق والمرافق الذكية.',
    'Encoder for programming Mifare smart cards — read / write / encryption for access-control, hotels &amp; smart facilities.',
    free, '1', was('650') + free],
  ['3', 'CARD',
    'كارت مايفير ذكي، يستخدم للتعريف والدخول في أنظمة التحكم والفنادق والمرافق الذكية بتقنية 13.56MHz مع إمكانية البرمجة والتشفير.',
    'Mifare smart card 13.56MHz RFID — identification &amp; access for control systems, hotels &amp; smart facilities; programmable &amp; encryptable.',
    free, '1200', was('3,600') + free],
  ['4', 'ENS-2',
    'موفر طاقة للفنادق يعمل بالكروت (Mifare)، يشغّل الكهرباء داخل الغرفة عند إدخال الكارت، يدعم التعرف على الكارت المبرمج (ID) وخاصية التوقيت، مناسب لأنظمة إدارة الطاقة وتقليل الاستهلاك.',
    'Mifare energy-saving room switch — activates power on card insertion, supports programmed card ID &amp; timing; ideal for hotel energy management.',
    '60', '400', was('40,000') + money('24,000')],
  ['5', 'INS', 'أعمال التركيب والبرمجة', 'Installation &amp; Programming', '160', '400', money('64,000')],
];

const itemsList = `
<table class="listing-table total-table" cellpadding="0" cellspacing="0">
  <thead>
    <tr>
      <th>البند</th><th>الوصف</th><th>صورة المنتج</th>
      <th>سعر الوحدة</th><th>الكمية</th><th>المجموع</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map(([n, code, ar, en, unit, qty, total]) => `
    <tr>
      <td class="item-code">${code}</td>
      <td class="item-description">${ar}<small>${en}</small></td>
      <td><img src="${thumb}" alt="" /></td>
      <td>${unit}</td>
      <td>${qty}</td>
      <td>${total}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr><td></td><td></td><td></td><td>0.00</td><td>0</td><td>0.00</td></tr>
  </tfoot>
</table>
<table class="total-table" cellpadding="0" cellspacing="0">
  <tr><td>المجموع / Subtotal</td><td>178,000 <span class="cur">ر.س</span></td></tr>
  <tr><td>ضريبة القيمة المضافة 15% / VAT</td><td>26,700 <span class="cur">ر.س</span></td></tr>
  <tr><td>الإجمالي الكلي / Grand Total</td><td>204,700 <span class="cur">ر.س</span></td></tr>
</table>`;

const values = {
  '{%logo%}': logo,
  '{%logo-width%}': '400',
  '{%logo-height%}': '',
  '{%invoice_number%}': 'Q-2026-92074',
  '{%label_date%}': 'التاريخ',
  '{%invoice_date%}': '2026 / 06 / 27',
  '{%client_info%}': 'شركة اوتادا للتطوير العقاري',
  '{%client_address%}': 'مكة المكرمة – حي العوالي',
  '{%label_ship%}': 'الشحن إلى',
  '{%ship_info%}': '',
  '{%staff_member_name%}': 'بشار عادل',
  '{%staff_member_phone%}': '+966 55 123 4567',
  '{%invoice_notes%}': 'توريد وتركيب بدون تخريم الأبواب.',
  '{%custom_fields%}': customFields,
  '{%items_list%}': itemsList,
  '{%footer%}': '',
  '{%html_sticky_footer%}': stickyFooter,
};

let out = template;
for (const [key, value] of Object.entries(values)) {
  out = out.split(key).join(value);
}
/* <custom_field> is a Daftra-only tag; render it as a plain block in the browser. */
out = out.replace(/<custom_field /g, '<div ').replace(/<\/custom_field>/g, '</div>');

fs.writeFileSync(path.join(dir, 'preview.html'), out);
console.log('wrote preview.html');
