import { lookup } from './lookup.js';

/**
 * Checks that the brightness value is valid.
 *
 * @param {Number} brightness - The brightness level.
 */
function assertBrightness(brightness) {
	if (typeof brightness !== 'number' || ~~brightness !== brightness) {
		throw new TypeError('Expected brightness to be an integer');
	}

	if (brightness < 0 || brightness > 255) {
		throw new RangeError('Expected brightness to be between 0 and 255');
	}
}

/**
 * Gets information about a specific brightness and scoped functions for retreiving that brightness
 * colors or a specific color by index.
 *
 * @param {Number} brightness - The brightness level.
 * @returns {Object}
 */
export function getBrightness(brightness) {
	assertBrightness(brightness);

	return {
		brightness,
		count: lookup[brightness].length,
		getColor(idx) {
			return getColor(brightness, idx);
		},
		getColors() {
			return getColors(brightness);
		}
	};
}

/**
 * Returns a color at the specified index for the given brightness.
 *
 * @param {Number} brightness - The brightness level.
 * @param {Number} idx - The index in the list of colors.
 * @returns {Number}
 */
export function getColor(brightness, idx) {
	assertBrightness(brightness);

	if (typeof idx !== 'number' || ~~idx !== idx) {
		throw new TypeError('Expected index to be an integer');
	}

	if (idx < 0) {
		throw new RangeError('Expected index to be a positive integer');
	}

	return lookup[brightness][idx];
}

/**
 * Returns all colors for the specified brightness.
 *
 * @param {Number} brightness - The brightness level.
 * @returns {Array.<Number>}
 */
export function getColors(brightness) {
	assertBrightness(brightness);
	return lookup[brightness];
}

/**
 * Converts a number to an array of red, green, and blue component values.
 *
 * @param {Number} num - A number representing a color.
 * @returns {Array.<Number>}
 */
export function toRGB(num) {
	if (typeof num !== 'number' || ~~num !== num) {
		throw new TypeError('Expected color to be an integer');
	}

	if (num < 0) {
		throw new RangeError('Expected color to be a positive integer');
	}

	return [ (num >> 16) & 0xFF, (num >> 8) & 0xFF, num & 0xFF ];
}
