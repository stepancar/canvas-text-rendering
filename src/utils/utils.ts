export type Position = {
    x: number,
    y: number,
}
export const layoutWords = (
    wordMetrics,
    wordSpace: number,
    lineHeight: number,
    layoutWidth: number,
    layoutHeight: number
) => {
    let xPos = 0;
    let yPos = 0 + lineHeight;
    let wordPositions : Array<Position> = [];
    let lineIndices: number[] = [];
    console.log('word metrics', wordMetrics.length);

    let xOffset = xPos;
    let yOffset = yPos;
    let newLine = false;
    wordPositions.push({x: xOffset, y: yOffset});
    wordMetrics.forEach((wordMetric, index) => {
        // NOTE: don't use these properties as they are not consistent between node and web
        const { width } = wordMetric;
        xOffset += width + wordSpace;
        if (wordMetrics[index + 1] && xOffset + wordMetrics[index + 1].width > layoutWidth) {
            xOffset = xPos;
            yOffset += lineHeight;
            newLine = true;
        }
        else {
            newLine = false;
        }
        wordPositions.push({x: xOffset, y: yOffset});
        if (newLine) lineIndices.push(index);
    });
    if (lineIndices[lineIndices.length - 1] !== wordMetrics.length - 1) {
        lineIndices.push(wordMetrics.length - 1);
    }

    return {
        positions: wordPositions,
        lineIndices,
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
