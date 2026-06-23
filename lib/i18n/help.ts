import { type Lang } from './translations'

type LangContent = { title: string; steps: string[] }
type PageData = Record<Lang, LangContent>

const HELP: Record<string, PageData> = {
  '/dashboard': {
    sl: { title: 'Nadzorna plošča', steps: ['Pregled celotnega inventarja: skupno orodij, aktivne izposoje in opozorila o nizki zalogi.', 'V razdelku "Trenutno izposojeno" vidite, katera orodja so pri delavcih.', 'Opozorila o nizki zalogi vas opominjajo, kdaj je treba naročiti material.'] },
    sr: { title: 'Kontrolna tabla', steps: ['Pregled celokupnog inventara: ukupan broj alata, aktivne posudbe i upozorenja o niskoj zalihi.', 'U odeljku "Trenutno posuđeno" vidite koji alati su kod radnika.', 'Upozorenja o niskoj zalihi podsećaju vas kada treba naručiti materijal.'] },
    sq: { title: 'Paneli kryesor', steps: ['Pasqyrë e inventarit: gjithsej mjete, huazime aktive dhe alarme stoku të ulët.', 'Tek "Aktualisht i huazuar" shihni cilat mjete janë te punëtorët.', 'Alarmet e stokut të ulët kujtojnë kur duhet porositur material.'] },
    tr: { title: 'Ana Sayfa', steps: ['Envanter özeti: toplam araç sayısı, aktif ödünçler ve düşük stok uyarıları.', '"Şu an ödünç alınanlar" bölümünde hangi araçların işçilerde olduğunu görürsünüz.', 'Düşük stok uyarıları ne zaman malzeme sipariş edilmesi gerektiğini hatırlatır.'] },
    mk: { title: 'Контролна табла', steps: ['Преглед на инвентар: вкупно алати, активни позајмици и предупредувања за ниска залиха.', 'Во „Моментално позајмено" гледате кои алати се кај работниците.', 'Предупредувањата за ниска залиха потсетуваат кога треба да се нарача материјал.'] },
    hi: { title: 'डैशबोर्ड', steps: ['इन्वेंट्री का अवलोकन: कुल उपकरण, सक्रिय चेकआउट और कम स्टॉक अलर्ट।', '"वर्तमान में चेकआउट" में देखें कौन से उपकरण कर्मचारियों के पास हैं।', 'कम स्टॉक अलर्ट बताते हैं कब सामग्री ऑर्डर करनी है।'] },
    en: { title: 'Dashboard', steps: ['Overview of your inventory: total tools, active checkouts, and low stock alerts.', '"Currently checked out" shows which tools are with workers right now.', 'Low stock alerts remind you when to reorder materials.'] },
  },

  '/tools': {
    sl: { title: 'Orodja & material', steps: ['Brskajte in iščite po vseh orodjih in materialih v inventarju.', 'Filtrirajte po kategoriji ali vrsti predmeta (orodje / material).', 'Kliknite "Izposodi" ali "Vzemi" za jemanje predmeta iz zaloge.', 'Kliknite na ime orodja za podrobnosti, historijo in QR kodo.', 'Administratorji dodajajo nova orodja z gumbom "Dodaj orodje".'] },
    sr: { title: 'Alati i materijal', steps: ['Pregledajte i pretražujte sve alate i materijale u inventaru.', 'Filtrirajte po kategoriji ili tipu (alat / materijal).', 'Kliknite "Posudi" ili "Uzmi" za uzimanje predmeta iz zalihe.', 'Kliknite na naziv alata za detalje, istoriju i QR kod.', 'Administratori dodaju nove alate dugmetom "Dodaj alat".'] },
    sq: { title: 'Mjetet & materiali', steps: ['Shfletoni dhe kërkoni të gjitha mjetet dhe materialet në inventar.', 'Filtroni sipas kategorisë ose llojit (mjet / material).', 'Klikoni "Huazo" ose "Merr" për të marrë një send nga stoku.', 'Klikoni emrin e mjetit për detaje, historik dhe kodin QR.', 'Administratorët shtojnë mjete të reja me butonin "Shto mjet".'] },
    tr: { title: 'Araçlar ve malzeme', steps: ['Envanterdeki tüm araç ve malzemeleri inceleyin ve arayın.', 'Kategoriye veya türe (araç / malzeme) göre filtreleyin.', 'Bir öğeyi stoktan almak için "Ödünç al" veya "Al" düğmesine tıklayın.', 'Detaylar, geçmiş ve QR kodu için araç adına tıklayın.', 'Yöneticiler "Araç ekle" düğmesiyle yeni araçlar ekler.'] },
    mk: { title: 'Алати и материјал', steps: ['Прелистувајте и пребарувајте ги сите алати и материјали во инвентарот.', 'Филтрирајте по категорија или тип (алат / материјал).', 'Кликнете „Позајми" или „Земи" за земање предмет од залиха.', 'Кликнете на името на алатот за детали, историја и QR код.', 'Администраторите додаваат нови алати со копчето „Додај алат".'] },
    hi: { title: 'उपकरण और सामग्री', steps: ['इन्वेंट्री में सभी उपकरणों और सामग्रियों को ब्राउज़ और खोजें।', 'श्रेणी या प्रकार (उपकरण / सामग्री) के अनुसार फ़िल्टर करें।', 'स्टॉक से आइटम लेने के लिए "चेकआउट" या "ले जाएं" पर क्लिक करें।', 'विवरण, इतिहास और QR कोड के लिए उपकरण नाम पर क्लिक करें।', 'प्रशासक "उपकरण जोड़ें" बटन से नए उपकरण जोड़ते हैं।'] },
    en: { title: 'Tools & Materials', steps: ['Browse and search all tools and materials in the inventory.', 'Filter by category or type (tool / material).', 'Click "Check out" or "Take" to borrow an item from stock.', 'Click a tool name to see details, checkout history, and its QR code.', 'Admins can add new tools using the "Add tool" button.'] },
  },

  '/tools/new': {
    sl: { title: 'Dodaj orodje / material', steps: ['Vnesite ime, kategorijo in izberite vrsto: orodje ali material.', 'Nastavite skupno zalogo in minimalno zalogo za opozorila o nizki zalogi.', 'Neobvezno naložite sliko orodja.', 'Po shranjevanju se orodju samodejno ustvari edinstvena QR koda.'] },
    sr: { title: 'Dodaj alat / materijal', steps: ['Unesite naziv, kategoriju i izaberite tip: alat ili materijal.', 'Postavite ukupnu zalihu i minimalnu zalihu za upozorenja.', 'Opcionalno dodajte fotografiju alata.', 'Nakon čuvanja automatski se generiše jedinstveni QR kod.'] },
    sq: { title: 'Shto mjet / material', steps: ['Vendosni emrin, kategorinë dhe zgjidhni llojin: mjet ose material.', 'Caktoni stokun total dhe stokun minimal për alarme.', 'Opsionalisht ngarkoni fotografi të mjetit.', 'Pas ruajtjes gjenerohet automatikisht një kod QR unik.'] },
    tr: { title: 'Araç / malzeme ekle', steps: ['Adı ve kategoriyi girin, türü seçin: araç veya malzeme.', 'Toplam stok ve uyarılar için minimum stok seviyesini ayarlayın.', 'İsteğe bağlı olarak araç fotoğrafı yükleyin.', 'Kaydettikten sonra benzersiz bir QR kodu otomatik olarak oluşturulur.'] },
    mk: { title: 'Додај алат / материјал', steps: ['Внесете го името, категоријата и изберете тип: алат или материјал.', 'Поставете вкупна залиха и минимална залиха за предупредувања.', 'Опционално прикачете слика на алатот.', 'По зачувувањето автоматски се генерира единствен QR код.'] },
    hi: { title: 'उपकरण / सामग्री जोड़ें', steps: ['नाम, श्रेणी दर्ज करें और प्रकार चुनें: उपकरण या सामग्री।', 'कुल स्टॉक और अलर्ट के लिए न्यूनतम स्टॉक स्तर सेट करें।', 'वैकल्पिक रूप से उपकरण की फोटो अपलोड करें।', 'सहेजने के बाद एक अनूठा QR कोड स्वचालित रूप से बन जाता है।'] },
    en: { title: 'Add Tool / Material', steps: ['Enter the name and category, then choose the type: tool or material.', 'Set total stock and the minimum stock level for low-stock alerts.', 'Optionally upload a photo of the tool.', 'After saving, a unique QR code is automatically generated.'] },
  },

  '/tools/[id]': {
    sl: { title: 'Podrobnosti orodja', steps: ['Pregled zaloge, QR kode in celotne historije izposoj orodja.', 'Kliknite "Izposodi" ali "Vzemi" za jemanje orodja iz zaloge.', 'QR kodo natisnite in prilepite na fizično orodje za hitro skeniranje.', 'Administratorji lahko uredijo podatke orodja ali ga deaktivirajo.'] },
    sr: { title: 'Detalji alata', steps: ['Pregled zalihe, QR koda i kompletne istorije posudbi alata.', 'Kliknite "Posudi" ili "Uzmi" za uzimanje alata iz zalihe.', 'Odštampajte QR kod i zalepite ga na fizički alat za brzo skeniranje.', 'Administratori mogu urediti podatke alata ili ga deaktivirati.'] },
    sq: { title: 'Detajet e mjetit', steps: ['Shikoni stokun, kodin QR dhe historikun e plotë të huazimeve.', 'Klikoni "Huazo" ose "Merr" për të marrë mjetin nga stoku.', 'Printoni kodin QR dhe ngjiteni mbi mjetin fizik për skanim të shpejtë.', 'Administratorët mund të modifikojnë të dhënat ose ta çaktivizojnë mjetin.'] },
    tr: { title: 'Araç Detayları', steps: ['Aracın stok seviyesini, QR kodunu ve tüm ödünç geçmişini görüntüleyin.', 'Araçı stoktan almak için "Ödünç al" veya "Al" düğmesine tıklayın.', 'QR kodu yazdırın ve hızlı tarama için fiziksel araca yapıştırın.', 'Yöneticiler araç verilerini düzenleyebilir veya aracı devre dışı bırakabilir.'] },
    mk: { title: 'Детали на алатот', steps: ['Преглед на залиха, QR код и целосна историја на позајмици.', 'Кликнете „Позајми" или „Земи" за земање на алатот.', 'Испечатете го QR кодот и залепете го на физичкиот алат за брзо скенирање.', 'Администраторите можат да уредат податоци или да го деактивираат алатот.'] },
    hi: { title: 'उपकरण विवरण', steps: ['उपकरण का स्टॉक स्तर, QR कोड और पूरा चेकआउट इतिहास देखें।', 'स्टॉक से उपकरण लेने के लिए "चेकआउट" या "ले जाएं" पर क्लिक करें।', 'QR कोड प्रिंट करें और त्वरित स्कैनिंग के लिए भौतिक उपकरण पर लगाएं।', 'प्रशासक उपकरण डेटा संपादित कर सकते हैं या उसे निष्क्रिय कर सकते हैं।'] },
    en: { title: 'Tool Details', steps: ['View the tool\'s stock level, QR code, and full checkout history.', 'Click "Check out" or "Take" to borrow the tool from stock.', 'Print the QR code and stick it on the physical tool for quick scanning.', 'Admins can edit tool data or deactivate the tool.'] },
  },

  '/tools/[id]/edit': {
    sl: { title: 'Uredi orodje', steps: ['Posodobite ime, kategorijo, opis ali vrsto orodja.', 'Prilagodite skupno zalogo, minimalno in maksimalno zalogo.', 'Deaktivacija orodja ga skrije iz aktivnega inventarja, ne izbriše ga.'] },
    sr: { title: 'Uredi alat', steps: ['Ažurirajte naziv, kategoriju, opis ili tip alata.', 'Prilagodite ukupnu zalihu, minimalnu i maksimalnu zalihu.', 'Deaktivacija alata ga skriva iz aktivnog inventara, ali ga ne briše.'] },
    sq: { title: 'Modifiko mjetin', steps: ['Përditësoni emrin, kategorinë, përshkrimin ose llojin e mjetit.', 'Rregulloni stokun total, minimal dhe maksimal.', 'Çaktivizimi e fsheh mjetin nga inventari aktiv, por nuk e fshin.'] },
    tr: { title: 'Aracı Düzenle', steps: ['Aracın adını, kategorisini, açıklamasını veya türünü güncelleyin.', 'Toplam, minimum ve maksimum stok seviyelerini ayarlayın.', 'Aracı devre dışı bırakmak onu aktif envanterden gizler, silmez.'] },
    mk: { title: 'Уреди алат', steps: ['Ажурирајте го името, категоријата, описот или типот на алатот.', 'Прилагодете ја вкупната, минималната и максималната залиха.', 'Деактивирањето го крие алатот од активниот инвентар, но не го брише.'] },
    hi: { title: 'उपकरण संपादित करें', steps: ['उपकरण का नाम, श्रेणी, विवरण या प्रकार अपडेट करें।', 'कुल, न्यूनतम और अधिकतम स्टॉक स्तर समायोजित करें।', 'निष्क्रिय करने से उपकरण सक्रिय इन्वेंट्री से छिप जाता है, हटता नहीं।'] },
    en: { title: 'Edit Tool', steps: ['Update the tool\'s name, category, description, or type.', 'Adjust the total, minimum, and maximum stock levels.', 'Deactivating the tool hides it from the active inventory — it is not deleted.'] },
  },

  '/scan': {
    sl: { title: 'Skeniranje QR kode', steps: ['Usmerite kamero na QR kodo, ki je prilepljena na orodje.', 'Ob uspešnem skeniranju se samodejno odpre stran tega orodja.', 'Tam orodje izposodite, vrnete ali si ogledate historijo.', 'QR kode za vsako orodje najdete v zavihku "Podrobnosti orodja".'] },
    sr: { title: 'Skeniranje QR koda', steps: ['Uperite kameru prema QR kodu zalepljenom na alatu.', 'Uspešnim skeniranjem automatski se otvara stranica tog alata.', 'Tamo posudite, vratite alat ili pogledajte istoriju.', 'QR kodove za svaki alat pronađete na stranici "Detalji alata".'] },
    sq: { title: 'Skanim i kodit QR', steps: ['Drejtoni kamerën drejt kodit QR të ngjitur mbi mjet.', 'Pas skanimit të suksesshëm hapet automatikisht faqja e atij mjeti.', 'Atje huazoni, ktheni mjetin ose shikoni historikun.', 'Kodet QR për çdo mjet i gjeni te "Detajet e mjetit".'] },
    tr: { title: 'QR Kod Tarama', steps: ['Kamerayı aracın üzerine yapıştırılmış QR koduna yöneltin.', 'Başarılı taramada o aracın sayfası otomatik olarak açılır.', 'Oradan aracı ödünç alın, iade edin veya geçmişi görüntüleyin.', 'Her aracın QR kodunu "Araç Detayları" sayfasında bulabilirsiniz.'] },
    mk: { title: 'Скенирање QR код', steps: ['Насочете ја камерата кон QR кодот залепен на алатот.', 'При успешно скенирање автоматски се отвора страницата на тој алат.', 'Таму позајмете, вратете го алатот или прегледајте ја историјата.', 'QR кодовите за секој алат ги наоѓате во „Детали на алатот".'] },
    hi: { title: 'QR कोड स्कैन', steps: ['उपकरण पर चिपके QR कोड की ओर कैमरा इंगित करें।', 'सफल स्कैन के बाद उस उपकरण का पृष्ठ स्वचालित रूप से खुलता है।', 'वहां उपकरण चेकआउट करें, वापस करें या इतिहास देखें।', 'प्रत्येक उपकरण के QR कोड "उपकरण विवरण" पृष्ठ पर मिलते हैं।'] },
    en: { title: 'QR Code Scanner', steps: ['Point your camera at the QR code attached to the tool.', 'On a successful scan, that tool\'s page opens automatically.', 'From there, check out the tool, return it, or view its history.', 'You can find the QR code for any tool on its "Tool Details" page.'] },
  },

  '/checkouts': {
    sl: { title: 'Izposoje', steps: ['Pregled vseh izposoj s filtri: VSE, AKTIVNE, V POSTOPKU VRNITVE, VRNJENE, PORABLJENE.', 'Ko želite vrniti orodje, kliknite gumb "Vrni" pri aktivni izposoji.', 'Zahteva za vrnitev gre v čakanje – administrator jo mora potrditi ali zavrniti.', 'Material se pri vrnitvi označi kot "Porabljeno" in ne zmanjša zaloge.'] },
    sr: { title: 'Posudbe', steps: ['Pregled svih posudbi sa filterima: SVE, AKTIVNE, U PROCESU VRAĆANJA, VRAĆENE, POTROŠENE.', 'Za vraćanje alata kliknite "Vrati" kod aktivne posudbe.', 'Zahtev za vraćanje čeka na odobrenje ili odbijanje od strane administratora.', 'Materijal se označava kao "Potrošeno" i ne smanjuje zalihu.'] },
    sq: { title: 'Huazimet', steps: ['Shikoni të gjitha huazimet me filtra: TË GJITHA, AKTIVE, NË PROCES KTHIMI, KTHYER, KONSUMUAR.', 'Për kthimin e mjetit klikoni "Kthe" te huazimi aktiv.', 'Kërkesa e kthimit pret miratimin ose refuzimin nga administratori.', 'Materiali shënohet si "Konsumuar" dhe nuk ul stokun.'] },
    tr: { title: 'Ödünçler', steps: ['Tüm ödünçleri filtrelerle görüntüleyin: HEPSİ, AKTİF, İADE SÜRECİNDE, İADE EDİLDİ, TÜKETİLDİ.', 'Aracı iade etmek için aktif ödünçteki "İade et" düğmesine tıklayın.', 'İade talebi yöneticinin onay veya reddi için bekler.', 'Malzeme "Tüketildi" olarak işaretlenir ve stoku azaltmaz.'] },
    mk: { title: 'Позајмици', steps: ['Прегледајте ги сите позајмици со филтри: СВЕ, АКТИВНИ, ВО ПРОЦЕС НА ВРАЌАЊЕ, ВРАТЕНИ, ПОТРОШЕНИ.', 'За враќање на алат кликнете „Врати" кај активна позајмица.', 'Барањето за враќање чека потврда или одбивање од администраторот.', 'Материјалот се означува како „Потрошено" и не ја намалува залихата.'] },
    hi: { title: 'चेकआउट', steps: ['फ़िल्टर के साथ सभी चेकआउट देखें: सभी, सक्रिय, वापसी प्रक्रिया में, वापस किए गए, उपयोग किए गए।', 'उपकरण वापस करने के लिए सक्रिय चेकआउट में "वापस करें" पर क्लिक करें।', 'वापसी अनुरोध प्रशासक की स्वीकृति या अस्वीकृति का इंतजार करता है।', 'सामग्री को "उपयोग किया गया" के रूप में चिह्नित किया जाता है और स्टॉक कम नहीं होता।'] },
    en: { title: 'Checkouts', steps: ['View all checkouts with filters: ALL, ACTIVE, PENDING RETURN, RETURNED, CONSUMED.', 'To return a tool, click the "Return" button on an active checkout.', 'The return request waits for an admin to confirm or reject it.', 'Materials are marked as "Consumed" and do not reduce stock when returned.'] },
  },

  '/projects': {
    sl: { title: 'Projekti', steps: ['Pregled vseh projektov z njihovim statusom (aktiven, zaključen, v mirovanju) in vodjo.', 'Vsak projekt ima vodjo (foreman), ki je odgovoren za gradbišče.', 'Administratorji ustvarijo projekt z imenom, lokacijo in izberejo vodjo.', 'Kliknite "Prikaži" za pregled vseh izposoj, vezanih na posamezen projekt.'] },
    sr: { title: 'Projekti', steps: ['Pregled svih projekata sa statusom (aktivan, završen, na čekanju) i vođom projekta.', 'Svaki projekat ima vođu (predradnik) koji je odgovoran za gradilište.', 'Administratori kreiraju projekat sa imenom, lokacijom i biraju vođu.', 'Kliknite "Prikaži" za pregled svih posudbi vezanih za projekat.'] },
    sq: { title: 'Projektet', steps: ['Pasqyrë e të gjitha projekteve me statusin (aktiv, përfunduar, në pritje) dhe udhëheqësin.', 'Çdo projekt ka udhëheqës (kryepunëtor) përgjegjës për ndërtimin.', 'Administratorët krijojnë projekt me emër, vendndodhje dhe zgjedhin udhëheqës.', 'Klikoni "Shfaq" për huazimet e lidhura me projektin.'] },
    tr: { title: 'Projeler', steps: ['Tüm projeleri durum (aktif, tamamlandı, beklemede) ve proje lideriyle görüntüleyin.', 'Her projenin şantiyeden sorumlu bir lideri (ustabaşı) vardır.', 'Yöneticiler ad, konum ile proje oluşturur ve lider seçer.', 'Projeye bağlı tüm ödünçleri görmek için "Görüntüle"ye tıklayın.'] },
    mk: { title: 'Проекти', steps: ['Преглед на сите проекти со статус (активен, завршен, на чекање) и раководител.', 'Секој проект има раководител (предрадник) одговорен за градежното место.', 'Администраторите создаваат проект со ime, локација и избираат раководител.', 'Кликнете „Прикажи" за позајмици поврзани со проектот.'] },
    hi: { title: 'प्रोजेक्ट', steps: ['सभी प्रोजेक्ट को स्थिति (सक्रिय, पूर्ण, प्रतीक्षा में) और नेता के साथ देखें।', 'प्रत्येक प्रोजेक्ट में एक नेता (फोरमैन) होता है जो निर्माण स्थल के लिए जिम्मेदार है।', 'प्रशासक नाम, स्थान के साथ प्रोजेक्ट बनाते हैं और नेता चुनते हैं।', 'किसी प्रोजेक्ट से जुड़े सभी चेकआउट देखने के लिए "देखें" पर क्लिक करें।'] },
    en: { title: 'Projects', steps: ['View all projects with their status (active, completed, on hold) and project leader.', 'Each project has a leader (foreman) responsible for the work site.', 'Admins create a project with a name, location, and assign a leader.', 'Click "View" to see all checkouts linked to a specific project.'] },
  },

  '/requests': {
    sl: { title: 'Zahtevki', steps: ['Pregled vseh zahtevkov za orodja in material.', 'Delavci in vodje ustvarijo zahtevek z gumbom "Nov zahtevek".', 'Administrator zahtevek pregleda in ga odobri ali zavrne.', 'Odobreni zahtevki samodejno sprožijo izposojo orodij zahtevatelju.', 'Sledite statusu: ČAKA, ODOBREN, DELNO ODOBREN, ZAVRNJEN.'] },
    sr: { title: 'Zahtevi', steps: ['Pregled svih zahteva za alate i materijal.', 'Radnici i vođe kreiraju zahtev dugmetom "Novi zahtev".', 'Administrator pregleda zahtev i odobrava ili odbija.', 'Odobreni zahtevi automatski pokreću posudbu alata podnosiocu.', 'Pratite status: ČEKA, ODOBREN, DELIMIČNO ODOBREN, ODBIJEN.'] },
    sq: { title: 'Kërkesat', steps: ['Pasqyrë e të gjitha kërkesave për mjete dhe material.', 'Punëtorët dhe udhëheqësit krijojnë kërkesë me butonin "Kërkesë e re".', 'Administratori e shqyrton dhe e miraton ose refuzon kërkesën.', 'Kërkesat e miratuara aktivizojnë automatikisht huazimin e mjeteve.', 'Ndiqni statusin: PRET, MIRATUAR, PJESËRISHT MIRATUAR, REFUZUAR.'] },
    tr: { title: 'Talepler', steps: ['Araç ve malzeme için tüm taleplerin genel görünümü.', 'Çalışanlar ve liderler "Yeni talep" düğmesiyle talep oluşturur.', 'Yönetici talebi inceler ve onaylar veya reddeder.', 'Onaylanan talepler otomatik olarak talep sahibine ödünç işlemi başlatır.', 'Durumu takip edin: BEKLİYOR, ONAYLANDI, KISMİ ONAY, REDDEDİLDİ.'] },
    mk: { title: 'Барања', steps: ['Преглед на сите барања за алати и материјал.', 'Работниците и раководителите создаваат барање со копчето „Ново барање".', 'Администраторот го прегледува и го одобрува или одбива барањето.', 'Одобрените барања автоматски го активираат позајмувањето.', 'Следете го статусот: ЧЕКА, ОДОБРЕНО, ДЕЛУМНО ОДОБРЕНО, ОДБИЕНО.'] },
    hi: { title: 'अनुरोध', steps: ['उपकरण और सामग्री के सभी अनुरोधों का अवलोकन।', 'कर्मचारी और नेता "नया अनुरोध" बटन से अनुरोध बनाते हैं।', 'प्रशासक अनुरोध की समीक्षा करता है और स्वीकृत या अस्वीकार करता है।', 'स्वीकृत अनुरोध स्वचालित रूप से अनुरोधकर्ता को चेकआउट शुरू करते हैं।', 'स्थिति ट्रैक करें: प्रतीक्षारत, स्वीकृत, आंशिक रूप से स्वीकृत, अस्वीकृत।'] },
    en: { title: 'Requests', steps: ['Overview of all requests for tools and materials.', 'Workers and foremen create a request using the "New request" button.', 'An admin reviews and approves or rejects the request.', 'Approved requests automatically trigger checkouts to the requester.', 'Track the status: PENDING, APPROVED, PARTIALLY APPROVED, REJECTED.'] },
  },

  '/requests/new': {
    sl: { title: 'Nov zahtevek', steps: ['Izberite projekt, za katerega potrebujete orodja ali material.', 'Dodajte artikel iz inventarja ali vpišite ime predmeta, ki ga ni v sistemu.', 'Vnesite potrebno količino za vsak artikel.', 'Neobvezno dodajte opombo za administratorja.', 'Pošljite zahtevek – administrator bo takoj obveščen.'] },
    sr: { title: 'Novi zahtev', steps: ['Izaberite projekat za koji su vam potrebni alati ili materijal.', 'Dodajte artikal iz inventara ili upišite naziv predmeta koji nije u sistemu.', 'Unesite potrebnu količinu za svaki artikal.', 'Opcionalno dodajte napomenu za administratora.', 'Pošaljite zahtev – administrator će odmah biti obavešten.'] },
    sq: { title: 'Kërkesë e re', steps: ['Zgjidhni projektin për të cilin keni nevojë për mjete ose material.', 'Shtoni artikull nga inventari ose shkruani emrin e sendit që nuk është në sistem.', 'Vendosni sasinë e nevojshme për çdo artikull.', 'Opsionalisht shtoni shënim për administratorin.', 'Dërgoni kërkesën – administratori do njoftohet menjëherë.'] },
    tr: { title: 'Yeni Talep', steps: ['Araç veya malzemeye ihtiyaç duyduğunuz projeyi seçin.', 'Envanterden öğe ekleyin ya da sistemde olmayan öğeler için serbest metin girin.', 'Her öğe için gerekli miktarı girin.', 'İsteğe bağlı olarak yönetici için not ekleyin.', 'Talebi gönderin – yönetici hemen bilgilendirilecektir.'] },
    mk: { title: 'Ново барање', steps: ['Изберете проект за кој ви требаат алати или материјал.', 'Додајте артикл од инвентарот или внесете слободен текст за предмети надвор од системот.', 'Внесете ја потребната количина за секој артикл.', 'Опционално додајте забелешка за администраторот.', 'Испратете го барањето – администраторот ќе биде веднаш известен.'] },
    hi: { title: 'नया अनुरोध', steps: ['वह प्रोजेक्ट चुनें जिसके लिए आपको उपकरण या सामग्री चाहिए।', 'इन्वेंट्री से आइटम जोड़ें या सिस्टम में नहीं होने वाली वस्तुओं के लिए स्वतंत्र टेक्स्ट लिखें।', 'प्रत्येक आइटम के लिए आवश्यक मात्रा दर्ज करें।', 'वैकल्पिक रूप से प्रशासक के लिए नोट जोड़ें।', 'अनुरोध भेजें – प्रशासक को तुरंत सूचित किया जाएगा।'] },
    en: { title: 'New Request', steps: ['Select the project you need tools or materials for.', 'Add items from the inventory or type a free-text name for items not in the system.', 'Enter the required quantity for each item.', 'Optionally add a note for the admin.', 'Submit the request — the admin will be notified immediately.'] },
  },

  '/requests/[id]': {
    sl: { title: 'Podrobnosti zahtevka', steps: ['Pregled vseh artiklov v zahtevku in statusa posameznega artika.', 'Administrator odobri ali zavrne vsak artikel posebej in nastavi odobreno količino.', 'Odobreni artikli se samodejno izposodijo zahtevatelju.', 'Adminova opomba je prikazana pri vsakem odločenem artiku.'] },
    sr: { title: 'Detalji zahteva', steps: ['Pregled svih artikala u zahtevu i statusa svakog artikla.', 'Administrator odobrava ili odbija svaki artikal posebno i postavlja odobrenu količinu.', 'Odobreni artikli se automatski posuđuju podnosiocu zahteva.', 'Napomena administratora je prikazana za svaki odlučeni artikal.'] },
    sq: { title: 'Detajet e kërkesës', steps: ['Pasqyrë e të gjithë artikujve në kërkesë dhe statusit të secilit.', 'Administratori miraton ose refuzon çdo artikull veçmas dhe cakton sasinë e miratuar.', 'Artikujt e miratuar huazohen automatikisht kërkuesit.', 'Shënimi i administratorit shfaqet te çdo artikull i vendosur.'] },
    tr: { title: 'Talep Detayları', steps: ['Talepteki tüm öğelerin ve her öğenin durumunun genel görünümü.', 'Yönetici her öğeyi ayrı ayrı onaylar veya reddeder ve onaylanan miktarı belirler.', 'Onaylanan öğeler otomatik olarak talep sahibine ödünç verilir.', 'Yöneticinin notu her karara verilmiş öğede gösterilir.'] },
    mk: { title: 'Детали на барањето', steps: ['Преглед на сите артикли во барањето и статусот на секој артикл.', 'Администраторот одобрува или одбива секој артикл посебно и ја поставува одобрената количина.', 'Одобрените артикли се автоматски позајмуваат на подносителот.', 'Забелешката на администраторот е прикажана кај секој одлучен артикл.'] },
    hi: { title: 'अनुरोध विवरण', steps: ['अनुरोध में सभी आइटम और प्रत्येक आइटम की स्थिति का अवलोकन।', 'प्रशासक प्रत्येक आइटम को अलग से स्वीकृत या अस्वीकार करता है और स्वीकृत मात्रा सेट करता है।', 'स्वीकृत आइटम स्वचालित रूप से अनुरोधकर्ता को चेकआउट होते हैं।', 'प्रशासक का नोट प्रत्येक निर्णित आइटम पर दिखाई देता है।'] },
    en: { title: 'Request Details', steps: ['Overview of all items in the request and the status of each item.', 'An admin approves or rejects each item individually and sets the approved quantity.', 'Approved items are automatically checked out to the requester.', 'The admin\'s note is shown next to each decided item.'] },
  },

  '/reports': {
    sl: { title: 'Poročila', steps: ['Štirje zavihki: Pregled, Uporaba, Inventar in Revizija.', '"Pregled" prikazuje splošne statistike sistema.', '"Uporaba" prikazuje, katera orodja so najpogosteje izposojena.', '"Inventar" prikazuje zaloge vseh orodij in materialov.', '"Revizija" prikazuje dnevnik vseh sprememb z informacijo o izvajalcu in času.', 'Kliknite "Izvozi Excel" za prenos podatkov v preglednico.'] },
    sr: { title: 'Izveštaji', steps: ['Četiri kartice: Pregled, Upotreba, Inventar i Revizija.', '"Pregled" prikazuje opšte statistike sistema.', '"Upotreba" prikazuje koji alati se najčešće posuđuju.', '"Inventar" prikazuje zalihe svih alata i materijala.', '"Revizija" prikazuje dnevnik svih promena sa izvodom o ko i kada.', 'Kliknite "Izvezi Excel" za preuzimanje podataka u tabelu.'] },
    sq: { title: 'Raportet', steps: ['Katër skeda: Pasqyrë, Përdorim, Inventar dhe Auditim.', '"Pasqyra" tregon statistikat e përgjithshme të sistemit.', '"Përdorimi" tregon mjetet që huazohen më shpesh.', '"Inventari" tregon stokun e të gjitha mjeteve dhe materialeve.', '"Auditimi" tregon regjistrin e të gjitha ndryshimeve me kush dhe kur.', 'Klikoni "Eksporto Excel" për shkarkimin e të dhënave.'] },
    tr: { title: 'Raporlar', steps: ['Dört sekme: Genel Bakış, Kullanım, Envanter ve Denetim.', '"Genel Bakış" sistemin genel istatistiklerini gösterir.', '"Kullanım" hangi araçların en sık ödünç alındığını gösterir.', '"Envanter" tüm araç ve malzemelerin stoklarını gösterir.', '"Denetim" tüm değişikliklerin günlüğünü kim ve ne zaman ile birlikte gösterir.', '"Excel\'e Aktar" düğmesiyle verileri indirin.'] },
    mk: { title: 'Извештаи', steps: ['Четири картички: Преглед, Употреба, Инвентар и Ревизија.', '„Преглед" ги прикажува општите статистики на системот.', '„Употреба" покажува кои алати се најчесто позајмувани.', '„Инвентар" ги прикажува залихите на сите алати и материјали.', '„Ревизија" го прикажува дневникот на сите промени со кој и кога.', 'Кликнете „Извези Excel" за преземање на податоците.'] },
    hi: { title: 'रिपोर्ट', steps: ['चार टैब: अवलोकन, उपयोग, इन्वेंट्री और ऑडिट।', '"अवलोकन" सिस्टम की सामान्य सांख्यिकी दिखाता है।', '"उपयोग" दिखाता है कौन से उपकरण सबसे अधिक चेकआउट होते हैं।', '"इन्वेंट्री" सभी उपकरणों और सामग्रियों का स्टॉक दिखाता है।', '"ऑडिट" किसने और कब के साथ सभी परिवर्तनों का लॉग दिखाता है।', 'डेटा डाउनलोड करने के लिए "Excel निर्यात करें" पर क्लिक करें।'] },
    en: { title: 'Reports', steps: ['Four tabs: Overview, Usage, Inventory, and Audit.', '"Overview" shows general statistics for the whole system.', '"Usage" shows which tools are checked out most frequently.', '"Inventory" shows stock levels for all tools and materials.', '"Audit" shows a log of every change, with who did it and when.', 'Click "Export Excel" to download the data as a spreadsheet.'] },
  },

  '/admin/users': {
    sl: { title: 'Upravljanje uporabnikov', steps: ['Pregled vseh registriranih uporabnikov in njihovih vlog.', 'Povabite novega uporabnika: vnesite e-poštni naslov in izberite vlogo.', 'Vloge: ADMIN (polni dostop), MANAGER (upravljanje), EMPLOYEE (delavec), FOREMAN (vodja).', 'Spremenite vlogo ali deaktivirajte uporabnika s klikom na "Uredi".', 'Deaktiviran uporabnik se ne more prijaviti, a njegovi zapisi ostanejo.'] },
    sr: { title: 'Upravljanje korisnicima', steps: ['Pregled svih registrovanih korisnika i njihovih uloga.', 'Pozovite novog korisnika: unesite e-poštu i izaberite ulogu.', 'Uloge: ADMIN (pun pristup), MANAGER (upravljanje), EMPLOYEE (radnik), FOREMAN (predradnik).', 'Promenite ulogu ili deaktivirajte korisnika klikom na "Uredi".', 'Deaktiviran korisnik ne može da se prijavi, ali njegovi zapisi ostaju.'] },
    sq: { title: 'Menaxhimi i përdoruesve', steps: ['Pasqyrë e të gjithë përdoruesve të regjistruar dhe roleve të tyre.', 'Ftoni përdorues të ri: vendosni email dhe zgjidhni rolin.', 'Rolet: ADMIN (akses i plotë), MANAGER (menaxhim), EMPLOYEE (punëtor), FOREMAN (kryepunëtor).', 'Ndryshoni rolin ose çaktivizoni përdoruesin me "Modifiko".', 'Përdoruesi i çaktivizuar nuk mund të identifikohet, por të dhënat e tij ruhen.'] },
    tr: { title: 'Kullanıcı Yönetimi', steps: ['Tüm kayıtlı kullanıcıları ve rollerini görüntüleyin.', 'Yeni kullanıcı davet edin: e-posta girin ve rol seçin.', 'Roller: ADMIN (tam erişim), MANAGER (yönetim), EMPLOYEE (çalışan), FOREMAN (ustabaşı).', '"Düzenle" ile rolü değiştirin veya kullanıcıyı devre dışı bırakın.', 'Devre dışı bırakılan kullanıcı giriş yapamaz ancak kayıtları kalır.'] },
    mk: { title: 'Управување со корисници', steps: ['Преглед на сите регистрирани корисници и нивните улоги.', 'Поканете нов корисник: внесете е-пошта и изберете улога.', 'Улоги: ADMIN (целосен пристап), MANAGER (управување), EMPLOYEE (работник), FOREMAN (предрадник).', 'Сменете улога или деактивирајте корисник со „Уреди".', 'Деактивиран корисник не може да се најави, но неговите записи остануваат.'] },
    hi: { title: 'उपयोगकर्ता प्रबंधन', steps: ['सभी पंजीकृत उपयोगकर्ताओं और उनकी भूमिकाओं का अवलोकन।', 'नए उपयोगकर्ता को आमंत्रित करें: ईमेल दर्ज करें और भूमिका चुनें।', 'भूमिकाएं: ADMIN (पूर्ण पहुंच), MANAGER (प्रबंधन), EMPLOYEE (कर्मचारी), FOREMAN (फोरमैन)।', '"संपादित करें" से भूमिका बदलें या उपयोगकर्ता को निष्क्रिय करें।', 'निष्क्रिय उपयोगकर्ता लॉगिन नहीं कर सकता लेकिन उसके रिकॉर्ड बने रहते हैं।'] },
    en: { title: 'User Management', steps: ['View all registered users and their roles.', 'Invite a new user: enter their email and choose a role.', 'Roles: ADMIN (full access), MANAGER (management), EMPLOYEE (worker), FOREMAN (site leader).', 'Change a role or deactivate a user with the "Edit" button.', 'A deactivated user cannot log in, but their records are kept.'] },
  },

  '/admin/procurement': {
    sl: { title: 'Nabava', steps: ['Tukaj so prikazani odobreni zahtevki za predmete, ki jih ni v inventarju.', 'Posodobite status: V OBDELAVI → NAROČENO → DOSTAVLJENO.', 'Ko je predmet dostavljen, ga ročno dodajte v inventar z "Dodaj orodje".', 'Označite postavko kot zaključeno, da se umakne iz aktivne nabave.'] },
    sr: { title: 'Nabavka', steps: ['Ovde su prikazani odobreni zahtevi za predmete koji nisu u inventaru.', 'Ažurirajte status: U OBRADI → NARUČENO → ISPORUČENO.', 'Kad je predmet isporučen, ručno ga dodajte u inventar sa "Dodaj alat".', 'Označite stavku kao završenu da je uklonite iz aktivne nabavke.'] },
    sq: { title: 'Prokurimi', steps: ['Këtu shfaqen kërkesat e miratuara për sende që nuk janë në inventar.', 'Përditësoni statusin: NË PROCES → POROSITUR → DORËZUAR.', 'Kur sendi dorëzohet, shtojeni manualisht në inventar me "Shto mjet".', 'Shënoni zërin si të përfunduar për ta hequr nga prokurimi aktiv.'] },
    tr: { title: 'Tedarik', steps: ['Burada envanterde olmayan öğeler için onaylanan talepler gösterilir.', 'Durumu güncelleyin: İŞLEMDE → SİPARİŞ VERİLDİ → TESLİM EDİLDİ.', 'Öğe teslim edildiğinde "Araç ekle" ile envantera manuel olarak ekleyin.', 'Aktif tedarikten çıkarmak için kalemi tamamlandı olarak işaretleyin.'] },
    mk: { title: 'Набавка', steps: ['Тука се прикажани одобрените барања за предмети кои ги нема во инвентарот.', 'Ажурирајте го статусот: ВО ОБРАБОТКА → НАРАЧАНО → ДОСТАВЕНО.', 'Кога предметот е доставен, рачно додајте го во инвентарот со „Додај алат".', 'Означете ставката како завршена за да ја отстраните од активната набавка.'] },
    hi: { title: 'खरीद', steps: ['यहां उन वस्तुओं के लिए स्वीकृत अनुरोध दिखाए जाते हैं जो इन्वेंट्री में नहीं हैं।', 'स्थिति अपडेट करें: प्रक्रिया में → ऑर्डर किया → डिलीवर किया।', 'जब वस्तु डिलीवर हो, "उपकरण जोड़ें" से इन्वेंट्री में मैन्युअल रूप से जोड़ें।', 'सक्रिय खरीद से हटाने के लिए आइटम को पूर्ण के रूप में चिह्नित करें।'] },
    en: { title: 'Procurement', steps: ['Approved requests for items that are not in the inventory are shown here.', 'Update the status: IN PROGRESS → ORDERED → DELIVERED.', 'Once delivered, manually add the item to inventory using "Add tool".', 'Mark an item as completed to remove it from the active procurement list.'] },
  },

  '/admin/import': {
    sl: { title: 'Uvoz orodij', steps: ['Uvozite seznam orodij in materialov iz Excel datoteke (.xlsx).', 'Kliknite "Prenesi predlogo" za vzorčno datoteko s pravilnimi stolpci.', 'Izpolnite predlogo s podatki (ime, kategorija, zaloga, itd.).', 'Naložite izpolnjeno datoteko in kliknite "Uvozi".', 'Preverite poročilo: uspešno uvoženi vnosi so označeni zeleno, napake rdeče.'] },
    sr: { title: 'Uvoz alata', steps: ['Uvezite listu alata i materijala iz Excel datoteke (.xlsx).', 'Kliknite "Preuzmi predložak" za primer datoteke sa ispravnim kolonama.', 'Popunite predložak podacima (naziv, kategorija, zaliha, itd.).', 'Uploadujte popunjenu datoteku i kliknite "Uvezi".', 'Proverite izveštaj: uspešno uvoženi unosi su zeleni, greške crvene.'] },
    sq: { title: 'Importimi i mjeteve', steps: ['Importoni listën e mjeteve dhe materialeve nga skedari Excel (.xlsx).', 'Klikoni "Shkarko shabllonin" për skedarin shembull me kolonat e duhura.', 'Plotësoni shabllonin me të dhëna (emri, kategoria, stoku, etj.).', 'Ngarkoni skedarin e plotësuar dhe klikoni "Importo".', 'Kontrolloni raportin: hyrjet e importuara me sukses janë jeshile, gabimet janë të kuqe.'] },
    tr: { title: 'Araç İçe Aktarma', steps: ['Excel dosyasından (.xlsx) araç ve malzeme listesini içe aktarın.', 'Doğru sütunlarla birlikte örnek dosya için "Şablonu İndir"e tıklayın.', 'Şablonu verilerle doldurun (ad, kategori, stok vb.).', 'Doldurulmuş dosyayı yükleyin ve "İçe Aktar"a tıklayın.', 'Raporu kontrol edin: başarıyla içe aktarılanlar yeşil, hatalar kırmızı.'] },
    mk: { title: 'Увоз на алати', steps: ['Увезете листа на алати и материјали од Excel датотека (.xlsx).', 'Кликнете „Преземи шаблон" за примерна датотека со правилни колони.', 'Пополнете го шаблонот со податоци (ime, категорија, залиха итн.).', 'Прикачете ја пополнетата датотека и кликнете „Увези".', 'Проверете го извештајот: успешно увезените се зелени, грешките се црвени.'] },
    hi: { title: 'उपकरण आयात', steps: ['Excel फ़ाइल (.xlsx) से उपकरणों और सामग्रियों की सूची आयात करें।', 'सही कॉलम के साथ नमूना फ़ाइल के लिए "टेम्पलेट डाउनलोड करें" पर क्लिक करें।', 'टेम्पलेट को डेटा से भरें (नाम, श्रेणी, स्टॉक आदि)।', 'भरी हुई फ़ाइल अपलोड करें और "आयात करें" पर क्लिक करें।', 'रिपोर्ट जांचें: सफलतापूर्वक आयात किए गए प्रविष्टियां हरी हैं, त्रुटियां लाल।'] },
    en: { title: 'Tool Import', steps: ['Import a list of tools and materials from an Excel file (.xlsx).', 'Click "Download template" for a sample file with the correct columns.', 'Fill the template with your data (name, category, stock, etc.).', 'Upload the filled file and click "Import".', 'Check the report: successfully imported entries are green, errors are red.'] },
  },
}

function resolveKey(pathname: string): string | null {
  if (pathname === '/dashboard') return '/dashboard'
  if (pathname === '/tools/new') return '/tools/new'
  if (/^\/tools\/[^/]+\/edit$/.test(pathname)) return '/tools/[id]/edit'
  if (/^\/tools\/[^/]+$/.test(pathname)) return '/tools/[id]'
  if (pathname === '/tools') return '/tools'
  if (pathname === '/scan') return '/scan'
  if (pathname === '/checkouts') return '/checkouts'
  if (pathname === '/projects') return '/projects'
  if (pathname === '/requests/new') return '/requests/new'
  if (/^\/requests\/[^/]+$/.test(pathname)) return '/requests/[id]'
  if (pathname === '/requests') return '/requests'
  if (pathname === '/reports') return '/reports'
  if (pathname === '/admin/users') return '/admin/users'
  if (pathname === '/admin/procurement') return '/admin/procurement'
  if (pathname === '/admin/import') return '/admin/import'
  return null
}

export function getHelp(pathname: string, lang: Lang): { title: string; steps: string[] } | null {
  const key = resolveKey(pathname)
  if (!key) return null
  const page = HELP[key]
  if (!page) return null
  const content = page[lang] ?? page.en
  return { title: content.title, steps: content.steps }
}
