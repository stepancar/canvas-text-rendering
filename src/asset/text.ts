import {GraphicStyle, ObjectAnimation, TextStyle} from "./captions";
import {getWords, layoutWords, Position, remapValue} from "../utils/utils";
import {ProgressIncrementer} from "../animation/progressIncrementer";

// what about text and font loading? Since we already load the CSS fonds for NTE
// we shouldn't have to do any additional work.
export class Text {
    private _text: string;
    private _highlights: Array<number> = [];
    private _words: string[] = [];

    private _normalLineIndices: number[] = [];
    private _normalWordMetrics: TextMetrics[] = [];
    private _normalWordPositions: Position[] = [];

    private _highlightLineIndices: number[] = [];
    private _highlightWordMetrics: TextMetrics[] = [];
    private _highlightWordPositions: Position[] = [];

    normalStyle: TextStyle;
    normalGraphicStyle: GraphicStyle | null = null;
    objectAnimation: Array<ObjectAnimation> | [] = [];
    highlightStyle: TextStyle | null = null;
    highlightGraphicStyle: GraphicStyle | null = null;

    private _objectIncrementer: Array<ProgressIncrementer> = [];

    private _multiplier = 2;
    private _canvas: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;

    _progress: number = 0.25;
    width: number = 200;
    height: number = 100;
    startTime: number = 200;
    endTime: number = 100;
    constructor(options: {
        text: string,
        highlights?: Array<number>
        normalStyle: TextStyle,
        normalGraphicStyle?: GraphicStyle,
        objectAnimation?: Array<ObjectAnimation>,
        highlightStyle?: TextStyle,
        highlightGraphicStyle?: GraphicStyle,
        width?: number,
        height?: number,
    }) {
        this._text = options.text;
        this._highlights = options.highlights || [];

        this.normalStyle = options.normalStyle;
        this.normalGraphicStyle = options.normalGraphicStyle || null;
        this.objectAnimation = options.objectAnimation || [];
        this.highlightStyle = options.highlightStyle || null;
        this.highlightGraphicStyle = options.highlightGraphicStyle || null;

        this.width = options.width || 200;
        this.height = options.height || 100;

        this._canvas = document.createElement('canvas');
        this._canvas.width = this.width * this.multiplier
        this._canvas.height = this.height * this.multiplier;
        this._canvas.style.width = this.width + 'px';
        this._canvas.style.height = this.height + 'px';
        this._context = this._canvas.getContext('2d')!;

        this._build();
    }

    get progress() {
        return this._progress;
    }

    set progress(value: number) {
        if (value < 0 || value > 1) {
            return;
        }
        this._progress = value;
    }

    get multiplier() {
        return this._multiplier;
    }
    get canvas() {
        return this._canvas;
    }
    get context() {
        return this._context;
    }

    get wordSpace() {
        return this.normalStyle.fontSize * 0.2 * this.multiplier;
    }

    get lineHeight() {
        return this.normalStyle.fontSize * 1.4 * this.multiplier;
    }

    get fontSize() {
        return this.normalStyle.fontSize * this.multiplier;
    }

    /**
     * Here we cache the different metrics for the text since they do not change during drawing
     */
    _build() {
        this._words = getWords(this._text, 'en', 'ltr');

        // store normal style metrics
        this._activateNormalStyle();
        this._normalWordMetrics = this._words.map(word => this.context.measureText(word));
        ({positions: this._normalWordPositions, lineIndices : this._normalLineIndices} = layoutWords(this._normalWordMetrics, this.wordSpace, this.lineHeight, this.width, this.height));

        // store highlight style metrics
        if (this._highlights.length !== 0) {
            this._activateHighlightStyle();
            this._highlightWordMetrics = this._words.map(word => this.context.measureText(word));
            ({positions: this._highlightWordPositions, lineIndices : this._highlightLineIndices} = layoutWords(this._highlightWordMetrics, this.wordSpace, this.lineHeight, this.width, this.height));
        }

        // create animation incrementer
        if (this.objectAnimation.length !== 0) {
            this.objectAnimation.map((animation, index) => {
                let arraySize = 0;
                switch(animation.element) {
                   case 'word': arraySize = this._words.length; break;
                   case 'line': arraySize = this._normalLineIndices.length; break;
                   default: throw new Error('Invalid animation type');
                }
                const incrementer = new ProgressIncrementer(arraySize);
                incrementer.offset = animation.offset;
                incrementer.duration = animation.duration;
                this._objectIncrementer.push(incrementer);
            });
        }
    }

    _activateNormalStyle() {
        this.context.fillStyle = this.normalStyle.fontColor;
        this.context.font = `${this.normalStyle.fontSize * this.multiplier}px ${this.normalStyle.fontFamily}`;
    }

    _activateHighlightStyle() {
        if (!this.highlightStyle) {
            throw new Error('No highlight style defined');
        }
        this.context.fillStyle = this.highlightStyle.fontColor;
        this.context.font = `${this.highlightStyle.fontSize * this.multiplier}px ${this.highlightStyle.fontFamily}`;
    }

    _activateHighlightGraphicStyle() {
        if (!this.highlightGraphicStyle) {
            throw new Error('No highlight graphic style defined');
        }
        this.context.fillStyle = this.highlightGraphicStyle.graphicColor;
    }

    /**
     * Draw the final text on the canvas. This includes the normal text, the highlighted text and the animated objects.
     */
    draw() {
        // update object animation
        this._objectIncrementer.forEach((incrementer, index) => {
            incrementer.progress = this.progress;
            incrementer.update();
        });

        // build up the canvas from the bottom up. First draw the elements that are behind the text.

        // clear canvas
        this.context.clearRect(0, 0, this.width * this.multiplier, this.height * this.multiplier);

        // draw highlighted pass
        if (this._highlights.length !== 0) {
            // draw highlight graphics
            if (this.highlightGraphicStyle && this.progress > 0.0) {
                this._activateHighlightGraphicStyle();

                this.context.beginPath();
                this._highlights.forEach(index => {
                    const {x, y} = this._highlightWordPositions[index];
                    const {fontBoundingBoxAscent, fontBoundingBoxDescent, width} = this._highlightWordMetrics[index]
                    const height = fontBoundingBoxAscent + fontBoundingBoxDescent;
                    // @ts-ignore
                    this.context.rect(x - this.highlightGraphicStyle.padding.left, y - fontBoundingBoxAscent - this.highlightGraphicStyle?.padding.top, (width + this.highlightGraphicStyle.padding.left + this.highlightGraphicStyle.padding.right) * this.progress, height + (this.highlightGraphicStyle?.padding.top + this.highlightGraphicStyle?.padding.bottom));
                });
                this.context.fill();
            }

            // draw highlighted text
            if (this.progress > 0.0) {
                this.context.save();

                this._activateHighlightStyle();

                this.context.beginPath();
                this._highlights.forEach(index => {
                    const {x, y} = this._highlightWordPositions[index];
                    const {actualBoundingBoxAscent, actualBoundingBoxDescent, width} = this._highlightWordMetrics[index]
                    const height = actualBoundingBoxAscent + actualBoundingBoxDescent;
                    this.context.rect(x, y - actualBoundingBoxAscent, width * this.progress, height);
                });
                this.context.clip();

                this._words.forEach((word, i) => {
                    this.context.fillText(this._words[i], this._normalWordPositions[i].x, this._normalWordPositions[i].y);
                });
                this.context.restore();
            }
        }

        // draw normal pass
        this.context.save();
        this._activateNormalStyle();

        // clip normal text to highlight text
        if (this._highlights.length !== 0) {
            this.context.beginPath();
            this._words.forEach((word, index) => {
                const {x, y} = this._highlightWordPositions[index];
                const {actualBoundingBoxAscent, actualBoundingBoxDescent, width} = this._highlightWordMetrics[index]
                const height = actualBoundingBoxAscent + actualBoundingBoxDescent;
                if (this._highlights.includes(index)) {
                    const offset = width * this.progress;
                    this.context.rect(x + offset, y - actualBoundingBoxAscent, width * (1 - this.progress), height);
                } else {
                    this.context.rect(x, y - actualBoundingBoxAscent, width, height);
                }
            });
            this.context.clip();
        }

        // draw actual normal text
        let lineIncrement = 0;
        this._words.forEach((word, i) => {
            let xPos = this._normalWordPositions[i].x;
            let yPos = this._normalWordPositions[i].y;

            this.objectAnimation.forEach((animation, aIndex) => {
                const value = this._objectIncrementer[aIndex].array[lineIncrement];
                const range = animation.range;
                const remappedValue = remapValue(value, range[0], range[1]);

                switch (animation.property) {
                    case 'opacity': this.context.globalAlpha = remappedValue; break;
                    case 'x': xPos += remappedValue; break;
                    case 'y': yPos += remappedValue; break;
                    default: throw new Error('Invalid animation property');
                }
            });

            this.context.fillText(this._words[i], xPos, yPos);

            if (this._normalLineIndices.includes(i)) {
                lineIncrement++;
            }
        });
        this.context.restore();
    }
}