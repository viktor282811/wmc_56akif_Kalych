# Abgabe KM5-05 — Drizzle ORM

## 1. Vorhersage vor dem Ausführen

### a) Artists mit Gründungsjahr 1999

Abfrage:

~~~ts
db.select().from(artist).where(eq(artist.gruendungsjahr, 1999))
~~~

Vorhersage:

~~~sql
SELECT "id", "name", "gruendungsjahr"
FROM "artist"
WHERE "artist"."gruendungsjahr" = ?
~~~

Parameter: [1999]

### b) Anzahl Alben für Artist 1

Abfrage:

~~~ts
db.select({ n: count() }).from(album).where(eq(album.artistId, 1))
~~~

Vorhersage:

~~~sql
SELECT count(*) AS "n"
FROM "album"
WHERE "album"."artist_id" = ?
~~~

Parameter: [1]

## 2. Abgleich der Vorhersage

Die erste Vorhersage wurde bestätigt:

~~~text
select "id", "name", "gruendungsjahr" from "artist" where "artist"."gruendungsjahr" = ?
Parameter: [1999]
~~~

Bei der zweiten Abfrage erzeugt Drizzle tatsächlich kein SQL-AS für den Objektschlüssel n:

~~~text
select count(*) from "album" where "album"."artist_id" = ?
Parameter: [1]
~~~

Der Wert bleibt im zurückgegebenen TypeScript-Objekt unter dem Schlüssel n verfügbar.

## 3. Ergänzte Queries

Die Demo ermittelt das älteste Album mit asc(album.jahr) und limit(1). Ergebnis: Night Ferry aus dem Jahr 2012.

Die Track-Abfrage kombiniert albumId mit einem Titelanfang Echo:

~~~text
select "id", "titel", "dauer_sek", "album_id" from "track" where (("track"."album_id" = ?) and ("track"."titel" like ?))
Parameter: [1, "Echo%"]
Ergebnis: Echo Room
~~~

Die Gruppierung zählt die Tracks pro Album. Für Silent Lines wurden 2 Tracks gefunden.

## 4. SQL-Vergleich: Tracks pro Album

Reines SQL:

~~~sql
SELECT "album"."titel", COUNT(*)
FROM "track"
INNER JOIN "album" ON "track"."album_id" = "album"."id"
GROUP BY "album"."id";
~~~

Tatsächliches SQL von Drizzle:

~~~sql
select "album"."titel", count(*) from "track" inner join "album" on "track"."album_id" = "album"."id" group by "album"."id"
~~~

| SQL-Baustein | Drizzle |
|---|---|
| INNER JOIN | innerJoin(album, eq(track.albumId, album.id)) |
| ON | eq(track.albumId, album.id) |
| COUNT(*) | count() |
| GROUP BY | groupBy(album.id) |

Drizzle erzeugt dieselben JOIN-, ON-, COUNT- und GROUP-BY-Bausteine. Das Ergebnisobjekt verwendet den Schlüssel tracks aus der TypeScript-Auswahl.

## 5. Nachweis

deno task demo wurde erfolgreich ausgeführt:

~~~text
Ältestes Album: Night Ferry ( 2012 )
Echo-Tracks: [ { id: 2, titel: "Echo Room", dauerSek: 187, albumId: 1 } ]
Tracks pro Album: [ { titel: "Silent Lines", tracks: 2 } ]
Nach update: 220 Sekunden
Tracks nach delete: 1
~~~

deno task test wurde erfolgreich ausgeführt: 9 Tests bestanden, 0 fehlgeschlagen.