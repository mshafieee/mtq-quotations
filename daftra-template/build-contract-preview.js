/*
 * Builds daftra-template/contract-preview.html from contract22.html + footer.html.
 *
 * Sample values imitate the markup Daftra substitutes into each {%placeholder%} — the same
 * six-column item table (البند | الوصف | صورة المنتج | سعر الوحدة | الكمية | المجموع) and
 * totals-like classes the live account emits — so the preview exercises the real stylesheet.
 * Run:  node daftra-template/build-contract-preview.js
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'contract22.html'), 'utf8');
const stickyFooter = fs.readFileSync(path.join(dir, 'footer.html'), 'utf8');

const logo = 'data:image/svg+xml;base64,' + Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="74" height="74" viewBox="0 0 74 74">
  <rect x="0" y="0" width="74" height="74" rx="17" fill="#01040B"/>
  <rect x="24" y="24" width="26" height="26" rx="5" fill="#7B27FF"/>
</svg>`).toString('base64');

const thumb = 'data:image/svg+xml;base64,' + Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
  <rect width="60" height="60" rx="6" fill="#EFEFEF"/>
  <rect x="10" y="16" width="40" height="26" rx="3" fill="#A0A2B1"/>
</svg>`).toString('base64');

/* {%custom_fields%} — the client fields the contract needs beyond name and address, named as
   index.html records them: CR, VAT card, mobile and the client's signatory. */
const customFields = `
<table cellpadding="0" cellspacing="0">
  <tr>
    <td><label>ممثل الطرف الأول</label>ثامر محمد راشد حسن</td>
    <td><label>البطاقة الضريبية</label>310122334500003</td>
  </tr>
</table>`;

const money = (v) => `${v} <span class="cur">ر.س</span>`;

/* Rows taken from contract.txt so the preview reflects a real contract's density. */
const rows = [
  ['MI-K80', 'وحدة انتركوم ComView K-Series — إنتركوم خارجي بدقة 1080P مع شاشة IPS مقاس 8 بوصة، يدعم التعرف على الوجه، RFID، PoE، تحكم بالمصاعد، وحماية IP65.',
    '1080P outdoor intercom, 8-inch IPS screen, face recognition, RFID, PoE, lift control, IP65, aluminium housing.', '2,160.00', '1', '2,160.00'],
  ['MI-K7', 'شاشة ComTouch K-Series — شاشة إنتركوم داخلية 7 بوصة، اتصال ومراقبة وفتح بابين، ربط متعدد، تحكم بالصوت والصورة، تصميم أنيق ومتين.',
    '7-inch indoor intercom monitor with call, talk, monitoring, dual-door unlock and full audio/video adjustment.', '330.00', '18', '5,940.00'],
  ['DP-3', 'لوحة باب خارجية Exterior Door Panel — بإطار معدني باللون الأسود، مصنوعة من البلاستيك عالي الجودة لمقاومة العوامل البيئية، بمقاس 130×230 مم.',
    'Outdoor door panel, black metal frame, high-quality weather-resistant plastic, 130×230 mm.', '132.00', '18', '2,376.00'],
  ['ML-1', 'قفل مغناطيسي Magnetic Lock — قفل عالي الجودة يعمل بالكهرباء، متوافق مع أنظمة وأجهزة الإنتركوم، مناسب للمباني التجارية والمكاتب والفنادق والمنازل الذكية.',
    'High-quality electric magnetic lock, compatible with intercom systems; commercial buildings, offices, hotels, smart homes.', '372.00', '1', '372.00'],
  ['POE-24+2', 'سويتش Switch POE 24+2 — سويتش شبكة عالي الكفاءة مزود بـ 24 منفذ لتغذية وتشغيل الأجهزة عبر الكابل مباشرة، مع منفذين إضافيين للربط الشبكي.',
    'High-performance POE switch, 24 ports with Power over Ethernet plus 2 uplink ports.', '540.00', '1', '540.00'],
  ['EX-1', 'زر خروج Exit Button — زر خروج بدون لمس، تصميم أنيق وعالي الحساسية للاستجابة السريعة، مناسب لأنظمة التحكم في الدخول والخروج.',
    'Touchless exit button, sleek design, high sensitivity, suitable for access-control systems.', '144.00', '1', '144.00'],
  ['INS', 'أعمال التركيب والبرمجة — خدمة التركيب والبرمجة وتشغيل النظام وفق متطلبات العميل، مع تنفيذ الأعمال بدقة عالية وضمان توافق جميع المكونات.',
    'Installation, programming and system commissioning to client requirements.', '1,500.00', '1', '1,500.00'],
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
    ${rows.map(([code, ar, en, unit, qty, total]) => `
    <tr>
      <td class="item-code">${code}</td>
      <td class="item-description">${ar}<small>${en}</small></td>
      <td><img src="${thumb}" alt="" /></td>
      <td>${unit}</td>
      <td>${qty}</td>
      <td>${money(total)}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr><td></td><td></td><td></td><td>0.00</td><td>0</td><td>0.00</td></tr>
  </tfoot>
</table>
<table class="total-table" cellpadding="0" cellspacing="0">
  <tr><td>المجموع / Subtotal</td><td>13,032.00 <span class="cur">ر.س</span></td></tr>
  <tr><td>خصم خاص / Discount</td><td>1,511.71 <span class="cur">ر.س</span></td></tr>
  <tr><td>السعر بعد الخصم</td><td>11,520.29 <span class="cur">ر.س</span></td></tr>
  <tr><td>ضريبة القيمة المضافة 15% / VAT</td><td>1,728.04 <span class="cur">ر.س</span></td></tr>
  <tr><td>الإجمالي شامل الضريبة / Grand Total</td><td>13,248.33 <span class="cur">ر.س</span></td></tr>
</table>`;

/* {%invoice_notes%} — the scope of works, typed per contract, set into المادة (3)'s sentence.
   A phrase that reads on from "يشمل هذا العقد", not a sentence of its own. */
const invoiceNotes = `توريد وتركيب وبرمجة`;

/* {%footer%} — a per-contract note printed just above the signatures. */
const notes = `<p>يتم التسليم على دفعتين حسب جاهزية الموقع، ويلتزم الطرف الأول بتوفير تغذية كهربائية 220 فولت لكل نقطة قبل موعد التركيب.</p>`;

const values = {
  '{%logo%}': logo,
  '{%logo-width%}': '74',
  '{%logo-height%}': '',
  '{%invoice_number%}': 'MTQCT-072',
  '{%label_date%}': 'التاريخ',
  '{%invoice_date%}': '2026 / 04 / 13',
  '{%client_info%}': 'شركة المشاريع السكنية للمقاولات العامة المحدودة',
  '{%client_address%}': 'مدينة جدة – حي النهضة',
  '{%client_mobile%}': '0553710221',
  '{%client_bn2%}': '7011019275',
  '{%custom_fields%}': customFields,
  '{%invoice_notes%}': invoiceNotes,
  '{%items_list%}': itemsList,
  '{%footer%}': notes,
  '{%html_sticky_footer%}': stickyFooter,
};

let out = template;
for (const [key, value] of Object.entries(values)) {
  out = out.split(key).join(value);
}
/* <custom_field> is a Daftra-only tag; render it as a plain block in the browser. */
out = out.replace(/<custom_field /g, '<div ').replace(/<\/custom_field>/g, '</div>');

fs.writeFileSync(path.join(dir, 'contract-preview.html'), out);
console.log('wrote contract-preview.html');
