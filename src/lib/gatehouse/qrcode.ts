/**
 * CondoVia - Pure TypeScript QR Code Generator
 * Based on Project Nayuki's open-source QR Code generator (MIT License).
 * Generates standards-compliant ISO/IEC 18004 QR Codes without any external dependencies.
 */

export enum Ecc {
  LOW = 0,
  MEDIUM = 1,
  QUARTILE = 2,
  HIGH = 3,
}

export class QrSegment {
  public static makeBytes(data: Readonly<Array<number>>): QrSegment {
    const bb: Array<number> = [];
    for (const b of data) {
      appendBits(b, 8, bb);
    }
    return new QrSegment(Mode.BYTE, data.length, bb);
  }

  public static makeNumeric(digits: string): QrSegment {
    if (!NUMERIC_REGEX.test(digits)) {
      throw new RangeError("String contains non-numeric characters");
    }
    const bb: Array<number> = [];
    let i = 0;
    while (i < digits.length) {
      const n = Math.min(digits.length - i, 3);
      appendBits(parseInt(digits.substring(i, i + n), 10), n * 3 + 1, bb);
      i += n;
    }
    return new QrSegment(Mode.NUMERIC, digits.length, bb);
  }

  public static makeAlphanumeric(text: string): QrSegment {
    if (!ALPHANUMERIC_REGEX.test(text)) {
      throw new RangeError("String contains unencodable characters in alphanumeric mode");
    }
    const bb: Array<number> = [];
    let i = 0;
    while (i + 2 <= text.length) {
      let temp = ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45;
      temp += ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
      appendBits(temp, 11, bb);
      i += 2;
    }
    if (i < text.length) {
      appendBits(ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6, bb);
    }
    return new QrSegment(Mode.ALPHANUMERIC, text.length, bb);
  }

  public static makeSegments(text: string): Array<QrSegment> {
    if (text === "") return [];
    if (NUMERIC_REGEX.test(text)) return [QrSegment.makeNumeric(text)];
    if (ALPHANUMERIC_REGEX.test(text)) return [QrSegment.makeAlphanumeric(text)];
    return [QrSegment.makeBytes(toUtf8ByteArray(text))];
  }

  public constructor(
    public readonly mode: Mode,
    public readonly numChars: number,
    private readonly bitData: Array<number>
  ) {
    if (numChars < 0) throw new RangeError("Invalid argument");
    this.bitData = bitData.slice();
  }

  public getData(): Array<number> {
    return this.bitData.slice();
  }
}

export class QrCode {
  public static readonly MIN_VERSION: number = 1;
  public static readonly MAX_VERSION: number = 40;

  public static encodeText(text: string, ecl: Ecc = Ecc.MEDIUM): QrCode {
    const segs = QrSegment.makeSegments(text);
    return QrCode.encodeSegments(segs, ecl);
  }

  public static encodeBinary(data: Readonly<Array<number>>, ecl: Ecc = Ecc.MEDIUM): QrCode {
    const seg = QrSegment.makeBytes(data);
    return QrCode.encodeSegments([seg], ecl);
  }

  public static encodeSegments(
    segs: Readonly<Array<QrSegment>>,
    ecl: Ecc,
    minVersion: number = 1,
    maxVersion: number = 40,
    mask: number = -1,
    boostEcl: boolean = true
  ): QrCode {
    if (
      minVersion < QrCode.MIN_VERSION ||
      minVersion > maxVersion ||
      maxVersion > QrCode.MAX_VERSION ||
      mask < -1 ||
      mask > 7
    ) {
      throw new RangeError("Invalid version or mask parameter");
    }

    let version: number;
    let dataUsedBits: number;
    for (version = minVersion; ; version++) {
      const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
      const usedBits = getTotalBits(segs, version);
      if (usedBits <= dataCapacityBits) {
        dataUsedBits = usedBits;
        break;
      }
      if (version >= maxVersion) {
        throw new RangeError("Data length exceeds QR Code capacity");
      }
    }

    if (boostEcl) {
      for (const newEcl of [Ecc.MEDIUM, Ecc.QUARTILE, Ecc.HIGH]) {
        if (dataUsedBits <= getNumDataCodewords(version, newEcl) * 8) {
          ecl = newEcl;
        }
      }
    }

    const bb: Array<number> = [];
    for (const seg of segs) {
      appendBits(seg.mode.modeBits, 4, bb);
      appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
      for (const b of seg.getData()) {
        bb.push(b);
      }
    }

    const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
    appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
    appendBits(0, (8 - (bb.length % 8)) % 8, bb);

    for (let padByte = 0xec; bb.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) {
      appendBits(padByte, 8, bb);
    }

    const dataCodewords: Array<number> = [];
    while (dataCodewords.length * 8 < bb.length) {
      dataCodewords.push(0);
    }
    bb.forEach((b, i) => (dataCodewords[i >>> 3] |= b << (7 - (i & 7))));

    return new QrCode(version, ecl, dataCodewords, mask);
  }

  public readonly size: number;
  public readonly modules: Array<Array<boolean>> = [];
  private readonly isFunction: Array<Array<boolean>> = [];

  public constructor(
    public readonly version: number,
    public readonly errorCorrectionLevel: Ecc,
    dataCodewords: Readonly<Array<number>>,
    msk: number
  ) {
    if (version < QrCode.MIN_VERSION || version > QrCode.MAX_VERSION) {
      throw new RangeError("Version out of range");
    }
    if (msk < -1 || msk > 7) {
      throw new RangeError("Mask out of range");
    }
    this.size = version * 4 + 17;

    const row: Array<boolean> = [];
    for (let i = 0; i < this.size; i++) row.push(false);
    for (let i = 0; i < this.size; i++) {
      this.modules.push(row.slice());
      this.isFunction.push(row.slice());
    }

    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    if (msk === -1) {
      let minPenalty = 1e9;
      for (let i = 0; i < 8; i++) {
        this.applyMask(i);
        this.drawFormatBits(i);
        const penalty = this.getPenaltyScore();
        if (penalty < minPenalty) {
          minPenalty = penalty;
          msk = i;
        }
        this.applyMask(i);
      }
    }
    this.mask = msk;
    this.applyMask(msk);
    this.drawFormatBits(msk);
    this.isFunction = [];
  }

  public readonly mask: number;

  public getModule(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size && this.modules[y][x];
  }

  private setFunctionModule(x: number, y: number, isDark: boolean): void {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  }

  private drawFunctionPatterns(): void {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    const alignPatPos = getAlignmentPatternPositions(this.version);
    const numAlign = alignPatPos.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (
          !(i === 0 && j === 0) &&
          !(i === 0 && j === numAlign - 1) &&
          !(i === numAlign - 1 && j === 0)
        ) {
          this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
        }
      }
    }

    this.drawFormatBits(0);
    this.drawVersion();
  }

  private drawFormatBits(msk: number): void {
    const data = (this.errorCorrectionLevel.valueOf() << 3) | msk;
    let rem = data;
    for (let i = 0; i < 10; i++) {
      rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    }
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i));

    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, this.size - 8, true);
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  private drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private addEccAndInterleave(data: Readonly<Array<number>>): Array<number> {
    const ver = this.version;
    const ecl = this.errorCorrectionLevel;
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl.valueOf()][ver];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl.valueOf()][ver];
    const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks: Array<Array<number>> = [];
    const rsDiv = reedSolomonComputeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i >= numShortBlocks ? 1 : 0));
      k += dat.length;
      const ecc = reedSolomonComputeRemainder(dat, rsDiv);
      if (i >= numShortBlocks) dat.push(0);
      blocks.push(dat.concat(ecc));
    }

    const result: Array<number> = [];
    for (let i = 0; i < shortBlockLen + 1; i++) {
      for (let j = 0; j < numBlocks; j++) {
        if (i < shortBlockLen - (j < numShortBlocks ? 0 : 0) || (i === shortBlockLen && j >= numShortBlocks)) {
          result.push(blocks[j][i]);
        }
      }
    }
    return result;
  }

  private drawCodewords(data: Readonly<Array<number>>): void {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  private applyMask(msk: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.isFunction[y][x]) {
          let invert: boolean;
          switch (msk) {
            case 0: invert = (x + y) % 2 === 0; break;
            case 1: invert = y % 2 === 0; break;
            case 2: invert = x % 3 === 0; break;
            case 3: invert = (x + y) % 3 === 0; break;
            case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            default: throw new Error("Unreachable");
          }
          if (invert) this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }

  private getPenaltyScore(): number {
    let result = 0;
    for (let y = 0; y < this.size; y++) {
      let runColor = false;
      let runX = 0;
      for (let x = 0; x < this.size; x++) {
        if (this.modules[y][x] === runColor) {
          runX++;
          if (runX === 5) result += 3;
          else if (runX > 5) result++;
        } else {
          runColor = this.modules[y][x];
          runX = 1;
        }
      }
    }
    for (let x = 0; x < this.size; x++) {
      let runColor = false;
      let runY = 0;
      for (let y = 0; y < this.size; y++) {
        if (this.modules[y][x] === runColor) {
          runY++;
          if (runY === 5) result += 3;
          else if (runY > 5) result++;
        } else {
          runColor = this.modules[y][x];
          runY = 1;
        }
      }
    }
    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const color = this.modules[y][x];
        if (
          color === this.modules[y][x + 1] &&
          color === this.modules[y + 1][x] &&
          color === this.modules[y + 1][x + 1]
        ) {
          result += 3;
        }
      }
    }
    let total = 0;
    for (const row of this.modules) {
      for (const color of row) {
        if (color) total++;
      }
    }
    const k = Math.abs(Math.floor((total * 20) / (this.size * this.size)) - 10);
    result += k * 10;
    return result;
  }

  public toSvgString(border: number = 4): string {
    if (border < 0) throw new RangeError("Border must be non-negative");
    const parts: Array<string> = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.getModule(x, y)) {
          parts.push(`M${x + border},${y + border}h1v1h-1z`);
        }
      }
    }
    const totalSize = this.size + border * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${totalSize} ${totalSize}" stroke="none" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${parts.join("")}" fill="#000000"/></svg>`;
  }

  public toDataUrl(border: number = 4): string {
    const svg = this.toSvgString(border);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

class Mode {
  public static readonly NUMERIC = new Mode(0x1, [10, 12, 14]);
  public static readonly ALPHANUMERIC = new Mode(0x2, [9, 11, 13]);
  public static readonly BYTE = new Mode(0x4, [8, 16, 16]);

  private constructor(
    public readonly modeBits: number,
    private readonly numBitsCharCount: [number, number, number]
  ) {}

  public numCharCountBits(version: number): number {
    return this.numBitsCharCount[Math.floor((version + 7) / 17)];
  }
}

function appendBits(val: number, len: number, bb: Array<number>): void {
  for (let i = len - 1; i >= 0; i--) {
    bb.push((val >>> i) & 1);
  }
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

function toUtf8ByteArray(str: string): Array<number> {
  str = encodeURI(str);
  const result: Array<number> = [];
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) !== "%") {
      result.push(str.charCodeAt(i));
    } else {
      result.push(parseInt(str.substring(i + 1, i + 3), 16));
      i += 2;
    }
  }
  return result;
}

function getTotalBits(segs: Readonly<Array<QrSegment>>, version: number): number {
  let result = 0;
  for (const seg of segs) {
    const cc = seg.mode.numCharCountBits(version);
    if (seg.numChars >= 1 << cc) return 1e9;
    result += 4 + cc + seg.getData().length;
  }
  return result;
}

function getNumDataCodewords(ver: number, ecl: Ecc): number {
  return (
    Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl.valueOf()][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl.valueOf()][ver]
  );
}

function getNumRawDataModules(ver: number): number {
  const s = ver * 4 + 17;
  let numModules = s * s;
  numModules -= 64 * 3;
  numModules -= 15 * 2 + 1;
  numModules -= (s - 16) * 2;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    numModules -= (numAlign * numAlign - 3) * 25;
    numModules -= (numAlign - 2) * 2 * 20;
  }
  if (ver >= 7) {
    numModules -= 6 * 3 * 2;
  }
  return numModules;
}

function getAlignmentPatternPositions(ver: number): Array<number> {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: Array<number> = [6];
  for (let pos = size(ver) - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

function size(ver: number): number {
  return ver * 4 + 17;
}

function reedSolomonComputeDivisor(degree: number): Array<number> {
  const result: Array<number> = [];
  for (let i = 0; i < degree - 1; i++) result.push(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: Readonly<Array<number>>, divisor: Readonly<Array<number>>): Array<number> {
  const result: Array<number> = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= reedSolomonMultiply(coef, factor)));
  }
  return result;
}

function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

const NUMERIC_REGEX = /^[0-9]*$/;
const ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/;
const ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 72, 74, 79],
];

/**
 * Builds the standard visitor access payload and visitor pass URL.
 */
export function buildAuthorizationPassUrl(passToken: string, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://condovia.kynovia.com.br");
  return `${base}/pass/${passToken}`;
}

export function buildWhatsAppShareUrl(options: {
  visitorName: string;
  condoName: string;
  unitCode: string;
  validFrom: string;
  validUntil: string;
  passUrl: string;
}): string {
  const text = [
    `*Autorização de Acesso - CondoVia*`,
    `Olá, *${options.visitorName}*!`,
    `Você possui uma liberação de acesso para a *Unidade ${options.unitCode}* no *${options.condoName}*.`,
    ``,
    `📅 *Período de Validade:*`,
    `De: ${options.validFrom}`,
    `Até: ${options.validUntil}`,
    ``,
    `📲 Apresente o QR Code na portaria:`,
    options.passUrl,
  ].join("\n");

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
