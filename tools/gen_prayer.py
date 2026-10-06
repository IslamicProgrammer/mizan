#!/usr/bin/env python3
"""Prayer-section screens: timetable, month, qaza, qibla, prayer settings, log sheet."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gen_app import OUT, IC, page, bar, li, group, tiles, nav, CHEV, BACK

W = lambda n, s: (OUT / n).write_text(s, encoding="utf-8") or print("wrote", n)

# ---------------------------------------------------------------- timetable
day_nav = '''  <div class="daynav">
    <button type="button" aria-label="Kecha"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19 8 12l7-7"/></svg></button>
    <span class="d"><b>Bugun · 29-sentabr</b><s>7 Rabi' al-Thani 1448</s></span>
    <button type="button" aria-label="Ertaga"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
  </div>
'''
W("timetable.html", page("Namoz vaqtlari",
  bar("Namoz vaqtlari",
      right='<a class="ic" href="qibla.html" aria-label="Qibla"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5"/><path d="M15.5 8.5 13 13l-4.5 2.5L11 11z"/></svg></a>'
            '<a class="ic" href="month.html" aria-label="Oy"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></a>')
  + day_nav
  + group([
      li("fajr","Bomdod","05:36 da o'qildi",value="05:36",href="prayer-sheet.html"),
      li("sun_3d".replace("_3d",""),"Quyosh chiqishi",value="06:58",cls="dim"),
      li("dhuhr","Peshin","12:40 da o'qildi",value="12:25",href="prayer-sheet.html"),
      li("asr","Asr","hozir · 1s 12d qoldi",value="16:34",cls="on",href="prayer-sheet.html"),
      li("maghrib","Shom",value="18:36",href="prayer-sheet.html"),
      li("isha","Xufton",value="20:02",href="prayer-sheet.html"),
    ])
  + '  <div class="lbl">Qazo</div>\n'
  + group([li("calendar","Qazo namozlar","Bittadan qaytarib borasiz",right="14",chev=True,href="qaza.html")]),
  extra_css='''  .daynav{position:relative;margin:0 var(--gutter) 14px;display:flex;align-items:center;gap:10px;flex:none}
  .daynav button{width:34px;height:34px;border:0;border-radius:12px;background:var(--surface);
                 box-shadow:var(--lift);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink)}
  .daynav .d{flex:1;padding:8px;border-radius:14px;background:var(--surface);box-shadow:var(--lift);
             display:flex;flex-direction:column;align-items:center;gap:1px}
  .daynav .d b{font-size:14px;font-weight:700}
  .daynav .d s{font-size:11px;font-weight:500;color:var(--ink-soft);text-decoration:none}''',
  tab="timetable.html"))

# ---------------------------------------------------------------- month
full = ("#7E9B78", "#FFFDF7", "700"); part = ("#B7CBB2", "#33482F", "600")
none_ = ("#EDE2CE", "#9A8974", "600"); cyc = ("#F0DCDC", "#9E5757", "600")
today = ("#EFB55C", "#40290C", "800"); fut = ("#F6EFE3", "#C4B29A", "500")
pat = [full,full,part,full,full,full,none_, full,full,full,part,cyc,cyc,cyc,
       cyc,cyc,full,full,full,full,part, full,full,full,full,full,part,full, full,today]
cells = ['      <span class="c" style="background:transparent"></span>'] * 1
for i, (bg, col, wt) in enumerate(pat):
    cells.append(f'      <span class="c" style="background:{bg};color:{col};font-weight:{wt}">{i+1}</span>')
W("month.html", page("Oylik ko'rinish",
  bar("Sentabr 2026", back="timetable.html",
      right='<button class="ic" aria-label="Keyingi oy"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>')
  + '  <div class="cal">\n    <div class="dow">' + "".join(f"<span>{d}</span>" for d in "D S C P J Sh Y".split())
  + '</div>\n    <div class="grid">\n' + "\n".join(cells) + "\n    </div>\n  </div>\n"
  + '''  <div class="key">
    <span><i style="background:#7E9B78"></i>Besh vaqt</span>
    <span><i style="background:#B7CBB2"></i>Qisman</span>
    <span><i style="background:#EDE2CE"></i>Belgilanmagan</span>
    <span><i style="background:#F0DCDC"></i>Hayz kunlari</span>
  </div>
'''
  + tiles([("143","o'qilgan namoz"),("91%","muntazamlik"),("17","kunlik Bomdod")]),
  extra_css='''  .cal{position:relative;margin:0 var(--gutter);padding:18px 14px;border-radius:24px;
       background:var(--surface);box-shadow:var(--lift);flex:none}
  .dow{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:10px}
  .dow span{text-align:center;font-size:10.5px;font-weight:700;color:#A08B70}
  .grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
  .c{aspect-ratio:1;border-radius:13px;display:flex;align-items:center;justify-content:center;
     font-size:12.5px;font-variant-numeric:tabular-nums}
  .key{position:relative;margin:16px var(--gutter);display:flex;flex-wrap:wrap;gap:9px 14px;flex:none}
  .key span{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--ink-soft)}
  .key i{width:13px;height:13px;border-radius:5px;display:block}''',
  tab="timetable.html"))

# ---------------------------------------------------------------- qaza
W("qaza.html", page("Qazo namozlar",
  bar("Qazo namozlar", back="timetable.html")
  + '''  <div class="hero">
    <span class="k">Qolgan</span>
    <b>14</b>
    <span class="s">namoz · sentabrdan beri</span>
    <span class="track"><i style="width:62%"></i></span>
    <span class="s2">23 tasi qaytarildi · 62%</span>
  </div>
'''
  + '''  <div class="note">
    <img src="assets/icons/heart.png" alt="">
    <p>Bu qarz daftari emas. Har kuni bittadan qaytarsangiz ham, bu yaxshi.</p>
  </div>
'''
  + '  <div class="lbl">Namoz turi bo\'yicha</div>\n'
  + group([
      li("fajr","Bomdod",value="6",right='<button class="mk">Qaytardim</button>'),
      li("dhuhr","Peshin",value="2",right='<button class="mk">Qaytardim</button>'),
      li("asr","Asr","eng ko'p qolgani",value="5",right='<button class="mk">Qaytardim</button>'),
      li("maghrib","Shom",value="0",right='<span class="ok">Toza</span>'),
      li("isha","Xufton",value="1",right='<button class="mk">Qaytardim</button>'),
    ]),
  extra_css='''  .hero{position:relative;margin:4px var(--gutter) 0;padding:22px;border-radius:26px;
        background:var(--surface);box-shadow:var(--lift);display:flex;flex-direction:column;
        align-items:center;gap:4px;flex:none}
  .hero .k{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#A08B70}
  .hero b{font-size:60px;font-weight:900;line-height:1.05;letter-spacing:-2px;color:var(--ink-warm);
          font-variant-numeric:tabular-nums}
  .hero .s{font-size:13px;font-weight:600;color:var(--ink-soft)}
  .hero .track{width:100%;height:8px;border-radius:999px;background:rgba(80,50,15,.12);
               overflow:hidden;margin-top:12px}
  .hero .track i{display:block;height:100%;border-radius:999px;background:#7E9B78}
  .hero .s2{margin-top:6px;font-size:12px;font-weight:600;color:var(--ink-soft)}
  .note{position:relative;margin:14px var(--gutter) 0;padding:14px 16px;border-radius:20px;
        background:#EFF3EC;display:flex;gap:11px;align-items:flex-start;flex:none}
  .note img{width:24px;height:24px;flex:none}
  .note p{font-size:12.5px;line-height:1.55;font-weight:500;color:#4A5D46}
  .mk{padding:7px 13px;border:0;border-radius:12px;background:var(--ink-warm);color:#FBF3E6;
      font-family:'Onest',sans-serif;font-size:12px;font-weight:700;cursor:pointer}
  .ok{padding:7px 13px;border-radius:12px;background:#EFF3EC;color:#5F7D59;font-size:12px;font-weight:700}''',
  tab="timetable.html"))

print("prayer screens done")
