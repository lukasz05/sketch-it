import DomainError from "../utils";

class PColor {
    /* html class name */
    html;
    /* Hex color representation */
    hex;

    constructor({ html, hex }) {
        this.html = html;
        this.hex = hex;
    }
}

class Palette {
    colors;
    name;
    constructor(colors = [], name) {
        this.colors = colors;
        this.name = name;
    }

    getColorByHTMLClass(clrName) {
        for (let clr of this.colors) {
            if (clr.html == clrName) {
                return clr;
            }
        }
        throw new ColorNotInPaletteError(`${clrName} is not in palette ${this.name}`);
    }

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    cloneColorsArray() {
        return [...this.colors];
    }
}

class ColorNotInPaletteError extends DomainError {
    constructor(message) {
        super(message);
    }
}

const paletteColor = new Palette(
    [
        new PColor({ html: "is-red", hex: "#c40233" }),
        new PColor({ html: "is-orange", hex: "#ff7538" }),
        new PColor({ html: "is-orange-light", hex: "#ffa41c" }),
        new PColor({ html: "is-yellow", hex: "#ffd300" }),
        new PColor({ html: "is-green-light", hex: "#80c022" }),
        new PColor({ html: "is-green", hex: "#00ad43" }),
        new PColor({ html: "is-blue-light", hex: "#0075a3" }),
        new PColor({ html: "is-blue", hex: "#22438f" }),
        new PColor({ html: "is-purple", hex: "#69359c" }),
    ],
    "main colors"
);

const paletteGrey = new Palette(
    [
        new PColor({ html: "is-white", hex: "#f8f9fa" }),
        new PColor({ html: "is-grey-lightest", hex: "#e9ecef" }),
        new PColor({ html: "is-grey-lighter", hex: "#dee2e6" }),
        new PColor({ html: "is-grey-light", hex: "#ced4da" }),
        new PColor({ html: "is-grey", hex: "#adb5bd" }),
        new PColor({ html: "is-grey-dark", hex: "#6c757d" }),
        new PColor({ html: "is-grey-darker", hex: "#495057" }),
        new PColor({ html: "is-grey-darkest", hex: "#343a40" }),
        new PColor({ html: "is-black", hex: "#212529" }),
    ],
    "greyscale colors"
);

export { PColor, paletteColor, paletteGrey };
