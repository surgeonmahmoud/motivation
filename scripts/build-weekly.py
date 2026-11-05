"""Build seven November problem-solving posts and one standalone story and their Telegram publishing files."""
from pathlib import Path
import csv
import datetime
import html
import json
import zipfile

root = Path(__file__).resolve().parents[1]
out = root / 'weekly'
posts = json.loads((out / 'episodes.json').read_text())
expected_dates = [f'2026-11-{day:02}' for day in (6, 9, 13, 16, 20, 23, 27, 30)]
assert [p['date'] for p in posts] == expected_dates
assert [p['kind'] for p in posts].count('advice') == 7
assert [p['kind'] for p in posts].count('story') == 1
for p in posts:
    for key, value in p.items():
        if isinstance(value, str):
            p[key] = '\n'.join(line.rstrip() for line in value.split('\n'))
    p['post'] = '\n\n'.join([p['title'], p['intro'], p['solution'], p['example'], p['closing'], '#مذاكراوي'])
    link = f"https://motivaion.muzakrawy.workers.dev/weekly/episode-{p['id']:02}.html"
    assert len((p['post'] + '\n\n' + link).encode('utf-16-le')) // 2 <= 4096
(out / 'episodes.json').write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n')

md = ['''# مشكلة وحل — بوستات نوفمبر ٢٠٢٦

٨ بوستات: ٧ بوستات مباشرة عن المشكلات المتكررة وحلولها، وبوست قصصي مستقل واحد في نهاية الشهر. لا سلسلة روائية ولا حلقات تحتاج قراءة ما قبلها.

البداية الجمعة ٦ نوفمبر، ثم الاثنين والجمعة حتى الاثنين ٣٠ نوفمبر، الساعة ٨ مساءً بتوقيت القاهرة. هذه مواعيد نشر للفريق وليست جدول مذاكرة للطلاب.

## اختيار الموضوعات

استند اختيار الموضوعات إلى ١٠٠ رسالة معلّمة «عام من غير اسمي». حسب تصنيف المصدر: التشتت والموبايل ١١، اختيار المدرسين والسناتر ١١، التنظيم والجدول ١١، الحفظ والنسيان ٨، النوم ٧، صعوبة البداية ٦، والحل والفهم مجتمعان ٦ (٣ + ٣). توجد ٢٣ رسالة غير مصنفة؛ لذلك الأرقام تخص التصنيفات المسجلة، وليست ترتيبًا نهائيًا لكل المشكلات ولا إحصاءً لكل الطلاب. استُخدمت الرسائل العامة غير المصنفة لفهم السياق دون اختراع عدّ جديد لها.

تُعالج شكاوى التنظيم بتحسين تنفيذ المهمة الحالية، لا بإنشاء جدول أو تعديله. الأمثلة مكتوبة من جديد، لا اقتباسات منسوبة لطلاب. القصة الأخيرة تخيلية ومستقلة. ملف الطلاب الأصلي وبياناتهم الشخصية والرسائل الخاصة غير منشورة.

## استخدام البوستات

كل TXT رسالة كاملة جاهزة لتليجرام، أقل من ٤٠٩٦ وحدة UTF-16 مع رابط المعاينة. الصورة اختيارية. النصوص أطول من حد تعليق الصورة المعتاد؛ استخدم نسخ النص مع رابط المعاينة إذا أردت رسالة واحدة مع صورة، وفق إعدادات تليجرام. لا يوجد نشر تلقائي.

المطلوب من الطالب تنفيذ الموجود في جدوله بأفضل أداء متاح؛ لا إنشاء جدول أو تعديله ولا إضافة تكليف كبير.

## مواعيد البوستات

| البوست | التاريخ | اليوم | النوع | المشكلة |
|---|---|---|---|---|''']
for p in posts:
    day = datetime.date.fromisoformat(p['date']).weekday()
    assert day in (0, 4)
    weekday = 'الجمعة' if day == 4 else 'الاثنين'
    kind = "قصة الشهر" if p["kind"] == "story" else "مشكلة وحل"
    md.append(f"| {p['id']} | {p['date']} | {weekday} | {kind} | {p['problem']} |")
for p in posts:
    i = f"{p['id']:02}"
    (out / f'episode-{i}.txt').write_text(p['post'] + '\n')
    canonical = f'https://motivaion.muzakrawy.workers.dev/weekly/episode-{i}.html'
    image_id = f"{p['imageId']:02}"
    img = f'https://motivaion.muzakrawy.workers.dev/weekly/visual-{image_id}.png'
    page = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(p['title'])} | مشكلة وحل — مذاكراوي</title><meta property="og:type" content="article"><meta property="og:title" content="{html.escape(p['title'])}"><meta property="og:description" content="{html.escape(p['problem'])}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{img}"><meta property="og:image:alt" content="{html.escape(p['imageAlt'])}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="{canonical}"><link rel="stylesheet" href="/weekly/style.css"></head><body><header class="top"><a href="/weekly#episode-{p['id']}">مذاكراوي · بوستات نوفمبر وأدوات النشر</a><span>{p['date']}</span></header><main style="max-width:850px;padding-top:25px"><h1 style="font-size:32px">{html.escape(p['title'])}</h1><img src="/weekly/visual-{image_id}.png" alt="{html.escape(p['imageAlt'])}" style="width:100%;max-height:460px;object-fit:contain"><div class="post">{html.escape(p['post'])}</div><p><a href="/weekly#episode-{p['id']}">فتح البوست في منصة النشر</a></p></main></body></html>'''
    (out / f'episode-{i}.html').write_text(page)
    md.extend([f"\n## البوست {p['id']} — {p['date']}\n", p['post'],
               f"\n[الصورة الاختيارية](visual-{image_id}.png) · [النص الجاهز](episode-{i}.txt)\n"])
book = '\n'.join(md).rstrip() + '\n'
(out / 'november-2026.md').write_text(book)
(out / 'season.md').write_text(book)  # Preserve existing download links.
with (out / 'schedule.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, lineterminator='\n')
    writer.writerow(['episode', 'date', 'weekday', 'time', 'timezone', 'kind', 'title', 'problem', 'text_file', 'image', 'status'])
    for p in posts:
        weekday = 'Friday' if datetime.date.fromisoformat(p['date']).weekday() == 4 else 'Monday'
        writer.writerow([p['id'], p['date'], weekday, p['time'], p['timezone'], p['kind'], p['title'], p['problem'],
                         f"episode-{p['id']:02}.txt", f"visual-{p['imageId']:02}.png", 'draft'])
with zipfile.ZipFile(out / 'season.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ['november-2026.md', 'schedule.csv'] + [f"episode-{p['id']:02}.txt" for p in posts]:
        archive.write(out / name, name)
    archive.writestr('IMAGES.txt', 'الصور متاحة للتحميل منفردة من منصة النشر:\nhttps://motivaion.muzakrawy.workers.dev/weekly\n')
print('Built eight complete November posts, preview pages, text bundle and Monday/Friday calendar.')
