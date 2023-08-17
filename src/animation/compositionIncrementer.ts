import {ProgressIncrementer} from "./progressIncrementer";

/**
 * Mockup of a scene composition incrementer. Each scene has an intro, a pause and an outro animation.
 * NOTE: this currently does not include a delay at the start (or end)
 */
export class CompositionIncrementer {
    private _intro: ProgressIncrementer;
    private _pause: number = 1000;
    private _outro: ProgressIncrementer;
    private _progress: number = 0;

    array: Array<number> = [];

    constructor(
        intro: ProgressIncrementer,
        outro: ProgressIncrementer,
        pause?: number,
    )
    {
        this._intro = intro;
        this._pause = pause || 1000;
        this._outro = outro;
    }

    get progress() {
        return this._progress;
    }
    set progress(value: number) {
        this._progress = value;

        const progress = value * this.duration;
        if (progress < this._intro.duration) {
            this._intro.progress = progress / this._intro.duration;
            this._intro.update();
            this.array = this._intro.array;
        }
        else if (progress > this._intro.duration && progress < this._intro.duration + this._pause) {
            // pause - nothing to do
            // console.log('inbetween')
        }
        else {
            this._outro.progress = 1 - ((progress - (this._intro.duration + this._pause)) / this._outro.duration);
            this._outro.update();
            this.array = this._outro.array;
        }
    }

    get duration() {
        return this._intro.duration + this._pause + this._outro.duration;
    }
}