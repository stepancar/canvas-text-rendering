import fs from "fs";

const { registerFont, createCanvas } = require('canvas')
import LANGUAGES from "./library";
import {downloadFile} from "./node_utils";
import {getWords} from "./node_utils";

const drawAndSelectText = async(languageIndex: number) => {
    if (languageIndex === undefined) {
        throw new Error('languageIndex is undefined');
    }
    console.log('drawAndSelectText', languageIndex);

    const languages = Object.keys(LANGUAGES);
    const {family: fontFamily, url: fontUrl, text, locales, direction} = LANGUAGES[languages[languageIndex]];
    const fontFileName = fontUrl.split('/').pop();
    const fontPath = `./tmp/${fontFileName}`

    // create tmp directory as we have to download our font files
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp')
    await downloadFile(fontUrl, fontPath);

    // we must register the font before we create a canvas
    registerFont(fontPath, { family: fontFamily })

    const multiplier = 2;
    const width = 512 * multiplier;
    const height = 128 * multiplier;
    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d');

    const fontSize = 36 * multiplier;
    context.font = `${fontSize}px ${fontFamily}`;

    let words = getWords(text, locales, direction);
    if (direction === 'rtl') {
        words = words.reverse();
    }

    const yPos = 100;
    const xPos = 10;
    let xOffset = xPos;
    let yOffset = yPos;
    const space = fontSize * 0.2;

    let totalWidth = 0;
    let fontAscent = 0;
    let fontDescent = 0;
    let textAscent = -Infinity;
    let textDescent = -Infinity;
    words.forEach((word, index) => {
        context.fillStyle = 'rgba(0, 0, 0, 1.0)';
        const textMetrics = context.measureText(word);
        context.fillText(word, xOffset, yPos);

        yOffset = yPos - textMetrics.actualBoundingBoxAscent;
        let height = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
        let width = textMetrics.actualBoundingBoxRight - textMetrics.actualBoundingBoxLeft;
        console.log(word, textMetrics.actualBoundingBoxRight, textMetrics.actualBoundingBoxLeft, textMetrics.width);
        // let width = textMetrics.width;

        if (index === 1 ) {
            context.fillStyle = 'rgba(255, 0, 0, 0.5)';
            context.fillRect(xOffset, yOffset, width, height);
        }
        if (index === 2 ) {
            context.fillStyle = 'rgba(0, 255, 0, 0.5)';
            context.fillRect(xOffset, yOffset, width, height);
        }
        if (index === 3 ) {
            context.fillStyle = 'rgba(0, 0, 255, 0.5)';
            context.fillRect(xOffset, yOffset, width, height);
        }
        xOffset += width + space;
        totalWidth += width + space;
        fontAscent = textMetrics.fontBoundingBoxAscent;
        fontDescent = textMetrics.fontBoundingBoxDescent;

        if (textAscent < textMetrics.actualBoundingBoxAscent) {
            textAscent = textMetrics.actualBoundingBoxAscent;
        }
        if (textDescent < textMetrics.actualBoundingBoxDescent) {
            textDescent = textMetrics.actualBoundingBoxDescent;
        }
    });

    // draw baseline, ascender, descender and lineHeight
    context.fillRect(0, yPos, totalWidth, 1);
    context.fillRect(0, yPos - fontAscent, totalWidth, 1);
    context.fillRect(0, yPos + fontDescent, totalWidth, 1);

    context.fillStyle = 'rgba(255, 0, 0, 0.5)';
    context.fillRect(0, yPos - textAscent, totalWidth, 1);
    context.fillRect(0, yPos + textDescent, totalWidth, 1);

    const imageFileName = `./tmp/${locales}_${fontFamily}.png`;
    const buffer = canvas.toBuffer('image/png')
    fs.writeFileSync(imageFileName, buffer);
};

const drawAllText = async() => {
    for (let i = 0; i < 5; i++) {
        await drawAndSelectText(i);
    }
}
drawAllText();