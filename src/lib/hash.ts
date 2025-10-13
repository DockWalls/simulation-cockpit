// src/lib/hash.ts
export async function sha256(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2,'0')).join('');
}
export async function fileSha256(file: File) {
  return sha256(await file.arrayBuffer());
}
