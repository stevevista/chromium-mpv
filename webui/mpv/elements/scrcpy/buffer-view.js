
export function writeLengthText (view, bytes, offset) {
  offset = writeUInt32BE(view, bytes.length, offset)

  let i
  for (i = 0; i < length; ++i) {
    if ((i + offset >= view.byteLength) || (i >= bytes.length)) break
    view[i + offset] = bytes[i]
  }

  return i + offset
}

export function readUInt8 (view, offset) {
  offset = offset >>> 0
  return view[offset]
}

export function readUInt16BE (view, offset) {
  offset = offset >>> 0
  return (view[offset] << 8) | view[offset + 1]
}

export function readUInt32BE (view, offset) {
  offset = offset >>> 0

  return (view[offset] * 0x1000000) +
    ((view[offset + 1] << 16) |
    (view[offset + 2] << 8) |
    view[offset + 3])
}

export function readBigUInt64BE (view, offset) {
  offset = offset >>> 0
  const first = view[offset]
  const last = view[offset + 7]
  if (first === undefined || last === undefined) {
    throw new Error('error readBigUInt64BE')
  }

  const hi = first * 2 ** 24 +
  view[++offset] * 2 ** 16 +
  view[++offset] * 2 ** 8 +
  view[++offset]

  const lo = view[++offset] * 2 ** 24 +
  view[++offset] * 2 ** 16 +
  view[++offset] * 2 ** 8 +
  last

  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
}

export function readInt8 (view, offset) {
  offset = offset >>> 0
  if (!(view[offset] & 0x80)) return (view[offset])
  return ((0xff - view[offset] + 1) * -1)
}

export function readInt16BE (view, offset) {
  offset = offset >>> 0
  const val = view[offset + 1] | (view[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

export function readInt32BE (view, offset) {
  offset = offset >>> 0

  return (view[offset] << 24) |
    (view[offset + 1] << 16) |
    (view[offset + 2] << 8) |
    (view[offset + 3])
}

export function readBigInt64BE (view, offset) {
  offset = offset >>> 0
  const first = view[offset]
  const last = view[offset + 7]
  if (first === undefined || last === undefined) {
    throw new Error('error readBigInt64BE')
  }

  const val = (first << 24) + // Overflow
  view[++offset] * 2 ** 16 +
  view[++offset] * 2 ** 8 +
  view[++offset]

  return (BigInt(val) << BigInt(32)) +
    BigInt(view[++offset] * 2 ** 24 +
      view[++offset] * 2 ** 16 +
      view[++offset] * 2 ** 8 +
    last)
}

export function writeUInt8 (view, value, offset) {
  value = +value
  offset = offset >>> 0
  view[offset] = (value & 0xff)
  return offset + 1
}

export function writeUInt16BE (view, value, offset) {
  value = +value
  offset = offset >>> 0
  view[offset] = (value >>> 8)
  view[offset + 1] = (value & 0xff)
  return offset + 2
}

export function writeUInt32BE (view, value, offset) {
  value = +value
  offset = offset >>> 0
  view[offset] = (value >>> 24)
  view[offset + 1] = (value >>> 16)
  view[offset + 2] = (value >>> 8)
  view[offset + 3] = (value & 0xff)
  return offset + 4
}

export function writeInt8 (view, value, offset) {
  value = +value
  offset = offset >>> 0
  if (value < 0) value = 0xff + value + 1
  view[offset] = (value & 0xff)
  return offset + 1
}

export function writeInt16BE (view, value, offset) {
  value = +value
  offset = offset >>> 0
  view[offset] = (value >>> 8)
  view[offset + 1] = (value & 0xff)
  return offset + 2
}

export function writeInt32BE (view, value, offset) {
  value = +value
  offset = offset >>> 0
  if (value < 0) value = 0xffffffff + value + 1
  view[offset] = (value >>> 24)
  view[offset + 1] = (value >>> 16)
  view[offset + 2] = (value >>> 8)
  view[offset + 3] = (value & 0xff)
  return offset + 4
}

// https://github.com/google/closure-library/blob/51e5a5ac373aefa354a991816ec418d730e29a7e/closure/goog/crypt/crypt.js#L117
/*
    Copyright 2008 The Closure Library Authors. All Rights Reserved.
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS-IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
/**
  * Converts a JS string to a UTF-8 "byte" array.
  * @param {string} str 16-bit unicode string.
  * @return {!Array<number>} UTF-8 byte array.
  */
export function stringToUtf8ByteArray (str) {
  // TODO(user): Use native implementations if/when available
  const out = []
  let p = 0;
  
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      out[p++] = c;
    } else if (c < 2048) {
      out[p++] = (c >> 6) | 192;
      out[p++] = (c & 63) | 128;
    } else if (
      ((c & 0xFC00) === 0xD800) && (i + 1) < str.length &&
      ((str.charCodeAt(i + 1) & 0xFC00) === 0xDC00)) {
      // Surrogate Pair
      c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
      out[p++] = (c >> 18) | 240;
      out[p++] = ((c >> 12) & 63) | 128;
      out[p++] = ((c >> 6) & 63) | 128;
      out[p++] = (c & 63) | 128;
    } else {
      out[p++] = (c >> 12) | 224;
      out[p++] = ((c >> 6) & 63) | 128;
      out[p++] = (c & 63) | 128;
    }
  }
  
  return out
}

/**
  * Converts a UTF-8 byte array to JavaScript's 16-bit Unicode.
  * @param {Uint8Array|Array<number>} bytes UTF-8 byte array.
  * @return {string} 16-bit Unicode string.
  */
export function utf8ByteArrayToString (bytes) {
  // TODO(user): Use native implementations if/when available
  const out = []
  let pos = 0
  let c = 0;
  while (pos < bytes.length) {
    const c1 = bytes[pos++];
    if (c1 < 128) {
      out[c++] = String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224) {
      const c2 = bytes[pos++];
      out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
    } else if (c1 > 239 && c1 < 365) {
      // Surrogate Pair
      const c2 = bytes[pos++];
      const c3 = bytes[pos++];
      const c4 = bytes[pos++];
      const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) -
              0x10000;
      out[c++] = String.fromCharCode(0xD800 + (u >> 10));
      out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
    } else {
      const c2 = bytes[pos++];
      const c3 = bytes[pos++];
      out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63)
    }
  }
  return out.join('')
}
