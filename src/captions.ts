import {Transcript} from "./transcript";

type Position = {
    x: number,
    y: number,
}

export type Font = {
    family: string,
    url: string,
}

export type TextStyle = {
    fontSize: number,
    fontFamily: string,
    fontColor: string,
    lineHeight?: number,
}

const getNextClosestIndex = (array, index) => {
    for (let i = 0; i < array.length; i++) {
        if (array[i] > index) {
            return i;
        }
    }
    return array.length - 1;
}

class Caption {
    // local transcript for the current chunk of text
    _transcript: Transcript;
    _parent: CaptionGenerator;

    _words: string[] = [];

    // normal style word metrics
    _normalWordMetrics: TextMetrics[] = [];
    _normalWordPos: Position[] = [];
    _normalLineIndices: number[] = [];

    // skia highlight style word metrics
    _highlightWords: any[] = [];

    constructor(options: {
        transcript: Transcript,
        parent: CaptionGenerator,
    }) {
        this._transcript = options.transcript;
        this._parent = options.parent;
        this.build();
    }

    get parent() {
        return this._parent;
    }

    build() {
        // normal style
        this._words = this._transcript.words.map((word) => word.text);

        this.parent._activateNormalFont();
        this._normalWordMetrics = this._words.map(word => this.parent.context.measureText(word));

        const padding = {
            left: 3,
            right: 3,
            top: -4,
            bottom: -4,
        }
        let xPos = this.parent.fancyStyle.style === 'highlight' ? this.parent.x + padding.left : this.parent.x;
        let yPos = this.parent.fancyStyle.style === 'highlight' ? this.parent.y + padding.top + this.parent.lineHeight: this.parent.y + this.parent.lineHeight;
        let xOffset = xPos;
        let yOffset = yPos
        let newLine = false;
        this._normalWordPos.push({x: xOffset, y: yOffset});
        this._normalWordMetrics.forEach((wordMetric, index) => {
            const {
                actualBoundingBoxRight,
                actualBoundingBoxLeft
            } = wordMetric;

            let width = actualBoundingBoxRight - actualBoundingBoxLeft;
            xOffset += width + this.parent.space;
            if (index < this._words.length - 1 && xOffset + this._normalWordMetrics[index + 1].width > this.parent.canvas.width) {
                xOffset = xPos;
                yOffset += this.parent.lineHeight;
                newLine = true;
            }
            else {
                newLine = false;
            }
            this._normalWordPos.push({x: xOffset, y: yOffset});
            if (newLine) this._normalLineIndices.push(index);
        });


        // this._normalWordsPos.push({x: xOffset, y: yOffset});
        // this._normalWords.forEach((word, index) => {
        //     xOffset += word.width + this.parent.space;
        //     if (this._normalWords[index + 1] && (xOffset + this._normalWords[index + 1].width) > this.parent.width) {
        //         xOffset = padding.left;
        //         yOffset += word.lineHeight;
        //         newLine = true;
        //     }
        //     else {
        //         newLine = false;
        //     }
        //     this._normalWordsPos.push({x: xOffset, y: yOffset});
        //     if (newLine) this._normalLineIndices.push(index);
        // });
        // this._normalLineIndices.push(this._normalWords.length - 1);
        // console.log('normal line indices', this._normalLineIndices, this._normalLineIndices.map(index => this._normalWordsPos[index].y));
    }

    draw() {
        this.parent.context.clearRect(0, 0, this.parent.canvas.width, this.parent.canvas.height);

        const lastWordIndex = this._words.length;
        if (this.parent.fancyStyle.style === 'opacity') {
            if (this.parent.fancyStyle.level === 'word') {
                const activeWordIndex = this._transcript.getActiveWordIndex(this.parent.currentTime);
                if (activeWordIndex !== -1) {
                    for(let i = 0; i <= activeWordIndex; i++) {
                        this.parent._activateHighlightStyle();
                        this.parent.context.fillText(this._words[i], this._normalWordPos[i].x, this._normalWordPos[i].y);
                    }
                    for (let i = activeWordIndex + 1; i < lastWordIndex; i++) {
                        this.parent._activateNormalStyle();
                        this.parent.context.fillText(this._words[i], this._normalWordPos[i].x, this._normalWordPos[i].y);
                    }
                }
                else {
                    for (let i = 0; i < lastWordIndex; i++) {
                        this.parent._activateNormalStyle();
                        this.parent.context.fillText(this._words[i], this._normalWordPos[i].x, this._normalWordPos[i].y);
                    }
                }
            }
        }
        if (this.parent.fancyStyle.style === 'highlight') {
            const padding = {
                left: 3,
                right: 3,
                top: 4,
                bottom: 4,
            }

            // draw color graphic behind spoken word
            const activeWordIndex = this._transcript.getActiveWordIndex(this.parent.currentTime);
            if (activeWordIndex !== -1) {
                this.parent._activateHighlightStyle();

                const textMetric = this._normalWordMetrics[activeWordIndex];
                this.parent.context.fillRect(
                    this._normalWordPos[activeWordIndex].x - padding.left,
                    this._normalWordPos[activeWordIndex].y - this._normalWordMetrics[activeWordIndex].actualBoundingBoxAscent - padding.top,
                    textMetric.width + padding.left + padding.right,
                    textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent + padding.top + padding.bottom)
            }

            // draw transcript text
            for (let i = 0; i < lastWordIndex; i++) {
                this.parent._activateNormalStyle();
                this.parent.context.fillText(this._words[i], this._normalWordPos[i].x, this._normalWordPos[i].y);
            }
        }

    }

    destroy() {
        // this._normalWords.forEach(paragraph => {
        //     paragraph.paragraph.delete();
        // })
    }
}

export type FancyStyle = {
    style: 'opacity' | 'highlight',
    level: 'object' | 'line' | 'word',
    interpolation: 'linear' | 'stepped'
}


// appear
// chunkDuration: 1000
// objectAnimation: [{
//      property: 'opacity',
//      level: 'letter', // animate word from start to end in x
//      interpolation: 'stepped',
//      layout: 'onTheFly',
//      start: '0',
//      end: '1',
// }]

// fade
// chunkDuration: 1000
// objectAnimation: [{
//      property: 'opacity',
//      level: 'letter', // animate word from start to end in x
//      interpolation: 'linear',
//      layout: 'atTheStart',
//      start: 0,
//      end: 1,
// }]

// swipe
// chunkDuration: 1000
// objectAnimation: [{
//      property: 'opacity',
//      level: 'word',
//      interpolation: 'linear',
//      layout: 'atTheStart',
//      start: 0,
//      end: 1,
// },
// {
//      property: 'x',
//      level: 'word',
//      interpolation: 'linear',
//      layout: 'atTheStart',
//      start: 0,
//      end: 100,
// }]

// karaoke (highlight active word)
// chunkDuration: 1000
// colorGraphics: [{
//      property: 'opacity',
//      level: 'word',
//      interpolation: 'stepped',
//      layout: 'atTheStart',
//      start: 0,
//      end: 1,
// }]


// not relevant dynamic styling properties
// delay?
// percentage offset
// zigZagPerLine
// zigZagPerLineStart
// shouldOffsetPropertyValue
// mirrorPercentageOffset
// startMulti
// end Multi

export class CaptionGenerator {
    // global transcript container the entire transcript of the media
    private _transcript: Transcript;
    startTime: number;
    endTime: number;
    chunkDuration : number;
    private _currentTime = -1;

    private _normalStyle: TextStyle;
    private _highlightStyle: TextStyle | null = null;
    private _normalFont: Font;
    private _highlightFont: Font | null = null;

    private _x: number;
    private _y: number;
    private _width: number;
    private _height: number;

    private _previousActiveChunk = -1;
    private _activeCaption : Caption | null = null;

    private _canvas: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;

    fancyStyle: FancyStyle;

    constructor(options: {
        transcript: Transcript,

        normalStyle: TextStyle
        normalFont: Font,
        highlightStyle?: TextStyle,
        highlightFont?: Font,

        x?: number,
        y?: number,
        width?: number,
        height?: number,

        startTime?: number,
        endTime?: number,
        chunkDuration?: number

        fancyStyle: FancyStyle,
    }) {
        this._transcript = options.transcript;

        this._normalStyle = options.normalStyle;
        this._normalFont = options.normalFont;
        this._highlightStyle = options.highlightStyle || null;
        this._highlightFont = options.highlightFont || null;

        this._x = options.x || 0;
        this._y = options.y || 0;
        this._width = options.width || 250;
        this._height = options.height || 250;

        this.startTime = options.startTime || 0;
        this.endTime = options.endTime || 1000;
        this.chunkDuration = options.chunkDuration || 1000;

        this.fancyStyle = options.fancyStyle;

        this._canvas = document.createElement('canvas');
        this._canvas.id = 'captionCanvas';
        const context = this._canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get canvas context');
        }
        this._context = context;

        this.resizeCanvas(this._width, this._height);
    }

    resizeCanvas(width: number, height: number) {
        this._width = width * 2;
        this._height = height * 2;
        this._canvas.width = width;
        this._canvas.height = height;
    }

    get canvas() {
        return this._canvas;
    }

    get context() {
        return this._context;
    }

    get space() {
        const fontSize = this._normalStyle.fontSize;
        if (!fontSize) {
            return 0;
        }
        return fontSize * 0.2;
    }

    get lineHeight() {
        const fontSize = this._normalStyle.fontSize;
        if (!fontSize) {
            return 0;
        }
        const lineHeight = this._normalStyle.lineHeight || 1.2;
        return fontSize * lineHeight;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    public get transcript() {
        return this._transcript;
    }

    public get normalStyle() {
        return this._normalStyle;
    }

    public get normalFont() {
        return this._normalFont;
    }

    public get highlightStyle() {
        return this._highlightStyle;
    }

    public get highlightFont() {
        return this._highlightFont;
    }

    get chunkCount() {
        return Math.ceil(this.duration / this.chunkDuration);
    }

    getActiveChunk(time) {
        if (time < this.startTime) {
            return 0;
        }
        if (time > this.endTime) {
            return this.chunkCount;
        }
        return Math.floor(time / this.chunkDuration);
    }

    getChunkTimeRange(index: number) {
        const chunckDuration = this.chunkDuration;
        const startTime = index * chunckDuration;
        const endTime = startTime + chunckDuration;
        return {
            startTime,
            endTime
        }
    }
    getWordsForTimeRange(startTime: number, endTime: number) {
        return this.transcript.getWordsForTimeRange(startTime, endTime);
    }

    getActiveWordIndex() {
        return this.transcript.getActiveWordIndex(this.currentTime);
    }

    get duration() {
        return this.endTime - this.startTime;
    }

    get currentTime() {
        return this._currentTime;
    }
    set currentTime(time) {
        // nothing to do if we're not within the time range
        if (this.startTime > time || this.endTime < time) {
            return;
        }

        this._currentTime = time;
        const activeChunk = this.getActiveChunk(time);
        if (activeChunk === this._previousActiveChunk) {
            return;
        }
        this._previousActiveChunk = activeChunk;

        // NOTE: we don't take bounds into account here. We just get all the words within the given chunk duration
        // if we want to take bounds into account, we'll have to rework this quite a bit as we'll first want to layout
        // out all the words first, so we know their width and height to chunk bounds.
        const {startTime, endTime} = this.getChunkTimeRange(activeChunk);
        const transcript = this.transcript.createTranscriptFromTimeRange(startTime, endTime)

        if (this._activeCaption) {
            this._activeCaption.destroy();
        }
        this._activeCaption = new Caption({
            transcript,
            parent: this
        });
    }

    public  get activeCaption() {
        return this._activeCaption;
    }

    _activateNormalFont() {
        this.context.font = `${this.normalStyle.fontSize}px ${this.normalStyle.fontFamily}`;
    }

    _activateNormalStyle() {
        this.context.fillStyle = this.normalStyle.fontColor;
    }

    _activateHighlightFont() {
        if (!this.highlightStyle) {
            return;
        }
        this.context.font = `${this.highlightStyle.fontSize}px ${this.highlightStyle.fontFamily}`;
    }

    _activateHighlightStyle() {
        if (!this.highlightStyle) {
            return;
        }
        this.context.fillStyle = this.highlightStyle.fontColor;
    }

    draw() {
        if (!this.activeCaption) {
            console.warn('no active caption');
            return;
        }
        this.activeCaption.draw();
    }
}