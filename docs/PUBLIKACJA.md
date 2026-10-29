# Publikacja w sklepach – plan (wstrzymany)

Stan: **w toku** (2026-10-29): konto Google Play w weryfikacji; polityka prywatności (`docs/privacy.html`) i ściąga do konsoli (`docs/GOOGLE_PLAY.md`, grafiki w `docs/sklep/`) gotowe. Następnie: wersja sklepowa i klucz podpisywania (kroki 1–2). Wcześniej wstrzymane decyzją właściciela (2026-10-28). Aplikacja jest rozprowadzana jako APK z wydań GitHuba (`releases/latest`) z samoaktualizacją. Ten plik zbiera ustalenia, żeby można było wrócić do tematu bez zaczynania od nowa.

## Google Play

### Do zrobienia w aplikacji (strona techniczna, ok. 1–2 dni)

1. **Dwie wersje z jednego kodu**
   - Wersja z GitHuba (APK): bez zmian, z samoaktualizacją (`src/ui/updates.ts`) i uprawnieniem `REQUEST_INSTALL_PACKAGES`.
   - Wersja sklepowa (AAB): bez sprawdzania aktualizacji (w Ustawieniach zostaje sam numer wersji) i **bez** `REQUEST_INSTALL_PACKAGES`. Google Play zabrania samoaktualizacji spoza sklepu i ogranicza to uprawnienie.
   - Technicznie: zmienna „wersja sklepowa” w konfiguracji budowania (`app.config`), drugi krok w `.github/workflows/android-apk.yml` (`bundleRelease`) na main, z tym samym numerem wersji (`versionCode` = numer przebiegu). Plik AAB jako artefakt „cruxlog-play”. Testy: wersja sklepowa nie ma samoaktualizacji ani uprawnienia.
2. **Własny klucz podpisywania (klucz przesyłania)**
   - Dziś APK jest podpisany publicznym kluczem testowym z szablonu Expo – do sklepu się nie nadaje.
   - Wygenerować klucz poza repozytorium (repo jest publiczne), przekazać właścicielowi prywatnie; właściciel dodaje 4 sekrety w GitHub › Settings › Secrets and variables › Actions (plik klucza w base64, hasło magazynu, alias, hasło klucza) i przechowuje kopię klucza i hasła w bezpiecznym miejscu.
   - W konsoli Google Play włączyć „Podpisywanie aplikacji przez Google Play” – nasz klucz jest wtedy tylko kluczem przesyłania i w razie zgubienia da się go wymienić.
   - Uwaga: zmiana klucza oznacza, że wersji sklepowej nie da się zainstalować „na” wersję z GitHuba (inny podpis) – trzeba odinstalować APK (po zrobieniu kopii zapasowej) albo zostawić obie ścieżki osobno.
3. **Polityka prywatności** (polski i angielski), np. `docs/privacy.html` opublikowana przez GitHub Pages (włączenie: repo › Settings › Pages). Treść:
   - dane (przejścia, skały, zdjęcia, cele, wyprawy) zostają w telefonie;
   - położenie tylko do mapy i „skał w pobliżu”, nie jest wysyłane;
   - aparat i zdjęcia tylko w aplikacji, nie w galerii;
   - kopia zapasowa do folderu wybranego przez użytkownika (np. Dysk Google);
   - wspólna baza skał: anonimowe poprawki skał i dróg do arkusza Google z losowym kodem urządzenia (serwer Google widzi adres IP); można wyłączyć w Ustawieniach;
   - paczki skał pobierane z GitHuba (`cruxlog-paczki`);
   - brak reklam, kont, analityki;
   - kontakt: e-mail (do ustalenia).
4. **Materiały do sklepu** (`docs/GOOGLE_PLAY.md`): nazwa, krótki opis (do 80 znaków) i pełny opis po polsku i angielsku; ikona 512×512 (mamy), baner 1024×500 (z ikony); lista ok. 6 zrzutów ekranu; gotowe odpowiedzi do formularzy „Bezpieczeństwo danych”, klasyfikacja treści, grupa docelowa, deklaracje uprawnień (położenie, aparat).

### Po stronie właściciela

- Konto dewelopera Google Play: jednorazowo 25 USD, weryfikacja tożsamości (może trwać kilka dni).
- Nowe konta prywatne: zamknięty test z **co najmniej 12 testerami przez 14 dni z rzędu** przed publikacją dla wszystkich (stan wiedzy z 2026 r. – sprawdzić aktualne liczby przy zakładaniu konta).
- Formularze w konsoli (pomoc w `docs/GOOGLE_PLAY.md`).
- Sprawdzić nazwę „Cruxlog” w sklepie i znakach towarowych.
- Przed publikacją: przejść testy z `docs/TESTING.md` (3g–6i) i dostępność (duża czcionka, TalkBack, tryb ciemny). Dane w paczkach muszą być własne (bez treści przepisanych z przewodników).

### Kolejność i czas

1. Konto Google Play i weryfikacja. 2. Wersja sklepowa (A–D powyżej). 3. Zamknięty test, 12 testerów, 14 dni, poprawki. 4. Wniosek o produkcję (przegląd Google: zwykle kilka dni do tygodnia). Razem ok. 3–4 tygodnie, głównie przez 14 dni testów.

### Otwarte pytania

- ~~E-mail kontaktowy~~: cruxlogger@gmail.com.
- ~~Nazwa w sklepie~~: „Cruxlog – dziennik wspinacza” / „Cruxlog – climbing logbook” (limit 30 znaków).
- Administrator danych w polityce: imię i nazwisko właściciela (do wpisania w `docs/privacy.html` w miejsce [IMIĘ I NAZWISKO] / [FULL NAME]).

## iPhone (iOS)

- **PWA odradzone**: baza SQLite w przeglądarce (Safari potrafi usunąć dane nieużywanej strony – ryzyko utraty dziennika), mapa MapLibre do napisania od nowa, brak zapisu kopii do folderu, limity miejsca na zdjęcia. Kilka tygodni pracy i gorsza aplikacja.
- **Zalecane: natywna aplikacja z tego samego kodu (Expo)**, kilka dni pracy. Do przerobienia tylko rzeczy androidowe:
  1. aktualizacje – na iOS przez TestFlight/App Store, samoaktualizacja wyłączona;
  2. kopia automatyczna do folderu (dziś androidowy wybór folderu) – np. iCloud Drive albo „Udostępnij do Plików”;
  3. drobiazgi tylko dla Androida (komunikaty „Pobieram…”, instalator).
- Potrzebne: konto Apple Developer (99 USD rocznie); budowanie w chmurze (Expo EAS albo GitHub Actions na macOS); testy na iPhonie właściciela; dystrybucja przez TestFlight (do 10 000 testerów), później App Store.
