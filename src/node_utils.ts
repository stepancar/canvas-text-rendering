import fs from 'fs'
import https from 'https'

export const getWords = (text, locales, direction) => {
     let words: string[] = [];

    // NOTE: this API is only available in Node 16+
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter/Segmenter
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
export async function downloadFile (url, targetFile) {
  return await new Promise((resolve, reject) => {
    https.get(url, response => {
      const code = response.statusCode ?? 0

      if (code >= 400) {
        return reject(new Error(response.statusMessage))
      }

      // handle redirects
      if (code > 300 && code < 400 && !!response.headers.location) {
        return resolve(
          downloadFile(response.headers.location, targetFile)
        )
      }

      // save the file to disk
      const fileWriter = fs
        .createWriteStream(targetFile)
        .on('finish', () => {
          resolve({})
        })

      response.pipe(fileWriter)
    }).on('error', error => {
      reject(error)
    })
  })
}