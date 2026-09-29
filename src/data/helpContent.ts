export interface HelpSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  codeSnippet?: string;
  callout?: {
    type: 'info' | 'warning' | 'tip';
    text: string;
  };
}

export interface HelpTopic {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  keywords: string[];
  sections: HelpSection[];
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Kezdetek',
    description: 'Alapvető tudnivalók az alkalmazásról, mentésről és használatról',
    iconName: 'Sparkles'
  },
  {
    id: 'ladder-editor',
    title: 'Létraszerkesztő',
    description: 'Létra diagram szerkesztése, fokok, ágak és billentyűkombinációk',
    iconName: 'Layers'
  },
  {
    id: 'elements-modules',
    title: 'Elemek és modulok',
    description: 'Időzítők, számlálók, M bitek, kapuk és áramköri makrók',
    iconName: 'Cpu'
  },
  {
    id: 'simulation',
    title: 'Szimuláció',
    description: 'Valós ideű szimuláció, bemenet-kényszerítés és energiaháló',
    iconName: 'Activity'
  },
  {
    id: 'code-generation',
    title: 'Kódgenerálás',
    description: 'Arduino C++ kód fordítása, könyvtárak és méretoptimalizálás',
    iconName: 'Terminal'
  },
  {
    id: 'advanced',
    title: 'Haladó',
    description: 'Multi-tasking, FBD, állapotgépek és validációs hibaelhárítás',
    iconName: 'Sliders'
  }
];

export const HELP_TOPICS: HelpTopic[] = [
  // --- KEZDETEK ---
  {
    id: 'what-is-arduplc',
    categoryId: 'getting-started',
    title: 'Mi ez az alkalmazás?',
    summary: 'Az ArduPLC Studio egy böngészőben futó ipari PLC létramdiagram szerkesztő és Arduino kódgeneráló stúdió.',
    keywords: ['alkalmazás', 'bevezetés', 'plc', 'arduino', 'létra', 'studio', 'stúdió'],
    sections: [
      {
        title: '1. Fejezet: Áttekintés és Célkitűzés',
        paragraphs: [
          'Az ArduPLC Ladder Studio egy kifejezetten oktatási, hobbista és ipari prototípus-fejlesztési célokra tervezett vizuális PLC (Programozható Logikai Vezérlő) fejlesztőkörnyezet.',
          'Lehetővé teszi, hogy a klasszikus IEC 61131-3 szabványnak megfelelő létradiagramos (Ladder Diagram - LD), valamint Funkcióblokk Diagramos (FBD) és Állapotgépes (SFC) logikákat tervezz, szimulálj és egyetlen kattintással szabványos Arduino C++ (.ino) forráskóddá alakíts.'
        ],
        bullets: [
          'Vizuális létraszerkesztő soros (AND) és párhuzamos (OR) logikai ágakkal',
          'Beépített valós idejű szimulátor vizuális energiaháló (Power-Flow) kiemeléssel',
          'Akkurátus Arduino C++ kódgenerátor intelligens könyvtár-és érintkező-kezeléssel',
          'I/O portbővítők, Modbus RTU, RTC, SD adatgyűjtő és ipari protokoll támogatás',
          'Telepítés nélkül, 100%-ban offline működő webes alkalmazás (PWA)'
        ],
        callout: {
          type: 'info',
          text: 'Tipp: A generált Arduino kód közvetlenül letölthető .ino fájlként, vagy vágólapra másolható az Arduino IDE-be történő beillesztéshez!'
        }
      },
      {
        title: '2. Fejezet: Támogatott hardverek és mikrokontrollerek',
        paragraphs: [
          'A stúdió elsősorban az Atmel ATmega328P alapú mikrokontrollereket (Arduino Uno, Nano, Pro Mini) célozza meg, de az I/O lábkiosztás és a generált kód kompatibilis az Arduino Mega (ATmega2560) és ESP32 modulokkal is.',
          'A hardveres lábkiosztás és lábkonfliktus-vizsgáló eszköz automatikusan figyelmeztet, ha egy fizikai digitális vagy analóg lábat több elemhez is hozzárendeltél.'
        ]
      }
    ]
  },
  {
    id: 'desktop-mobile-usage',
    categoryId: 'getting-started',
    title: 'Asztali használat / mobil korlát',
    summary: 'Optimális kijelzőméret, érintőképernyős és mobil korlátozások feloldása.',
    keywords: ['mobil', 'kijelző', 'felbontás', 'korlát', 'bypass', 'zoom', 'görgő'],
    sections: [
      {
        title: '1. Fejezet: Ajánlott kijelzőméret',
        paragraphs: [
          'A létraszerkesztő és a szimulációs műszerfal jelentős képernyőterületet igényel a komplex áramköri struktúrák és paraméterpanelok kényelmes megjelenítéséhez.',
          'Az alkalmazás minimális ajánlott felbontása 1024x768 pixel. Kisebb kijelzőkön (<= 768px szélesség) egy figyelmeztető képernyő jelenik meg.'
        ],
        callout: {
          type: 'warning',
          text: 'Mobilon történő megtekintéshez a figyelmeztető képernyőn a "Folytatás saját felelősségre" gombbal átlépheted a korlátozást.'
        }
      },
      {
        title: '2. Fejezet: Nagyítás és Mozgatás (Zoom & Pan)',
        paragraphs: [
          'Nagy méretű létramodulok szerkesztésekor a canvas felülete Ctrl + Egérgörgő segítségével nagyítható és kicsinyíthető.',
          'A vászon tetszőleges irányba mozgatható az egér középső gombjával (vagy Shift + Bal egérgomb nyomvatartásával), így a sok fokból álló összetett programok is könnyen áttekinthetők.'
        ]
      }
    ]
  },
  {
    id: 'project-save-load',
    categoryId: 'getting-started',
    title: 'Új projekt, mentés (IndexedDB slotok, JSON export/import)',
    summary: 'Automatikus háttérmentés, mentési slotok kezelése IndexedDB-ben és fájlexport.',
    keywords: ['mentés', 'betöltés', 'slot', 'indexeddb', 'json', 'export', 'import', 'plcopen', 'xml'],
    sections: [
      {
        title: '1. Fejezet: Automatikus Háttérmentés (Autosave)',
        paragraphs: [
          'Minden változtatás (elem hozzáadása, változó átnevezése, fok átrendezése) automatikusan elmentésre kerül a böngésző belső IndexedDB adatbázisába egy 500 ms-os intelligens késleltetéssel (debounce).',
          'Ha véletlenül bezárod a böngészőt vagy frissíted az oldalt, az utolsó állapot automatikusan visszaáll az alkalmazás megnyitásakor.'
        ]
      },
      {
        title: '2. Fejezet: Projekt Kezelő Slotok (IndexedDB)',
        paragraphs: [
          'A Fájl → Projekt Kezelő menüpontban tetszőleges számú projektet menthetsz el névvel, megjegyzéssel és időbélyeggel ellátott slotokba.',
          'Ez lehetővé teszi, hogy váltogass a különböző PLC feladatok és kísérleti projektek között anélkül, hogy fájlokat kellene letöltened.'
        ]
      },
      {
        title: '3. Fejezet: JSON és PLCopen XML Export/Import',
        paragraphs: [
          'Ha a projektet át szeretnéd vinni egy másik számítógépre vagy archiválni szeretnéd, a Fájl menüben választandó opciók:',
          'Exportálás (JSON): Teljes projektstruktúra, beleértve a változókat, könyvtárakat és szimulációs beállításokat.',
          'Exportálás (PLCopen XML): Szabványos IEC 61131-3 PLCopen XML fájl generálása, amely más ipari PLC szoftverekbe is importálható.'
        ],
        bullets: [
          'JSON mentés: Minden belső beállítást megőriz.',
          'PLCopen XML: Ipari kompatibilitási formátum.',
          'Nyomtatás / PDF Export: Szép formázott létradiagram dokumentáció nyomtatása.'
        ]
      }
    ]
  },
  {
    id: 'pwa-installation',
    categoryId: 'getting-started',
    title: 'PWA telepítés röviden',
    summary: 'Progesszív Webalkalmazás (PWA) telepítése asztali gépre és mobilra internetfüggetlen használathoz.',
    keywords: ['pwa', 'telepítés', 'offline', 'chrome', 'edge', 'app'],
    sections: [
      {
        title: '1. Fejezet: Mi az a PWA?',
        paragraphs: [
          'A PWA (Progressive Web App) technológia lehetővé teszi, hogy az ArduPLC Studio-t klasszikus asztali alkalmazásként telepítsd a számítógépedre (Windows, macOS, Linux) vagy Android/iOS eszközödre.',
          'A telepített alkalmazás ablakban fut, nincs böngészőfejléc, és 100%-ban működik internetkapcsolat nélkül is!'
        ]
      },
      {
        title: '2. Fejezet: Telepítés lépései',
        paragraphs: [
          'Chrome vagy Edge böngészőben kattints a címsor jobb szélén megjelenő kis "Alkalmazás telepítése" ikonra, vagy válaszd az alkalmazás alján megjelenő PWA telepítési sávot.',
          'Telepítés után az ArduPLC elérhető lesz az indítómenüből és az asztalról is.'
        ]
      }
    ]
  },

  // --- LÉTRASZERKESZTŐ ---
  {
    id: 'rung-branch-logic',
    categoryId: 'ladder-editor',
    title: 'Fok, ág, soros (AND) / párhuzamos (OR)',
    summary: 'A létra diagram felépítése: fokok (rungs), soros érintkezők és párhuzamos ágak.',
    keywords: ['fok', 'rung', 'ág', 'branch', 'and', 'or', 'soros', 'párhuzamos', 'energia'],
    sections: [
      {
        title: '1. Fejezet: Fokok (Rungs) és Végrehajtási Sorrend',
        paragraphs: [
          'A létradiagram vízszintes sorokból, úgynevezett fokokból (Rung) áll. A PLC a fokokat szigorúan felülről lefelé, balról jobbra értékeli ki a ciklikus beolvasás (Scan Cycle) során.',
          'Minden fok bal oldalán található a tápsín (Power Rail), jobb oldalán pedig a kimeneti tekercsek és modulok.'
        ],
        codeSnippet: `+---[ SZA-1 ]---[ SZA-2 ]--------------------( OUT )---+
|                                                     |
+---[ SZA-3 ]---+-------------------------------------+
        `
      },
      {
        title: '2. Fejezet: Soros (AND) és Párhuzamos (OR) Logika',
        paragraphs: [
          'Soros kapcsolat (AND): Ha egy ágon belül egymás után több kontaktust helyezel el, az áram csak akkor jut tovább, ha MINDEN kontaktus zárva van.',
          'Párhuzamos kapcsolat (OR): Ha egy fokhoz párhuzamos ágat adsz hozzá, az áram akkor is eléri a kimenetet, ha a felső VAGY az alsó ág vezet.'
        ],
        callout: {
          type: 'tip',
          text: 'Párhuzamos ág hozzáadásához kattints a fok bal oldalán található "+ Ág hozzáadása" gombra!'
        }
      }
    ]
  },
  {
    id: 'contacts-coils',
    categoryId: 'ladder-editor',
    title: 'Kontaktusok és tekercsek',
    summary: 'Alapvető léteaelemek: záró, bontó, élvezérelt kontaktusok és tekercstípusok.',
    keywords: ['kontaktus', 'tekercs', 'no', 'nc', 'rising', 'falling', 'set', 'reset', 'coil'],
    sections: [
      {
        title: '1. Fejezet: Kontaktus Típusok',
        paragraphs: [
          'NO (Normally Open - Zárókontaktus) —[ ]—: Átengedi az energiát, ha a hozzárendelt bemenet/változó értéke Igaz (1 / HIGH).',
          'NC (Normally Closed - Bontókontaktus) —[/]—: Átengedi az energiát, ha a hozzárendelt bemenet/változó értéke Hamis (0 / LOW).',
          'RISING EDGE (Felfutó él) —[P]—: Egyetlen ciklus idejéig engedi át az energiát, amikor a bemenet Hamis állapotból Igaz állapotba vált.',
          'FALLING EDGE (Lefutó él) —[N]—: Egyetlen ciklus idejéig engedi át az energiát, amikor a bemenet Igaz állapotból Hamis állapotba vált.'
        ]
      },
      {
        title: '2. Fejezet: Tekercs Típusok',
        paragraphs: [
          'Normál Tekercs —( )—: Beismeri a fok logikai állapotát. Ha a fok energiát kap, a kimenet HIGH lesz, ha megszűnik az energia, LOW-ra vált.',
          'Invertált Tekercs —(/)—: Ellenkező állapotot vesz fel. Energiamentes fok esetén HIGH, energizált fok esetén LOW.',
          'SET / Latch Tekercs —(S)—: Öntartó kimenet! Amint a fok legalább egy ciklusra energiát kap, a kimenet HIGH marad még a fok lekapcsolása után is.',
          'RESET / Unlatch Tekercs —(R)—: Törli a korábban SET-elt kimenetet vagy alaphelyzetbe állítja az időzítőket/számlálókat.'
        ]
      }
    ]
  },
  {
    id: 'single-output-rule',
    categoryId: 'ladder-editor',
    title: 'Egy kimenet / fok szabály',
    summary: 'A PLC szabványos működési elve: miért van legfeljebb egy tekercs/modul fokonként.',
    keywords: ['szabály', 'kimenet', 'tekercs', 'dupla tekercs', 'fok', 'validáció'],
    sections: [
      {
        title: '1. Fejezet: Mi az az Egy Kimenet Szabály?',
        paragraphs: [
          'Az ipari PLC szabványok és az átlátható programozási gyakorlat értelmében minden létrafok végén pontosan egy kimeneti elem (tekercs, időzítő, számláló vagy modul) foglalhat helyet.',
          'Ez biztosítja, hogy a feltételrendszer egyértelműen az adott kimenetet vezérelje, és ne keletkezzenek rejtett mellékhatások.'
        ]
      },
      {
        title: '2. Fejezet: A Dupla Tekercs (Double Coil) Veszélye',
        paragraphs: [
          'Ha ugyanazt a fizikai kimenetet (pl. D8) két külön fok végén is normál tekercsként vezérled, az utoljára kiértékelt fok felülírja a korábbit!',
          'Ezért a stúdió beépített validátora figyelmeztet a dupla tekercs használatára. Ha több feltételből szeretnél egy kimenetet kapcsolni, használj párhuzamos ágakat (OR) egyetlen fokon belül, vagy SET/RESET tekercseket.'
        ],
        callout: {
          type: 'warning',
          text: 'Mindig kerüld el ugyanazon kimenő pin több normál ( ) tekercsben való vezérlését!'
        }
      }
    ]
  },
  {
    id: 'setup-vs-loop-sections',
    categoryId: 'ladder-editor',
    title: 'setup() vs loop() szakasz és palette szűrés',
    summary: 'Az egyszeri indító (Setup) és a ciklikus (Loop) létra szakaszok közti különbségek.',
    keywords: ['setup', 'loop', 'szekció', 'palette', 'szűrés', 'indítás', 'ciklikus'],
    sections: [
      {
        title: '1. Fejezet: A Setup Szakasz (Egyszeri Indítás)',
        paragraphs: [
          'Az szerkesztőben két különálló létraszakasz áll rendelkezésre: a Setup() és a Loop() szakasz.',
          'A Setup szakaszban elhelyezett fokok pontosan EGYSZER hajtódnak végre a PLC indításakor (tápfeszültség rákapcsolásakor vagy resetkor). Ide valók a kezdeti értékadások, kijelző üdvözlőüzenetek és csatorna beállítások.'
        ]
      },
      {
        title: '2. Fejezet: A Loop Szakasz (Ciklikus Végrehajtás)',
        paragraphs: [
          'A Loop szakasz fokai folyamatosan, ciklikusan ismétlődnek amíg a PLC be van kapcsolva.',
          'Az eszközpaletta (Tool Palette) automatikusan szűri a használható modulokat: a Setup-ba nem illő folyamatos blocks (pl. PID, folyamatos számláló) szürkítve jelennek meg.'
        ]
      }
    ]
  },
  {
    id: 'shortcuts-multiselect-zoom',
    categoryId: 'ladder-editor',
    title: 'Billentyűk, többes kijelölés, zoom (Ctrl+görgő)',
    summary: 'A legfontosabb billentyűparancsok, többszörös kijelölés és navigáció.',
    keywords: ['billentyű', 'shortcut', 'kijelölés', 'del', 'ctrl', 'zoom', 'visszavonás', 'undo'],
    sections: [
      {
        title: '1. Fejezet: Hasznos Billentyűkombinációk',
        paragraphs: [
          'Az alábbi gyorsbillentyűkkel jelentősen felgyorsítható a létradiagramok szerkesztése:'
        ],
        bullets: [
          'Ctrl + Z : Utolsó művelet visszavonása (Undo)',
          'Ctrl + Y / Ctrl + Shift + Z : Visszavont művelet újbóli végrehajtása (Redo)',
          'Ctrl + Click : Több elem kijelölése a vásznon',
          'Delete / Backspace : Kijelölt elemek vagy fok törlése',
          'Ctrl + Fel / Le nyíl : Kijelölt fok mozgatása felfelé / lefelé',
          'Ctrl + Egérgörgő : Vászon nagyítása és kicsinyítése (Zoom)',
          'Shift + Egérhúzás / Középső egérgomb : Vászon eltolása (Pan)',
          'Escape : Kijelölés törlése / Modal ablak bezárása',
          '? (Shift + /) : Súgó ablak megnyitása bárhonnan'
        ],
        callout: {
          type: 'tip',
          text: 'Több elem kijelölése után a Delete gomb megnyomásával az összes kijelölt elem egyszerre törölhető!'
        }
      }
    ]
  },

  // --- ELEMEK ÉS MODULOK ---
  {
    id: 'timers-counters-reset',
    categoryId: 'elements-modules',
    title: 'Timer, számláló (CTU/CTD), reset',
    summary: 'Ipari TON, TOF, TP időzítők, CTU/CTD számlálók és a COIL_RESET használata.',
    keywords: ['timer', 'ton', 'tof', 'tp', 'ctu', 'ctd', 'számláló', 'időzítő', 'reset'],
    sections: [
      {
        title: '1. Fejezet: Időzítő Modulok (TON, TOF, TP)',
        paragraphs: [
          'TON (On-Delay Timer): Be kapcsolási késleltetés. Amikor a fok energiát kap, az időzítő elindul. A beállított presetMs idő letelte után a kimenet HIGH lesz.',
          'TOF (Off-Delay Timer): Kikapcsolási késleltetés. Amikor a fok energiaellátása megszűnik, a kimenet még a beállított presetMs ideig HIGH marad.',
          'TP (Pulse Timer): Impulzus időzítő. Bemeneti engedélyezés hatására fix hosszúságú impulzust ad a kimeneten, függetlenül a bemenet későbbi ingadozásától.'
        ]
      },
      {
        title: '2. Fejezet: Számláló Modulok (CTU, CTD)',
        paragraphs: [
          'CTU (Count Up): Felfelé számláló. A fok energiájának minden felfutó élére (0->1) növeli a belső számláló értékét 1-gyel. Ha eléri a presetCount értéket, a kimenet Igaz lesz.',
          'CTD (Count Down): Lefelé számláló. Minden felfutó élre csökkenti a számláló értékét.'
        ]
      },
      {
        title: '3. Fejezet: Időzítők és Számlálók Törlése (COIL_RESET)',
        paragraphs: [
          'Ha egy COIL_RESET —(R)— elemet egy időzítő vagy számláló változójának nevére állítasz be, a fok energizálásakor a számláló értéke 0-ra áll vissza, és az időzítő alaphelyzetbe ugrik.'
        ]
      }
    ]
  },
  {
    id: 'm-bits-system-bits',
    categoryId: 'elements-modules',
    title: 'Belső M bitek és SM rendszer bitek',
    summary: 'Belső memóriabitek (M0..M15) és speciális rendszerváltozók (SM_FIRST_SCAN, SM_1HZ stb.).',
    keywords: ['m-bit', 'memória', 'sm', 'rendszerváltozó', 'sm_1hz', 'sm_first_scan', 'belső'],
    sections: [
      {
        title: '1. Fejezet: Belső Memória Bitekes (M0..M15)',
        paragraphs: [
          'A belső M bitek olyan virtuális relék és jelzőbitek, amelyek nem kapcsolódnak közvetlenül fizikai Arduino lábakhoz.',
          'Használhatók köztes állapotok, regiszterek, öntartó körök és szekvenciális lépések tárolására. Elérhetők INTERNAL_FLAG_CONTACT —[ M0 ]— és INTERNAL_FLAG_COIL —( M0 )— elemekként.'
        ]
      },
      {
        title: '2. Fejezet: Speciális Rendszer Bitek (SM Bitek)',
        paragraphs: [
          'A rendszer automatikusan biztosít fenntartott speciális biteket (System Memory - SM), amelyek segítségével könnyen megvalósíthatók időzített villogtatások és indítási rutinok:'
        ],
        bullets: [
          'SM_FIRST_SCAN: Csak a legelső ciklusban IGAZ (setup / boot inicializáláshoz).',
          'SM_ALWAYS_ON: Folyamatosan IGAZ (1).',
          'SM_ALWAYS_OFF: Folyamatosan HAMIS (0).',
          'SM_1HZ: 1 Hz-es ütemű villogó jel (0.5s BE / 0.5s KI).',
          'SM_10HZ: 10 Hz-es gyors villogó jel.',
          'SM_WATCHDOG: IGAZ-ra vált, ha a hardveres watchdog időtúllépést észlelt.'
        ]
      }
    ]
  },
  {
    id: 'combinational-logic-gates',
    categoryId: 'elements-modules',
    title: 'Kombinációs kapuk (AND/OR/XOR/NOT, 3-bemenetű)',
    summary: 'Kombinációs logikai kapu modulok (COMB_AND, COMB_OR, COMB_XOR, COMB_NOT) használata.',
    keywords: ['kapu', 'gate', 'and3', 'or3', 'xor', 'not', 'kombinációs', 'logika'],
    sections: [
      {
        title: '1. Fejezet: Kombinációs Kapu Modulok a Létrában',
        paragraphs: [
          'A stúdió támogatja a szintvezérelt kombinációs kapu modulokat is. Ezek az elemek az operandusaikból (sourceVariable, operandB, operandC) végzik el a boole-i logikai műveletet, és az eredményt a célváltozóba írják.'
        ],
        bullets: [
          'COMB_AND / COMB_AND3: 2 vagy 3 bemenetű ÉS kapu',
          'COMB_OR / COMB_OR3: 2 vagy 3 bemenetű VAGY kapu',
          'COMB_XOR: Kizáró VAGY kapu',
          'COMB_NOT: Inverter kapu'
        ]
      }
    ]
  },
  {
    id: 'macros-templates',
    categoryId: 'elements-modules',
    title: 'Makrók röviden',
    summary: 'Előre beépített ipari kapcsolási sablonok és saját létramakrók mentése.',
    keywords: ['makró', 'sablon', 'öntartó', 'csillag-delta', 'motor', 'recept'],
    sections: [
      {
        title: '1. Fejezet: Beépített Ipari Áramköri Makrók',
        paragraphs: [
          'A 3. Makrók menüpontban számos gyakran használt ipari kapcsolási rajz érhető el előre beparaméterezve:',
          'Motor Öntartó Kör (Direct On Line - DOL), Csillag-Delta indító szekvencia, Analóg határérték riasztás, Tartály szintszabályzó.'
        ]
      },
      {
        title: '2. Fejezet: Saját Létramakrók Mentése',
        paragraphs: [
          'A létraszerkesztőben tetszőleges fokokat kimenthetsz saját makróként. Az így elmentett sablonok friss egyedi azonosítókkal helyezhetők be bármelyik későbbi projektbe.'
        ]
      }
    ]
  },

  // --- SZIMULÁCIÓ ---
  {
    id: 'sim-start-reset',
    categoryId: 'simulation',
    title: 'Indítás / reset',
    summary: 'A valós idejű ciklikus szimuláció elindítása, leállítása és alaphelyzetbe állítása.',
    keywords: ['szimuláció', 'indítás', 'start', 'stop', 'reset', 'scan', 'ciklus'],
    sections: [
      {
        title: '1. Fejezet: Szimulációs Ciklus és Beállítások',
        paragraphs: [
          'A 2. Szimulátor nézetben a "Szimuláció Indítása" gombbal aktiválható a valós idejű PLC ciklus-kiértékelés.',
          'A szimulátor 50 ms-os lépésekben (20 Scan/sec) hajtja végre a létralogikát, a számlálókat, az időzítőket és a csatlakoztatott kommunikációs modulokat.'
        ]
      },
      {
        title: '2. Fejezet: Reset és Lépésenkénti Végrehajtás',
        paragraphs: [
          'Reset gomb: Alaphelyzetbe állítja az összes digitális és analóg bemenetet, törli a számlálókat, időzítőket és belső M biteket.',
          'Egyes Lépés (Step) gomb: Lehetővé teszi a program pontosan egyetlen ciklusának lefuttatását a hibakereséshez (Single Step Debugging).'
        ]
      }
    ]
  },
  {
    id: 'forcing-inputs',
    categoryId: 'simulation',
    title: 'Bemenet kényszerítés (Be/Ki a kontaktuson)',
    summary: 'Kontaktusok és bemeneti bitek azonnali kényszerítése és állapotváltása szimuláció alatt.',
    keywords: ['kényszerítés', 'force', 'be', 'ki', 'kontaktus', 'szimuláció'],
    sections: [
      {
        title: '1. Fejezet: Bemenetek Kényszerítése (Forcing)',
        paragraphs: [
          'A szimuláció alatt a létradiagramon vagy a szimulációs műszerfalon található kontaktusokra kattintva azonnal átváltható azok állapota.',
          'A kontaktus blokkokon megjelenő gyors "Be" és "Ki" gombok segítségével közvetlenül felülbírálható a fizikai pin (pl. D2), belső M bit vagy PLC változó állapota.'
        ],
        callout: {
          type: 'tip',
          text: 'A kényszerítés pillanatában a szimulátor azonnal lefuttat egy 0 ms-os vizsgálati ciklust, így a változás azonnal látható az egész létradiagramon!'
        }
      }
    ]
  },
  {
    id: 'power-flow-highlights',
    categoryId: 'simulation',
    title: 'Mit jelent az aktív kiemelés',
    summary: 'A vizuális energiaháló (Power-Flow) színkódjai és jelentésük.',
    keywords: ['kiemelés', 'szín', 'power flow', 'zöld', 'sárga', 'energizált', 'áram'],
    sections: [
      {
        title: '1. Fejezet: Az Energiaháló Színkódjai',
        paragraphs: [
          'Szimuláció közben a szerkesztő és a szimulátor vizuálisan jeleníti meg az energia áramlását a bal oldali tápsíntől a kimenetekig:'
        ],
        bullets: [
          'Zöld világító ág/elem: Energiát vezető, IGAZ állapotú szakasz.',
          'Sötét / Szürke szakasz: Energiamentes, HAMIS állapotú szakasz.',
          'Sárga/Lila keret: Aktívan időzítő TON/TOF modul vagy éppen szálon futó alprogram.',
          'Piros villogó sáv: Hardveres hiba, Watchdog időtúllépés vagy lábkonfliktus.'
        ]
      }
    ]
  },

  // --- KÓDGENERÁLÁS ---
  {
    id: 'arduino-code-output',
    categoryId: 'code-generation',
    title: 'Arduino kimenet szerepe',
    summary: 'A generált C++ kód felépítése, setup(), loop() és lábkonfigurációk.',
    keywords: ['arduino', 'kód', 'cpp', 'ino', 'generated', 'setup', 'loop', 'pinmode'],
    sections: [
      {
        title: '1. Fejezet: A Generált C++ Kód Szerkezete',
        paragraphs: [
          'Az 5. Arduino Kód nézetben (és a gyors gombra kattintva) megtekinthető a létradiagramból automatikusan fordított tiszta C++ forráskód.',
          'A generált kód követi a professzionális beágyazott programozási normákat: pinMode() beállítások a setup()-ban, valamint nem-blokkoló, millis()-alapú cikluskezelés a loop()-ban.'
        ],
        codeSnippet: `void setup() {
  pinMode(2, INPUT);   // START_BTN
  pinMode(8, OUTPUT);  // MOTOR_RELAY
}

void loop() {
  bool rung_0 = digitalRead(2);
  digitalWrite(8, rung_0 ? HIGH : LOW);
}`
      }
    ]
  },
  {
    id: 'clean-minimal-includes',
    categoryId: 'code-generation',
    title: 'Üres projekt = kevés include (usage-based)',
    summary: 'Igény szerinti header include kódgenerálás a flash memória takarékossághoz.',
    keywords: ['include', 'méret', 'flash', 'ram', 'minimal', 'library', 'header'],
    sections: [
      {
        title: '1. Fejezet: Használat-alapú Könyvtár Inklúzió',
        paragraphs: [
          'A stúdió kódgenerátora intelligens: ha egy üres vagy egyszerű projekten dolgozol, NEM tölti be feleslegesen a Wire.h, SPI.h, Servo.h vagy LiquidCrystal_I2C.h könyvtárakat.',
          'A kódba csak azok az header fájlok és objektumok kerülnek be, amelyeket az adott létradiagram ténylegesen használ. Ez garantálja a legkisebb kódméretet az Arduino ATmega328P korlátozott flash memóriájában.'
        ]
      }
    ]
  },
  {
    id: 'protocols-libraries-impact',
    categoryId: 'code-generation',
    title: 'Protokollok és könyvtárak hatása a sketch méretére',
    summary: 'Ipari buszok (I2C, SPI, Modbus, NRF24) memóriaigénye és beállításai.',
    keywords: ['protokoll', 'modbus', 'nrf24', 'i2c', 'spi', 'memória', 'sketch'],
    sections: [
      {
        title: '1. Fejezet: Protokollok Memóriaigénye',
        paragraphs: [
          'A 4. Menedzsment menüpontban engedélyezhető ipari protokollok különféle hardveres és szoftveres erőforrásokat igényelnek:'
        ],
        bullets: [
          'Modbus RTU (RS485): Ciklikus telegram puffert és UART soros portot igényel.',
          'NRF24L01+: RF24 könyvtárat és SPI buszt használ.',
          '24Cxxx EEPROM / SD Datalogger: Puffer memóriát foglal a RAM-ban.'
        ]
      }
    ]
  },

  // --- HALADÓ ---
  {
    id: 'tasks-programs-structure',
    categoryId: 'advanced',
    title: 'Task / program struktúra',
    summary: 'Multi-tasking adatmodell: Ciklikus és folyamatos taszkok, létrák és FBD-k.',
    keywords: ['task', 'program', 'multi-tasking', 'fbd', 'cyclic', 'priority'],
    sections: [
      {
        title: '1. Fejezet: Taszkok és Programok Szervezése',
        paragraphs: [
          'A stúdió támogatja az ipari multi-tasking architektúrát. Egy projekt több taszkból (Task) állhat, amelyhez több program (Program) rendelhető.',
          'A ciklikus (Cyclic) taszkok megadott időközönként (pl. 10 ms), míg a folyamatos taszkok megszakítás nélkül futnak.'
        ]
      }
    ]
  },
  {
    id: 'fbd-state-machine',
    categoryId: 'advanced',
    title: 'FBD / állapotgép röviden',
    summary: 'Funkcióblokk diagram (FBD) és Állapotgép (SFC) szerkesztők.',
    keywords: ['fbd', 'sfc', 'állapotgép', 'diagram', 'latch', 'funkcióblokk'],
    sections: [
      {
        title: '1. Fejezet: Funkcióblokk Diagram (FBD)',
        paragraphs: [
          'A létradiagram mellett a stúdió vizuális FBD szerkesztőt is biztosít. A blokkok (bemenetek, kapuk, tárolók) és a bezier-görbékkel összekötött jelek közvetlenül szimulálhatók és C++ kódra fordíthatók.'
        ]
      },
      {
        title: '2. Fejezet: Állapotgép Editor (SFC-Lite)',
        paragraphs: [
          'A szekvenciális folyamatokhoz (pl. csomagológép, mosóprogram) vizuális állapotgép tervezhető állapotokkal (States) és átmeneti feltételekkel (Transitions).'
        ]
      }
    ]
  },
  {
    id: 'common-errors-validation',
    categoryId: 'advanced',
    title: 'Gyakori hibák (validáció, dupla tekercs, setup-ba nem illő blokk)',
    summary: 'Beépített validációs szabályok, figyelmeztetések és hibaelhárítás.',
    keywords: ['hiba', 'validáció', 'figyelmeztetés', 'dupla tekercs', 'címzés', 'jmp', 'lbl'],
    sections: [
      {
        title: '1. Fejezet: Beépített Validációs Ellenőrzések',
        paragraphs: [
          'A szerkesztő valós időben ellenőrzi a létradiagram integritását, és sárga/piros figyelmeztetést ad az alábbi esetekben:'
        ],
        bullets: [
          'Dupla kimenet / tekercs: Ugyanaz a kimenet több normál tekercsben szerepel.',
          'Hiányzó / Érvénytelen címzés: Nincs megadva a kontaktus pინ-je vagy változója.',
          'Ismeretlen Ugrási Cél (JMP): A JMP modul olyan LBL címkére hivatkozik, ami nem létezik.',
          'Visszafelé ugrás: A JMP nem ugorhat korábbi fokszámra (hurokveszély elkerülése).',
          'Setup szekció összeférhetetlenség: Ciklikus blokk elhelyezése az indító Setup-ban.'
        ],
        callout: {
          type: 'warning',
          text: 'Mindig vizsgáld meg a Diagnosztika menüpontot vagy az elem feletti felkiáltójelet a hibák elhárításához!'
        }
      }
    ]
  }
];
