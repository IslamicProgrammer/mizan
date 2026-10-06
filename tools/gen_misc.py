#!/usr/bin/env python3
"""Charity, stats, settings and the two full-screen Fajr moments."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gen_app import OUT, IC, page, bar, li, group, tiles, STATUS

W = lambda n, s: (OUT / n).write_text(s, encoding="utf-8") or print("wrote", n)
TG = lambda on: f'<span class="tg{" on" if on else ""}"><i></i></span>'

# ---------------------------------------------------------------- charity promise
W("charity-promise.html", page("Ehson",
  bar("Ehson")
  + '''  <div class="vow">
    <img src="assets/icons/heart.png" alt="">
    <b>100%</b>
    <span class="s">sof foydamiz xayriyaga</span>
    <span class="s2">Har oy ochiq hisobot, hujjat va cheklar bilan</span>
  </div>
'''
  + '  <div class="lbl">Sof foyda qanday hisoblanadi</div>\n'
  + group([
      li(None,"Obunalardan tushgan daromad",right="+"),
      li(None,"Google Play komissiyasi",right="−",cls="dim"),
      li(None,"Server va xizmatlar",right="−",cls="dim"),
      li(None,"Soliqlar va rasmiy to'lovlar",right="−",cls="dim"),
      li(None,"Xodimlar ish haqi",right="−",cls="dim"),
      li("heart","Qolgani to'liq xayriyaga",right="="),
    ])
  + '''  <div class="fine">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4E6480" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/></svg>
    <p>Biz <b>daromadning</b> emas, <b>sof foydaning</b> 100% deymiz. Bu farq muhim va biz uni yashirmaymiz.</p>
  </div>
'''
  + '  <div style="margin:16px var(--gutter) 0;flex:none"><a class="act ghost" href="charity-zero.html">Oylik hisobotlar</a></div>\n',
  extra_css='''  .vow{position:relative;margin:4px var(--gutter) 0;padding:24px;border-radius:26px;
       background:linear-gradient(155deg,#F6E0E0,#ECC9C9);box-shadow:var(--lift-hi);
       display:flex;flex-direction:column;align-items:center;gap:4px;flex:none}
  .vow img{width:48px;height:48px}
  .vow b{margin-top:8px;font-size:44px;font-weight:900;line-height:1;letter-spacing:-1.6px;color:#6E3838}
  .vow .s{font-size:15px;font-weight:700;color:#844646}
  .vow .s2{margin-top:4px;font-size:12.5px;font-weight:500;color:#8A5B5B;text-align:center}
  .fine{position:relative;margin:14px var(--gutter) 0;padding:14px 16px;border-radius:19px;
        background:#F0F2F5;display:flex;gap:11px;align-items:flex-start;flex:none;
        font-size:12.5px;line-height:1.55;font-weight:500;color:#55657A}
  .fine svg{flex:none;margin-top:1px}
  .fine p{flex:1}
  .fine b{color:#2E3E52;font-weight:700}''',
  tab="charity-promise.html"))

# ---------------------------------------------------------------- charity zero
W("charity-zero.html", page("Oylik hisobotlar",
  bar("Oylik hisobotlar", back="charity-promise.html")
  + '''  <div class="zero">
    <span class="mk"><img src="assets/icons/calendar.png" alt=""></span>
    <b>$0</b>
    <span class="s">hozircha berilgan</span>
    <span class="s2">Ilova endi ishga tushdi. Hali daromad yo'q, demak taqsimlanadigan foyda ham yo'q.</span>
  </div>
'''
  + '''  <div class="soon">
    <img src="assets/icons/bell.png" alt="">
    <span class="l"><b>Birinchi hisobot: dekabr 2026</b>
    <s>Har oyning 5-sanasida oldingi oy hisoboti e'lon qilinadi.</s></span>
  </div>
'''
  + '  <div class="lbl">Shu paytgacha nima qilindi</div>\n'
  + group([
      li("check","Hisoblash usuli e'lon qilindi","Sof foyda qanday hisoblanishi yozib qo'yilgan"),
      li("check","Xayriya hamkori tanlanmoqda","Hujjat va chek bera oladigan tashkilot kerak"),
      li("calendar","Birinchi hisobot","Dekabr oyi yakunlangach",cls="dim"),
    ])
  + '''  <div class="fine">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4E6480" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/></svg>
    <p>Nol ko'rsatish bizga yoqmaydi, lekin yashirishdan ko'ra halolroq.</p>
  </div>
''',
  extra_css='''  .zero{position:relative;margin:4px var(--gutter) 0;padding:26px 22px;border-radius:26px;
        background:var(--surface);box-shadow:var(--lift);display:flex;flex-direction:column;
        align-items:center;gap:6px;flex:none}
  .zero .mk{width:56px;height:56px;border-radius:19px;background:rgba(80,50,15,.07);
            display:flex;align-items:center;justify-content:center}
  .zero .mk img{width:30px;height:30px}
  .zero b{margin-top:8px;font-size:48px;font-weight:900;line-height:1;letter-spacing:-1.8px;color:var(--ink-warm)}
  .zero .s{font-size:14px;font-weight:700;color:var(--ink-soft)}
  .zero .s2{margin-top:6px;font-size:12.5px;line-height:1.6;font-weight:500;color:var(--ink-soft);text-align:center}
  .soon{position:relative;margin:14px var(--gutter) 0;padding:16px;border-radius:22px;
        background:linear-gradient(155deg,#FCEBC7,#F5D699);box-shadow:var(--lift-hi);
        display:flex;gap:13px;align-items:flex-start;flex:none}
  .soon img{width:30px;height:30px;flex:none}
  .soon .l{flex:1;display:flex;flex-direction:column;gap:4px}
  .soon .l b{font-size:14.5px;font-weight:800;color:#40290C}
  .soon .l s{font-size:12.5px;line-height:1.55;font-weight:600;color:#8A5A11;text-decoration:none}
  .fine{position:relative;margin:14px var(--gutter) 0;padding:14px 16px;border-radius:19px;
        background:#F0F2F5;display:flex;gap:11px;align-items:flex-start;flex:none;
        font-size:12.5px;line-height:1.55;font-weight:500;color:#55657A}
  .fine svg{flex:none;margin-top:1px}
  .fine p{flex:1}''',
  tab="charity-promise.html"))

# ---------------------------------------------------------------- charity report
W("charity-report.html", page("Mart 2027",
  bar("Mart 2027", back="charity-zero.html",
      right='<button class="ic" aria-label="Ulashish"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg></button>')
  + group([
      li(None,"Daromad",value="$4 180"),
      li(None,"Google Play komissiyasi",value="−$627",cls="dim"),
      li(None,"Server va xizmatlar",value="−$312",cls="dim"),
      li(None,"Soliqlar",value="−$498",cls="dim"),
      li(None,"Sof foyda",value="$1 743"),
    ])
  + '''  <div class="gave">
    <img src="assets/icons/heart.png" alt="">
    <span class="l"><span class="k">Xayriyaga berildi</span><b>$1 743</b><s>Sof foydaning 100%</s></span>
  </div>
'''
  + '  <div class="lbl">Qayerga berildi</div>\n'
  + group([
      li("gift","Oziq-ovqat yordami","Mehr-shafqat jamg'armasi · 12-mart",value="$520"),
      li("droplet","Toza suv","Quduq loyihasi · 19-mart",value="$430"),
      li("book","Ta'lim","Maktab jihozlari · 26-mart",value="$393"),
    ])
  + '  <div style="margin:14px var(--gutter) 0;flex:none"><a class="act ghost" href="#">3 ta chekni ko\'rish</a></div>\n',
  extra_css='''  .gave{position:relative;margin:14px var(--gutter) 0;padding:20px;border-radius:24px;
        background:linear-gradient(155deg,#F6E0E0,#ECC9C9);box-shadow:var(--lift-hi);
        display:flex;align-items:center;gap:15px;flex:none}
  .gave img{width:44px;height:44px;flex:none}
  .gave .l{display:flex;flex-direction:column;gap:2px}
  .gave .k{font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#A06C6C}
  .gave b{font-size:30px;font-weight:900;line-height:1.1;letter-spacing:-1px;color:#6E3838}
  .gave s{font-size:12px;font-weight:700;color:#844646;text-decoration:none}''',
  tab="charity-promise.html"))

# ---------------------------------------------------------------- stats
def br(k, pct, warn=False):
    w = " warn" if warn else ""
    return (f'    <span class="br"><span class="k">{k}</span>'
            f'<span class="t"><i class="{w.strip()}" style="width:{pct}%"></i></span>'
            f'<span class="p{w}">{pct}%</span></span>')

W("stats.html", page("Statistika",
  bar("Statistika", back="home.html")
  + '''  <div class="seg"><button class="">Hafta</button><button class="on">Oy</button><button>Yil</button></div>
'''
  + '''  <div class="ring">
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="48" r="40" stroke="rgba(255,253,247,.55)" stroke-width="11"/>
      <circle cx="48" cy="48" r="40" stroke="#8A5A11" stroke-width="11" stroke-linecap="round"
              stroke-dasharray="251" stroke-dashoffset="23" transform="rotate(-90 48 48)"/>
    </svg>
    <span class="pc">91%</span>
    <span class="l"><b>Sentabr muntazamligi</b><s>143 / 157 namoz</s><em>avgustdan +6%</em></span>
  </div>
'''
  + '  <div class="lbl">Namoz bo\'yicha</div>\n'
  + '  <div class="bars">\n' + "\n".join([br("Bomdod",84),br("Peshin",97),br("Asr",78,True),
                                          br("Shom",100),br("Xufton",92)]) + "\n  </div>\n"
  + '<div style="height:14px;flex:none"></div>'
  + tiles([("17","kunlik Bomdod"),("8s 20d","fokus vaqti")]),
  extra_css='''  .ring{position:relative;margin:14px var(--gutter) 0;padding:20px;border-radius:26px;
        background:linear-gradient(155deg,#FCEBC7,#F3C87E);box-shadow:var(--lift-hi);
        display:flex;align-items:center;gap:16px;flex:none}
  .ring svg{flex:none}
  .ring .pc{position:absolute;left:68px;top:50%;transform:translate(-50%,-50%);
            font-size:21px;font-weight:800;color:#40290C}
  .ring .l{display:flex;flex-direction:column;gap:3px}
  .ring .l b{font-size:16px;font-weight:800;color:#40290C}
  .ring .l s{font-size:12.5px;font-weight:600;color:#8A5A11;text-decoration:none}
  .ring .l em{font-size:12px;font-style:normal;font-weight:600;color:#8A6222}'''))

print("charity + stats done")
