export type Position = {
    x: number,
    y: number,
}

export const clamped = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
}

/**
 * Layout words metrics within the given layout dimensions
 * NOTE: we can optimize this function by:
 * - use words instead of metrics. This would allow us to only measure the words we care about
 * - each time we get the metrics for a word, we can cache it
 * NOTE: we'll want to return a TextMetrics object here
 */
export const layoutWords = (
    {
        wordMetrics,
        startIndex,
        fontSize,
        wordSpace,
        lineHeight,
        layoutWidth,
        layoutHeight
    }: {
        wordMetrics: Array<TextMetrics>,
        startIndex: number,
        fontSize: number,
        wordSpace: number,
        lineHeight: number,
        layoutWidth: number,
        layoutHeight: number
    }
    ) => {
    let xPos = 0;
    let yPos = 0 + fontSize;
    let wordPositions : Array<Position> = [];
    let lineIndices: number[] = [];

    let xOffset = xPos;
    let yOffset = yPos;
    let newLine = false;
    let lastIndex = startIndex;
    wordPositions.push({x: xOffset, y: yOffset});

    for (let index = startIndex; index < wordMetrics.length; index++) {
        const { width } = wordMetrics[index]
        lastIndex = index;
        xOffset += width + wordSpace;
        if (wordMetrics[index + 1] && xOffset + wordMetrics[index + 1].width > layoutWidth) {
            xOffset = xPos;
            yOffset += lineHeight;
            newLine = true;

            if (yOffset > layoutHeight) {
                break;
            }
        }
        else {
            newLine = false;
        }
        wordPositions.push({x: xOffset, y: yOffset});
        if (newLine) lineIndices.push(index);
    }
    if (lineIndices[lineIndices.length - 1] !== lastIndex) {
        lineIndices.push(wordMetrics.length - 1);
    }

    // we should move some stuff around so this matches!!!
    const textFits = wordPositions.length - 1 === wordMetrics.length;

    return {
        positions: wordPositions,
        lineIndices,
        lastIndex,
        textFits,
    }
}

// How would this work when a piece text contains multiple languages?
export const getWords = (text, locales, direction) => {
     let words: string[] = [];

     // @ts-ignore
    const wordSegmenter = new Intl.Segmenter(locales, { granularity: 'word' });
    const wordIterator = wordSegmenter.segment(text)[Symbol.iterator]();
    for(const word of wordIterator) {
        if (!word.isWordLike) {
            continue;
        }
        words.push(word.segment);
    }

    if (direction === 'rtl') {
        words = words.reverse();
    }

    return words;
}

// return the graphemes from a text string
export const getGraphemes = (words: string[], locales) => {
     let graphemes: string[] = [];

    for(const word of words) {
        // @ts-ignore
        const graphemeSegmenter = new Intl.Segmenter(locales, { granularity: 'grapheme' });
        const graphemeIterator = graphemeSegmenter.segment(word)[Symbol.iterator]();
        for(const grapheme of graphemeIterator) {
            graphemes.push(grapheme.segment);
        }
    }
    graphemes.push(' ');

    return graphemes;
}

export const remapValue = (value, min, max) => {
    const range = max - min;
    return (value * range) + min;
}

export const simplifyTranscript = (TRANSCRIPT, groupId='72f7ad49-c114-cf11-a619-14fa385d020f') => {
    // scene group id
    if (!TRANSCRIPT[groupId]) throw new Error('Invalid group id');

    const root = TRANSCRIPT[groupId];
    const language = root['language'];
    const textDirection = root.editorState.root.direction;
    const paragraph = root.editorState.root.children[0];
    const words = paragraph.children
        .map(word => {
            return {
                text: word.text,
                startTime: word.startTime,
                endTime: word.endTime,
            }
        })
        .filter(word => word.text !== ' ' && word.text !== undefined)
    return {
        language,
        textDirection,
        words,
    }
}
export const loadAudio = async(url): Promise<HTMLAudioElement> => {
    const audio = document.createElement('audio');
    audio.src = url;
    audio.defaultMuted = true;
    // audio.muted = true;
    audio.autoplay = true;
    // audio.volume = 0;
    document.body.appendChild(audio);

    return new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => {
            console.log('audio loaded');
            resolve(audio);
        });
    })
}