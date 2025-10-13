// src/lib/auto-rig.ts
// Minimal browser client that calls your backend, uploads GLB, polls, returns rigged GLB.

export async function autoRigGLB(glb: ArrayBuffer): Promise<ArrayBuffer> {
  // 1) start job
  const start = await fetch('/api/autorig/start', { method: 'POST' }).then(r => r.json());
  if (!start.uploadUrl || !start.jobId) throw new Error('Auto-rig start failed');

  // 2) upload original GLB to signed URL
  await fetch(start.uploadUrl, { method: 'PUT', body: new Blob([glb]) });

  // 3) poll until done
  let delay = 800;
  const deadline = Date.now() + 60_000; // 60s
  while (Date.now() < deadline) {
    const s = await fetch(`/api/autorig/status?jobId=${encodeURIComponent(start.jobId)}`).then(r=>r.json());
    if (s.status === 'succeeded' && s.riggedUrl) return await fetch(s.riggedUrl).then(r=>r.arrayBuffer());
    if (s.status === 'failed') throw new Error(s.error || 'Auto-rig failed');
    await new Promise(r=>setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 3000);
  }
  throw new Error('Auto-rig timed out');
}
