import anime from 'animejs';
import Stats from 'stats.js';
import LANGUAGES, {LONG_TEXT, TEXT_LINES} from "./library";
import TRANSCRIPT from "../resources/transcript.json";
import CHRIS_TRANSCRIPT from '../resources/transcript_chris_talking.json'
import {
    getWords, layoutWords,
    loadAudio, Position,
    simplifyTranscript,
} from "./utils/utils";
import {
    Application, BaseTexture, CanvasResource,
    Sprite,
    Texture
} from "pixi.js";
import {Transcript} from "./asset/transcript";
import {CaptionGenerator, Font, TextStyle} from "./asset/captionGenerator";
import {ProgressTimeline, Timeline} from "./animation/timeline";
import {Text} from "./asset/text";
import {loadFont} from "./utils/font_loading";
import {ProgressIncrementer} from "./animation/progressIncrementer";
import {InterpolationCache} from "./animation/interpolationCache";
import {CompositionIncrementer} from "./animation/compositionIncrementer";
import {Caption, PixiCaption} from "./asset/caption";

/**
 * Here we verify if we can draw and select text for a specific language. We test the selecting part by drawing a
 * rectangle around the word and a line for the baseline, ascender, descender and line height. This test can be
 * found both here and in our node variant. We do this as a test to verify that both systems generate the same result.
 * To ensure our node reference images load we should run that test first.
 */
const drawAndSelectText = async(languageIndex: number) => {
    if (languageIndex === undefined) {
        throw new Error('languageIndex is undefined');
    }
    console.log('drawAndSelectText', languageIndex);

    const canvas = document.createElement('canvas');
    const multiplier = 2;
    canvas.width = 768 * 2;
    canvas.height = 64 * 2;
    canvas.style.width = 768 + 'px';
    canvas.style.height = 64 + 'px';
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Failed to get canvas context');
    }
    document.body.appendChild(canvas);

    const languages = Object.keys(LANGUAGES);
    const languageCount = languages.length;

    // Change the index [0 - 4] to see the different languages
    const {family: fontFamily, url: fontUrl, text, locales, direction} = LANGUAGES[languages[languageIndex]];

    const referenceImage = `./resources/${locales}_${fontFamily}.png`;
    const referenceImageElement = document.createElement('img');
    referenceImageElement.src = referenceImage;
    referenceImageElement.style.position = 'relative';
    referenceImageElement.style.top = '-50px';
    referenceImageElement.style.width = '768px';
    document.body.appendChild(referenceImageElement);

    // svg vs canvas
    await loadFont(fontFamily, fontUrl);
    const fontSize = 36 * multiplier;
    context.font = `${fontSize}px ${fontFamily}`;

    let words = getWords(text, locales, direction);
    if (direction === 'rtl') {
        words = words.reverse();
    }

    const yPos = multiplier * 50;
    const xPos = multiplier * 5;
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
        // WARNING: actualBoundingBoxRight and actualBoundingBoxLeft generate different results in node and browser
        // let width = textMetrics.actualBoundingBoxRight - textMetrics.actualBoundingBoxLeft;
        // console.log(word, textMetrics.actualBoundingBoxRight, textMetrics.actualBoundingBoxLeft, textMetrics.width);
        let width = textMetrics.width;

        context.fillStyle = 'rgba(0, 0, 255, 0.25)';
        context.fillRect(xOffset, yOffset, width, height);

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

    return {
        referenceImageElement,
        canvas
    }
}

const drawAllText = async() => {
    const references: HTMLImageElement[] = [];
    const div = document.createElement('div');
    div.innerText = 'blue = browser, green = node'
    document.body.appendChild(div);
    for (let i = 0; i < 6; i++) {
        let {referenceImageElement, canvas} = await drawAndSelectText(i);
        references.push(referenceImageElement);
        div.appendChild(canvas);
        div.appendChild(referenceImageElement);
    }

    // edit y position
    const yInput = document.createElement('input');
    yInput.type="range";
    yInput.min="1";
    yInput.max="100";
    yInput.value="50";
    yInput.addEventListener('input', (e) => {
        references.forEach(image => image.style.top = `-${yInput.value}px`)
    });
    document.body.appendChild(yInput);

    const xInput = document.createElement('input');
    xInput.type="range";
    xInput.min="-50";
    xInput.max="50";
    xInput.value="0";
    xInput.addEventListener('input', (e) => {
        references.forEach(image => image.style.left = `${xInput.value}px`)
    });
    document.body.appendChild(xInput);

    const oInput = document.createElement('input');
    oInput.type="range";
    oInput.min="0";
    oInput.max="100";
    oInput.value="100";
    oInput.addEventListener('input', (e) => {
        references.forEach(image => image.style.opacity = `${parseInt(oInput.value)/100}`)
    });
    document.body.appendChild(oInput);
}

const drawLotsOfText = async() => {
    await new Promise((resolve, reject) => {
        setTimeout(() => resolve('done'), 2000);
    });

    const canvas = document.createElement('canvas');
    const multiplier = 2;
    canvas.width = 512 * 2;
    canvas.height = 768 * 2;
    canvas.style.width = 512 + 'px';
    canvas.style.height = 768 + 'px';
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Failed to get canvas context');
    }
    document.body.appendChild(canvas);

    const languages = Object.keys(LANGUAGES);
    const languageCount = languages.length;

    // Change the index [0 - 4] to see the different languages
    const {family: fontFamily, url: fontUrl, text, locales, direction} = LANGUAGES[languages[0]];

    // set the active font
    await loadFont(fontFamily, fontUrl);
    const fontSize = 12 * multiplier;
    context.font = `${fontSize}px ${fontFamily}`;

    const words = getWords(LONG_TEXT, locales, direction);
    console.log('words', words.length)

    const space = fontSize * 0.2;
    const lineHeight = fontSize * 1.4;
    const xPos = 10;
    const yPos = lineHeight;
    let xOffset = xPos;
    let yOffset = yPos;

    const wordMetrics = words.map(word => context.measureText(word));

    words.forEach((word, index) => {
        // const transparency = 1.0;
        const transparency = Math.random();
        context.fillStyle = `rgba(0, 0, 0, ${transparency})`;
        const {
            actualBoundingBoxRight,
            actualBoundingBoxLeft
        } = wordMetrics[index];

        context.fillText(word, xOffset, yOffset);

        let width = actualBoundingBoxRight - actualBoundingBoxLeft;

        xOffset += width + space;
        if (index < words.length - 1 && xOffset + wordMetrics[index + 1].actualBoundingBoxRight > canvas.width) {
            xOffset = xPos;
            yOffset += lineHeight;
        }
    });
}

/**
 * A Karaoke Fancy caption implementation example. Here we animate the dynamic style of the text based on the transcript.
 * In this example we highlight the active word by placing a colored graphic behind it.
 */
const fancyCaptionGeneratorSelect = async() => {
    // to see how long it takes to render a frame
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.left = '10px';
    document.body.appendChild(stats.dom);

    // instructions for the user
    const click = document.createElement('div');
    click.innerText = 'click on screen to play';
    click.style.position = 'absolute';
    click.style.top = '10px';
    click.style.left = '384px';
    document.body.appendChild(click);

    //  ----------------------------------------------------------
    // PIXI setup
    const app = new Application({
        backgroundColor: 0xffffff,
        antialias: true,
        autoStart: false,
        width: 512 * 16/9,
        height: 512,
    });
    (app.view as HTMLCanvasElement).id = 'pixiCanvas';
    document.body.appendChild((app as any).view);

    const audio = await loadAudio('../resources/transcript_audio.m4a');

    const videoSprite = Sprite.from('../resources/container_ship_720.mp4');
    videoSprite.tint = 0xD6D6D6;
    (videoSprite.texture.baseTexture.resource as any).source.muted = true;
    (videoSprite.texture.baseTexture.resource as any).source.loop = true;
    app.stage.addChild(videoSprite);

    const normalFont: Font = {
        family: 'Poppins',
        url: 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf',
    }
    const normalStyle: TextStyle = {
        fontFamily: 'Poppins',
        fontSize: 42,
        fontColor: 'rgb(255,255,255)',
    }
    const highlightStyle: TextStyle = {
        fontFamily: 'Poppins',
        fontSize: 42,
        fontColor: 'rgb(160,91,218)',
    }
    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');

    const {words, language, textDirection} = simplifyTranscript(TRANSCRIPT)
    const transcript = new Transcript({
        name: 'global',
        words,
        language,
        textDirection,
    });
    const captions = new CaptionGenerator({
        transcript,
        normalStyle,
        normalFont,
        highlightStyle,
        highlightFont: normalFont,
        startTime: 0,
        endTime: transcript.endTime,
        chunkStyle: {
            style: 'duration',
            duration: 5000,
        },
        width: 325,
        height: 480,
        fancyStyle: {
            style: 'highlight',
            level: 'word',
            interpolation: 'stepped',
        },
    });
    const pixiTexture = Texture.from(captions.canvas);
    const pixiSprite = new Sprite(pixiTexture);
    pixiSprite.x = 50;
    pixiSprite.y = 150;
    app.stage.addChild(pixiSprite);

    // document.body.appendChild(captions.canvas);

    const timeline = new Timeline();
    const progressTimeline = new ProgressTimeline({
        start: 0,
        end: transcript.duration,
        loop: true,
        onLoopCallBack: () => {
            // restart audio when our timeline loops
            audio.currentTime = 0.0;
        }
    });

    const pixiDraw = () => {
        stats.begin();

        // update time
        const currentTime = timeline.currentTime;
        const progress = progressTimeline.value(currentTime);
        const time = progress * progressTimeline.end;
        captions.currentTime = time;
        captions.draw();

        // draw changes
        pixiTexture.update();

        stats.end();
    }

    //  ----------------------------------------------------------
    // start playback on click
    document.addEventListener('click', () => {
        app.ticker.add(pixiDraw);
        app.ticker.start();

        click.style.display = 'none';

        if (audio.paused) {
            audio.loop = true;
            audio.play();
            timeline.reset();
        }
        document.body.appendChild((app as any).view);
    })
    audio.pause();
}

/**
 * Another Karaoke Fancy caption implementation example. Here we animate the dynamic style of the text based on the
 * transcript. In this example we lighten the spoken words by making them lighter.
 */
const fancyCaptionGeneratorLighten = async() => {
    // await new Promise((resolve, reject) => {
    //     setTimeout(() => resolve('done'), 2000);
    // });

    // to see how long it takes to render a frame
    const stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.left = '10px';
    document.body.appendChild(stats.dom);

    // instructions for the user
    const click = document.createElement('div');
    click.innerText = 'click on screen to play';
    click.style.position = 'absolute';
    click.style.top = '10px';
    click.style.left = '384px';
    document.body.appendChild(click);

    //  ----------------------------------------------------------
    // PIXI setup
    const height = 512;
    const width = 512 * 16/9;
    const app = new Application({
        backgroundColor: 0xffffff,
        antialias: true,
        autoStart: false,
        width,
        height,
    });
    (app.view as HTMLCanvasElement).id = 'pixiCanvas';

    const videoSprite = Sprite.from('../resources/chris_talking_720.mp4');
    videoSprite.tint = 0xD6D6D6;
    videoSprite.scale.x = 0.85;
    videoSprite.scale.y = 0.85;
    const videoResource = videoSprite.texture.baseTexture.resource as any;
    const video = videoResource.source as HTMLVideoElement
    video.muted = true;
    video.loop = true;
    video.autoplay = false;
    video.pause();
    app.stage.addChild(videoSprite);

    const normalFont: Font = {
        family: 'Poppins',
        url: 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf',
    }
    const normalStyle: TextStyle = {
        fontFamily: 'Poppins',
        fontSize: 28,
        fontColor: 'rgba(98,98,98, 0.5)',
        lineHeight: 1.6,
    }
    const highlightStyle: TextStyle = {
        fontFamily: 'Poppins',
        fontSize: 28,
        fontColor: 'rgba(255,255,255, 1.0)',
        lineHeight: 1.6,
    }
    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');
    const groupId = 'da5b2a03-ad73-a936-8b5f-f6b485834a48';
    const {words, language, textDirection} = simplifyTranscript(CHRIS_TRANSCRIPT, groupId)
    const transcript = new Transcript({
        name: 'global',
        words,
        language,
        textDirection,
    });
    console.log('transcript duration', transcript.duration)
    const captions = new CaptionGenerator({
        transcript,
        normalStyle,
        normalFont,
        highlightStyle,
        highlightFont: normalFont,
        startTime: 0,
        endTime: transcript.endTime,
        chunkStyle: {
            style: 'bounds'
        },
        width: 350,
        height: 300,
        fancyStyle: {
            style: 'opacity',
            level: 'word',
            interpolation: 'stepped',
        },
    });

    // parent text canvas to document for viewing
    // document.body.appendChild(captions.canvas);

    const pixiTexture = Texture.from(captions.canvas);
    const pixiSprite = new Sprite(pixiTexture);
    pixiSprite.x = 30;
    pixiSprite.y = 120;
    app.stage.addChild(pixiSprite);

    // create a looping timeline
    const timeline = new Timeline();
    const progressTimeline = new ProgressTimeline({
        start: 0,
        end: transcript.duration,
        loop: true,
        onLoopCallBack: () => {
            // restart audio when our timeline loops
            video.currentTime = 0.0;
        }
    });
    const pixiDraw = () => {
        stats.begin();

        if (video.paused) {
            video.play();
            timeline.reset();
        }

        // update time
        const currentTime = timeline.currentTime;
        const progress = progressTimeline.value(currentTime);
        const time = progress * progressTimeline.end;
        captions.currentTime = time;
        captions.draw();

        // draw changes
        pixiTexture.update();

        stats.end();
    }

    document.addEventListener('click', () => {
        app.ticker.add(pixiDraw);
        app.ticker.start();
        document.body.appendChild((app as any).view);
        click.style.display = 'none';

        // video.muted = false;
        video.pause();
        video.currentTime = 0.0;
    });
    captions.draw();
}


const fancyCaptionAppear = async() => {
    // await new Promise((resolve, reject) => {
    //     setTimeout(() => resolve('done'), 2000);
    // });

    const div = document.createElement('div');
    div.innerText = 'Fancy caption with appear dynamic style'
    document.body.appendChild(div);

    // transcript
    const groupId = 'da5b2a03-ad73-a936-8b5f-f6b485834a48';
    const {words, language, textDirection} = simplifyTranscript(CHRIS_TRANSCRIPT, groupId)
    const transcript = new Transcript({
        name: 'global',
        words,
        language,
        textDirection,
    });

    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');

    const caption = new Caption({
        transcript,
        normalStyle: {
            fontFamily: 'Poppins',
            fontSize: 28,
            fontColor: 'rgba(0,0,0, 1.0)',
            lineHeight: 1.6,
        },
        chunkStyle: {
            style: 'bounds'
        },
        objectAnimation: [
            {
                property: 'opacity',
                element: 'word',
                interpolation: {
                    type: 'sigmoid', // hardcoded
                    duration: 150,
                },
                range: [0, 1],
            },
            {
                property: 'x',
                element: 'word',
                interpolation: {
                    type: 'sigmoid', // hardcoded
                    duration: 150,
                },
                range: [-10, 0],
            }
        ]
    })
    document.body.appendChild(caption.canvas);

    const currentTimeInput = document.createElement('input');
    currentTimeInput.type="range";
    currentTimeInput.min="0";
    // currentTimeInput.max=`${transcript.duration}`;
    currentTimeInput.max="10000";
    currentTimeInput.value="0";
    currentTimeInput.style.width = '500px';
    currentTimeInput.addEventListener('input', (e) => {
        caption.currentTime = parseInt(currentTimeInput.value);
        caption.draw();
    });
    document.body.style.display = 'grid';
    document.body.appendChild(currentTimeInput);

    const plusButton = document.createElement('button');
    plusButton.innerText = '+10ms';
    plusButton.style.width = '500px';
    plusButton.addEventListener('click', () => {
        const newTime = caption.currentTime + 10;
        currentTimeInput.value = `${newTime}`;
        caption.currentTime = newTime;
        caption.draw();
    });
    document.body.appendChild(plusButton);

    const minusButton = document.createElement('button');
    minusButton.innerText = '-10ms';
    minusButton.style.width = '500px';
    minusButton.addEventListener('click', () => {
        const newTime = caption.currentTime - 10;
        currentTimeInput.value = `${newTime}`;
        caption.currentTime = newTime;
        caption.draw();
    });
    document.body.appendChild(minusButton);

    currentTimeInput.value = `${caption.currentTime}`;
    caption.currentTime = 3000;
    caption.draw();
}

const pixiFancyCaptionAppear = async() => {
    await new Promise((resolve, reject) => {
        setTimeout(() => resolve('done'), 2000);
    });

    const height = 300;
    const width = 600;
    const app = new Application({
        backgroundColor: 0xffffff,
        antialias: true,
        autoStart: false,
        width,
        height,
    });
    (app.view as HTMLCanvasElement).id = 'pixiCanvas';
    document.body.appendChild((app as any).view);

    const groupId = 'da5b2a03-ad73-a936-8b5f-f6b485834a48';
    const {words, language, textDirection} = simplifyTranscript(CHRIS_TRANSCRIPT, groupId)
    const transcript = new Transcript({
        name: 'global',
        words,
        language,
        textDirection,
    });

    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');

    const caption = new PixiCaption({
        transcript,
        normalStyle: {
            fontFamily: 'Poppins',
            fontSize: 28,
            fontColor: 'rgba(0,0,0, 1.0)',
            lineHeight: 1.6,
        },
        chunkStyle: {
            style: 'bounds'
        },
        objectAnimation: [
            {
                property: 'opacity',
                element: 'word',
                interpolation: {
                    type: 'sigmoid', // hardcoded
                    duration: 150,
                },
                range: [0, 1],
            },
            {
                property: 'x',
                element: 'word',
                interpolation: {
                    type: 'sigmoid', // hardcoded
                    duration: 150,
                },
                range: [-10, 0],
            },
        ],
        x: 10,
        y: 10,
        width: 300,
        height: 200
    })
    app.stage.addChild(caption.sprite);

    let time = 0;
    const draw = () => {
        caption.currentTime = time;
        caption.draw();
        time+=10;
    };
    app.ticker.add(draw);
    app.ticker.start();

    console.assert(caption.getBounds().x === 10);
    console.assert(caption.getBounds().width === 300);
}

/**
 * Simple example to test the performance of text rendering by drawing to a large number of individual text "assets".
 * In the context of this method, an "asset" is a canvas element that contains a single line of text.
 */
const pixiCanvasMultiSync = async() => {
    const stats = new Stats();
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.left = '10px';
    document.body.appendChild(stats.dom);

    // PIXI setup
    const height = 720;
    const width = 1280;
    const app = new Application({
        backgroundColor: 0xffffff,
        antialias: true,
        autoStart: false,
        width,
        height,
    });
    (app.view as HTMLCanvasElement).id = 'pixiCanvas';
    document.body.appendChild((app as any).view);
    global.app = app;

    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');

    const create2dContext = (width, height, index) => {
        const canvas = document.createElement('canvas');
        // document.body.appendChild(canvas);
        const context = canvas.getContext('2d');
        if (!context) {
            console.warn('No context was created!!!')
            return {
                canvas,
            }
        }
        canvas.width = width;
        canvas.height = height;

        const resource = new CanvasResource(canvas);
        const baseTexture = new BaseTexture(resource);
        const pixiTexture = Texture.from(baseTexture);
        const pixiSprite = new Sprite(pixiTexture);
        app.stage.addChild(pixiSprite);
        pixiSprite.y = index * 18;

        return {
            canvas,
            context,
            sprite: pixiSprite,
        };
    }

    const drawText = (text, xOffset, context) => {
        const yOffset = 24;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.font = `14px Poppins`;
        context.fillStyle = `rgba(0, 0, 0, 0.5)`;
        context.fillText(text, xOffset, yOffset);
    }

    // create a canvas for each text line
    // this will represent one asset
    const assets: any[] = [];
    const tc = TEXT_LINES.length;
    console.log('rendering', tc, 'text lines')
    for (let i = 0; i < tc; i++) {
        assets.push(create2dContext(1200, 100, i));
    }

    // go through all "assets" and draw the text
    let frame = 0;
    let add = 1;
    const pixiDraw = () => {
        stats.begin();
        for (let i = 0; i < tc; i++) {
            const textString = TEXT_LINES[i];
            drawText(textString, frame, assets[i].context);
            assets[i].sprite.texture.baseTexture.update();
        }

        if (frame > 100) add = -1;
        if (frame < 0) add = 1;
        frame += add;

        stats.end();
    }

    app.ticker.add(pixiDraw);
    app.ticker.start();
}

/**
 * Here we mockup up one of our more complex dynamic styles. This is a test to see if we can clip or mask text
 */
const dynamicStylingText = async () => {
    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');
    const text = new Text({
        text: TEXT_LINES[0],
        // since we can only highlight words, maybe we can update our schema to reflect this?
        highlights: [1, 3, 7],
        normalStyle: {
            fontFamily: 'Poppins',
            fontSize: 18,
            fontColor: 'rgb(255,0,255)',
        },
        highlightStyle: {
            fontFamily: 'Poppins',
            fontSize: 18,
            fontColor: 'rgb(255,0,0)',
        },
        highlightGraphicStyle: {
            graphicColor: 'rgb(0,255,0)',
            padding: {
                top: -2,
                bottom: -2,
                left: 4,
                right: 4,
            }
        },
        width: 400,
        height: 200,
    })
    document.body.appendChild(text.canvas);

    text.progress = 0.5;
    text.draw();

    // animate
    text.progress = 0.0;
    const draw = () => {
        text.progress += 0.005;
        text.draw();
        requestAnimationFrame(draw)
    };
    // uncomment line below to start animation
    // requestAnimationFrame(draw)
}

/**
 * This is a test to see if we can animate the text
 */
const dynamicStylingText1 = async () => {
    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');
    const text = new Text({
        text: TEXT_LINES[0],
        normalStyle: {
            fontFamily: 'Poppins',
            fontSize: 18,
            fontColor: 'rgb(0,0,0)',
        },
        objectAnimation: [
            {
                property: 'opacity',
                element: 'line',
                offset: 2,
                duration: 10,
                range: [0, 1],
            },
            {
                property: 'x',
                element: 'line',
                offset: 2,
                duration: 10,
                range: [50, 0],
            },
        ],
        width: 400,
        height: 200,
    })
    document.body.appendChild(text.canvas);

    // animate
    const timeline = new Timeline();
    const progressTimeline = new ProgressTimeline({
        start: 0,
        end: 1000,
        loop: true
    });

    const draw = () => {
        const currentTime = timeline.currentTime;
        text.progress = progressTimeline.value(currentTime);
        text.draw();
        requestAnimationFrame(draw)
    };
    timeline.reset();
    requestAnimationFrame(draw)
}

/**
 * Visual test to verify the behaviour when a given font doesn't exist.
 */
const canRenderText = async() => {
    const languages = Object.keys(LANGUAGES);

    // NOTE that we don't load any fonts here
    // in our current fontkit based system we won't be able to render any text
    const text = new Text({
        text: LANGUAGES[languages[3]].text,
        normalStyle: {
            fontFamily: 'Poppins',
            fontSize: 18,
            fontColor: 'rgb(0,0,0)',
        },
        width: 400,
        height: 200,
    })
    document.body.appendChild(text.canvas);
    text.progress = 0.5;
    text.draw();
}

/**
 * Visual test to verify the behaviour of our layout algorithm.
 */
const layoutText = async() => {
    console.log('layoutText')
    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');

    // canvas for measuring text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not get canvas context');
    }

    const options = {
        fontSize: 24,
        width: 200,
        height: 200,
    }
    const text = [TEXT_LINES[0], TEXT_LINES[1]].join(' ');
    const words = getWords(text, 'en', 'ltr');
    const fontFamily = 'Poppins';

    const renderText = ({fontSize, width, height}) => {
        // cleanup
        while(document.getElementById('textCanvas')) {
            document.getElementById('textCanvas')?.remove();
        }

        const space = fontSize * 0.2
        const lineHeight = fontSize * 1.2;

        context.font = `${fontSize}px ${fontFamily}`;
        const metrics = words.map(word => context.measureText(word));
        const textWidth = width * 0.8;
        const textHeight = height * 0.8;

        let startIndex = 0;
        let lastIndex = 0;
        let positions: Array<Position> = [];

        while(lastIndex !== words.length - 1) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.id = 'textCanvas';
            document.body.appendChild(canvas);
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Could not get canvas context');
            }
            context.font = `${fontSize}px ${fontFamily}`;

            ({positions, lastIndex} = layoutWords({
                wordMetrics: metrics,
                startIndex,
                wordSpace: space,
                lineHeight,
                layoutWidth: textWidth,
                layoutHeight: textHeight
            }));

            context.clearRect(0, 0, width, height);

            // we're making the area a bit smaller to ensure we can see if there would be any clipping
            // visualize bounds
            context.fillStyle = 'rgb(255,0,0, 0.1)';
            context.fillRect(0, 0, textWidth, textHeight);

            context.fillStyle = 'rgb(0,0,0)';
            let i, j;
            for (i = startIndex, j = 0; i < lastIndex; i++, j++) {
                const x = positions[j].x
                const y = positions[j].y
                context.fillText(words[i], x, y);
            }

            startIndex = lastIndex;
        }
    }

    // controls
    const controls = document.createElement('div');
    document.body.appendChild(controls);

    const fontSizeRange = document.createElement('input');
    fontSizeRange.type="range";
    fontSizeRange.min="6";
    fontSizeRange.max="64";
    fontSizeRange.value="24";
    fontSizeRange.addEventListener('input', (e) => {
        options.fontSize = parseInt(fontSizeRange.value);
        renderText(options);
    });
    controls.appendChild(fontSizeRange);

    const widthRange = document.createElement('input');
    widthRange.type="range";
    widthRange.min="40";
    widthRange.max="300";
    widthRange.value="200";
    widthRange.addEventListener('input', (e) => {
        options.width = parseInt(widthRange.value);
        renderText(options);
    });
    controls.appendChild(widthRange);

    const heightRange = document.createElement('input');
    heightRange.type="range";
    heightRange.min="40";
    heightRange.max="300";
    heightRange.value="200";
    heightRange.addEventListener('input', (e) => {
        options.height = parseInt(heightRange.value);
        renderText(options);
    });
    controls.appendChild(heightRange);

    renderText(options);
}

/**
 * Basic example of a canTextFitBounds test. This is a test to see if we can fit text within a given width and height.
 */
const canTextFitBounds = async() => {
    await loadFont('Poppins', 'https://storage.googleapis.com/lumen5-site-css/Poppins-Bold.ttf');

    const fontFamily = 'Poppins';
    const fontSize = 18;
    const space = fontSize * 0.2
    const lineHeight = fontSize * 1.2;
    const text = TEXT_LINES[0];
    const width = 100;
    const height = 100;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not get canvas context');
    }

    const layoutText = (
        text: string,
        fontSize: number,
        space: number,
        lineHeight: number,
        fontFamily: string,
        width: number,
        height: number
    ) => {
        context.font = `${fontSize}px ${fontFamily}`;
        const words = getWords(text, 'en', 'ltr');
        const metrics = words.map(word => context.measureText(word));
        const result = layoutWords({
            wordMetrics: metrics,
            startIndex: 0,
            wordSpace: space,
            lineHeight,
            layoutWidth: width,
            layoutHeight: height
        });
        return {
            words,
            ...result,
        }
    }

    // verify that text fits
    let fontScale = 1.0;
    let {words, positions, textFits} = layoutText(
        text,
        fontSize * fontScale,
        space * fontScale,
        lineHeight * fontScale,
        fontFamily,
        width,
        height
    );
    console.assert(!textFits, 'Text should not fit');

    // make the font smaller and try again
    fontScale = 0.5;
    ({words, positions, textFits} = layoutText(
        text,
        fontSize * fontScale,
        space * fontScale,
        lineHeight * fontScale,
        fontFamily,
        width,
        height
    ));
    console.assert(textFits, 'Text should fit');

    words.forEach((word, i) => {
        if (!positions[i]) {
            return;
        }
        const x = positions[i].x
        const y = positions[i].y
        context.fillText(words[i], x, y);
    });
};

/**
 * Here we test out the staggering feature of anime.js. We want to see if we could use this library as a replacement
 * of our current animation system. The immediate issue we can see in the following example is that the animation is
 * longer then expected. While we request and animation of 4000ms, we end up with an animation 4400ms long.
 */
const animate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not get canvas context');
    }

    const properties = [
        {y: 0},
        {y: 0},
        {y: 0}
    ];

    // what about staggering?
    // what about alternate? instead of looping?
    const introDuration = 1000;
    const inbetweenDuration = 2000; // pause between animations so our users can read the text
    const outroDuration = 1000;
    const totalDuration = introDuration + inbetweenDuration + outroDuration;

    const globalDelay = 100;
    const anim = anime({
        targets: properties,
        keyframes: [
            // staggering at the start propagates to the end
            {y: 100, duration: introDuration, easing: 'easeInOutSine', delay: anime.stagger(200)},
            {y: 100, duration: inbetweenDuration}, //, delay: anime.stagger(-200)}, // negate delay
            {y: 0, duration: outroDuration, easing: 'easeInOutSine'}, // however, we can't re-apply it here
        ],
        // y: 100,
        // endDelay: 1000,
        // loop: true,
        // this is the duration of each animation for each element so if we add a delay to an element then it will
        // take longer for the animation to complete
        // duration: 1000,
        autoplay: false,
        easing: 'linear',
        // offset each element by 100ms on top of the global delay
        // delay: anime.stagger(100),
        // delay: anime.stagger(100, {start: globalDelay}),
        // begin: (anim) => {
        //     console.log('begin', anim.progress, JSON.stringify(properties));
        // },
        update: (anim) => {
            // console.log('update', anim.progress, JSON.stringify(properties));

            // draw the animation back until 4000ms
            const remappedProgress = anim.duration / totalDuration;
            const xValue = (anim.progress * remappedProgress / 100) * canvas.width

            context.beginPath();
            context.fillStyle = 'rgb(255,0,0)';
            context.rect(xValue, properties[0].y, 1, 1);
            context.fill();

            context.beginPath();
            context.fillStyle = 'rgb(0,255,0)';
            context.rect(xValue, properties[1].y, 1, 1);
            context.fill();

            context.beginPath();
            context.fillStyle = 'rgb(0,0,255)';
            context.rect(xValue, properties[2].y, 1, 1);
            context.fill();

            // draw a scaled down version of the animation
            const scaledXValue = (anim.progress / 100) * canvas.width

            context.beginPath();
            context.fillStyle = 'rgb(255,0,0)';
            context.rect(scaledXValue, properties[0].y + 200, 1, 1);
            context.fill();

            context.beginPath();
            context.fillStyle = 'rgb(0,255,0)';
            context.rect(scaledXValue, properties[1].y + 200, 1, 1);
            context.fill();

            context.beginPath();
            context.fillStyle = 'rgb(0,0,255)';
            context.rect(scaledXValue, properties[2].y + 200, 1, 1);
            context.fill();
        },
        round: 10,
    });

    // borders
    context.beginPath();
    context.fillStyle = 'rgb(0,0,0)';
    context.rect(1, 0, 1, 100);
    context.rect(1, 200, 1, 100);
    context.fill();

    const introEnd = (introDuration / totalDuration) * canvas.width;
    context.rect(introEnd, 0, 1, 100);
    context.rect(introEnd, 200, 1, 100);

    const outroStart = ((introDuration + inbetweenDuration) / totalDuration) * canvas.width;
    context.rect(outroStart, 0, 1, 100);
    context.rect(outroStart, 200, 1, 100);
    context.fill();

    context.rect(canvas.width - 1, 0, 1, 100);
    context.rect(canvas.width - 1, 200, 1, 100);
    context.fill();

    // draw info
    const durationString = `Duration - Actual: ${anim.duration}ms - Expected (and displayed): ${totalDuration}ms`;
    context.fillText(durationString, 0, 120);
    context.fillText(`Scaled down version to match ${totalDuration}ms`, 0, 320);

    // draw curves
    const samples = 1000;
    const increment = 1.0 / samples;
    let progress = 0.0;
    for (let i = 0; i < samples; i++) {
        progress += increment;
        anim.seek(progress * anim.duration);
    }

}

const animateMirror = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not get canvas context');
    }

    const properties = [
        {y: 0},
        {y: 0},
        {y: 0}
    ];

    const introDuration = 1000;
    const inbetweenDuration = 2000; // pause between animations so our users can read the text
    const outroDuration = 1000;
    const totalDuration = introDuration + inbetweenDuration + outroDuration;

    // loop and alternate don't seem to work in combination with seek
    const globalDelay = 200;
    let mirror = false;
    const anim = anime({
        targets: properties,
        y: 100,
        endDelay: 1000,
        // loop: true,
        // this is the duration of each animation for each element so if we add a delay to an element then it will
        // take longer for the animation to complete
        duration: 1000,
        autoplay: false,
        easing: 'easeInOutSine',
        // direction: 'alternate',
        // offset each element by 100ms on top of the global delay
        // delay: anime.stagger(200),
        delay: anime.stagger(200),
        // begin: (anim) => {
        //     console.log('begin', anim.progress, JSON.stringify(properties));
        // },
        update: (anim) => {
            // draw a scaled down version of the animation
            let scaledXValue = anim.progress / 200
            if (mirror) {
                scaledXValue = 0.5 + (0.5 - scaledXValue);
            }
            scaledXValue *= canvas.width;

            context.beginPath();
            context.fillStyle = 'rgb(255,0,0)';
            context.rect(scaledXValue, properties[0].y, 1, 1);
            context.fill();

            context.beginPath();
            context.fillStyle = 'rgb(0,255,0)';
            context.rect(scaledXValue, properties[1].y, 1, 1);
            context.fill();

            context.beginPath();
            context.fillStyle = 'rgb(0,0,255)';
            context.rect(scaledXValue, properties[2].y, 1, 1);
            context.fill();
        },
        round: 10,
    });

    // borders
    context.beginPath();
    context.fillStyle = 'rgb(0,0,0)';
    context.rect(1, 0, 1, 100);
    context.fill();

    const introEnd = (introDuration / totalDuration) * canvas.width;
    context.rect(introEnd, 0, 1, 100);

    const outroStart = ((introDuration + inbetweenDuration) / totalDuration) * canvas.width;
    context.rect(outroStart, 0, 1, 100);
    context.fill();

    context.rect(canvas.width - 1, 0, 1, 100);
    context.fill();

    // draw info
    context.fillText(`Scaled down mirrored version to match ${totalDuration}ms`, 0, 120);

    // draw curves
    const samples = 1000;
    const increment = 1.0 / samples;
    let progress = 0.0;
    for (let i = 0; i < samples; i++) {
        // forward
        if (i <= samples / 2) {
            progress += increment * 2;
            mirror = false;
        }
        // backward
        else {
            progress -= increment * 2;;
            mirror = true
        }
        anim.seek(progress * anim.duration);
    }
}
const animatedIncrementer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Could not get canvas context');
    }

    const interpolation = new InterpolationCache(1000, 'sigmoid')
    const intro = new ProgressIncrementer(3, interpolation);
    intro.length = 3;
    intro.duration = 1000;
    intro.offset = 200;

    const pause = 2000;

    const outro = new ProgressIncrementer(3, interpolation);
    // outro.revert = true;
    outro.length = 3;
    outro.duration = 1000;
    outro.offset = 200;

    const ipo = new CompositionIncrementer(intro, outro, pause);

    const samples = 1000;
    const increment = 1.0 / samples;
    let progress = 0.0;
    for (let i = 0; i < samples; i++) {
        ipo.progress += increment;

        context.beginPath();
        context.fillStyle = 'rgb(255,0,0)';
        context.rect(ipo.progress * canvas.width, ipo.array[0] * 100, 1, 1);
        context.fill();

        context.beginPath();
        context.fillStyle = 'rgb(0,255,0)';
        context.rect(ipo.progress * canvas.width, ipo.array[1] * 100, 1, 1);
        context.fill();

        context.beginPath();
        context.fillStyle = 'rgb(0,0,255)';
        context.rect(ipo.progress * canvas.width, ipo.array[2] * 100, 1, 1);
        context.fill();
    }

    // borders
    context.beginPath();
    context.fillStyle = 'rgb(0,0,0)';
    context.rect(1, 0, 1, 100);
    context.fill();

    const introEnd = (intro.duration / ipo.duration) * canvas.width;
    context.rect(introEnd, 0, 1, 100);

    const outroStart = ((intro.duration + pause) / ipo.duration) * canvas.width;
    context.rect(outroStart, 0, 1, 100);
    context.fill();

    context.rect(canvas.width - 1, 0, 1, 100);
    context.fill();

    // draw info
    context.fillText(`Unscaled while respecting intro and outro duration`, 0, 120);

}

// drawAllText();
// drawLotsOfText();

// fancyCaptionGeneratorSelect();
// fancyCaptionGeneratorLighten();
// fancyCaptionAppear();
// pixiFancyCaptionAppear();

// pixiCanvasMultiSync();

// dynamicStylingText();
// dynamicStylingText1();

// canRenderText();
// canTextFitBounds();
// layoutText();

// animate();
// animateMirror();
// animatedIncrementer();