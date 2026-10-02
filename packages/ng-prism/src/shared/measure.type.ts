/**
 * Das Messwerkzeug misst Geometrie, nicht Kaskade: ein Punkt kennt die Kante,
 * auf der er sitzt, aber nicht die CSS-Eigenschaft, die sie erzeugt. Die
 * Zuordnung Pixel -> Eigenschaft ist bewusst Folgeschritt, siehe Spec §13.
 */
export type SnapKind = 'border' | 'padding' | 'content';

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left';

/** Worauf ein Punkt eingerastet ist — `null`, wenn kein Ziel in Toleranz lag. */
export interface SnapRef {
    kind: SnapKind;
    side: EdgeSide;
    from: Element;
}

/**
 * Ein Messpunkt in `.demo-wrap`-lokalen CSS-Pixeln.
 *
 * Nicht in Bildschirmkoordinaten: `.demo-wrap` trägt
 * `transform: scale(var(--zoom))`, und lokale Koordinaten machen die Distanz
 * ohne weitere Division zur CSS-Pixel-Distanz. Zoomen nach dem Setzen eines
 * Pins verschiebt ihn dann nicht relativ zum Specimen.
 */
export interface MeasurePoint {
    x: number;
    y: number;
    snap: SnapRef | null;
}

export interface Measurement {
    a: MeasurePoint;
    b: MeasurePoint;
}

/**
 * Wie nah der Zeiger an eine Kante kommen muss, in **Bildschirm**pixeln.
 *
 * Bildschirm- und nicht Dokumentpixel, weil die Toleranz eine Zielgenauigkeit
 * der Hand beschreibt und keine Eigenschaft des Dokuments: bei 50 % Zoom muss
 * sie sich genauso anfühlen wie bei 200 %. Derselbe Wert wie
 * `VIEWPORT_SNAP_TOLERANCE`, aus demselben Grund.
 */
export const MEASURE_SNAP_TOLERANCE = 8;

/**
 * Ab welcher Streckenlänge der Wert zwischen die Endticks passt, in CSS-Pixeln.
 *
 * Darunter überlappen Ticks und Zahl, und die Messung wird unleserlich genau
 * dort, wo sie am genauesten sein müsste. Der Wert wandert dann nach außen.
 */
export const MEASURE_LABEL_MIN_SPAN = 28;

/** Wie weit der Wert bei kurzen Strecken senkrecht zur Linie ausweicht. */
export const MEASURE_LABEL_OFFSET = 15;

/** Länge eines Endticks, auf dem Endpunkt zentriert. */
export const MEASURE_TICK_LENGTH = 7;
