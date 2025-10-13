// Minimal KTX2 header parser (Level 0 width/height)
export function readKTX2Dims(buf) {
    const magic = new Uint8Array(buf, 0, 12);
    const sig = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < 12; i++)
        if (magic[i] !== sig[i])
            return null;
    const dv = new DataView(buf);
    // KTX2 header (little-endian):
    const pixelWidth = dv.getUint32(12, true);
    const pixelHeight = dv.getUint32(16, true);
    return { width: pixelWidth, height: pixelHeight };
}
