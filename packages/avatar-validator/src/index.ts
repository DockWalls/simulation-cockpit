import { Document, NodeIO, Texture } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { inspect } from '@gltf-transform/functions';
import { readKTX2Dims } from './ktx2';

export type TextureReport = {
  allKTX2: boolean;
  overBudget: string[];   // list of texture names/uris that exceed max
  maxDim: number;         // maximum observed dimension
};

export interface ValidationReport {
  passed: boolean;
  alerts: string[];
  sha256: string;
  report: {
    meshCount?: number;
    hasSkin?: boolean;
    hasAnimations?: boolean;
    textures?: TextureReport;
    skeleton?: { [boneName: string]: boolean };
    extensions?: string[];
  };
}

const MAX_TEX_DIM = 2048;

/**
 * Computes the SHA-256 hash of an ArrayBuffer.
 * @param buffer The ArrayBuffer to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
export async function sha256(buffer: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest('SHA-256', buffer)
    .then(hashBuffer => Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

function isKTX2(tex: Texture, doc: Document): boolean {
  const mime = tex.getMimeType() || '';
  const name = tex.getName() || tex.getURI() || '';
  const usesBasis = doc.getRoot().listExtensionsUsed()
                        .some((ext) => (ext.constructor as any).EXTENSION_NAME === 'KHR_texture_basisu'); // fallback
  return mime === 'image/ktx2' || /\.ktx2$/i.test(name) || usesBasis;
}

async function texturePolicyCheck(doc: Document): Promise<TextureReport> {
  const textures = doc.getRoot().listTextures();
  let allKTX2 = true;
  const overBudget: string[] = [];
  let maxDim = 0;

  for (const tex of textures) {
    const name = tex.getName() || tex.getURI() || '(unnamed)';

    // KTX2 requirement
    const ktx2 = isKTX2(tex, doc);
    if (!ktx2) allKTX2 = false;

    // Dimension check (only reliable if KTX2; otherwise we skip dimension probe)
    if (ktx2) {
      // get image data as ArrayBuffer
      const image = tex.getImage();
      if (image) {
        const dims = readKTX2Dims(image);
        if (dims) {
          const localMax = Math.max(dims.width, dims.height);
          maxDim = Math.max(maxDim, localMax);
          if (localMax > MAX_TEX_DIM) {
            overBudget.push(`${name} (${dims.width}x${dims.height})`);
          }
        }
      }
    }

    // If not KTX2, we can’t safely read dims without decoding — policy will fail on allKTX2 anyway.
  }

  return { allKTX2, overBudget, maxDim };
}


/**
 * Validates a GLB file buffer against a set of rules.
 *
 * @param glbBuffer The ArrayBuffer of the .glb file.
 * @returns A promise that resolves to a ValidationReport.
 */
export async function validateAvatar(glbBuffer: ArrayBuffer): Promise<ValidationReport> {
  const alerts: string[] = [];
  const report: ValidationReport['report'] = {};

  // 1. SHA-256 Hash
  const hash = await sha256(glbBuffer);

  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  let doc: Document;

  try {
    doc = await io.readBinary(new Uint8Array(glbBuffer));
  } catch (e) {
    const error = e as Error;
    return {
      passed: false,
      alerts: [`Failed to parse GLB: ${error.message}`],
      sha256: hash,
      report: {},
    };
  }

  // 2. Mesh, Skin, and Animation Checks
  const root = doc.getRoot();
  report.meshCount = root.listMeshes().length;
  if (report.meshCount === 0) {
    alerts.push('Validation failed: No meshes found in the model.');
  }

  report.hasSkin = root.listSkins().length > 0;
  if (!report.hasSkin) {
    alerts.push('Validation failed: No skin/armature detected.');
  }

  report.hasAnimations = root.listAnimations().length > 0;
  if (!report.hasAnimations) {
    alerts.push('Validation warning: No animation clips found.');
  }

  // 3. Skeleton Schema Check
  const skeletonReport: { [boneName: string]: boolean } = {};
  const scene = root.listScenes()[0];
  let skeletonFound = false;
  if (scene) {
      scene.traverse((node) => {
          if (node.getName().toLowerCase().includes('hips')) {
              skeletonFound = true;
              // A simple check for now. A full recursive check would be more robust.
              const childrenNames = node.listChildren().map(c => c.getName());
              if(!childrenNames.find(name => name.toLowerCase().includes("spine"))) {
                alerts.push('Skeleton check failed: Humanoid skeleton validation failed.');
              }
          }
      });
  }
  if (!skeletonFound) {
      alerts.push('Skeleton check failed: Humanoid skeleton validation failed.');
  }
  report.skeleton = skeletonReport;


  // 4. Texture Policy Check
  const textures = await texturePolicyCheck(doc);
  report.textures = textures;

  // Hard fail on non-compliance:
  if (!textures.allKTX2) {
    alerts.push('Texture policy: Non-KTX2 textures detected. All textures must be KTX2.');
  }
  if (textures.overBudget.length > 0) {
    alerts.push(`Texture policy: Dimensions exceed ${MAX_TEX_DIM}px: ${textures.overBudget.join(', ')}`);
  }


  // 5. Extension Sanity
  try {
    report.extensions = doc.getRoot().listExtensionsUsed().map(ext => (ext.constructor as any).EXTENSION_NAME);
  } catch (e) {
    // ignore
  }

  const passed = alerts.every(a => a.startsWith('Validation warning'));

  return {
    passed,
    alerts,
    sha256: hash,
    report,
  };
}