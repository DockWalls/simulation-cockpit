export function comparePose(actualPose, expectedPose, tolerance = 10) {
  if (!actualPose || !expectedPose) return true

  for (const bone in expectedPose.bones) {
    const expected = expectedPose.bones[bone]
    const actual = actualPose.bones?.[bone]

    if (!actual) return false

    const delta = Math.abs(actual.rotationZ - expected.rotationZ)
    if (delta > tolerance) return false
  }

  return true
}