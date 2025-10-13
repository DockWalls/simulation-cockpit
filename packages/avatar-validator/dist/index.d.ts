export type TextureReport = {
    allKTX2: boolean;
    overBudget: string[];
    maxDim: number;
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
        skeleton?: {
            [boneName: string]: boolean;
        };
        extensions?: string[];
    };
}
/**
 * Computes the SHA-256 hash of an ArrayBuffer.
 * @param buffer The ArrayBuffer to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
export declare function sha256(buffer: ArrayBuffer): Promise<string>;
/**
 * Validates a GLB file buffer against a set of rules.
 *
 * @param glbBuffer The ArrayBuffer of the .glb file.
 * @returns A promise that resolves to a ValidationReport.
 */
export declare function validateAvatar(glbBuffer: ArrayBuffer): Promise<ValidationReport>;
