// src/domain/dnd.ts

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" string guard */
export function isValidTimeStr(t: unknown): t is string {
    return typeof t === "string" && HHMM.test(t);
}

/**
 * "HH:MM" → dakika (00:00 = 0)
 * @throws Error("INVALID_HHMM:<field>")
 */
export function timeToMinutes(t: unknown, field = "time"): number {
    if (!isValidTimeStr(t)) {
        throw new Error(`INVALID_HHMM:${field}`);
    }
    const [hhStr, mmStr] = t.split(":");
    const h = Number(hhStr);
    const m = Number(mmStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
        throw new Error(`INVALID_HHMM:${field}`);
    }
    return h * 60 + m;
}

/**
 * DND aralığında mı?
 * @param dnd  {start:"HH:MM", end:"HH:MM"} | null | undefined
 * @param eventDateUtc  ISO "Z" timestamp'tan türetilmiş Date (UTC bazlı)
 * @returns true → DND aktif, false → değil
 *
 * Kurallar:
 * - start === end → aralığı etkisiz say (24h değil)
 * - start-inclusive, end-exclusive
 * - Gece aşımı destekli (örn. 22:00–07:00)
 * - DND formatı bozuksa güvenli default: false
 */
export function isWithinDnd(
    dnd: { start: string; end: string } | null | undefined,
    eventDateUtc: Date
): boolean {
    if (!dnd) return false;

    let start: number;
    let end: number;
    try {
        start = timeToMinutes(dnd.start, "dnd.start");
        end = timeToMinutes(dnd.end, "dnd.end");
    } catch {
        // DND yanlış ise güvenli varsayılan: kapalı say
        return false;
    }

    if (start === end) return false;

    const nowMin = eventDateUtc.getUTCHours() * 60 + eventDateUtc.getUTCMinutes();

    // Aynı gün aralığı (örn. 09:00–17:00)
    if (start < end) {
        return nowMin >= start && nowMin < end;
    }

    // Gün aşan aralık (örn. 22:00–07:00)
    return nowMin >= start || nowMin < end;
}
