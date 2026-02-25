import { ColorPickerColorInterface } from './color.interface';

export class ColorPickerUtils {
    static roundToPlace(num: number, place: number) {
        return +(Math.round(parseFloat(num + 'e+' + place)) + 'e-' + place);
    }

    static isHexColor(hexStr: string) {
        const regExp = new RegExp(/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)|(^#[0-9A-F]{8}$)/i);

        return regExp.test(hexStr);
    }

    static rgbToHex(r: string, g: string, b: string, a = 100) {
        let hexStr =
            '#' + ('0' + parseInt(r, 10).toString(16)).slice(-2) + ('0' + parseInt(g, 10).toString(16)).slice(-2) + ('0' + parseInt(b, 10).toString(16)).slice(-2);

        // When alpha channel is not 100% add alpha information to the hexstr as well
        if (a < 100) {
            a = this.roundToPlace(a / 100, 2);
            const aStr = ((a * 255) | (1 << 8)).toString(16).slice(1);

            hexStr = hexStr + aStr;
        }

        return <ColorPickerColorInterface>{
            array: null,
            string: hexStr
        };
    }

    static hsvToHsl(h: number, s: number, v: number, a = 100) {
        s = s / 100;
        v = v / 100;

        const vmin = Math.max(v, 0.01);
        const lmin = (2 - s) * vmin;
        let sl;
        let l;

        l = (2 - s) * v;
        sl = s * vmin;
        sl /= lmin <= 1 ? lmin : 2 - lmin;
        sl = sl || 0;
        l /= 2;

        sl = this.roundToPlace(sl * 100, 2);
        l = this.roundToPlace(l * 100, 2);
        a = this.roundToPlace(a / 100, 2);

        return <ColorPickerColorInterface>{
            array: [h, sl, l, a],
            string: 'hsl(' + this.roundToPlace(h, 1) + ', ' + this.roundToPlace(sl, 1) + '%, ' + this.roundToPlace(l, 1) + '%, ' + a + ')'
        };
    }

    static hsvToRgb(h: number, s: number, v: number, a = 100) {
        h /= 360;
        s /= 100;
        v /= 100;

        let r: number;
        let g: number;
        let b: number;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            case 5:
                r = v;
                g = p;
                b = q;
                break;
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        r = Math.round(r * 255);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        g = Math.round(g * 255);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        b = Math.round(b * 255);
        a = this.roundToPlace(a / 100, 2);

        return <ColorPickerColorInterface>{
            array: [r, g, b, a],
            string: 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')'
        };
    }

    static hslToHex(h: number, s: number, l: number) {
        l /= 100;
        const a = (s * Math.min(l, 1 - l)) / 100;
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

            return Math.round(255 * color)
                .toString(16)
                .padStart(2, '0'); // convert to Hex and prefix "0" if needed
        };

        return `#${f(0)}${f(8)}${f(4)}`;
    }

    static hexToRgb(hex: string) {
        if (hex.startsWith('#')) {
            hex = hex.substring(1);
        }
        if (hex.length < 2 || hex.length > 8) {
            return false;
        }

        const values = hex.split('');
        let r,
            g,
            b,
            a = 1;

        if (hex.length === 2) {
            r = parseInt(values[0].toString() + values[1].toString(), 16);
            g = r;
            b = r;
        } else if (hex.length === 3) {
            r = parseInt(values[0].toString() + values[0].toString(), 16);
            g = parseInt(values[1].toString() + values[1].toString(), 16);
            b = parseInt(values[2].toString() + values[2].toString(), 16);
        } else if (hex.length === 6) {
            r = parseInt(values[0].toString() + values[1].toString(), 16);
            g = parseInt(values[2].toString() + values[3].toString(), 16);
            b = parseInt(values[4].toString() + values[5].toString(), 16);
        } else if (hex.length === 8) {
            r = parseInt(values[0].toString() + values[1].toString(), 16);
            g = parseInt(values[2].toString() + values[3].toString(), 16);
            b = parseInt(values[4].toString() + values[5].toString(), 16);
            a = parseInt(values[6].toString() + values[7].toString(), 16) / 255;
            a = this.roundToPlace(a, 2);
        } else {
            return false;
        }

        return <ColorPickerColorInterface>{
            array: [r, g, b, a],
            string: 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')'
        };
    }

    static rgbToHsv(r: number, g: number, b: number, a = 100) {
        r = r / 255;
        g = g / 255;
        b = b / 255;

        let rr,
            gg,
            bb,
            h,
            s,
            v = Math.max(r, g, b);

        const diff = v - Math.min(r, g, b),
            diffc = function (c: number) {
                return (v - c) / 6 / diff + 1 / 2;
            };

        if (diff === 0) {
            h = s = 0;
        } else {
            s = diff / v;
            rr = diffc(r);
            gg = diffc(g);
            bb = diffc(b);

            if (r === v) {
                h = bb - gg;
            } else if (g === v) {
                h = 1 / 3 + rr - bb;
            } else if (b === v) {
                h = 2 / 3 + gg - rr;
            }
            if (h && h < 0) {
                h += 1;
            } else if (h && h > 1) {
                h -= 1;
            }
        }

        h = this.roundToPlace(h! * 360, 2);
        s = this.roundToPlace(s * 100, 2);
        v = this.roundToPlace(v * 100, 2);
        a = this.roundToPlace(a / 100, 2);

        return <ColorPickerColorInterface>{
            array: [h, s, v, a],
            string: null
        };
    }

    static rgbToHsl(r: number, g: number, b: number) {
        r = r / 255;
        g = g / 255;
        b = b / 255;

        const max = Math.max(r, g, b),
            min = Math.min(r, g, b),
            l = (max + min) / 2;
        let d, h, s;

        if (max !== min) {
            d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) {
                h = (g - b) / d + (g < b ? 6 : 0);
            } else if (max === g) {
                h = (b - r) / d + 2;
            } else {
                h = (r - g) / d + 4;
            }

            h = h / 6;
        } else {
            h = s = 0;
        }

        const hh = this.roundToPlace(h * 360, 2);
        const ss = this.roundToPlace(s * 100, 2);
        const ll = this.roundToPlace(l * 100, 2);

        return <ColorPickerColorInterface>{
            array: [hh, ss, ll],
            string: 'hsl(' + this.roundToPlace(hh, 1) + ', ' + this.roundToPlace(ss, 1) + '%, ' + this.roundToPlace(ll, 1) + '%)'
        };
    }

    static hexToHsv(hex: string) {
        const rgb: any = this.hexToRgb(hex);

        return this.rgbToHsv(rgb.array[0], rgb.array[1], rgb.array[2], rgb.array[3] * 100);
    }
}
