
const LANGUAGES = {
    "English": { "text": "Tobey Maguire is the best Spider-Man." },
    // "Spanish": { "text": "Tobey Maguire es el mejor Spider-Man." },
    // "French": { "text": "Tobey Maguire est le meilleur Spider-Man." },
    // "German": { "text": "Tobey Maguire ist der beste Spider-Man." },
    // "Italian": { "text": "Tobey Maguire è il miglior Spider-Man." },
    // "Portuguese": { "text": "Tobey Maguire é o melhor Spider-Man." },
    // "Dutch": { "text": "Tobey Maguire is de beste Spider-Man." },
    // "Russian": { "text": "Тоби Магуайр - лучший Человек-паук." },
    // "Chinese (Simplified)": { "text": "托比·马奎尔是最好的蜘蛛侠。" },
    // "Chinese (Traditional)": { "text": "托比·馬奎爾是最好的蜘蛛俠。" },
    // "Japanese": { "text": "トビー・マグワイアは最高のスパイダーマンです。トビー・マグワイアは最高のスパイダーマンです。" },
    // "Korean": { "text": "토비 맥과이어는 최고의 스파이더맨입니다." },
    // "Arabic": { "text": "توبي ماجواير هو أفضل سبايدر-مان." },
    // "Turkish": { "text": "Tobey Maguire en iyi Örümcek Adam'dır." },
    // "Greek": { "text": "Ο Tobey Maguire είναι ο καλύτερος Spider-Man." },
    // "Swedish": { "text": "Tobey Maguire är den bästa Spider-Man." },
    // "Norwegian": { "text": "Tobey Maguire er den beste Spider-Man." },
    // "Danish": { "text": "Tobey Maguire er den bedste Spider-Man." },
    // "Finnish": { "text": "Tobey Maguire on paras Spider-Man." },
    // "Polish": { "text": "Tobey Maguire to najlepszy Spider-Man." },
    // "Romanian": { "text": "Tobey Maguire este cel mai bun Spider-Man." },
    // "Hebrew": { "text": "טובי מגווייר הוא הספיידר-מן הכי טוב." },
    // "Hindi": { "text": "टोबी मैग्वायर सबसे बेहतर स्पाइडर-मैन है।" },
    // "Bengali": { "text": "টবি ম্যাগুয়ায়ার সেরা স্পাইডার-ম্যান।" },
    // "Thai": { "text": "โทบี้ แมกไวร์เป็นสไปเดอร์แมนที่ดีที่สุด" },
    // "Vietnamese": { "text": "Tobey Maguire là người dã sứ Spider-Man tốt nhất." },
    // "Malay": { "text": "Tobey Maguire adalah Spider-Man terbaik." },
    // "Swahili": { "text": "Tobey Maguire ndiye Spider-Man bora zaidi." },
    // "Tagalog": { "text": "Si Tobey Maguire ang pinakamahusay na Spider-Man." },
    // "Ukrainian": { "text": "Тобі Магвайр - найкращий Людина-павук." },
    // "Hungarian": { "text": "Tobey Maguire a legjobb Pókember." },
    // "Czech": { "text": "Tobey Maguire je nejlepší Spider-Man." },
    // "Slovak": { "text": "Tobey Maguire je najlepší Spider-Man." },
    // "Bulgarian": { "text": "Тоби Магуайър е най-добрият Спайдър-Мен." },
    // "Serbian": { "text": "Tobey Maguire je najbolji Spajdermen." },
    // "Croatian": { "text": "Tobey Maguire je najbolji Spider-Man." },
    // "Slovenian": { "text": "Tobey Maguire je najboljši Spider-Man." },
    // "Lithuanian": { "text": "Tobey Maguire yra geriausias Spider-Man." },
    // "Estonian": { "text": "Tobey Maguire on parim Spider-Man." }
    // Add more languages as needed
}

const canvas = document.createElement('canvas',);

const scale = window.devicePixelRatio || 1;
canvas.width = 1920;
canvas.height = 1080*2;

const ctx: CanvasRenderingContext2D = canvas.getContext('2d', {desynchronized: true, premultipliedAlpha: 0, willReadFrequently: true}) as CanvasRenderingContext2D;
(ctx as any).textDrawingMode = 'path';
const map = {
    0: '#53F',
    200: '#53F',
    400: '#53F',
    600: '#53F',
    800: '#53F',
    1000: '#53F',
    1200: '#53F',
    1400: '#53F',
    1600: '#53F',
    1800: '#53F',
    2000: '#53F',
}
export function renderText() {
    for (let [language, { text }] of Object.entries(LANGUAGES)) {
        let fontSize = 200;
        for (let yOffset=0; yOffset < 1080*2; yOffset += fontSize) {
            ctx.font = `${fontSize}px Courier`;
            const textColor = map[yOffset]//  Math.floor(Math.random() * 16777215).toString(16);
            ctx.fillStyle = `${textColor}`;
            ctx.fillText(text, 0, yOffset);
        }
    }

    return {
        ctx,
        canvas,
    };
}
