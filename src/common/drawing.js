import { paletteGrey, paletteColor } from "./colors.js";
import { UnknownShapeError } from "./utils.js";

class DrawingTool {
    color;
    weight;

    constructor(color, weight) {
        this.color = color;
        this.weight = weight;
    }

    setColor(color) {
        this.color = color;
    }
}

class Pencil extends DrawingTool {
    constructor() {
        super(paletteGrey.getColorByHTMLClass("is-grey-darkest"), 7);
    }
}

class Highlighter extends DrawingTool {
    constructor(color = paletteColor.getColorByHTMLClass("is-yellow")) {
        super(color, 20);
    }
}

class Eraser extends DrawingTool {
    constructor() {
        super(paletteGrey.getColorByHTMLClass("is-white"), 15);
    }
}

class Coord {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Shape {
    constructor(firstCoord, tool) {
        this.coords = [firstCoord];
        this.tool = tool;
    }

    push(coord) {
        return this.coords.push(coord);
    }

    popBack() {
        return this.coords.shift();
    }

    get length() {
        return this.coords.length;
    }
}

class Drawing {
    limit;
    shapes;
    currentShape;
    size;

    constructor(limit = null) {
        this.limit = limit;
        this.shapes = [];
        this.currentShape = null;
        this.size = 0;
    }

    addShape(firstCoord, tool) {
        let newShape = new Shape(firstCoord, tool);
        this.shapes.push(newShape);
        this.currentShape = newShape;
        this.size += 1;
        if (this.limit != null && this.size > this.limit) {
            this.#popBack();
        }
    }

    pushCoord(newCoord) {
        if (this.currentShape == null) {
            throw new UnknownShapeError("Tried to push x,y before starting any shape");
        }
        this.size += 1;
        if (this.limit != null && this.size > this.limit) {
            this.#popBack();
        }
        this.currentShape.push(newCoord);
    }

    #popBack() {
        this.shapes[0].popBack();
        if (this.shapes[0].length == 0) {
            this.shapes.shift();
        }
        this.size -= 1;
    }

    clear() {
        this.size = 0;
        this.currentShape = null;
        this.shapes = [];
    }
}

export { DrawingTool, Pencil, Highlighter, Eraser, Coord, Shape, Drawing };
