package assetlint

import rego.v1

# Deny if the asset is too large
deny contains msg if {
  input.asset.size > 100000000 # 100 MB
  msg := sprintf("Asset size of %v bytes is too large. Assets should be under 100 MB.", [input.asset.size])
}

# Deny if textures are too large
deny contains msg if {
  some i
  texture := input.asset.textures[i]
  texture.width > 4096
  texture.height > 4096
  msg := sprintf("Texture %v has dimensions %vx%v, which is too large. Textures should be no larger than 4096x4096.", [i, texture.width, texture.height])
}

# Deny if Draco compression is not used
deny contains msg if {
  not input.asset.extensions.KHR_draco_mesh_compression
  msg := "Asset is not using Draco compression. All assets should use Draco compression to reduce file size."
}