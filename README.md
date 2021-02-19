# bryt-lite

Get colors by brightness.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Travis CI Build][travis-image]][travis-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

## Overview

bryt provides an API for getting all colors for a given brightness. A brightness is represented by
an integer between `0` and `255`. Some brightnesses have more colors than others.

Determining a color's brightness is a pretty simple calculation, but choosing a color by brightness
is not. bryt-lite uses a pre-baked lookup table of brightnesses and their associated colors.

There are 16,777,216 possible 24-bit colors which takes up 66 MB. With some clever hacks and Brotli
compression, we can squeeze this size down to a little over 3 MB, but this is still too big.

bryt-lite has reduced the number of colors per brightness that are similar to each other. Instead
of 16 million colors, bryt-lite only has 7,204 colors and requires 66 KB on disk.

If you want the full lookup table and don't mind the 3MB size, you can always use [bryt][bryt]. The
bryt-lite API is identical to bryt's API.

## Installation

    npm install bryt-lite

## Examples

Get brightness info.

```js
import * as bryt from 'bryt-lite';

const info = bryt.getBrightness(128);
console.log(`Brightness ${info.brightness} has ${info.count} colors`);

for (let i = 0; i < info.count; i++) {
	console.log(`Color ${i + 1}) ${info.getColor(i)}`);
}

console.log('All colors:', info.getColors());
```

Get a specific color by brightness and index.

```js
const color = bryt.getColor(200, 3);
```

Get all colors for a specific brightness. Note that this is not super performant.

```js
const colors = bryt.getColors(187);
for (const color of colors) {
	console.log(color);
}
```

Convert a integer color to an RGB array.

```js
const color = bryt.getColor(200, 3);
const [ red, green, blue ] = bryt.toRGB(color);
console.log(`red: ${red}, green: ${green}, blue ${blue}`);
```

## API

### `getBrightness(brightness)`

 * `brightness` (Number): A positive integer between 0 and 255.

Returns `Object` containing the `brightness`, `count` of colors, `getColor(idx)`, and `getColors()`.

### `getColor(brightness, idx)`

 * `brightness` (Number): A positive integer between 0 and 255.

Returns `Number` as a positive integer.

### `getColors(brightness)`

 * `brightness` (Number): A positive integer between 0 and 255.

Returns `Array<Number>` containing all colors (as integers).

### `toRGB(num)`

 * `num` (Number): A positive integer to split into red, green, and blue components.

Returns `Array<Number>`.

## License

MIT

[bryt]: https://npmjs.org/package/bryt
[npm-image]: https://img.shields.io/npm/v/bryt-lite.svg
[npm-url]: https://npmjs.org/package/bryt-lite
[downloads-image]: https://img.shields.io/npm/dm/bryt-lite.svg
[downloads-url]: https://npmjs.org/package/bryt-lite
[travis-image]: https://img.shields.io/travis/cb1kenobi/bryt-lite.svg
[travis-url]: https://travis-ci.org/cb1kenobi/bryt-lite
[david-image]: https://img.shields.io/david/cb1kenobi/bryt-lite.svg
[david-url]: https://david-dm.org/cb1kenobi/bryt-lite
[david-dev-image]: https://img.shields.io/david/dev/cb1kenobi/bryt-lite.svg
[david-dev-url]: https://david-dm.org/cb1kenobi/bryt-lite#info=devDependencies
