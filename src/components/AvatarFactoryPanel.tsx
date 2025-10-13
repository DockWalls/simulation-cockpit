import React, { useState } from 'react';
import { validateAvatar, ValidationReport } from '@jallybean/avatar-validator';
import { autoRigGLB } from '../lib/auto-rig';
import { sha256, fileSha256 } from '../lib/hash';

const DUMMY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInQiOiJhY21lIiwiciI6ImNvbW1hbmRlciIsImlhdCI6MTc1ODg4Njg4M30.wP6zSKn4WqQ7-KRrQsRtJ26hjc1B6BPLau1N2uxsE5c';

async function putToSignedUrl(url: string, glbBuf: ArrayBuffer) {
  const r = await fetch(url, { method: 'PUT', body: glbBuf, headers: { 'Content-Type': 'model/gltf-binary' }});
  if (!r.ok) throw new Error(`PUT signed URL failed (${r.status})`);
}

async function postEvidenceFlow({
  token, traceId, pngName, pngHash, glbBuf, validationReport
}: {
  token: string; traceId: string;
  pngName: string; pngHash: string; glbBuf: ArrayBuffer; validationReport: ValidationReport
}) {

  const glb_sha256 = await sha256(glbBuf);

  // 1) Signed URL
  const up = await fetch('/api/evidence/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ trace_id: traceId, glb_sha256 })
  }).then(r => r.json());
  if (!up.url) throw new Error('Failed to get signed URL');

  // 2) Upload GLB
  await putToSignedUrl(up.url, glbBuf);

  // 3) Evidence POST (identity fields will be server-enriched from JWT)
  const payload = {
    trace_id: traceId,
    ts: new Date().toISOString(),
    inputs: { png_sha256: pngHash, png_name: pngName },
    outputs: {
      glb_sha256,
      size_bytes: glbBuf.byteLength,
      extensions: validationReport.report?.extensions ?? []
    },
    validator: {
      passed: true,
      report: validationReport.report,
      tool: '@jallybean/avatar-validator',
      version: '0.1.0'
    },
    policy: { clause: 'avatar.generate', decision: 'allow' }
  };

  const ev = await fetch('/api/evidence/avatars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!ev.ok) throw new Error(`Evidence POST failed (${ev.status})`);
  return ev.json();
}


export function AvatarFactoryPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRigging, setIsRigging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedGlb, setValidatedGlb] = useState<ArrayBuffer | null>(null);
  const [pngName, setPngName] = useState<string>('');
  const [pngHash, setPngHash] = useState<string>('');
  const [lastTraceId, setLastTraceId] = useState<string|null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setValidationReport(null);
      setError(null);
      setValidatedGlb(null);
    }
  };

  const handlePngChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const pngFile = e.target.files[0];
      setPngName(pngFile.name);
      setPngHash(await fileSha256(pngFile));
    }
  };

  const handleValidate = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }
    setIsValidating(true);
    setError(null);
    setValidationReport(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      let report = await validateAvatar(arrayBuffer);
      setValidationReport(report);

      const needsRigging = !report.report.hasSkin || report.alerts.some(a => a.includes('Humanoid skeleton validation failed'));

      if (needsRigging) {
        setError('Validation failed: Missing or invalid skeleton. Attempting auto-rig...');
        setIsRigging(true);
        try {
          const riggedBuffer = await autoRigGLB(arrayBuffer);
          report = await validateAvatar(riggedBuffer);
          setValidationReport(report);
          if (!report.passed) {
            throw new Error(`Auto-rig failed validation: ${report.alerts.join(', ')}`);
          }
          setValidatedGlb(riggedBuffer);
          setError('Auto-rig successful. Validation passed.');
        } catch (rigError) {
          const e = rigError as Error;
          setError(`Auto-rig failed: ${e.message}`);
        } finally {
          setIsRigging(false);
        }
      } else if (!report.passed) {
        let errorMsg = report.alerts.join('\n');
        if (report.alerts.some(a => a.startsWith('Texture policy'))) {
          errorMsg += '\nTip: enable KTX2 auto-transcode.';
        }
        setError(errorMsg);
      } else {
        setValidatedGlb(arrayBuffer);
        setError(null);
      }
    } catch (err) {
      const e = err as Error;
      setError(`An unexpected error occurred during validation: ${e.message}`);
      setValidationReport(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleInject = async () => {
    if (!validationReport || !validationReport.passed || !validatedGlb) {
      if (validationReport && validationReport.alerts.length > 0) {
        let errorMsg = `Injection failed. Validation alerts:\n\n${validationReport.alerts.join('\n')}`;
        if (validationReport.alerts.some(a => a.startsWith('Texture policy'))) {
          errorMsg += '\nTip: enable KTX2 auto-transcode.';
        }
        alert(errorMsg);
      } else {
        alert('Validation must pass before injecting.');
      }
      return;
    }

    console.log('Injecting avatar...');

    try {
      const traceId = crypto.randomUUID();
      const resp = await postEvidenceFlow({
        token: DUMMY_TOKEN,
        traceId,
        pngName, pngHash,
        glbBuf: validatedGlb!,
        validationReport
      });
      setLastTraceId(traceId);
      alert(`Evidence submitted successfully! Ledger signature: ${resp.signedLedgerEntry.signature}`);
      // show “Evidence ✓” badge
    } catch (e:any) {
      alert(e.message);
    }
  };

  const handleVerify = async () => {
    if (!lastTraceId) return alert('No trace to verify.');
    const r = await fetch(`/api/evidence/verify?trace_id=${encodeURIComponent(lastTraceId)}`, {
      headers: { 'Authorization': 'Bearer ' + DUMMY_TOKEN }
    });
    const j = await r.json();
    alert(j.ok ? 'Evidence signature ✅' : 'Evidence signature ❌');
  }


  return (
    <div>
      <h2>Avatar Factory Panel</h2>
      <div>
        <label>
          PNG Source Image:
          <input type="file" accept="image/png" onChange={handlePngChange} />
        </label>
      </div>
      <div>
        <label>
          Avatar GLB:
          <input type="file" accept=".glb" onChange={handleFileChange} />
        </label>
      </div>

      <button onClick={handleValidate} disabled={!file || isRigging || isValidating}>
        {isRigging ? 'Auto-rigging...' : (isValidating ? 'Validating...' : 'Validate')}
      </button>
      <button onClick={handleInject} disabled={!validationReport?.passed || isRigging || isValidating}>
        Inject
      </button>
      {lastTraceId && (
        <button onClick={handleVerify} disabled={isRigging || isValidating}>
          Verify Evidence
        </button>
      )}

      {error && (
        <div style={{ color: 'red', whiteSpace: 'pre-wrap', marginTop: '10px' }}>
          <h4>Error</h4>
          <p>{error}</p>
        </div>
      )}

      {isRigging && <p>Auto-rigging in progress, this may take a moment...</p>}

      {validationReport && (
        <div style={{ marginTop: '10px' }}>
          <h4>Validation Report</h4>
          <pre>{JSON.stringify(validationReport, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
