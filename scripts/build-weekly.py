from pathlib import Path
import json,datetime,html,csv
root=Path(__file__).resolve().parents[1];out=root/'weekly';posts=json.loads((out/'episodes.json').read_text())
alts=['باب مضيء داخل ورقة مطوية؛ العودة لخطوة حاضرة بدل حمل النتيجة كلها','مفتاح يطابق فتحة في صفحة؛ فهم سبب اختيار أول خطوة','دفتر في الضوء وهاتف على رف بعيد؛ استخدام الأداة ثم العودة للمهمة','شكل يظهر من تحت بطاقة؛ محاولة الاسترجاع ثم كشف الإجابة','كرسيان متقابلان بينهما مساحة وكلام هادئ؛ طلب مساحة للفهم','مصباح يستريح وقوس شمس هادئ؛ الراحة ليست ذنبًا','مسارات متعددة تتجمع في طريق واحد إلى الكتاب؛ تحديد موضع التعثر','عدسة تكشف فجوة صغيرة في مسار؛ معرفة سبب الخطأ','موطئ قدم مضيء وأفق غير واضح؛ العمل بالحاضر دون ضمان المستقبل','خيط ينقطع ثم يعود متصلًا؛ التعطل لا يمحو ما تعلمته','جسر يستند لدعامة مساعدة؛ طلب الدعم لاستكمال المهمة','كتاب مفتوح وصفحة هادئة تستقبل ضوءًا جديدًا؛ استمرار التعلم']
for p,alt in zip(posts,alts):
 p['imageAlt']=alt
 for key,value in p.items():
  if isinstance(value,str):p[key]='\n'.join(line.rstrip() for line in value.split('\n'))
(out/'episodes.json').write_text(json.dumps(posts,ensure_ascii=False,indent=2))
md=['# هوامش على كتاب مستعمل — النسخة الأسبوعية الجديدة\n\nالموسم الأول: ١٢ حلقة. كل جمعة الساعة ٨ مساءً بتوقيت القاهرة، من ٦ نوفمبر ٢٠٢٦ إلى ٢٢ يناير ٢٠٢٧. نوفمبر: ٦، ١٣، ٢٠، ٢٧ فقط.\n\nهذه النسخة تحل محل إيقاع الرواية السابق في واجهة القراءة الجديدة. الشخصيات خيالية والمواقف مركبة، وليست نقلًا حرفيًا لرسائل الطلاب. لا يُطلب من الطالب إنشاء جدول أو تعديله أو زيادة تكليف كبير. كل حل داخل المهمة الموجودة، مع مراعاة التعب والحاجة للدعم.\n\n## الشخصيات\n\n- سلمى: طالبة ١٧ سنة تخفي ورقة امتحان؛ تتعلم وصف موضع التعثر بدل الحكم على نفسها.\n- مريم: صديقتها ذات الصورة المتفوقة؛ تتعلم إظهار السؤال وطلب المساعدة.\n- نادية: جدة سلمى، أمينة مكتبة سابقة؛ تعرف عمر ولا تستعجل كشف كل الماضي.\n- عمر: صاحب هوامش سنة ٢٠٠٨؛ يظهر لاحقًا مرمم كتب، دون تحويل قصته لوعد بمجموع أو مهنة.\n- نبيل: بائع الكتب ووالد عمر. والد سلمى شخصية مساندة يتعلم السؤال دون مقارنة.\n\n## النشر\n\nكل ملف TXT بوست كامل واحد أقل من ٤٠٩٦ وحدة UTF-16، شامل الحل والمثال والتشويق. الصورة اختيارية. لبوست واحد بصري، انسخ النص مع رابط صفحة الحلقة كي يظهر رابط المعاينة وفق إعدادات تليجرام. لا تستخدم النص الكامل ككابشن عادي لصورة؛ حد الكابشن المعتاد أقصر. لا يوجد نشر آلي. تاريخ النشر هو موعد للفريق وليس جدولًا للمذاكرة.\n\n## التقويم\n\n| الحلقة | الجمعة | المشكلة |\n|---|---|---|']
for p in posts:
 date=datetime.date.fromisoformat(p['date']);assert date.weekday()==4;assert len(p['post'].encode('utf-16-le'))//2<4096
 md.append(f"| {p['id']} | {p['date']} | {p['problem']} |")
for p in posts:
 i=f"{p['id']:02}";(out/f'episode-{i}.txt').write_text(p['post']+'\n')
 canonical=f'https://motivaion.muzakrawy.workers.dev/weekly/episode-{i}.html';img=f'https://motivaion.muzakrawy.workers.dev/weekly/visual-{i}.png'
 page=f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(p['title'])} | هوامش مذاكراوي</title><meta property="og:type" content="article"><meta property="og:title" content="{html.escape(p['title'])}"><meta property="og:description" content="{html.escape(p['problem'])}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{img}"><meta property="og:image:alt" content="{html.escape(p['imageAlt'])}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="{canonical}"><link rel="stylesheet" href="/weekly/style.css"></head><body><header class="top"><a href="/weekly#episode-{p['id']}">مذاكراوي · كل الحلقات وأدوات النشر</a><span>{p['date']}</span></header><main style="max-width:850px;padding-top:25px"><h1 style="font-size:32px">{html.escape(p['title'])}</h1><img src="/weekly/visual-{i}.png" alt="{html.escape(p['imageAlt'])}" style="width:100%;max-height:460px;object-fit:contain"><div class="post">{html.escape(p['post'])}</div><p><a href="/weekly#episode-{p['id']}">فتح الحلقة في منصة النشر</a></p></main></body></html>'''
 (out/f'episode-{i}.html').write_text(page);md.extend([f"\n## الحلقة {p['id']} — {p['date']}\n",p['post'],f"\n[الصورة الاختيارية](visual-{i}.png) · [النص الجاهز](episode-{i}.txt)\n"])
(out/'season.md').write_text('\n'.join(md))
with (out/'schedule.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f,lineterminator="\n");w.writerow(['episode','date','weekday','time','timezone','title','problem','text_file','image','status'])
 for p in posts:w.writerow([p['id'],p['date'],'Friday',p['time'],p['timezone'],p['title'],p['problem'],f"episode-{p['id']:02}.txt",f"visual-{p['id']:02}.png",'draft'])
print('Prepared 12 Friday episodes, Telegram TXT, preview pages and publishing calendar.')
import zipfile
with zipfile.ZipFile(out/'season.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for name in ['season.md','schedule.csv']+[f"episode-{p['id']:02}.txt" for p in posts]:archive.write(out/name,name)
 archive.writestr('IMAGES.txt','الصور متاحة للتحميل منفردة من منصة هوامش:\nhttps://motivaion.muzakrawy.workers.dev/weekly\n')
