import {Transcript} from "./transcript";
import {ChunkStyle, Font, TextStyle} from "./captionGenerator";
import {clamped, layoutWords, Position, remapValue} from "../utils/utils";
import {InterpolationCache} from "../animation/interpolationCache";
import {Rectangle, Sprite, Texture} from "pixi.js";

type ChunkBasedObjectAnimation = {
    property: string,
    // this can be object, line or word
    element: string,
    // this can be a hardcoded value or a dynamic value
    //  max element height, max element width, element height, element width, scene width, scene height, gapless
    range: [number, number],
    interpolation: {
        type: string,
        duration: number
    },
}

type Chunk = {
    transcript: Transcript,
    startIndex: number,
    endIndex: number,
    wordPositions: Array<Position>,
}

export class PixiCaption {
    private _caption : Caption;
    private _sprite: Sprite;

    constructor(
        {
            transcript,
            normalStyle,
            chunkStyle,
            objectAnimation,
            x,
            y,
            width,
            height
        }:{
            transcript: Transcript,
            normalStyle: TextStyle,
            chunkStyle?: ChunkStyle,
            objectAnimation?: Array<ChunkBasedObjectAnimation>,
            x?: number,
            y?: number,
            width?: number,
            height?: number
        }
    ) {
        this._caption = new Caption({
            transcript,
            normalStyle,
            chunkStyle,
            objectAnimation,
            width,
            height
        });
        const pixiTexture = Texture.from(this._caption.canvas);
        this._sprite = new Sprite(pixiTexture);
        this._sprite.x = x || 0;
        this._sprite.y = y || 0;
    }

    get currentTime() {
        return this._caption.currentTime;
    }

    set currentTime(value: number) {
        this._caption.currentTime = value;
    }

    draw() {
        this._caption.draw();
        this._sprite.texture.baseTexture.update();
    }

    getBounds() {
        const {left, top} = this._caption.getAnimationPadding();
        return new Rectangle(left, top, this._caption.width, this._caption.height);
    }

    get sprite() {
        return this._sprite;
    }
}

/**
 * A Caption is a type of text animation, rendering and styling engine. It animates the text using a transcript. This
 * provides the engine with a time code when a word needs to be made visible. It styles the text using our a text and
 * dynamic styling system, and it renders all of this using a 2D Canvas element.
 */
export class Caption {
    // NOTE: we should add text alignment
    private _normalStyle: TextStyle;
    private _normalWordMetrics : Array<TextMetrics> = [];

    private _x: number = 0;
    private _y: number = 0;
    private _width: number = 100;
    private _height: number = 100;

    private _canvas: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;

    private _currentTime = -1;
    startTime: number = 0;
    endTime: number = 100;

    private _transcript: Transcript;
    private _chunkStyle: ChunkStyle = {style: 'bounds'};

    private _chunks: Array<Chunk> = [];
    private _activeChunkIndex: number = -1;

    objectAnimation: Array<ChunkBasedObjectAnimation> = [];
    objectAnimationValues: Array<Array<number>> = [];
    private _interpolation: InterpolationCache;

    constructor(
        {
            transcript,
            normalStyle,
            chunkStyle,
            objectAnimation,
            width,
            height
        }: {
            transcript: Transcript,
            normalStyle: TextStyle,
            chunkStyle?: ChunkStyle,
            objectAnimation?: Array<ChunkBasedObjectAnimation>,
            width?: number,
            height?: number
        }) {
        this._transcript = transcript;
        this._normalStyle = normalStyle;
        this._chunkStyle = chunkStyle || this._chunkStyle;
        this.objectAnimation = objectAnimation || this.objectAnimation;

        this._width = width || 250;
        this._height = height || 250;

        // create canvas and context
        this._canvas = document.createElement('canvas');
        // document.body.appendChild(this._canvas);
        const context = this._canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get canvas context');
        }
        this._context = context;

        // we need the context to generate the metrics
        // create metrics - these are very basic metrics. They are just so we can animate the text
        // however they are not enough to calculate the bounds of the text. That's why we're just
        // going to use the provided width and height for this demo.
        this._activateNormalFont();
        this._normalWordMetrics = this.transcript.words.map(word => this.context.measureText(word.text));

        // create chunks -- we need to make them up front if we want to be able to jump forward and backwards. If we
        // only care about playing forward then we can create them on the fly.
        this._createChunks();

        // resize canvas and update inner offsets
        const padding = this.getAnimationPadding();
        const canvasWidth = this._width + padding.left + padding.right;
        const canvasHeight = this._height + padding.top + padding.bottom;
        this._x = padding.left;
        this._y = padding.top;
        this._canvas.width = canvasWidth;
        this._canvas.height = canvasHeight;

        // create interpolation cache
        // we should only do this globally once -- this is just to demo functionality
        this._interpolation = new InterpolationCache(100, 'sigmoid', 0, 1);
        this.objectAnimationValues = this.objectAnimation.map(() => new Array(this.transcript.words.length).fill(0));

    }

    public get canvas() {
        return this._canvas;
    }

    public get chunkStyle() {
        return this._chunkStyle;
    }

    public get normalStyle() {
        return this._normalStyle;
    }

    get transcript() {
        return this._transcript;
    }

    get context() {
        return this._context;
    }

    get currentTime() {
        return this._currentTime;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    _activateNormalFont() {
        this.context.fillStyle = this.normalStyle.fontColor;
        this.context.font = `${this.normalStyle.fontSize}px ${this.normalStyle.fontFamily}`;

        if (this.normalStyle.shadow) {
            this.context.shadowColor = this.normalStyle.shadow.color;
            this.context.shadowBlur = this.normalStyle.shadow.blur;
        }
    }

    set currentTime(value: number) {
        if (this.currentTime === value) {
            return;
        }
        this._currentTime = value;
    }

    get wordSpace() {
        return this._normalStyle.fontSize * 0.2;
    }

    get fontSize() {
        return this._normalStyle.fontSize;
    }

    get lineHeight() {
        const lineHeight = this._normalStyle.lineHeight || 1.2;
        return this.fontSize * lineHeight;
    }

    getBounds() {
        // we don't have a fully fleshed out metrics here, so we're just assuming that the canvas is completely filled
        return {
            x: this._x,
            y: this._y,
            width: this.canvas.width,
            height: this.canvas.height
        }
    }

    // if we have any animation then we need add the maximum duration when looking up chunks so that we have time to
    // animate in
    _maxAnimationDuration() {
        return Math.max(...this.objectAnimation
            .map(animation => animation.interpolation.duration));
    }

    // return the padding required to make room for any animations
    getAnimationPadding() {
        // NOTE: text alignment will have an impact on the offsets
        // Left and right alignment should be trivial to calculate. Center alignment will be more difficult since we
        // need to know the width of the text. This means that we'll need the metrics.

        // look for animation coming in from the left (we assume the text is left aligned)
        const left = Math.abs(Math.min(...this.objectAnimation
            .filter(animation => animation.property === 'x')
            .map(animation => animation.range[0])));

        // sort any other directions

        return {
            'left': left,
            'right': 0,
            'top': 0,
            'bottom': 0
        }
    }

    _createChunks() {
        let startIndex = 0;
        let lastIndex = 0;
        let positions: Array<Position> = [];
        while(lastIndex !== this.transcript.words.length - 1) {

            if (this.chunkStyle.style === 'bounds') {
                ({positions, lastIndex} = layoutWords({
                    wordMetrics: this._normalWordMetrics,
                    startIndex: startIndex,
                    fontSize: this.fontSize,
                    wordSpace: this.wordSpace,
                    lineHeight: this.lineHeight,
                    layoutWidth: this._width,
                    layoutHeight: this._height
                }));
            }
            else {
                throw new Error('Invalid chunk style');
            }

            const transcript = this.transcript.createTranscriptFromWordRange(startIndex, lastIndex);
            this._chunks.push({
                transcript,
                startIndex,
                endIndex: lastIndex,
                wordPositions: positions
            })
            startIndex = lastIndex;
        }
    }

    private _getActiveChunk() {
        // we need to include the max animation duration so our chunk has time to animate in
        const currentTime = this.currentTime + this._maxAnimationDuration();

        if (this._activeChunkIndex !== -1) {
            if (currentTime >= this._chunks[this._activeChunkIndex].transcript.startTime &&
                currentTime <= this._chunks[this._activeChunkIndex].transcript.endTime) {
                return this._chunks[this._activeChunkIndex];
            }
        }

        if (currentTime < this._chunks[0].transcript.startTime) {
            this._activeChunkIndex = 0;
            return this._chunks[0];
        }

        const chunkIndex = this._chunks.findIndex(chunk => {
            return currentTime >= chunk.transcript.startTime
                && currentTime <= chunk.transcript.endTime;
        });
        if (chunkIndex !== -1) {
            this._activeChunkIndex = chunkIndex;
            return this._chunks[chunkIndex];
        }
    }

    _computeAnimationValues() {
        // what about highlights? which value do they have?
        // where does animation start and where does it stop? Since most remapping requires some kind of metrics we'll
        // probably want to keep it in the draw method.
        const chunk = this._getActiveChunk();
        if (!chunk) {
            return;
        }
        const activeWordIndex = chunk.transcript.getActiveWordIndex(this.currentTime);
        this.objectAnimation.forEach((animation, index) => {
            if (animation.element === 'word') {
                const words = chunk.transcript.text;
                for (let i = 0; i < words.length; i++) {
                    let value = 0.0;

                    // is the word going to be active in the foreseeable future?
                    const duration = animation.interpolation ? animation.interpolation.duration : 0;
                    if (duration > 0) {
                        const futureWordIndex = chunk.transcript.getActiveWordIndex(this.currentTime + duration);
                        if (i <= futureWordIndex) {
                            const futureWord = chunk.transcript.words[i];
                            const progress = (this.currentTime - futureWord.startTime + duration) / duration;
                            value = clamped(progress, 0, 1);
                        }
                    }
                    // is the word currently active or was it active in the past?
                    if (i <= activeWordIndex) {
                        value = 1;
                    }

                    const range = animation.range; // in our current examples range is a hardcoded value but in production it will be dynamic
                    this.objectAnimationValues[index][i] = remapValue(this._interpolation.getCachedValue(value), range[0], range[1]);
                }
            }
            else {
                throw new Error('Invalid animation element');
            }
        });
    }

    draw() {
        // get the active chunk
        const chunk = this._getActiveChunk();
        if (!chunk) {
            return;
        }
        const words = chunk.transcript.text;
        this._computeAnimationValues();

        // clear the canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // draw the text
        this._activateNormalFont();
        for (let i = 0; i < words.length; i++) {
            let xPos = this._x + chunk.wordPositions[i].x;
            let yPos = this._y + chunk.wordPositions[i].y;

            this.objectAnimation.forEach((animation, j) => {
                const value = this.objectAnimationValues[j][i];
                switch (animation.property) {
                    case 'opacity': this.context.globalAlpha = value; break;
                    case 'x': xPos +=  value; break;
                    case 'y': yPos += value; break;
                    default: throw new Error('Invalid animation property');
                }
            });

            this.context.fillText(words[i], xPos, yPos);
        }
    }
}