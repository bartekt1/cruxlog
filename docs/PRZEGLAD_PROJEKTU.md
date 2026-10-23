# Cruxlog: przegląd projektu

Stan na 23 października 2026. Dokument dla zespołu i dla agenta AI, który ma pracować z projektem bez dostępu do kodu. Kod jest w publicznym repozytorium `github.com/bartekt1/cruxlog`, gałąź robocza `claude/optimize-costs-quality-ux-5janpl`, główna `main`.

## 1. Czym jest Cruxlog

Dziennik wspinaczkowy i przewodnik po skałach na telefon z Androidem (iOS później). Jedna osoba zapisuje swoje przejścia dróg, ogląda postępy, wyznacza cele i ma przy sobie bazę skał z mapą, zdjęciami ścian i liniami dróg (topo).

Główne założenia:
- **Bez konta i bez serwera.** Wszystkie dane leżą w telefonie. Kopia zapasowa trafia do folderu wybranego przez użytkownika (zwykle Dysk Google).
- **Prywatność.** Pozycja telefonu służy tylko do pokazania „jesteś tutaj” i skał w pobliżu. Aplikacja nie nagrywa śladów GPS i niczego nie wysyła. Zdjęcia nie mają danych o miejscu. Aplikacja nie czyta galerii; dostaje tylko zdjęcia wybrane w systemowym oknie wyboru.
- **Tylko wspinaczka z liną.** Drogi sportowe i wielowyciągowe; bouldery zostały usunięte z aplikacji.
- **Dwa języki:** polski i angielski. Wszystkie napisy idą przez pliki tłumaczeń.
- **Wygląd „przewodnik kredą”:** papierowe kolory, czcionki Barlow, wyceny w ciemnych kwadratach. Tryb jasny i ciemny.
- **Gotowość na przyszłą synchronizację i funkcje społecznościowe.** Każdy wiersz w bazie ma identyfikator tekstowy i daty utworzenia, zmiany i usunięcia. Nic nie jest kasowane fizycznie (tylko oznaczane jako usunięte).
- **Dane z przewodników tylko jako fakty:** nazwa, wycena, długość, położenie. Bez kopiowania opisów i rysunków chronionych prawem autorskim. Przed publikacją w sklepie potrzebna jest opinia prawnika.

## 2. Jak działa aplikacja (ekrany)

Dolny pasek ma 4 zakładki i środkowy przycisk „+”:

| Zakładka | Co robi |
|---|---|
| **Dziennik** | Lista przejść pogrupowana po dniach, wynik sezonu, przypomnienie o kopii zapasowej. |
| **Postępy** | Statystyki dowolnego roku: przejścia, dni na skale, najtrudniejsza droga, piramida trudności, najtrudniejsze w miesiącu i w roku, style przejść, kalendarz aktywności, najczęstsze skały i partnerzy. |
| **+** | Nowe przejście. |
| **Skały** | Drzewo miejsc: region › rejon › grupa (dowolnie głęboko) › skała › sektor › droga. Wyszukiwarka na każdym poziomie. Widok listy i mapy, skały w pobliżu. |
| **Cele** | Wyprawy (plan i podsumowanie) oraz cele w czterech rodzajach: liczba przejść w roku, liczba dróg od danej wyceny, projekt (konkretna droga), lista życzeń. |

Najważniejsze ekrany poza zakładkami:
- **Nowe przejście / edycja:**
  - droga do wyboru przez wyszukiwanie, skały w pobliżu, ostatnio wspinane albo wpisanie nowej drogi (z rejonem, skałą, sektorem i wyceną);
  - data, styl (OS, flash, RP, PP, TR, próba), liczba prób, własna wycena, ocena gwiazdkami, partner, warunki, notatka;
  - do 5 zdjęć;
  - przy próbie przełącznik „zrób z tej drogi projekt”.
- **Droga:** historia przejść jako oś czasu, dodanie do projektów lub listy życzeń, sekcja Topo ze zdjęciem ściany i podświetloną linią, przycisk „Dodaj kolejne przejście”.
- **Skała:** położenie (dokładne albo przybliżone), opis, dojście, zdjęcia skały (do 10), drogi pogrupowane po sektorach z ich zdjęciami (do 10 na sektor), znaczki projekt/życzenie, edycja.
- **Zdjęcie na pełnym ekranie:** przewijanie, linie topo z numerami (stuknięcie w numer otwiera drogę), usuwanie, przejście do edytora topo.
- **Edytor topo:**
  - tryb „Ringi”: stuka się start, kolejne przeloty i stanowisko, a linia sama prowadzi się płynną krzywą;
  - tryb „Ręcznie”: rysuje się palcem;
  - powiększanie dwoma palcami i przyciskami (do 8×), przesuwanie i usuwanie punktów, cofnij i ponów.
- **Wyprawa:** nazwa, dni (od–do), skały, lista proponowanych dróg w ustalonej kolejności i wiadomość. Przed wyjazdem: karta-zaproszenie do WhatsAppa i tekst z linkiem do mapy. W dniach wyprawy jej drogi są podpowiadane jako pierwsze przy dodawaniu przejścia. Po wyjeździe podsumowanie (przejścia, dni, najtrudniejsza droga, ile z planu zrobione) i karta „Pochwal się”.
- **Udostępnianie** (droga, przejście, skała): obrazek-karta do wysłania np. przez WhatsApp oraz tekst z linkiem do Map Google. Pozycja skały jest domyślnie włączona; zdjęcie z linią topo jest opcjonalne, domyślnie wyłączone, bo na zdjęciach bywają inne osoby.
- **Ustawienia:** język, motyw, domyślna skala wycen, import CSV, usuwanie importowanych danych, automatyczna kopia (wybór folderu, „Zrób kopię teraz”, lista kopii z przyciskiem „Przywróć”), schowana ręczna kopia jednym plikiem.
- **Wyszukiwarka dróg:** filtry wyceny od–do, miejsca, statusu (jeszcze nie próbowane, tylko próby, przejście zaliczone) i typu.
- **Ustawianie położenia skały:** z GPS telefonu albo przez przesunięcie mapy.

## 3. Technologie

| Obszar | Technologia |
|---|---|
| Platforma | React Native 0.86 + Expo SDK 57, TypeScript (tryb ścisły) |
| Nawigacja | expo-router (pliki w `app/` to ekrany) |
| Baza danych | SQLite przez expo-sqlite (asynchroniczne API), migracje przez `PRAGMA user_version` |
| Ustawienia | Zustand + `expo-sqlite/kv-store` |
| Tłumaczenia | i18next + react-i18next, pliki `src/i18n/pl.json` i `en.json` |
| Mapa | MapLibre (`@maplibre/maplibre-react-native` 11); podkłady OpenFreeMap (domyślny) i OpenTopoMap (poziomice) |
| Położenie | expo-location (tylko gdy aplikacja jest otwarta) |
| Zdjęcia | expo-image-picker (systemowe okno wyboru, bez uprawnień do aparatu i galerii), expo-image-manipulator (zmniejszanie do JPEG) |
| Rysowanie | react-native-svg (linie topo, poziomice w tle) |
| Udostępnianie | react-native-view-shot (zrzut karty), expo-sharing, Share z React Native |
| Pliki | expo-file-system (nowe API File/Directory, dostęp do folderu przez Android SAF), expo-document-picker |
| CSV i kompresja | papaparse, fflate (gzip) |
| Testy | Jest; testy bazy na prawdziwym SQLite z Node (`node:sqlite`); test synchronizacji tłumaczeń (te same klucze w obu językach, brak tekstu wpisanego na sztywno w ekranach) |
| Budowanie | GitHub Actions: przy każdym wysłaniu kodu typecheck, testy, `expo prebuild` i build APK (tylko arm64). Plik do pobrania: Artifacts › `cruxlog-apk`. |

Struktura kodu:
- `app/`: ekrany.
- `src/domain/`: czysta logika bez zależności od telefonu, w całości pokryta testami. Obejmuje:
  - wyceny i przeliczenia;
  - statystyki, cele i daty;
  - odczyt plików CSV;
  - geometrię topo (wygładzanie, powiększanie, cofanie);
  - zasady kopii zapasowej;
  - odległości;
  - tekst udostępniania.
- `src/db/`: zapytania do bazy podzielone tematycznie: drogi, przejścia, skały, rejony, cele, import, zdjęcia, topo. Do tego migracje i kopia JSON. Ekrany korzystają z nich przez jeden plik `repo.ts`.
- `src/ui/`: wspólne komponenty, motyw, czcionki, mapa, zdjęcia, automatyczna kopia, części dużych ekranów.
- `__tests__/`: około 190 testów.
- `docs/`: plan prac (`NEXT.md`), procedura testów na telefonie (`TESTING.md`), audyt UX (`UX_AUDIT.md`), dokument projektowy (`design.html`).
- `CLAUDE.md` i `AGENTS.md`: zasady dla agentów AI; `.claude/skills/`: gotowe procedury (sprawdzanie, nowy ekran, migracja bazy, tłumaczenia, audyt UX).

## 4. Przechowywanie danych

### Baza SQLite na telefonie

Tabele:

| Tabela | Zawartość |
|---|---|
| `region` | Miejsca nad skałą: poziom `region`, `area` (rejon) albo `group`, link do rodzica (drzewo dowolnej głębokości), źródło (`user`/`import`). |
| `crag` | Skała: nazwa, rejon, opis, dojście, `lat`/`lng` i skąd pochodzi pozycja (`pos_source`: `user` ustawione na telefonie, `file` z pliku, `approx` przybliżone, puste = brak). |
| `sector` | Sektor (ściana) skały. Skała bez sektorów ma jeden sektor nazwany jak ona. |
| `route` | Droga: nazwa, typ (`sport`/`multipitch`), wycena, długość, liczba przelotów. |
| `pitch`, `ascent_pitch` | Wyciągi dróg wielowyciągowych; tabele gotowe, formularz jeszcze nie. |
| `partner` | Partnerzy wspinaczkowi (po nazwie). |
| `ascent` | Przejście: droga, data, styl, próby, ocena, własna wycena, partner, warunki, notatka. |
| `goal` | Cel: rodzaj, nazwa, liczba docelowa, wycena, droga, data wykonania. |
| `pack` | Pobrane paczki skał: identyfikator, nazwa, wersja. Skała ma `pack_id` paczki, z której pochodzi. |
| `trip`, `trip_crag`, `trip_route` | Wyprawa: nazwa, dni, wiadomość; jej skały i proponowane drogi z kolejnością. |
| `photo` | Zdjęcie: do czego należy (`ascent`, `crag`, `sector`), wymiary, rozmiar, kolejność. |
| `topo_line` | Linia drogi na zdjęciu: punkty zapisane względnie (0..1 szerokości i wysokości zdjęcia, JSON), tryb `bolts`/`free`. |

Zasady:
- **Identyfikatory i daty.** Każdy wiersz ma tekstowy identyfikator oraz `created_at`, `updated_at` i `deleted_at` (milisekundy). Usuwanie tylko ustawia `deleted_at`.
- **Własne drogi.** Drogi dodane przez użytkownika mają `source='user'` i `status='private'`. Przygotowanie pod przyszłe „zaproponuj do katalogu”.
- **Wycena** jest zapisana jako pozycja na wspólnej drabinie trudności (`grade_index`) plus oryginalny zapis i skala. Skale: kręgowa (VI.1+), UIAA (VII-) i francuska (6a+), przeliczane w przybliżeniu. Na ekranie pokazuje się oryginał, gdy skala się zgadza.
- **Migracje** tylko się dopisuje (obecnie 11), starych nigdy się nie zmienia. Przy zmianie formatu kopii podbija się `BACKUP_VERSION` (obecnie 9), a starsze kopie dalej się wczytują.
- **Transakcje.** Zapis, który dotyka kilku tabel, idzie w jednej transakcji: nowe przejście z nową drogą, zdjęciami i projektem zapisuje się w całości albo wcale.

### Zdjęcia

- **Pliki** `photos/<id>.jpg` w prywatnym folderze aplikacji, wiersze w tabeli `photo`.
- **Limity:**
  - przejście: do 5 zdjęć, zmniejszanych do 1600 px;
  - skała i sektor: do 10 zdjęć, zmniejszanych do 2000 px;
  - JPEG o jakości 0,75, kilkaset KB na zdjęcie.
- **Sprzątanie.** Przy starcie aplikacja usuwa pliki, których nie potrzebuje już żadne zdjęcie.

### Ustawienia

Język, motyw, skala wycen, podkład mapy oraz stan kopii (folder, data ostatniej kopii, ostatni błąd) są zapisane w osobnym magazynie klucz–wartość, a nie w tabelach.

## 5. Kopia zapasowa i przywracanie

**Automatyczna kopia (główny sposób):**
- **Wybór folderu.** Użytkownik raz wybiera folder w systemowym oknie (Dysk Google albo folder w telefonie). Aplikacja dostaje trwały dostęp tylko do niego.
- **Kiedy powstaje kopia.** Przy otwarciu aplikacji i przy powrocie do niej, jeśli minęło 7 dni i coś się zmieniło. Kopia to cała baza jako JSON spakowany gzipem: `cruxlog-RRRR-MM-DD-GGMM.json.gz`. Zostaje 5 najnowszych kopii.
- **Zdjęcia** trafiają do podfolderu `zdjecia/`, każde tylko raz, wkrótce po dodaniu. Rok zdjęć to dziesiątki MB, nie gigabajty.
- **Rozpoznawanie plików.** Dysk Google nie pokazuje aplikacji czytelnych nazw plików, więc aplikacja pamięta adresy tego, co zapisała. Własne pliki rozpoznaje po zawartości: kopie po polu JSON, zdjęcia po znaczniku `cruxlog:<id>` wpisanym do pliku JPEG. Dzięki temu na nowym telefonie po wybraniu tego samego folderu znajduje wcześniejsze kopie.
- **Jedna operacja naraz.** Wszystkie operacje na folderze idą po kolei (blokada), żeby nie zapisały się dwa razy.
- **Przywracanie** z listy kopii w Ustawieniach. Wiersze łączą się po identyfikatorze i wygrywa nowsza data zmiany, więc nic się nie dubluje. Zdjęcia wracają z podfolderu.

**Ręczna kopia (schowana w „Inne sposoby kopii”):** eksport całej bazy jednym plikiem JSON przez systemowe okno udostępniania (bez zdjęć) i import pliku `.json` albo `.json.gz`.

## 6. Import danych

Jeden format: **wzór Cruxlog** (`docs/IMPORT.md`, przykład `docs/cruxlog-wzor.csv`). Właściciel buduje własną bazę skał we wzorze, wolną od danych stron trzecich. Inne formaty plików nie są obsługiwane.

- Plik CSV (UTF-8; separator średnik, przecinek albo tabulator), jeden wiersz to jedna droga. Kolumny są wyszukiwane po nazwach nagłówków, w dowolnej kolejności, a nieznane kolumny aplikacja pomija. Nazwy są po polsku lub angielsku; wielkość liter i polskie znaki nie mają znaczenia.
- **Obowiązkowe:** Region, Rejon, Skała, Nazwa, Wycena. Gdy którejś brakuje, aplikacja wypisuje, której.
- **Opcjonalne dla drogi:** Grupa (kilka poziomów przez `›`), Sektor, Typ (droga/wielowyciąg), Skala_wycen (kr/uiaa/fr), Długość, Przeloty, Autor, Rok, Opis, ID_drogi.
- **Opcjonalne dla skały:** Lat, Lng, Przybliżone, Opis_skały, Dojście, ID_skały. Wystarczy je wpisać w jednym wierszu danej skały.
- **Plik położeń:** same kolumny Skała (lub ID_skały), Lat, Lng, ewentualnie Przybliżone. Ustawia tylko pinezki na mapie.

Zasady importu:
- **Najpierw sprawdzenie całego pliku.** Błędy pokazują się z nazwą pliku i numerem wiersza i wtedy nic się nie zapisuje. Potem pytanie z liczbą skał i dróg. Bouldery są pomijane.
- **Identyfikatory.** Wiersze z importu mają identyfikatory `imp:<rodzaj>:<klucz>`. Kluczem jest ID_skały lub ID_drogi z pliku, a bez nich klucz robiony z nazw. Ponowny import aktualizuje te same wiersze.
- **Przejmowanie po nazwie.** Skała o tej samej nazwie (gdy w aplikacji jest dokładnie jedna), a w niej sektor i droga o tej samej nazwie, są przejmowane razem z przejściami, zdjęciami i liniami topo.
- **Zapamiętany klucz.** Przy przejętym wierszu zostaje zapisany klucz z pliku (kolumna `import_key`, migracja 9). Następne importy trafiają w ten sam wiersz, także po zmianie nazwy w pliku. Komunikat po imporcie podaje liczbę przejętych dróg.
- **Plik decyduje o drogach skały.** Zaimportowane wcześniej drogi tej skały, których nie ma w pliku i które nie mają przejść, znikają. Drogi dodane w telefonie zostają.
- **Puste komórki.** Pusta komórka opcjonalnej kolumny zostawia istniejącą wartość.
- **Pozycje.** Pozycja ustawiona ręcznie na telefonie nigdy nie jest nadpisywana plikiem.
- Przycisk **„Usuń importowane skały i drogi”** zostawia drogi, na których użytkownik ma przejścia.
- **Obecna baza we wzorze.** Właściciel ma obecną bazę z telefonu jako plik we wzorze, z własnymi numerami (`sk-0001`, `dr-00001`), do dalszej pracy. Plik nie trafia do repozytorium. Wgrany do aplikacji przejmuje istniejące skały i drogi po nazwie, z przejściami.

### Paczki skał z internetu

- Osobne, publiczne repozytorium `bartekt1/cruxlog-paczki`. Właściciel wrzuca bazę (CSV we wzorze) do `baza/`, a automat na GitHubie („Zbuduj paczki”) dzieli ją na paczki: **jedna paczka = jedna grupa skał** (pierwszy poziom kolumny Grupa; skały bez grupy trafiają do „<Rejon> – pozostałe skały”). Automat zapisuje `paczki/<id>.csv` i spis `index.json` (nazwa, region, rejon, liczba skał i dróg, wersja, rozmiar, obszar na mapie). Wersja rośnie, gdy zmieni się zawartość paczki.
- W aplikacji: Ustawienia › Paczki skał. Lista pogrupowana Region › Rejon. Każdą paczkę można pobrać, zaktualizować albo usunąć; jest też „Pobierz cały rejon”. Paczka wgrywa się jak zwykły import (te same zasady przejmowania i ID), a skały pamiętają, z której paczki są (`crag.pack_id`, tabela `pack`, migracja 11). Usunięcie paczki zostawia drogi z przejściami i drogi dodane w telefonie.
- Dalsze etapy: topo w paczkach, mapy offline dla obszaru paczki.

## 7. Eksport i udostępnianie

- **Kopia zapasowa:** patrz punkt 5.
- **Udostępnianie** drogi, przejścia lub skały:
  - obrazek-karta PNG 1080 px szerokości: nazwa, wycena, styl, skała › sektor, ścieżka miejsca, data, współrzędne, opcjonalnie zdjęcie z linią topo;
  - wiadomość tekstowa z linkiem do Map Google.

  Pozycji telefonu nigdy nie ma w udostępnianych danych.

## 8. Jakość i sposób pracy

- **Przed każdym wysłaniem kodu:** sprawdzenie typów (`npm run typecheck`), testy (`npm test`) i próbne zbudowanie paczki aplikacji (`expo export`).
- **Testy na telefonie** według `docs/TESTING.md`. Właściciel sprawdza na swoim telefonie i zgłasza uwagi ze zrzutami ekranu.
- **Akceptacja przed pracą.** Właściciel nie jest programistą: zmiany są najpierw przedstawiane prostym językiem i zaczynane dopiero po akceptacji.
- **Repozytorium jest publiczne.** Nie wolno do niego wrzucać danych użytkownika: plików z bazą skał, kopii zapasowych, wyników dopasowań położeń. Folder `import-kamieniec/` jest wyłączony z repozytorium.
- **Audyt (21.10.2026).** Naprawiono ciche błędy, podwójne zapisy i równoległe kopie. Przyspieszono wyszukiwanie. Podzielono duże pliki i wspólne elementy interfejsu wydzielono do jednego miejsca.

## 9. Co dalej (kolejność właściciela)

1. Mapy offline: pobranie mapy rejonu przed wyjazdem (pakiety MapLibre dla OpenFreeMap; OpenTopoMap nie pozwala na masowe pobieranie).
2. Multipitch w formularzu przejścia: wyciągi, kto prowadził, styl na wyciąg.
3. Skały bez pozycji: poprawianie na miejscu, ewentualnie ponowne dopasowanie z OSM.
4. Sprawdzenia na urządzeniu: TalkBack, największa czcionka, tryb ciemny na każdym ekranie.
5. Pomysły do topo: wstawianie punktu między przelotami, lupa pod palcem.

Przed publikacją w sklepie: sprawdzenie nazwy i domeny, polityka prywatności, licencja, opinia prawna o danych z przewodników, wersja na iOS. Potem funkcje społecznościowe z moderacją proponowanych dróg.

## 10. Pytania do dyskusji w zespole

- **Synchronizacja i konta:** czy i kiedy? Dane są na to przygotowane (identyfikatory, daty zmian, miękkie usuwanie).
- **Prawa do danych z przewodników** przed udostępnieniem innym użytkownikom.
- **Model katalogu:** wspólna baza skał czy każdy importuje swoją?
- **Monetyzacja i publikacja:** sklep Google Play, później App Store.
- **Moderacja dróg proponowanych przez użytkowników:** kto akceptuje i jakie minimum danych.
