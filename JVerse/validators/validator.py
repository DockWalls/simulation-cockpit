import sys, json, os
import argparse
from pygltflib import GLTF2
import trimesh

EXIT_OK = 0
EXIT_NO_GEOMETRY = 3
EXIT_NO_RIGGING = 4
EXIT_NO_UV = 5
EXIT_NO_ANIMATIONS = 6

def validate_mesh(path, strict=False):
    scene = trimesh.load(path, force='scene')
    gltf = GLTF2().load(path)
    report = {
        "hasGeometry": len(scene.geometry) > 0,
        "numMeshes": len(scene.geometry),
        "rigged": bool(gltf.skins) and any(n.skin is not None for n in gltf.nodes or []),
        "uvChannels": {},
        "animationClips": len(gltf.animations or [])
    }
    for mi, mesh in enumerate(gltf.meshes or []):
        for pi, prim in enumerate(mesh.primitives or []):
            attrs = prim.attributes or {}
            uv0 = hasattr(attrs, "TEXCOORD_0")
            uv1 = hasattr(attrs, "TEXCOORD_1")
            report["uvChannels"][f"mesh{mi}_prim{pi}"] = {"uv0": uv0, "uv1": uv1}
    print(json.dumps(report, indent=2))
    if not report["hasGeometry"]:
        sys.exit(EXIT_NO_GEOMETRY)
    if not report["rigged"] and strict:
        sys.exit(EXIT_NO_RIGGING)
    if not any(uv["uv0"] for uv in report["uvChannels"].values()) and strict:
        sys.exit(EXIT_NO_UV)
    if report["animationClips"] == 0 and strict:
        sys.exit(EXIT_NO_ANIMATIONS)
    sys.exit(EXIT_OK)

def main():
    parser = argparse.ArgumentParser(description="Validate GLB mesh files.")
    parser.add_argument("--mode", choices=["batch", "single"], default="single")
    parser.add_argument("--check", choices=["animation", "hud"], default="animation")
    parser.add_argument("--exit-on-fail", action="store_true")
    parser.add_argument("file", nargs="?", help="Path to a single .glb file")

    args = parser.parse_args()

    if args.mode == "single":
        if not args.file:
            print("Usage: python validator.py <file.glb>")
            sys.exit(1)
        validate_mesh(args.file, strict=True)

    elif args.mode == "batch":
        failed = []
        for root, _, files in os.walk("avatars"):
            for f in files:
                if f.endswith(".glb"):
                    path = os.path.join(root, f)
                    try:
                        validate_mesh(path, strict=True)
                    except SystemExit as e:
                        if e.code != EXIT_OK:
                            print(f"❌ Failed: {path}")
                            failed.append(path)
                    except Exception as e:
                        print(f"❌ Failed: {path} — {e}")
                        failed.append(path)

        if failed:
            print(f"\n{len(failed)} file(s) failed validation.")
            if args.exit_on_fail:
                sys.exit(1)
        else:
            print("✅ All files passed validation.")

if __name__ == "__main__":
    main()