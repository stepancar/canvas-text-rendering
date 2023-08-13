import Stats from 'stats.js';
import LANGUAGES, {LONG_TEXT, TEXT_LINES} from "./library";
import TRANSCRIPT from "../resources/transcript.json";
import CHRIS_TRANSCRIPT from '../resources/transcript_chris_talking.json'
import {
    getWords, layoutWords,
    loadAudio,
    simplifyTranscript,
} from "./utils/utils";
import {
    Application, BaseTexture, CanvasResource,
    Sprite,
    Texture
} from "pixi.js";
import {Transcript} from "./asset/transcript";
import {CaptionGenerator, Font, TextStyle} from "./asset/captions";
import {ProgressTimeline, Timeline} from "./animation/timeline";
import {Text} from "./asset/text";
import {loadFont} from "./utils/font_loading";

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
    // words.push('😜😂😍');

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

const transcriptToAnimation = async() => {
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

const transcriptToAnimation2 = async() => {
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
            style: 'duration',
            duration: 5000,
        },
        width: 350,
        height: 350,
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

    const assets: any[] = [];
    const tc = TEXT_LINES.length;
    console.log('rendering', tc, 'text lines')
    for (let i = 0; i < tc; i++) {
        assets.push(create2dContext(1200, 100, i));
    }

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
 * Simple example to confirm how managed textures are different from bound gl textures.
 * Since WebGL1 only supports 16 bound textures, we can't use more than 16 textures in a single draw call.
 */
// NOTE: we need to duplicate container_ship_480_1.mp4 20 times for this test
const simpleVideoDraw = async () => {
    const width = 400;
    const height = 400;
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


    let j = 0;
    let k = 0;
    // the moment we use more than 16 textures, we'll have
    // 2 draw calls, for each call we'll update the individual
    // gl textures so we can't manually update our gl textures.
    // we would have to save them as textures firs (or use our
    // existing textures better). The latter probably doesn't
    // work for 4K textures
    for (let i = 0; i < 20; i++) {
        const videoTexture = Texture.from(`resources/container_ship_480_${i+1}.mp4`);
        const videoSprite = new Sprite(videoTexture);
        (videoSprite.texture.baseTexture.resource as any).source.muted = true;
        videoSprite.scale.set(0.1, 0.1);
        videoSprite.y = k * 30;
        videoSprite.x = j * 75;
        app.stage.addChild(videoSprite);

        k++;
        if (k === 5) {
            k = 0;
            j += 1;
        }
    }

    await new Promise((resolve, reject) => {
       setTimeout(() => resolve('done'), 1000);
    });

    // app.ticker.start();
    app.ticker.update();

    // bounds textures = 16
    // managed textures = 20
    // app.renderer.texture.boundTextures
}

/**
 * This is a test to see if we can clip or mask text
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
        end: 2000,
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
        fontFamily: string,
        space: number,
        lineHeight: number,
        width: number,
        height: number
    ) => {
        context.font = `${fontSize}px ${fontFamily}`;
        const words = getWords(text, 'en', 'ltr');
        const metrics = words.map(word => context.measureText(word));
        const result = layoutWords(metrics, space, lineHeight, width, height);
        return {
            words,
            ...result,
        }
    }
    let {words, positions, textFits} = layoutText(text, fontSize, fontFamily, space, lineHeight, width, height);
    console.assert(!textFits, 'Text should not fit');
    ({words, positions, textFits} = layoutText(text, fontSize/2, fontFamily, space/2, lineHeight/2, width, height));
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

// drawAllText();
// drawLotsOfText();
// transcriptToAnimation();
// transcriptToAnimation2();
// simpleVideoDraw();
// pixiCanvasMultiSync();
// dynamicStylingText();
dynamicStylingText1();
// canRenderText();
// canTextFitBounds();