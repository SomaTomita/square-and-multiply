import { strings as core } from './core.js';
import { strings as basics } from './basics.js';
import { strings as math } from './math.js';
import { strings as rsa } from './rsa.js';
import { strings as dh } from './dh.js';
import { strings as tls } from './tls.js';

export const strings = { ...core, ...basics, ...math, ...rsa, ...dh, ...tls };
