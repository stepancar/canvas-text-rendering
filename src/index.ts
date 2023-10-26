import {renderText} from './testCases';




console.time('renderText');
const {ctx, canvas} = renderText();
ctx.getImageData(0,0,1,1)
console.timeEnd('renderText');
document.body.appendChild(canvas);

