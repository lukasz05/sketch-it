import { DomainError } from "./utils.mjs";

class PColor {
  /* html class name */
  html;
  /* Hex color representation */
  hex;
  /* RGB color representation */
  rgb;

  constructor({ html, hex, rgb }) {
    this.html = html;
    this.hex = hex;
    this.rgb = rgb;
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
    throw new ColorNotInPaletteError(
      `${clrName} is not in palette ${this.name}`
    );
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
    new PColor({
      html: "is-red",
      hex: "#c40233",
      rgb: { r: 196, g: 2, b: 51 },
    }),
    new PColor({
      html: "is-orange",
      hex: "#ff7538",
      rgb: { r: 255, g: 117, b: 56 },
    }),
    new PColor({
      html: "is-orange-light",
      hex: "#ffa41c",
      rgb: { r: 255, g: 164, b: 28 },
    }),
    new PColor({
      html: "is-yellow",
      hex: "#ffd300",
      rgb: { r: 255, g: 211, b: 0 },
    }),
    new PColor({
      html: "is-green-light",
      hex: "#80c022",
      rgb: { r: 128, g: 192, b: 34 },
    }),
    new PColor({
      html: "is-green",
      hex: "#00ad43",
      rgb: { r: 0, g: 173, b: 67 },
    }),
    new PColor({
      html: "is-blue-light",
      hex: "#0075a3",
      rgb: { r: 0, g: 117, b: 163 },
    }),
    new PColor({
      html: "is-blue",
      hex: "#22438f",
      rgb: { r: 34, g: 67, b: 143 },
    }),
    new PColor({
      html: "is-purple",
      hex: "#69359c",
      rgb: { r: 105, g: 53, b: 156 },
    }),
  ],
  "main colors"
);

const paletteGrey = new Palette(
  [
    new PColor({
      html: "is-white",
      hex: "#f8f9fa",
      rgb: { r: 248, g: 249, b: 250 },
    }),
    new PColor({
      html: "is-grey-lightest",
      hex: "#e9ecef",
      rgb: { r: 233, g: 236, b: 239 },
    }),
    new PColor({
      html: "is-grey-lighter",
      hex: "#dee2e6",
      rgb: { r: 222, g: 226, b: 230 },
    }),
    new PColor({
      html: "is-grey-light",
      hex: "#ced4da",
      rgb: { r: 206, g: 212, b: 218 },
    }),
    new PColor({
      html: "is-grey",
      hex: "#adb5bd",
      rgb: { r: 173, g: 181, b: 189 },
    }),
    new PColor({
      html: "is-grey-dark",
      hex: "#6c757d",
      rgb: { r: 108, g: 117, b: 125 },
    }),
    new PColor({
      html: "is-grey-darker",
      hex: "#495057",
      rgb: { r: 73, g: 80, b: 87 },
    }),
    new PColor({
      html: "is-grey-darkest",
      hex: "#343a40",
      rgb: { r: 52, g: 58, b: 64 },
    }),
    new PColor({
      html: "is-black",
      hex: "#212529",
      rgb: { r: 33, g: 37, b: 41 },
    }),
  ],
  "greyscale colors"
);

export { Palette, PColor, paletteColor, paletteGrey };
