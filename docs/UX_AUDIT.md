# Przegląd wygody (UX) – 2026-10-28, po fali nowych funkcji

Przegląd na podstawie kodu (aplikacji nie da się uruchomić w chmurze). Rzeczy oznaczone „sprawdzić na telefonie” wymagają zrzutów ekranu albo próby w ręku. Status: **otwarte** – nic jeszcze nie zmienione; decyzje właściciela.

## 1. Mapa aplikacji

Dolny pasek: **Dziennik · Postępy · [+] · Skały · Cele**; zębatka Ustawień w prawym górnym rogu każdej zakładki.

| Ekran | Co jest na nim | Dokąd prowadzi |
|---|---|---|
| **Dziennik** | 3 liczby sezonu, baner zaległej kopii, przejścia pogrupowane po dniach; przy każdym dniu ikona udostępniania | przejście, „Pochwal się dniem”, Ustawienia |
| **Postępy** | wybór roku, liczby, piramida, wykresy, kalendarz, skały, partnerzy; ikona udostępniania przy roku | „Pochwal się rokiem” |
| **[+]** (środek paska) | formularz przejścia | – |
| **Skały** | przełącznik Lista/Mapa, pole „Szukaj skały”, przycisk **Szukaj drogi**, przycisk **Moje skały i drogi**, skały w pobliżu, regiony, skały bez regionu, na dole **Dodaj region** i **Nowa skała** | region, skała, wyszukiwarka dróg, Moje skały i drogi |
| Region / rejon / grupa | pole szukania, „Szukaj drogi tutaj”, podrejony, skały, dodawanie | niżej, skała, edycja |
| **Skała** | w nagłówku 3 ikony (kalendarz = zaplanuj wyprawę, udostępnij, edytuj); położenie, opis, dojście, zdjęcia skały, podpowiedź, **Dodaj drogi** + **Dodaj sektor**, szukaj drogi; sektory z 3 ikonami każdy (aparat, +, ołówek); każda droga z ikoną ołówka | droga, edycja drogi, sektor, wyprawa, udostępnianie, położenie, zdjęcia |
| **Droga** | w nagłówku udostępnij + edytuj; nazwa, wycena, długość, przeloty, cel/projekt, stan, **Zapisz przejście tej drogi**, topo, historia przejść | skała, przejście, cel, zdjęcie topo |
| **Przejście** | szczegóły; na dole 3–4 przyciski jeden pod drugim: (projekt), **Pochwal się**, **Edytuj**, **Usuń** | droga, udostępnianie, edycja |
| **Cele** | **Wyprawy** (lista + „Nowa wyprawa”), potem **Cele** („Pochwal się celami”, „Dodaj cel”, lista) | wyprawa, cel, udostępnianie celów |
| Wyprawa | szczegóły, zaproszenie, podsumowanie | skała, droga, udostępnianie |
| **Ustawienia** | 5 zwijanych działów: Wygląd i język; Skały i paczki (paczki, import CSV, usuń zaimportowane); Wspólna baza skał (przełącznik, kolejka, Moje skały i drogi, Wyślij teraz); Kopia zapasowa; Wersja aplikacji | Paczki skał, Moje skały i drogi |
| Udostępnianie (6 ekranów) | przejście/droga/skała, dzień, rok, cele, wyprawa (zaproszenie, podsumowanie) | – |

**Udostępnianie – 6 wejść, 4 różne sposoby:** ikona w nagłówku (droga, skała), zwykły przycisk na dole (przejście), mała ikona przy nagłówku dnia (Dziennik), ikona przy roku (Postępy), napis-link (Cele), przyciski na ekranie wyprawy.

## 2. Pięć najważniejszych zadań

| Zadanie | Droga w aplikacji | Stuknięcia* | Problemy |
|---|---|---|---|
| **Zapisać przejście** (najczęstsze) | [+] → skała w pobliżu albo wpisanie nazwy → droga → styl (domyślnie RP) → przewinąć → Zapisz | 3–4 + pisanie + przewijanie | Formularz ma 11 części (droga, data, styl, próby, projekt, odczuta wycena, ocena, partner, pogoda, notatki, zdjęcia); **Zapisz jest na samym dole**, trzeba przewijać; data = 2 chipy + pole daty (dubel) |
| **Znaleźć drogę** | Skały → **Szukaj drogi** → wpisać | 1 + pisanie | Dwie różne wyszukiwarki obok siebie (pole „Szukaj skały” i przycisk „Szukaj drogi”), trzecia na ekranie skały, czwarta w regionie; trudno zgadnąć, której użyć |
| **Pochwalić się przejściem** | Dziennik → przejście → przewinąć → **Pochwal się** → wygląd → Wyślij | 3–4 + przewijanie | Przycisk na dole, wśród Edytuj/Usuń; na ekranie udostępniania długa lista opcji (7 wyglądów, zdjęcie, dopasowanie, numer zdjęcia, topo, wiadomość, miejsce) przed przyciskiem Wyślij |
| **Dodać skałę z drogami** | Skały → przewinąć listę regionów do końca → **Nowa skała** → formularz → Zapisz → **Dodaj drogi** | 4+ + przewijanie | „Nowa skała” na samym dole długiej listy; nie ma „+” w nagłówku |
| **Kopia zapasowa** | automatyczna; zaległa → baner w Dzienniku → Ustawienia | 1–2 | Dobrze; ewentualnie baner mógłby od razu otwierać dział kopii |

\* liczone od ekranu startowego; „sprawdzić na telefonie”.

## 3. Znalezione problemy (od najważniejszych)

| # | Problem | Waga | Propozycja |
|---|---|---|---|
| 1 | **Formularz przejścia za długi, Zapisz na dole** | wysoka | Przycisk Zapisz zawsze widoczny na dole ekranu; rzadziej używane pola (odczuta wycena, pogoda, notatki, zdjęcia) pod „Więcej szczegółów”; jedna kontrolka daty |
| 2 | **Zakładka Skały: 2 duże przyciski nad treścią** (Szukaj drogi, Moje skały i drogi) | wysoka | Jedna wyszukiwarka (skały, rejony i drogi naraz); „Moje skały i drogi” przenieść do Ustawień / menu „⋯”; „+” w nagłówku zamiast przycisków na dole |
| 3 | **Ekran skały przeładowany ikonami** (3 w nagłówku, 3 przy każdym sektorze, ołówek przy każdej drodze) | wysoka | Akcje sektora w jednym menu „⋯”; bez ołówka przy drogach (edycja z ekranu drogi); „Zaplanuj wyprawę” do menu „⋯” (ikona kalendarza jest niejasna) |
| 4 | **Udostępnianie w 6 miejscach i 4 stylach** | średnia | Wszędzie ta sama ikona udostępniania w nagłówku ekranu; na ekranie udostępniania podgląd i „Wyślij” na górze, opcje niżej (zwinięte) |
| 5 | **Przejście: 4 przyciski jeden pod drugim** | średnia | Udostępnij i Edytuj jako ikony w nagłówku (jak na drodze i skale); na dole tylko Usuń |
| 6 | **Zakładka „Cele” zawiera też wyprawy** | średnia | Nazwa zakładki „Plany” (Wyprawy + Cele) albo wyprawy osobno; dziś wyprawy łatwo przeoczyć |
| 7 | **Ikona udostępniania przy każdym dniu w Dzienniku** | niska | Mniej widoczna (szara) albo tylko dla dni z przejściami; ewentualnie przytrzymanie nagłówka dnia |
| 8 | **Różne słowa na to samo**: „Udostępnij”, „Pochwal się”, „Zaproś” | niska | Ujednolicić: „Udostępnij” wszędzie, „Pochwal się …” tylko jako tytuł ekranu |
| 9 | Region: pole szukania + „Szukaj drogi tutaj” + przyciski dodawania | niska | Jak w #2 – jedna wyszukiwarka, dodawanie w „+” |

## 4. Do sprawdzenia na telefonie (zrzuty ekranu)

Dziennik, Skały (lista), ekran skały z kilkoma sektorami, formularz nowego przejścia (cały, z przewijaniem), Ustawienia, ekran udostępniania przejścia. Także: duża czcionka systemowa, tryb ciemny, TalkBack (`docs/TESTING.md` §8).
