import type { Canvas } from 'canvas';
import { createCanvas } from 'canvas';
require('jsdom-global')();
type CreateElement = typeof document.createElement;


document.createElement = (function( create: CreateElement) {
    return function(this: any, type: string) {
        let element: Element;
        switch (type) {
            case 'canvas': {
                element = createCanvas(1, window.innerHeight) as any;
                break;
            }
            default: {
                element = (create as any).apply(this, arguments);
                break;
            }
        }
        (element as any).style = document.createAttribute('style');

        return element;
    };
})(document.createElement) as CreateElement;
