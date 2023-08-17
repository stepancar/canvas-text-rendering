import {Transcript} from "./transcript";
import {ChunkStyle, Font, TextStyle} from "./captionGenerator";
import {clamped, layoutWords, Position, remapValue} from "../utils/utils";
import {InterpolationCache} from "../animation/interpolationCache";

type ChunkBasedObjectAnimation = {
    property: string,
    element: string,
    range: number[],
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

export class Caption {
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
    private _interpolation: InterpolationCache;

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
        }: {
            transcript: Transcript,
            normalStyle: TextStyle,
            chunkStyle?: ChunkStyle,
            objectAnimation?: Array<ChunkBasedObjectAnimation>,
            x?: number,
            y?: number,
            width?: number,
            height?: number
        }) {
        this._transcript = transcript;
        this._normalStyle = normalStyle;
        this._chunkStyle = chunkStyle || this._chunkStyle;
        this.objectAnimation = objectAnimation || this.objectAnimation;

        this._x = x || 0;
        this._y = y || 0;
        this._width = width || 250;
        this._height = height || 250;

        this._canvas = document.createElement('canvas');
        this._canvas.width = this._width;
        this._canvas.height = this._height;
        document.body.appendChild(this._canvas);
        const context = this._canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get canvas context');
        }
        this._context = context;

        this._build();

        // create interpolation cache
        // we should only do this globally once -- this is just to demo
        this._interpolation = new InterpolationCache(100, 'sigmoid', 0, 1);
    }

    _build() {
        // create metrics
        this._activateNormalFont();
        this._normalWordMetrics = this.transcript.words.map(word => this.context.measureText(word.text));

        // create chunks -- we need to make them up front if we want to be able to jump forward and backwards. If we
        // only care about playing forward then we can create them on the fly.
        this._createChunks();
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

    _activateNormalFont() {
        this.context.fillStyle = this.normalStyle.fontColor;
        this.context.font = `${this.normalStyle.fontSize}px ${this.normalStyle.fontFamily}`;
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

    // if we have any animation then we need add the maximum duration when looking up chunks so that we have time to
    // animate in
    _maxAnimationDuration() {
        return Math.max(...this.objectAnimation
            .map(animation => animation.interpolation.duration));
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

    draw() {
        const chunk = this._getActiveChunk();
        if (!chunk) {
            return;
        }
        const words = chunk.transcript.text;

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this._activateNormalFont();

        const activeWordIndex = chunk.transcript.getActiveWordIndex(this.currentTime);

        for (let i = 0; i < words.length; i++) {
            let xPos = this._x + chunk.wordPositions[i].x;
            let yPos = this._y + chunk.wordPositions[i].y;

            // get the next word which will be visible within 100ms
            // that way we can fade it in

            this.objectAnimation.forEach(animation => {
                const duration = animation.interpolation ? animation.interpolation.duration : 0;
                let value = 0.0;

                // is the word going to active in the foreseeable future?
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

                const range = animation.range;
                const remappedValue = remapValue(this._interpolation.getCachedValue(value), range[0], range[1]);

                switch (animation.property) {
                    case 'opacity': this.context.globalAlpha = remappedValue; break;
                    case 'x': xPos += remappedValue; break;
                    case 'y': yPos += remappedValue; break;
                    default: throw new Error('Invalid animation property');
                }
            });

            this.context.fillText(words[i], xPos, yPos);
        }
    }
}