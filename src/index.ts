import Stats from 'stats.js';
import LANGUAGES, {LONG_TEXT} from "./library";
import TRANSCRIPT from "../resources/transcript.json";
import CHRIS_TRANSCRIPT from '../resources/transcript_chris_talking.json'
import {
    loadFont,
    getWords, loadAudio, simplifyTranscript,
} from "./utils";
import {
    Application,
    Sprite,
    Texture
} from "pixi.js";
import {Transcript} from "./transcript";
import {CaptionGenerator, Font, TextStyle} from "./captions";
import {ProgressTimeline, Timeline} from "./timeline";

const drawAndSelectText = async() => {
    const canvas = document.createElement('canvas');
    const multiplier = 2;
    canvas.width = 512 * 2;
    canvas.height = 512 * 2;
    canvas.style.width = 512 + 'px';
    canvas.style.height = 512 + 'px';
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Failed to get canvas context');
    }
    console.log('context', context);
    document.body.appendChild(canvas);

    const languages = Object.keys(LANGUAGES);
    const languageCount = languages.length;
    console.log('languageCount', languageCount);

    // Change the index [0 - 4] to see the different languages
    const {family: fontFamily, url: fontUrl, text, locales, direction} = LANGUAGES[languages[4]];
    console.log('fontFamily', fontFamily, 'text', text, locales, direction);

    // svg vs canvas
    await loadFont(fontFamily, fontUrl);
    const fontSize = 36 * multiplier;
    context.font = `${fontSize}px ${fontFamily}`;

    const words = getWords(text, locales, direction);
    // words.push('😜😂😍');

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

    const transcript = new Transcript({...simplifyTranscript(TRANSCRIPT)});
    const captions = new CaptionGenerator({
        transcript,
        normalStyle,
        normalFont,
        highlightStyle,
        highlightFont: normalFont,
        startTime: 0,
        endTime: transcript.endTime,
        chunkDuration: 2600,
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
    const transcript = new Transcript({...simplifyTranscript(CHRIS_TRANSCRIPT, groupId)});
    const captions = new CaptionGenerator({
        transcript,
        normalStyle,
        normalFont,
        highlightStyle,
        highlightFont: normalFont,
        startTime: 0,
        endTime: transcript.endTime,
        chunkDuration: 5000,
        width: 325,
        height: 480,
        fancyStyle: {
            style: 'opacity',
            level: 'word',
            interpolation: 'stepped',
        },
    });

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

        video.muted = false;
        video.pause();
        video.currentTime = 0.0;
    });
}

// drawAndSelectText();
// drawLotsOfText();
// transcriptToAnimation();
transcriptToAnimation2();