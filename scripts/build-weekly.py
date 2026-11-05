"""Build the eight November story posts and their Telegram publishing files."""
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
for p in posts:
    for key, value in p.items():
        if isinstance(value, str):
            p[key] = '\n'.join(line.rstrip() for line in value.split('\n'))
    p['post'] = (f"لسه ما خلصتش | {p['id']} من ٨\n{p['title']}\n\n{p['story']}"
                 f"\n\nلو الموقف ده شبهك:\n{p['solution']}\n\n{p['example']}"
                 f"\n\n{p['cliff']}\n\n#مذاكراوي")
    link = f"https://motivaion.muzakrawy.workers.dev/weekly/episode-{p['id']:02}.html"
    assert len((p['post'] + '\n\n' + link).encode('utf-16-le')) // 2 <= 4096
(out / 'episodes.json').write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n')

md = ['''# لسه ما خلصتش — بوستات نوفمبر ٢٠٢٦

٨ بوستات فقط. البداية الجمعة ٦ نوفمبر، ثم الاثنين والجمعة حتى الاثنين ٣٠ نوفمبر. موعد النشر المقترح ٨ مساءً بتوقيت القاهرة. هذه مواعيد نشر للفريق وليست جدول مذاكرة للطلاب.

سلمى ومريم صاحبتان في تالتة ثانوي. نتيجة امتحان تخلي سلمى تخبّي الورقة عن مامتها، بينما مريم بتسلّم واجبًا مش عارفة تشرح حله. خلال الشهر، مشاكلهم تتكشف في الدرس والبيت والمحادثات، ويحاولوا يتعاملوا معاها من غير تحولات مثالية أو نتيجة مضمونة.

## الشخصيات

- سلمى: ١٧ سنة، في تالتة ثانوي. بتذاكر، لكن الدرجة الوحشة بتخليها تخاف من السؤال اللي بعدها ومن كلام البيت.
- مريم: صاحبتها من أولى إعدادي. كشكولها مرتب، وبتتكسف تقول إنها مش فاهمة اللي كتبته.
- أمل: والدة سلمى، أم عاملة وقلقانة على بنتها. بتقارن وتسأل بطريقة توجعها، وبتحاول تسمع من غير ما خلافهم يختفي في مشهد واحد.

الشخصيات خيالية، والمواقف مركبة من أنماط عامة مسموح بمشاركتها دون أسماء. لا توجد رسائل خاصة أو اقتباسات منسوبة لطلاب حقيقيين.

## استخدام البوستات

كل TXT رسالة كاملة جاهزة لتليجرام، أقل من ٤٠٩٦ وحدة UTF-16 حتى بعد إضافة رابط المعاينة. القصة والحل والمثال والتشويق في نفس الرسالة. الصورة اختيارية. النص أطول من حد تعليق الصورة المعتاد؛ استخدم نسخ النص مع رابط المعاينة إذا أردت رسالة واحدة مع صورة، وفق إعدادات تليجرام. لا يوجد نشر تلقائي.

المطلوب من الطالب تنفيذ الموجود في جدوله بأفضل أداء متاح؛ لا إنشاء جدول أو تعديله ولا تكليف إضافي كبير.

## مواعيد البوستات

| البوست | التاريخ | اليوم | المشكلة |
|---|---|---|---|''']
for p in posts:
    day = datetime.date.fromisoformat(p['date']).weekday()
    assert day in (0, 4)
    weekday = 'الجمعة' if day == 4 else 'الاثنين'
    md.append(f"| {p['id']} | {p['date']} | {weekday} | {p['problem']} |")
for p in posts:
    i = f"{p['id']:02}"
    (out / f'episode-{i}.txt').write_text(p['post'] + '\n')
    canonical = f'https://motivaion.muzakrawy.workers.dev/weekly/episode-{i}.html'
    img = f'https://motivaion.muzakrawy.workers.dev/weekly/visual-{i}.png'
    page = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(p['title'])} | لسه ما خلصتش — مذاكراوي</title><meta property="og:type" content="article"><meta property="og:title" content="{html.escape(p['title'])}"><meta property="og:description" content="{html.escape(p['problem'])}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{img}"><meta property="og:image:alt" content="{html.escape(p['imageAlt'])}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="{canonical}"><link rel="stylesheet" href="/weekly/style.css"></head><body><header class="top"><a href="/weekly#episode-{p['id']}">مذاكراوي · بوستات نوفمبر وأدوات النشر</a><span>{p['date']}</span></header><main style="max-width:850px;padding-top:25px"><h1 style="font-size:32px">{html.escape(p['title'])}</h1><img src="/weekly/visual-{i}.png" alt="{html.escape(p['imageAlt'])}" style="width:100%;max-height:460px;object-fit:contain"><div class="post">{html.escape(p['post'])}</div><p><a href="/weekly#episode-{p['id']}">فتح البوست في منصة النشر</a></p></main></body></html>'''
    (out / f'episode-{i}.html').write_text(page)
    md.extend([f"\n## البوست {p['id']} — {p['date']}\n", p['post'],
               f"\n[الصورة الاختيارية](visual-{i}.png) · [النص الجاهز](episode-{i}.txt)\n"])
book = '\n'.join(md).rstrip() + '\n'
(out / 'november-2026.md').write_text(book)
(out / 'season.md').write_text(book)  # Preserve existing download links.
with (out / 'schedule.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, lineterminator='\n')
    writer.writerow(['episode', 'date', 'weekday', 'time', 'timezone', 'title', 'problem', 'text_file', 'image', 'status'])
    for p in posts:
        weekday = 'Friday' if datetime.date.fromisoformat(p['date']).weekday() == 4 else 'Monday'
        writer.writerow([p['id'], p['date'], weekday, p['time'], p['timezone'], p['title'], p['problem'],
                         f"episode-{p['id']:02}.txt", f"visual-{p['id']:02}.png", 'draft'])
with zipfile.ZipFile(out / 'season.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ['november-2026.md', 'schedule.csv'] + [f"episode-{p['id']:02}.txt" for p in posts]:
        archive.write(out / name, name)
    archive.writestr('IMAGES.txt', 'الصور متاحة للتحميل منفردة من منصة النشر:\nhttps://motivaion.muzakrawy.workers.dev/weekly\n')
print('Built eight complete November posts, preview pages, text bundle and Monday/Friday calendar.')
