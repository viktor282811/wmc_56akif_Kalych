// === Async/Await: Bestell-Pipeline mit individuellen Exceptions ===
// Lektion 2026-09-23, 5akif — Runtime ist Deno: deno run claim.ts
// Deno führt TypeScript direkt aus; Typ-Prüfung: deno check claim.ts

// --- Stufe 0: eigene Error-Typen (je Pipeline-Stufe einer) ---
class ValidationError extends Error {
    constructor(artikel: string, menge: number) {
        super(`Ungültige Bestellung: ${menge}x "${artikel}"`);
        this.name = "ValidationError";
    }
}

class PaymentError extends Error {
    constructor(karte: string) {
        super(`Zahlung fehlgeschlagen: Karte ${karte} abgelehnt`);
        this.name = "PaymentError";
    }
}

class ShippingError extends Error {
    constructor(plz: string) {
        super(`Lieferung nicht möglich: PLZ ${plz} außerhalb des Lieferraums`);
        this.name = "ShippingError";
    }
}

class ClaimError extends Error {
    constructor(artikel: string, grund: string) {
        super(`Reklamation ${artikel}: ${grund}`);
        this.name = "ClaimError";
    }
}

// --- Daten-Form: Auftrag (Input) wird zur Bestellung (durchgereicht) ---
interface Auftrag {
    artikel: string;
    menge: number;
}

interface Bestellung extends Auftrag {
    nr: number;
    zahlung?: string;
    tracking?: string;
}

// --- Hilfsbaukasten: simulate(ms, wert) -> Promise ---
const simulate = <T>(ms: number, wert: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(wert), ms));

// --- Hilfsfunktion: Exception lesbar machen (err ist in catch: unknown) ---
const fehlerText = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

// --- Pipeline-Stufen: jede wirft ihre eigene Exception ---
async function bestellen(artikel: string, menge: number): Promise<Bestellung> {
    const bestellNr = await simulate(300, { nr: 4711, artikel, menge });
    if (menge <= 0) {
        throw new ValidationError(artikel, menge);
    }
    console.log(`✓ Bestellung ${bestellNr.nr}: ${menge}x ${artikel}`);
    return bestellNr;
}

async function bezahlen(bestellung: Bestellung, karte: string): Promise<Bestellung> {
    if (karte === "4242-0000-0000-0002") {
        throw new PaymentError(karte);
    }
    const zahlung = await simulate(400, { id: "pay-99", betrag: bestellung.menge * 19.9 });
    console.log(`✓ Bezahlung ok (${zahlung.id}, ${zahlung.betrag.toFixed(2)} €)`);
    return { ...bestellung, zahlung: zahlung.id };
}

async function liefern(bestellung: Bestellung, plz: string): Promise<Bestellung> {
    if (plz.startsWith("9")) {
        throw new ShippingError(plz);
    }
    const lieferung = await simulate(300, { tracking: "AT-8812", plz });
    console.log(`✓ Lieferung an ${plz} unterwegs (${lieferung.tracking})`);
    return { ...bestellung, tracking: lieferung.tracking };
}

async function reclamieren(bestellung: Bestellung, grund: string): Promise<string> {
    const bestaetigung = await simulate(200, `Stornierung der Bestellung ${bestellung.nr} bestätigt`);
    if (grund === "kaputt") {
        throw new ClaimError(bestellung.artikel, grund);
    }
    console.log(`✓ Reklamation: ${bestaetigung}`);
    return bestaetigung;
}

// --- Variante A: ein try/catch, Verzweigung mit instanceof ---
async function pipelineAlsGanzes(
    auftrag: Auftrag,
    karte: string,
    plz: string,
    grund: string,
): Promise<void> {
    try {
        const b = await bestellen(auftrag.artikel, auftrag.menge);
        const b2 = await bezahlen(b, karte);
        const b3 = await liefern(b2, plz);
        const bestaetigung = await reclamieren(b3, grund);
        console.log(`✅ Pipeline fertig:`, b3, bestaetigung);
    } catch (err) {
        if (err instanceof ValidationError) {
            console.log(`🛑 Stufe bestellen: ${err.message}`);
        } else if (err instanceof PaymentError) {
            console.log(`🛑 Stufe bezahlen: ${err.message}`);
        } else if (err instanceof ShippingError) {
            console.log(`🛑 Stufe liefern: ${err.message}`);
        } else if (err instanceof ClaimError) {
            console.log(`🛑 Stufe reclamieren: ${err.message}`);
        } else {
            console.log(`🛑 Unbekannter Fehler: ${fehlerText(err)}`);
        }
    } finally {
        console.log(`— Pipeline-Lauf beendet (${new Date().toISOString().slice(11, 19)})\n`);
    }
}

// --- Variante B: granular — jedes await eigenes try/catch, Weiterarbeit möglich ---
async function pipelineGranular(auftrag: Auftrag, karte: string, plz: string, grund: string): Promise<void> {
    try {
        let b: Bestellung;
        try {
            b = await bestellen(auftrag.artikel, auftrag.menge);
        } catch (err) {
            console.log(`🛑 Abbruch: ${fehlerText(err)}`);
            return;
        }

        try {
            b = await bezahlen(b, karte);
        } catch (err) {
            console.log(`⚠️  Bezahlung fehlgeschlagen (${fehlerText(err)}) — andere Karte versuchen?`);
            b = await bezahlen(b, "4242-1111-1111-1111"); // Fallback-Karte
        }

        try {
            b = await liefern(b, plz);
        } catch (err) {
            console.log(`⚠️  Lieferung fehlgeschlagen (${fehlerText(err)})`);
            throw err; // Re-Throw: oben will das Ganze noch jemand sehen
        }
        try {
            const bestaetigung = await reclamieren(b, grund);
            console.log(`✅ Pipeline fertig:`, b, bestaetigung);
        } catch (err) {
            console.log(`🛑 Stufe reclamieren: ${fehlerText(err)}`);
        }
    } finally {
        console.log("— Granularer Lauf beendet");
    }
}

// --- Kontrast: dieselbe Kette mit .then()/.catch() (Promise-Recap vom 18.9.) ---
function pipelineDann(auftrag: Auftrag, karte: string, plz: string, grund: string): void {
    bestellen(auftrag.artikel, auftrag.menge)
        .then((b) => bezahlen(b, karte))
        .then((b) => liefern(b, plz))
        .then((b) => reclamieren(b, grund))
        .then((b) => console.log(`✅ Pipeline fertig:`, b))
        .catch((err) => console.log(`🛑 .catch(): ${err.name}: ${err.message}`));
}

// --- Hauptprogramm ---
const hauptprogramm = async (): Promise<void> => {
    await pipelineAlsGanzes({ artikel: "USB-C Hub", menge: 2 }, "4242-1111-1111-1111", "1100", "nicht benötigt");

    // Nach etwa 300 ms erwarte ich diese Ausgabe:
    // 🛑 Stufe bestellen: Ungültige Bestellung: 0x "USB-C Hub"
    // — Pipeline-Lauf beendet (Uhrzeit)
    // Keine Bezahlung, Lieferung oder Reklamation.
    // Zuerst wird await simulate(...) ausgeführt, danach if (menge <= 0).
    // Weil der Code der Reihe nach läuft, kommt der ValidationError erst nach dem Warten.
    await pipelineAlsGanzes({ artikel: "USB-C Hub", menge: 0 }, "4242-1111-1111-1111", "1100", "nicht benötigt");

    await pipelineAlsGanzes(
        { artikel: "Mechanische Tastatur", menge: 1 },
        "4242-0000-0000-0002",
        "1100",
        "nicht benötigt",
    );

    await pipelineGranular({ artikel: "Maus", menge: 1 }, "4242-0000-0000-0002", "1100", "nicht benötigt");

    // Auch bei throw err läuft finally, bevor der Fehler im Hauptprogramm ankommt.
    try {
        await pipelineGranular({ artikel: "Webcam", menge: 1 }, "4242-0000-0000-0002", "9980", "nicht benötigt");
    } catch (err) {
        console.log(`🛑 Hauptprogramm fängt Re-Throw: ${err instanceof Error ? err.name : String(err)}`);
    }

    await pipelineAlsGanzes({ artikel: "Kopfhörer", menge: 1 }, "4242-1111-1111-1111", "1100", "kaputt");
};

hauptprogramm();
