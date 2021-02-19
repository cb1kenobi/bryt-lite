import ansiColors from 'ansi-colors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { isMainThread, parentPort, Worker } from 'worker_threads';

/**
 * The color threshold is used to control how many colors are removed.
 *
 *    Threshold | Perception
 *   -----------+---------------------------------------
 *    <= 1.0    | Not perceptible by human eye
 *    1 - 2     | Perceptible through close observation
 *    2 - 10    | Perceptible at a glance
 *    11 - 49   | Colors are more similar than opposite
 *    100       | Colors are exact opposite
 *
 * The idea is to tune the threshold such that we have a good set of colors to choose from per
 * brightness without using a ton of space.
 *
 *   Threshold | Colors | Size (bytes) | Size on Disk
 *  -----------+--------+--------------+----------------
 *       5     | 7,204  | 65,055       | 66 KB
 *       6     | 5,103  | 46,167       | 49 KB
 *       7     | 3,555  | 32,376       | 33 KB
 *       8     | 2,771  | 25,529       | 29 KB
 */
const colorThreshold = 5;

const dirname = fileURLToPath(new URL('.', import.meta.url));
const cacheDir = path.resolve(dirname, '..', '.cache');

if (isMainThread) {
	const start = Date.now();
	const { cyan } = ansiColors;
	const index = [];
	const table = [];
	let brightness;

	if (!fs.existsSync(cacheDir)) {
		console.log('Calculating table...');
		for (let b = 0; b < 256; b++) {
			for (let g = 0; g < 256; g++) {
				for (let r = 0; r < 256; r++) {
					brightness = ((r * 299 + g * 587 + b * 114) / 1000) | 0;
					if (!table[brightness]) {
						table[brightness] = [];
					}
					table[brightness].push([
						rgb2lab(r, g, b),
						(r << 16) + (g << 8) + b
					]);
				}
			}
		}

		console.log('Writing cache...');
		fs.mkdirSync(cacheDir);

		// we need to manually write the cache file as it's too big to JSON.stringify()
		for (let i = 0; i < 256; i++) {
			fs.writeFileSync(path.join(cacheDir, `${i}.json`), JSON.stringify(table[i].sort((a, b) => a[1] - b[1])));
		}
	}

	brightness = 0;
	const numWorkers = os.cpus().length / 2;
	const workers = [];
	let totalColors = 0;

	console.log(`Starting ${cyan(numWorkers)} workers...`);
	for (let i = 0; i < numWorkers; i++) {
		const w = new Worker(fileURLToPath(import.meta.url));
		w.id = i;
		w.on('message', msg => {
			if (msg) {
				const { brightness, colors, count } = msg;
				index[brightness] = colors;
				totalColors += colors.length;
				console.log(
					`Worker: ${cyan(String(w.id).padEnd(2))} ` +
					`Brightness: ${cyan(String(brightness).padEnd(3))} ` +
					`Total Count: ${cyan(String(count).padEnd(7))} ` +
					`Removed: ${cyan(String(count - colors.length).padEnd(7))} ` +
					`Colors: ${cyan(String(colors.length).padEnd(7))}`
				);
			}
			if (brightness < 256) {
				w.postMessage({ brightness: brightness++ });
			} else {
				w.terminate();
			}
		});
		workers.push(new Promise((resolve, reject) => w.on('error', reject).on('exit', resolve)));
	}

	await Promise.all(workers);

	const lookupFile = path.resolve(dirname, '../src/lookup.js');
	let s = 'export const lookup=[';
	for (let i = 0, l = index.length; i < l; i++) {
		const colors = index[i];
		if (i) {
			s += ',';
		}
		s += '[';
		for (let j = 0, k = colors.length; j < k; j++) {
			if (j) {
				s += ',';
			}
			s += colors[j];
		}
		s += ']';
	}
	s += '];';
	fs.writeFileSync(lookupFile, s, 'utf-8');

	console.log(`Finished in ${cyan(Date.now() - start)} ms`);
	console.log(`Total colors: ${cyan(totalColors)}`);
	console.log(`Lookup file size: ${cyan(fs.statSync(lookupFile).size)} bytes`);
} else {
	// worker thread
	parentPort.on('message', async ({ brightness }) => {
		let colors = JSON.parse(fs.readFileSync(path.join(cacheDir, `${brightness}.json`)));
		const count = colors.length;

		// remove similar colors
		for (let i = 0; i < colors.length; i++) {
			const result = [ colors[i] ];
			for (let j = i + 1; j < colors.length; j++) {
				if (deltaE(colors[i][0], colors[j][0]) >= colorThreshold) {
					result.push(colors[j]);
				}
			}
			colors = result;
		}

		parentPort.postMessage({
			brightness,
			colors: colors.map(c => c[1]),
			count
		});
	});

	parentPort.postMessage(null);
}

// https://stackoverflow.com/a/52453462/5501041
function rgb2lab(r, g, b) {
	let x, y, z;
	r /= 255;
	g /= 255;
	b /= 255;
	r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
	g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
	b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
	x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
	y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
	z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
	x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
	y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
	z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;
	return [ (116 * y) - 16, 500 * (x - y), 200 * (y - z) ];
}

function deltaE(labA, labB) {
	const deltaL = labA[0] - labB[0];
	const deltaA = labA[1] - labB[1];
	const deltaB = labA[2] - labB[2];
	const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
	const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
	const deltaC = c1 - c2;
	let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
	deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
	const sc = 1.0 + 0.045 * c1;
	const sh = 1.0 + 0.015 * c1;
	const deltaLKlsl = deltaL / (1.0);
	const deltaCkcsc = deltaC / (sc);
	const deltaHkhsh = deltaH / (sh);
	const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
	return i < 0 ? 0 : Math.sqrt(i);
}
