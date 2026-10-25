# Import skał i dróg: wzór pliku

Wzór z przykładowymi (zmyślonymi) wierszami: `docs/cruxlog-wzor.csv`. Kod: `src/domain/flatImport.ts` (kolumny), `src/domain/importPlan.ts` (sprawdzanie), `src/db/imports.ts` (zapis).

Jeden plik CSV (UTF-8, separator średnik), **jeden wiersz = jedna droga**. Kolejność kolumn dowolna, aplikacja szuka ich po nazwach nagłówków. Kolumny, których nie zna, pomija. Wielkość liter i polskie znaki w nagłówkach nie mają znaczenia (`Skala` = `Skała`).

## Kolumny obowiązkowe

| Kolumna | Przykład | Uwagi |
|---|---|---|
| Region | Czarnorzeki | najwyższy poziom |
| Rejon | Kamieniec | |
| Skała | Krowia | |
| Nazwa | Rysa przy drzewie | nazwa drogi |
| Wycena | VI.1 | w skali z kolumny Skala_wycen |

## Kolumny opcjonalne: droga

| Kolumna | Przykład | Uwagi |
|---|---|---|
| Grupa | Grupa Północna | kilka poziomów oddzielonych znakiem `›`; puste = skała leży wprost w rejonie |
| Sektor | Ściana zachodnia | puste = sektor nazwany jak skała |
| Typ | droga / wielowyciąg | puste = droga sportowa |
| Skala_wycen | kr / uiaa / fr | puste = kr (kręgowa); można mieszać w jednym pliku |
| Długość | 18 | metry |
| Przeloty | 6 | liczba |
| Autor | Jan Kowalski | pierwsze przejście |
| Rok | 2019 | rok pierwszego przejścia |
| Opis | Rysą do ringu… | własny opis, bez kopiowania z przewodników |
| ID_drogi | dr-0001 | stały identyfikator: pozwala później zmienić nazwę drogi bez tworzenia duplikatu |

## Kolumny opcjonalne: skała (wystarczy wpisać w jednym wierszu tej skały)

| Kolumna | Przykład | Uwagi |
|---|---|---|
| Lat, Lng | 49.74440, 21.78330 | położenie skały w stopniach dziesiętnych (kropka albo przecinek) |
| Przybliżone | tak | pozycja przybliżona; puste = dokładna |
| Opis_skały | Lita ściana przy szlaku | |
| Dojście | 10 min od parkingu | |
| ID_skały | sk-001 | stały identyfikator skały, jak ID_drogi |

## Zasady

- Ponowny import tego samego pliku aktualizuje dane, nie dubluje ich; Twoje przejścia zostają.
- **Przejmowanie istniejących danych.** Skała o tej samej nazwie (gdy w aplikacji jest dokładnie jedna taka), a w niej sektor i droga o tej samej nazwie są przejmowane razem z przejściami, zdjęciami i liniami topo. Aplikacja zapamiętuje przy nich ID_skały i ID_drogi (albo klucz zrobiony z nazw, gdy ID nie ma), więc kolejne importy trafiają w te same wiersze, także po zmianie nazwy w pliku, o ile ID się nie zmieni.
- Plik decyduje, jakie drogi ma skała: zaimportowane wcześniej drogi tej skały, których w pliku nie ma, znikają, chyba że masz na nich przejścia. Drogi dodane ręcznie w telefonie zostają.
- Pusta komórka opcjonalnej kolumny (opis, długość, przeloty, autor, rok, dojście) zostawia to, co już jest w aplikacji.
- Wiersze z typem `boulder` są pomijane.
- Wiersz z błędem (brak obowiązkowej kolumny, nieznana wycena) jest pokazany z numerem i nic się nie importuje.
- Pozycja skały ustawiona ręcznie w telefonie nie zostanie nadpisana plikiem.
- Plik z samymi kolumnami Skała, Lat, Lng (i ewentualnie Przybliżone, ID_skały) ustawia tylko pozycje skał na mapie.

## Prawa autorskie

Baza zrobiona samemu w terenie (nazwy, wyceny, długości, przeloty, położenie, własne opisy) jest Twoja. Nie przepisuj opisów, schematów ani całych list dróg z przewodników i serwisów wspinaczkowych: poza prawem autorskim do tekstu w UE chroni się też same bazy danych, gdy ktoś przejmie ich znaczną część. Przed udostępnianiem bazy innym warto to potwierdzić z prawnikiem.
