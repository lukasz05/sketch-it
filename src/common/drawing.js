import { paletteGrey, paletteColor } from "./colors.js";


class DrawingTool {
    color;
    weight;

    constructor(color, weight) {
        this.color = color;
        this.weight = weight;
    }
}


class Pencil extends DrawingTool {
    constructor() {
        super( paletteGrey.getColorByHTMLClass("is-grey-darkest"), 7);
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
}


class Drawing {
    limit;
    shapes;
    currentShape;
    #size;

    constructor(limit = null) {
        this.limit = limit;
        this.shapes = [];
        this.currentShape = null;
        this.#size = 0;
    }
    
    addShape(firstCoord, tool) {
        let newShape = new Shape(firstCoord, tool);
        this.shapes.push(newShape);
        this.currentShape = newShape;
        this.#size += 1;
        if(this.limit != null && this.#size > this.limit) {
            this.#popBack();
        }
    }

    pushCoord(newCoord) {
        this.#size += 1;
        if(this.limit != null && this.#size > this.limit) {
            this.#popBack();
        }
        this.currentShape.push(newCoord);
    }

    #popBack() {
        let len = this.shapes[0].popBack();
        if (len == 0) {
            this.shapes.shift();
        }
        this.#size -= 1;
    }

    clear() {
        this.#size = 0;
        this.currentShape = null;
        shapes = 0;
    }
}


export { DrawingTool, 
         Pencil, 
         Highlighter,
         Eraser,
         Coord,
         Shape,
         Drawing
};
