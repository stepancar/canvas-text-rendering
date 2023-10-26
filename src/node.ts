import fs from "fs";
import './polyfill';
import {renderText} from './testCases'


console.time('renderText')
const {canvas, ctx} = renderText() as any;
ctx.getImageData(0,0,1,1)
console.timeEnd('renderText')

const out = fs.createWriteStream(__dirname + '/test.png')
const stream = canvas.createPNGStream()
stream.pipe(out)
