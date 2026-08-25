/**
 * blablalink CDN 경로 난독화(obfuscatedPath) TypeScript 구현
 *
 * 프론트엔드(`index-*.js`)의 `obfuscatedPath()`와 동일한 규칙:
 * - 디렉토리 세그먼트 -> djb2 해시 기반 `xx-99` 토큰
 * - 파일명 -> md5(평문 전체 경로) + 원래 확장자
 */

const CDN_BASE = 'https://sg-tools-cdn.blablalink.com';
const LARGE_PRIMES = [224737, 1000639, 2654435761, 2654435769, 1000621, 4294967291];

/**
 * JS Int32 비트연산 기반 djb2 해시
 */
function djb2(text: string, seed: number): number {
    let value = seed | 0;
    for (let i = 0; i < text.length; i++) {
        value = (Math.imul(value, 33) + text.charCodeAt(i)) | 0;
    }
    return value;
}

function dirToken(path: string, prime: number): string {
    const rawR = djb2(path, prime) % prime;
    const r = ((rawR % prime) + prime) % prime;
    const letters = String.fromCharCode(97 + (Math.floor(r / 26) % 26)) + String.fromCharCode(97 + (r % 26));
    const numStr = String(r % 99).padStart(2, '0');
    return `${letters}-${numStr}`;
}

/**
 * 브라우저 및 Node 환경 공용 MD5 해시 알고리즘
 */
function md5(str: string): string {
    function rotateLeft(lValue: number, iShiftBits: number) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function addUnsigned(lX: number, lY: number) {
        const lX8 = lX & 0x80000000;
        const lY8 = lY & 0x80000000;
        const lX4 = lX & 0x40000000;
        const lY4 = lY & 0x40000000;
        const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
        if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
        if (lX4 | lY4) {
            if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
            return lResult ^ 0x40000000 ^ lX8 ^ lY8;
        }
        return lResult ^ lX8 ^ lY8;
    }
    function F(x: number, y: number, z: number) { return (x & y) | ((~x) & z); }
    function G(x: number, y: number, z: number) { return (x & z) | (y & (~z)); }
    function H(x: number, y: number, z: number) { return x ^ y ^ z; }
    function I(x: number, y: number, z: number) { return y ^ (x | (~z)); }

    function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(utf8Str: string) {
        const lWordCount = Math.floor((utf8Str.length + 8) / 64) + 1;
        const x = Array(lWordCount * 16).fill(0);
        let iByteCount = 0;
        while (iByteCount < utf8Str.length) {
            const lWordCount_idx = Math.floor(iByteCount / 4);
            const iBytePosition = (iByteCount % 4) * 8;
            const code = utf8Str.charCodeAt(iByteCount);
            x[lWordCount_idx] |= (code << iBytePosition);
            iByteCount++;
        }
        const lWordCount_idx = Math.floor(iByteCount / 4);
        const iBytePosition = (iByteCount % 4) * 8;
        x[lWordCount_idx] |= (0x80 << iBytePosition);
        x[lWordCount * 16 - 2] = iByteCount * 8;
        x[lWordCount * 16 - 1] = (iByteCount * 8) >>> 32;
        return x;
    }

    function utf8Encode(strInput: string) {
        return unescape(encodeURIComponent(strInput));
    }

    const utf8Str = utf8Encode(str);
    const x = convertToWordArray(utf8Str);
    let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
        const AA = a, BB = b, CC = c, DD = d;
        a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478); d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756); c = FF(c, d, a, b, x[k + 2], 17, 0x242070db); b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
        a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf); d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a); c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613); b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
        a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8); d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af); c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1); b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
        a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122); d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193); c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e); b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);

        a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562); d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340); c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51); b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
        a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d); d = GG(d, a, b, c, x[k + 10], 9, 0x2441453); c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681); b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
        a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6); d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6); c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87); b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
        a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905); d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8); c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9); b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

        a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942); d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681); c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122); b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
        a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44); d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9); c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60); b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
        a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6); d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa); c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085); b = HH(b, c, d, a, x[k + 6], 23, 0x4881d05e);
        a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039); d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5); c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8); b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

        a = II(a, b, c, d, x[k + 0], 6, 0xf4292244); d = II(d, a, b, c, x[k + 7], 10, 0x432aff97); c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7); b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
        a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3); d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92); c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d); b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
        a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f); d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0); c = II(c, d, a, b, x[k + 6], 15, 0xa3014314); b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);

        a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
    }

    const hex = (n: number) => {
        let s = '';
        for (let j = 0; j <= 3; j++) {
            const byte = (n >>> (j * 8)) & 255;
            s += byte.toString(16).padStart(2, '0');
        }
        return s;
    };
    return hex(a) + hex(b) + hex(c) + hex(d);
}

/**
 * 평문 상대 경로 -> blablalink CDN 난독화 경로 변환
 */
export function obfuscatePath(path: string): string {
    const plain = path.replace(/^\/+/, '');
    const segments = plain.split('/').filter(Boolean);
    const out: string[] = [];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (i === segments.length - 1) {
            const extParts = seg.split('.');
            const ext = extParts.slice(1).join('.');
            out.push(`${md5(plain)}.${ext}`);
        } else {
            out.push(dirToken(plain, LARGE_PRIMES[i]));
        }
    }
    return out.join('/');
}

/**
 * 평문 상대 경로 -> 최종 CDN URL 생성
 */
export function getCdnUrl(path: string): string {
    return `${CDN_BASE}/${obfuscatePath(path)}`;
}
