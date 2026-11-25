/* ==========================================================================
   Pure JS ISO/IEC 18004 QR Code Generator (Byte Mode, ECC Level M, Ver 1-10)
   100%-ban offline működő, beépített QR-kód generátor az Admin felülethez
   ========================================================================== */

(function (global) {
  'use strict';

  // GF(256) log / exp táblák (polinom: 0x11D)
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rsGeneratorPoly(deg) {
    let poly = [1];
    for (let i = 0; i < deg; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsCompute(data, ecCount) {
    const gen = rsGeneratorPoly(ecCount);
    const res = new Uint8Array(ecCount);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ res[0];
      for (let j = 0; j < ecCount - 1; j++) res[j] = res[j + 1];
      res[ecCount - 1] = 0;
      if (factor !== 0) {
        for (let j = 0; j < ecCount; j++) {
          res[j] ^= gfMul(gen[j + 1], factor);
        }
      }
    }
    return res;
  }

  // ECC Level M tábla (Ver 1..10): [totalDataCodewords, ecPerBlock, [[blocks, dataCw], ...]]
  const VER_M = {
    1:  { cap: 14,  total: 16,  ec: 10, blocks: [[1, 16]], align: [] },
    2:  { cap: 26,  total: 28,  ec: 16, blocks: [[1, 28]], align: [6, 18] },
    3:  { cap: 42,  total: 44,  ec: 26, blocks: [[1, 44]], align: [6, 22] },
    4:  { cap: 62,  total: 64,  ec: 18, blocks: [[2, 32]], align: [6, 26] },
    5:  { cap: 84,  total: 86,  ec: 24, blocks: [[2, 43]], align: [6, 30] },
    6:  { cap: 106, total: 108, ec: 16, blocks: [[4, 27]], align: [6, 34] },
    7:  { cap: 122, total: 124, ec: 18, blocks: [[4, 31]], align: [6, 22, 38] },
    8:  { cap: 152, total: 154, ec: 22, blocks: [[2, 38], [2, 39]], align: [6, 24, 42] },
    9:  { cap: 180, total: 182, ec: 22, blocks: [[3, 36], [2, 37]], align: [6, 26, 46] },
    10: { cap: 213, total: 216, ec: 26, blocks: [[4, 43], [1, 44]], align: [6, 28, 50] }
  };

  // Version info (Ver 7..10)
  const VER_BITS = {
    7: 0x07c94,
    8: 0x085bc,
    9: 0x09a99,
    10: 0x0a4d3
  };

  // Format info for ECC Level M (00) + mask 0..7 (pre-XORed with 0x5412)
  const FMT_BITS_M = [
    0x5412, 0x5125, 0x5e7c, 0x5b4b,
    0x45f9, 0x40ce, 0x4f97, 0x4aa0
  ];

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(str));
    }
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }

  function encodeData(bytes, ver) {
    const info = VER_M[ver];
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };

    // Byte mode indicator (0100)
    pushBits(0b0100, 4);
    // Character count indicator (8 bits for V1-9, 16 bits for V10)
    pushBits(bytes.length, ver <= 9 ? 8 : 16);
    for (const b of bytes) pushBits(b, 8);

    const maxBits = info.total * 8;
    // Terminator (up to 4 zeros)
    pushBits(0, Math.min(4, maxBits - bits.length));
    // Pad to byte boundary
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let cw = 0;
      for (let j = 0; j < 8; j++) cw = (cw << 1) | bits[i + j];
      codewords.push(cw);
    }

    const padBytes = [0xec, 0x11];
    let p = 0;
    while (codewords.length < info.total) {
      codewords.push(padBytes[p % 2]);
      p++;
    }

    // Split into blocks and compute RS
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (const [count, cwLen] of info.blocks) {
      for (let b = 0; b < count; b++) {
        const blk = codewords.slice(offset, offset + cwLen);
        offset += cwLen;
        dataBlocks.push(blk);
        ecBlocks.push(Array.from(rsCompute(blk, info.ec)));
      }
    }

    // Interleave data codewords, then EC codewords
    const finalCw = [];
    const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxDataLen; i++) {
      for (const blk of dataBlocks) {
        if (i < blk.length) finalCw.push(blk[i]);
      }
    }
    for (let i = 0; i < info.ec; i++) {
      for (const ec of ecBlocks) finalCw.push(ec[i]);
    }

    const finalBits = [];
    for (const cw of finalCw) {
      for (let i = 7; i >= 0; i--) finalBits.push((cw >>> i) & 1);
    }
    return finalBits;
  }

  function createMatrix(ver) {
    const size = ver * 4 + 17;
    const mat = Array.from({ length: size }, () => new Int8Array(size)); // 0 empty, 1 light, 2 dark
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    const setFunc = (r, c, dark) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      mat[r][c] = dark ? 2 : 1;
      isFunc[r][c] = 1;
    };

    const drawFinder = (tr, tc) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = tr + r, cc = tc + c;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          const dark =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setFunc(rr, cc, dark);
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setFunc(6, i, i % 2 === 0);
      setFunc(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    const align = VER_M[ver].align;
    for (const r of align) {
      for (const c of align) {
        if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 8) || (r >= size - 8 && c <= 8)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            setFunc(r + dr, c + dc, dist === 2 || dist === 0);
          }
        }
      }
    }

    // Reserve format info areas
    for (let i = 0; i <= 8; i++) {
      if (!isFunc[8][i]) setFunc(8, i, false);
      if (!isFunc[i][8]) setFunc(i, 8, false);
    }
    for (let i = 0; i < 8; i++) {
      setFunc(8, size - 1 - i, false);
      setFunc(size - 1 - i, 8, false);
    }
    // Dark module
    setFunc(size - 8, 8, true);

    // Version info for Ver >= 7
    if (ver >= 7) {
      const vbits = VER_BITS[ver];
      for (let i = 0; i < 18; i++) {
        const bit = ((vbits >>> i) & 1) === 1;
        const r = Math.floor(i / 3);
        const c = size - 11 + (i % 3);
        setFunc(r, c, bit);
        setFunc(c, r, bit);
      }
    }

    return { size, mat, isFunc };
  }

  function applyFormat(mat, size, mask) {
    const bits = FMT_BITS_M[mask];
    const put = (r, c, idx) => {
      mat[r][c] = ((bits >>> idx) & 1) ? 2 : 1;
    };
    for (let i = 0; i <= 5; i++) put(8, i, 14 - i);
    put(8, 7, 8);
    put(8, 8, 7);
    put(7, 8, 6);
    for (let i = 0; i <= 5; i++) put(5 - i, 8, 5 - i);

    for (let i = 0; i <= 7; i++) put(8, size - 1 - i, i);
    for (let i = 0; i <= 6; i++) put(size - 7 + i, 8, 14 - i);
  }

  function maskBit(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return false;
    }
  }

  function penaltyScore(mat, size) {
    let score = 0;
    // Rule 1: 5+ consecutive same color in row/col
    for (let r = 0; r < size; r++) {
      let runR = 1, runC = 1;
      for (let i = 1; i < size; i++) {
        if (mat[r][i] === mat[r][i - 1]) {
          runR++;
          if (runR === 5) score += 3;
          else if (runR > 5) score += 1;
        } else runR = 1;

        if (mat[i][r] === mat[i - 1][r]) {
          runC++;
          if (runC === 5) score += 3;
          else if (runC > 5) score += 1;
        } else runC = 1;
      }
    }
    // Rule 2: 2x2 blocks
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = mat[r][c];
        if (v === mat[r][c + 1] && v === mat[r + 1][c] && v === mat[r + 1][c + 1]) score += 3;
      }
    }
    return score;
  }

  function generateQRMatrix(text) {
    const bytes = utf8Bytes(String(text || ''));
    let ver = 1;
    while (ver <= 10 && bytes.length > VER_M[ver].cap) ver++;
    if (ver > 10) {
      throw new Error('Az URL túl hosszú a QR-kódhoz (max 213 bájt).');
    }

    const dataBits = encodeData(bytes, ver);
    const { size, mat: base, isFunc } = createMatrix(ver);

    // Place data bits in zigzag
    const unmasked = base.map((row) => Int8Array.from(row));
    let bitIdx = 0;
    let upward = true;
    for (let col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col--;
      for (let i = 0; i < size; i++) {
        const r = upward ? size - 1 - i : i;
        for (let dc = 0; dc < 2; dc++) {
          const c = col - dc;
          if (!isFunc[r][c]) {
            const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
            unmasked[r][c] = bit ? 2 : 1;
          }
        }
      }
      upward = !upward;
    }

    // Choose lowest penalty mask
    let bestMat = null;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      const candidate = unmasked.map((row) => Int8Array.from(row));
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!isFunc[r][c] && maskBit(m, r, c)) {
            candidate[r][c] = candidate[r][c] === 2 ? 1 : 2;
          }
        }
      }
      applyFormat(candidate, size, m);
      const sc = penaltyScore(candidate, size);
      if (sc < bestScore) {
        bestScore = sc;
        bestMat = candidate;
      }
    }

    return {
      size,
      modules: bestMat.map((row) => Array.from(row, (v) => v === 2))
    };
  }

  function renderQRToCanvas(canvas, text, options) {
    const opts = Object.assign({ size: 220, dark: '#111111', light: '#FFFFFF', quietZone: 4 }, options);
    const { size, modules } = generateQRMatrix(text);
    const totalMods = size + opts.quietZone * 2;
    const scale = Math.max(2, Math.floor(opts.size / totalMods));
    const dim = totalMods * scale;

    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = opts.light;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = opts.dark;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules[r][c]) {
          ctx.fillRect((c + opts.quietZone) * scale, (r + opts.quietZone) * scale, scale, scale);
        }
      }
    }
    return canvas;
  }

  global.QRCodeGen = {
    generateMatrix: generateQRMatrix,
    renderToCanvas: renderQRToCanvas
  };
})(typeof window !== 'undefined' ? window : globalThis);
