# Cruxlog: przegląd projektu

Stan na 22 października 2026. Dokument dla zespołu i dla agenta AI, który ma pracować z projektem bez dostępu do kodu. Kod jest w publicznym repozytorium `github.com/bartekt1/cruxlog`, gałąź robocza `claude/optimize-costs-quality-ux-5janpl`, główna `main`.

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
| **Cele** | Cztery rodzaje: liczba przejść w roku, liczba dróg od danej wyceny, projekt (konkretna droga), lista życzeń. |

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
| `photo` | Zdjęcie: do czego należy (`ascent`, `crag`, `sector`), wymiary, rozmiar, kolejność. |
| `topo_line` | Linia drogi na zdjęciu: punkty zapisane względnie (0..1 szerokości i wysokości zdjęcia, JSON), tryb `bolts`/`free`. |

Zasady:
- **Identyfikatory i daty.** Każdy wiersz ma tekstowy identyfikator oraz `created_at`, `updated_at` i `deleted_at` (milisekundy). Usuwanie tylko ustawia `deleted_at`.
- **Własne drogi.** Drogi dodane przez użytkownika mają `source='user'` i `status='private'`. Przygotowanie pod przyszłe „zaproponuj do katalogu”.
- **Wycena** jest zapisana jako pozycja na wspólnej drabinie trudności (`grade_index`) plus oryginalny zapis i skala. Skale: kręgowa (VI.1+), UIAA (VII-) i francuska (6a+), przeliczane w przybliżeniu. Na ekranie pokazuje się oryginał, gdy skala się zgadza.
- **Migracje** tylko się dopisuje (obecnie 8), starych nigdy się nie zmienia. Przy zmianie formatu kopii podbija się `BACKUP_VERSION` (obecnie 6), a starsze kopie dalej się wczytują.
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

Jeden przycisk w Ustawieniach, „Importuj skały z pliku CSV”. Aplikacja sama rozpoznaje rodzaj pliku po nagłówkach:

| Format | Rozpoznanie | Co daje |
|---|---|---|
| **Prosta tabela** | kolumny region, rejon, grupa, skała, sektor, nazwa, typ, wycena (po polsku lub angielsku; separator przecinek, średnik lub tabulator); opcjonalnie skala wyceny, długość, przeloty, opis, lat, lng | drzewo miejsc i drogi |
| **Eksport z przewodnika** | polskie nagłówki z kolumną „Rodzaj wyceny” | regiony, rejony, grupy, skały, sektory („Krowia (ściana zachodnia)” → skała Krowia, sektor Ściana zachodnia), wyceny kręgowe |
| **Eksport z theCrag** | kolumny Region; Sektor; Nazwa; Trudność; …; Długość (m); Przeloty | cała ścieżka miejsc z kolumny „Sektor”, przeliczenie wycen (UIAA, francuska, YDS, słowacka) |
| **Plik położeń** | skała (lub klucz skały), lat, lng, opcjonalnie „przybliżone” | tylko pozycje skał na mapie |

Zasady importu:
- Najpierw sprawdzenie całego pliku. Błędy pokazują się z nazwą pliku i numerem wiersza i wtedy nic się nie zapisuje.
- Potem pytanie z liczbą skał i dróg oraz liczbą pominiętych wierszy.
- Pomijane: bouldery, lód i via ferraty, drogi bez nazwy, projekty, drogi bez wyceny lub z nieczytelną wyceną, drogi z zakazem wspinania.
- **Stałe klucze** (`imp:<rodzaj>:<klucz>`): ponowny import tego samego pliku aktualizuje dane zamiast je dublować. Cofa ręczne zmiany w importowanych drogach, ale zostawia przejścia użytkownika i jego własne drogi.
- **Pozycje.** Pozycja ustawiona ręcznie na telefonie nigdy nie jest nadpisywana plikiem.
- Przycisk **„Usuń importowane skały i drogi”** zostawia drogi, na których użytkownik ma przejścia.
- **Pozycje skał z OpenStreetMap** były dopasowane jednorazowo skryptami poza aplikacją (przez GitHub Actions, bo sandbox nie miał dostępu do OSM). Skały bez dokładnej pozycji dostały pozycję przybliżoną z sąsiednich skał grupy i są tak oznaczone. Około 40 skał nie ma pozycji; użytkownik poprawia je na miejscu.
- Dawny import z trzech plików (crags.csv, sectors.csv, routes.csv) usunięto 21 października 2026.

## 7. Eksport i udostępnianie

- **Kopia zapasowa:** patrz punkt 5.
- **Udostępnianie** drogi, przejścia lub skały:
  - obrazek-karta PNG 1080 px szerokości: nazwa, wycena, styl, skała › sektor, ścieżka miejsca, data, współrzędne, opcjonalnie zdjęcie z linią topo;
  - wiadomość tekstowa z linkiem do Map Google.

  Pozycji telefonu nigdy nie ma w udostępnianych danych.
- **Eksport do theCrag (zaplanowany, czeka na zgodę właściciela):**
  - plik CSV do zaimportowania samemu na stronie theCrag, w jedną stronę, bez logowania i hasła w aplikacji (theCrag nie ma publicznego API do zapisu dla osób prywatnych);
  - lista przejść z zaznaczaniem; domyślnie tylko przejścia zaliczające, jeszcze nie wysłane;
  - kraj zapisany raz dla regionu, notatki domyślnie wyłączone, partner domyślnie włączony;
  - po wysłaniu znacznik „wysłane do theCrag”; wymaga nowej kolumny w bazie;
  - najpierw testowy plik z 3 wierszami do sprawdzenia nazw kolumn i stylów.

## 8. Jakość i sposób pracy

- **Przed każdym wysłaniem kodu:** sprawdzenie typów (`npm run typecheck`), testy (`npm test`) i próbne zbudowanie paczki aplikacji (`expo export`).
- **Testy na telefonie** według `docs/TESTING.md`. Właściciel sprawdza na swoim telefonie i zgłasza uwagi ze zrzutami ekranu.
- **Akceptacja przed pracą.** Właściciel nie jest programistą: zmiany są najpierw przedstawiane prostym językiem i zaczynane dopiero po akceptacji.
- **Repozytorium jest publiczne.** Nie wolno do niego wrzucać danych użytkownika: plików z przewodników i theCrag, kopii zapasowych, wyników dopasowań położeń. Folder `import-kamieniec/` jest wyłączony z repozytorium.
- **Audyt (21.10.2026).** Naprawiono ciche błędy, podwójne zapisy i równoległe kopie. Przyspieszono wyszukiwanie. Podzielono duże pliki i wspólne elementy interfejsu wydzielono do jednego miejsca.

## 9. Co dalej (kolejność właściciela)

1. Mapy offline: pobranie mapy rejonu przed wyjazdem (pakiety MapLibre dla OpenFreeMap; OpenTopoMap nie pozwala na masowe pobieranie).
2. Multipitch w formularzu przejścia: wyciągi, kto prowadził, styl na wyciąg.
3. Skały bez pozycji: poprawianie na miejscu, ewentualnie ponowne dopasowanie z OSM.
4. Sprawdzenia na urządzeniu: TalkBack, największa czcionka, tryb ciemny na każdym ekranie.
5. Eksport do theCrag (plan w punkcie 7).
6. Pomysły do topo: wstawianie punktu między przelotami, lupa pod palcem.

Przed publikacją w sklepie: sprawdzenie nazwy i domeny, polityka prywatności, licencja, opinia prawna o danych z przewodników, wersja na iOS. Potem funkcje społecznościowe z moderacją proponowanych dróg.

## 10. Pytania do dyskusji w zespole

- **Synchronizacja i konta:** czy i kiedy? Dane są na to przygotowane (identyfikatory, daty zmian, miękkie usuwanie).
- **Prawa do danych z przewodników** przed udostępnieniem innym użytkownikom.
- **Model katalogu:** wspólna baza skał czy każdy importuje swoją?
- **Monetyzacja i publikacja:** sklep Google Play, później App Store.
- **Moderacja dróg proponowanych przez użytkowników:** kto akceptuje i jakie minimum danych.
