"""Package only verified, current campaign exports; never include local user data or keys."""
from pathlib import Path
import hashlib
import json
import struct
import zipfile

root = Path(__file__).resolve().parents[1]
assets = root / 'november'
data_bytes = (assets / 'data.json').read_bytes()
posts = json.loads(data_bytes)
manifest = json.loads((assets / 'assets-manifest.json').read_text())
assert manifest['sourceHash'] == hashlib.sha256(data_bytes).hexdigest(), 'Content changed: render the images again first.'
expected = {f"carousel-{p['day']:02}-{i:02}.png" for p in posts if 'carousel' in p for i in range(1, len(p['carousel']) + 1)}
assert expected == {item['file'] for item in manifest['slides']}, 'Carousel export coverage does not match the content.'
for name in sorted(expected) + [p['diagram'].replace('.svg', '.png') for p in posts if p['diagram']]:
    image = (assets / name).read_bytes()
    assert image[:8] == b'\x89PNG\r\n\x1a\n', name
    assert struct.unpack('>II', image[16:24]) == (1080, 1350), name

readme = '''مذاكراوي — حزمة نشر نوفمبر ٢٠٢٦

ابدأ بملف november-complete.md: الخطة، ٣٠ رسالة، الكبسولات، الستوري، نصوص الريلز وردود المشرفين.
schedule.csv سجل تحريري بتوقيت القاهرة. يحتاج مواءمة مع قالب منصة الجدولة؛ لا ينشر تلقائيًا.

مجلد carousels: ١٢ كاروسيل، ٧١ صورة PNG بمقاس 1080×1350.
كل مجلد يوم يحتوي على صور مرقمة حسب ترتيب رفعها، وكابشن جاهز، ومصدر HTML للعرض والتعديل.
ترتيب الرفع يبدأ بـ slide-01.png ثم 02 ثم 03. لا تعكس الترتيب بسبب اتجاه العربية.
مجلد november: ٨ مخططات PNG للنشر وSVG قابل للتعديل.
مجلد captions: نص البوست والكبسولة والستوري لكل يوم.

المحتوى يشجع الطالب على تنفيذ الموجود بالفعل في جدوله بأفضل أداء متاح، من غير إنشاء أو تعديل جدول، أو مهام كبيرة إضافية.
ابدأ برسالة تاريخ اليوم لو بدأت متأخرًا؛ احتفظ بالأيام السابقة في المكتبة ولا تنشرها دفعة واحدة.
الكاروسيل بديل للبوست النصي في نفس المنصة. لا حاجة لنشر كل الصيغ لنفس الجمهور معًا.
النصوص والرسومات تحرير محلي. لم يُنفذ توليد خارجي عبر Gemini لغياب المفتاح.
لا يُستخدم أي مفتاح أو بيانات طلاب في هذه الحزمة.
'''

def caption(p):
    return f"{p['date']} — {p['title']}\n\n{p['body']}\n\nكبسولة القناة:\n{p['capsule']}\n\nستوري اختياري:\n{p['story']}\n"

def add_carousel(archive, p, prefix=''):
    day = p['day']
    for i in range(1, len(p['carousel']) + 1):
        archive.write(assets / f'carousel-{day:02}-{i:02}.png', prefix + f'slide-{i:02}.png')
    archive.write(assets / f'carousel-{day:02}.html', prefix + 'editable-source.html')
    archive.writestr(prefix + 'caption.txt', caption(p))

for p in posts:
    if 'carousel' in p:
        with zipfile.ZipFile(assets / f"carousel-{p['day']:02}.zip", 'w', zipfile.ZIP_DEFLATED) as z:
            add_carousel(z, p)

bundle = assets / 'november-publishing-kit.zip'
bundle_md = (root / 'mozakrawi-november-2026-complete.md').read_text()
for post in posts:
    if 'carousel' in post:
        day = post['day']
        bundle_md = bundle_md.replace(
            f'[تحميل صور الكاروسيل كاملة — ZIP](november/carousel-{day:02}.zip)',
            f'[عرض شرائح الكاروسيل ومصدرها](carousels/day-{day:02}/editable-source.html)'
        )
with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('START-HERE.txt', readme)
    z.writestr('november-complete.md', bundle_md)
    z.write(assets / 'schedule.csv', 'schedule.csv')
    for p in posts:
        z.writestr(f"captions/day-{p['day']:02}.txt", caption(p))
        if 'carousel' in p:
            add_carousel(z, p, f"carousels/day-{p['day']:02}/")
        if p['diagram']:
            for ext in ['svg', 'png']:
                name = p['diagram'].replace('.svg', '.' + ext)
                # Match the Markdown links so the downloaded full plan remains navigable.
                z.write(assets / name, 'november/' + name)
with zipfile.ZipFile(bundle) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.startswith('carousels/') and n.endswith('.png')]) == len(expected)
    assert z.read('november-complete.md').decode() == bundle_md
    assert not any(name.endswith('.zip') for name in z.namelist())
    for post in posts:
        assert post['body'] in bundle_md
        if 'carousel' in post:
            assert f"carousels/day-{post['day']:02}/editable-source.html" in z.namelist()
print(f'Packaged 12 daily carousels and {len(expected)} slides. Complete kit: {bundle.stat().st_size / 1024 / 1024:.1f} MiB')
