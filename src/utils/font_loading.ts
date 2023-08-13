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