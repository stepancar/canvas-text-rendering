type TranscriptWord = {
    text: string,
    startTime: number,
    endTime: number,
}

export class Transcript {
    _name: string;
    _words: TranscriptWord[];
    _language: string;
    _textDirection: string;
    constructor({name, words, language, textDirection}) {
        this._name = name;
        this._words = words;
        this._language = language;
        this._textDirection = textDirection;
    }

    get name() {
        return this._name;
    }

    get duration() {
        return this.endTime - this.startTime;
    }

    // NOTE: we should make this a clearer type
    get words() {
        return this._words;
    }

    get startTime() {
        return this._words[0].startTime;
    }

    get endTime() {
        return this._words[this._words.length - 1].endTime;
    }
    getActiveWordIndex(time) {
        // console.log('getActiveWordIndex', time);
        if (time < this.startTime) {
            return -1;
        }
        if (time > this.endTime) {
            return -1;
        }
        let result = this._words.findIndex(word => {
            return word.startTime <= time && word.endTime >= time;
        });
        if (result !== -1) {
            return result;
        }
        result = this._words.findIndex(word => {
            return time > word.endTime
        });
        return result;
    }

    getLastWord() {
        return this._words[this._words.length - 1];
    }

    getWordsForTimeRange(startTime: number, endTime: number) {
        return this._words.filter(word => word.startTime >= startTime && word.endTime <= endTime)
    }

    /**
     * Create a new transcript from the given time range
     */
    createTranscriptFromTimeRange(startTime:number, endTime: number) {
        return new Transcript({
            name: 'local',
            words: this.getWordsForTimeRange(startTime, endTime),
            language: this._language,
            textDirection: this._textDirection
        })
    }

    createTranscriptFromWordRange(startWordIndex: number, endWordIndex: number) {
        return new Transcript({
            name: 'local',
            words: this._words.slice(startWordIndex, endWordIndex),
            language: this._language,
            textDirection: this._textDirection
        })
    }
}

