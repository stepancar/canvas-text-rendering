import WebFont from 'webfontloader';

const WEB_FONT_LOAD_TIMEOUT = 10000;

 const generateFontFaceCSS = (familyName: string, url: string) => {
    const style = familyName;
    return `
        @font-face {
            font-family: "${familyName}";
            src: url('${url}');
        }
        .${familyName}, .${familyName} span, .${familyName} p, .${familyName} div {
            font-family: ${familyName} !important;
        }
    `;
}

const createStyleElement = (familyName, url) => {
    const newStyle = document.createElement('style');
    const css = generateFontFaceCSS(familyName, url);

    newStyle.appendChild(document.createTextNode(css));
    window.document.head.appendChild(newStyle);
}

export const loadFont = async(familyName, fontUrl) => {
     createStyleElement(familyName, fontUrl);

     return new Promise((resolve, reject) => {
         const WebFontConfig = {
            custom: {
                families: [familyName],
            },
            fontactive: (familyName, fvd) => {
                resolve(familyName);
            },
            fontinactive: (familyName, fvd) => {
                const error = new Error(`Failed to load font ${familyName}`);
                reject(error);
            },
            timeout: WEB_FONT_LOAD_TIMEOUT,
        };
        WebFont.load(WebFontConfig);
     });
}

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
