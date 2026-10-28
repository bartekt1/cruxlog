# Wspólna baza robocza skał (arkusz Google)

Aplikacja wysyła poprawki skał, sektorów i dróg (dodanie, zmiana, usunięcie, położenie skały) do arkusza Google. Właściciel paczek przegląda arkusz, sprząta duplikaty i przenosi dobre wiersze do `baza/baza.csv` w repozytorium `cruxlog-paczki`.

- Wysyłane: dane skał i dróg w kolumnach wzoru Cruxlog oraz kolumny Kiedy, Zmiana, Co zmieniono, Urządzenie (losowy kod telefonu, bez imienia).
- Nigdy nie są wysyłane: przejścia, partnerzy, cele, zdjęcia, pozycja użytkownika. Import z pliku i paczki też nie.
- W aplikacji: Ustawienia › Wspólna baza skał (domyślnie włączone; przed pierwszą wysyłką jednorazowa informacja z możliwością wyłączenia). Zmiany czekają w telefonie (tabela `outbox`) i wychodzą przy otwarciu aplikacji, po powrocie do niej i co 2 minuty.
- Kod: `src/domain/proposals.ts` (adres `PROPOSALS_URL`, kolumny), `src/db/proposals.ts` (kolejka), `src/ui/proposals.ts` (wysyłka), skrypt arkusza: `docs/propozycje.gs`.

## Uruchomienie (raz, około 10 minut)

1. Na Dysku Google utwórz nowy arkusz i nazwij go **Cruxlog – propozycje**.
2. W arkuszu: **Rozszerzenia › Apps Script**. Otworzy się edytor z plikiem `Kod.gs`.
3. Usuń wszystko, co jest w edytorze, i wklej całą zawartość pliku `docs/propozycje.gs`. Kliknij ikonę dyskietki (Zapisz).
4. Kliknij **Wdróż › Nowe wdrożenie**. Przy „Wybierz typ” kliknij zębatkę i wybierz **Aplikacja internetowa**.
   - Opis: `Cruxlog`
   - Wykonaj jako: **Ja**
   - Kto ma dostęp: **Każdy**
5. Kliknij **Wdróż**. Google poprosi o uprawnienia: **Autoryzuj dostęp**, wybierz swoje konto. Pojawi się ostrzeżenie „Google nie zweryfikował tej aplikacji”: kliknij **Zaawansowane**, potem **Przejdź do projektu (niebezpieczne)** i **Zezwól**. (To Twój własny skrypt; ostrzeżenie dotyczy każdego prywatnego skryptu.)
6. Skopiuj **Adres URL aplikacji internetowej** (kończy się na `/exec`) i wyślij go Claude'owi; trafi do `PROPOSALS_URL` w aplikacji.
7. Sprawdzenie: otwórz ten adres w przeglądarce. Powinno się pokazać `{"ok":true,"app":"cruxlog-propozycje"}`, a w arkuszu pojawi się karta **Propozycje** z nagłówkami.

Zmiana skryptu później: wklej nowy kod, potem **Wdróż › Zarządzaj wdrożeniami › ołówek › Wersja: Nowa wersja › Wdróż** (adres zostaje ten sam).

## Sprzątanie

- Kolumny od **Region** do **ID_drogi** są takie jak w `baza.csv`: dobre wiersze kopiuje się prosto do bazy (bez czterech pierwszych kolumn).
- **ID_skały / ID_drogi** wypełnione: zmiana dotyczy skały lub drogi, która już jest w paczkach (poprawka albo usunięcie). Puste: coś nowego.
- **Urządzenie**: wiersze z jednego telefonu mają ten sam kod, co pomaga znaleźć duplikaty.
- Przeniesione albo odrzucone wiersze usuwa się z arkusza.
