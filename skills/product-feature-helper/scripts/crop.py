#!/usr/bin/env python3
"""
crop.py — 按 annotate.js 返回的 bbox 裁剪截图（纯标准库，无需 Pillow）

为什么需要裁剪：整页截图放进文档表格的单元格里会被缩到 20% 左右，
红框标注完全看不清，交互文档就失去意义。按标注区域裁剪后主体才够大。

用法：
    python3 crop.py <源图> <输出> <x> <y> <w> <h> [scale] [min_w] [min_h]

坐标是 CSS 像素（annotate.js 返回的 bbox）。

关于 scale：**默认 1，通常不要改**。annotate.js 会报告 devicePixelRatio（常见为 2），
但浏览器工具截出来的图往往已经是 CSS 像素尺寸，此时乘 dpr 会让坐标越界、裁出错误区域。
先比对截图实际宽高与 bbox.viewport，一致就用 1；确认是高倍图时才传对应倍数。

不足最小尺寸时向四周扩展，保证画面有上下文而不是贴着框硬切。
"""
import sys
import zlib
import struct


def read_png(path):
    """解析 PNG 为 (宽, 高, 每行RGBA字节列表)"""
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('not a PNG file')

    pos = 8
    width = height = bit_depth = color_type = None
    idat = b''
    palette = None
    trns = None

    while pos < len(data):
        (length,) = struct.unpack('>I', data[pos:pos + 4])
        ctype = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if ctype == b'IHDR':
            width, height, bit_depth, color_type = struct.unpack('>IIBB', body[:10])
            if body[10:13] != b'\x00\x00\x00':
                raise ValueError('interlaced or non-default PNG not supported')
        elif ctype == b'PLTE':
            palette = body
        elif ctype == b'tRNS':
            trns = body
        elif ctype == b'IDAT':
            idat += body
        elif ctype == b'IEND':
            break
        pos += 12 + length

    if bit_depth != 8:
        raise ValueError('only 8-bit PNG supported, got %s' % bit_depth)

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color_type]
    raw = zlib.decompress(idat)
    stride = width * channels

    # 逐行反 filter（PNG 的 5 种 filter 类型）
    rows = []
    prev = bytearray(stride)
    p = 0
    for _ in range(height):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:      # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif f == 2:    # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif f == 3:    # Average
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif f == 4:    # Paeth
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prev[i]
                c = prev[i - channels] if i >= channels else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        rows.append(bytes(line))
        prev = line

    # 统一转成 RGB
    out = []
    for line in rows:
        if color_type == 2:
            out.append(line)
        elif color_type == 6:
            out.append(bytes(b for i in range(0, len(line), 4) for b in line[i:i + 3]))
        elif color_type == 0:
            out.append(bytes(b for v in line for b in (v, v, v)))
        elif color_type == 4:
            out.append(bytes(b for i in range(0, len(line), 2) for b in (line[i],) * 3))
        elif color_type == 3:
            out.append(bytes(b for v in line for b in palette[v * 3:v * 3 + 3]))
    return width, height, out


def write_png(path, width, height, rows_rgb):
    raw = b''.join(b'\x00' + r for r in rows_rgb)

    def chunk(tag, body):
        return (struct.pack('>I', len(body)) + tag + body
                + struct.pack('>I', zlib.crc32(tag + body) & 0xFFFFFFFF))

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(raw, 6)))
        f.write(chunk(b'IEND', b''))


def resize_to_width(rows, w, h, target_w):
    """等比降采样到目标宽度（最近邻）。

    表格单元格宽度有限，超宽的图会被文档再压一次，且压出来的效果不可控。
    这里先自己缩到目标宽度，显示尺寸就确定了，不依赖 <img width> 是否生效。
    """
    if w <= target_w:
        return rows, w, h
    ratio = target_w / w
    new_h = max(1, int(round(h * ratio)))
    xmap = [min(w - 1, int(i / ratio)) for i in range(target_w)]
    out = []
    for j in range(new_h):
        sy = min(h - 1, int(j / ratio))
        src = rows[sy]
        out.append(bytes(b for x in xmap for b in src[x * 3:x * 3 + 3]))
    return out, target_w, new_h


def crop(src, dst, x, y, w, h, scale=1, min_w=560, min_h=320, max_w=None):
    W, H, rows = read_png(src)
    x, y, w, h = x * scale, y * scale, w * scale, h * scale
    mw, mh = min_w * scale, min_h * scale

    # 太窄/太矮就以中心为基准向外扩，避免裁出一条孤零零的细带
    if w < mw:
        x = max(0, x + w / 2 - mw / 2); w = mw
    if h < mh:
        y = max(0, y + h / 2 - mh / 2); h = mh

    x = int(max(0, min(x, W - 1)));  y = int(max(0, min(y, H - 1)))
    w = int(min(w, W - x));          h = int(min(h, H - y))

    out = [rows[yy][x * 3:(x + w) * 3] for yy in range(y, y + h)]
    if max_w:
        out, w, h = resize_to_width(out, w, h, int(max_w))
    write_png(dst, w, h, out)
    return w, h


if __name__ == '__main__':
    a = sys.argv[1:]
    src, dst = a[0], a[1]
    x, y, w, h = (int(float(v)) for v in a[2:6])
    scale = float(a[6]) if len(a) > 6 else 1
    mw = int(a[7]) if len(a) > 7 else 560
    mh = int(a[8]) if len(a) > 8 else 320
    xw = int(a[9]) if len(a) > 9 else None
    print('%dx%d' % crop(src, dst, x, y, w, h, scale, mw, mh, xw))
