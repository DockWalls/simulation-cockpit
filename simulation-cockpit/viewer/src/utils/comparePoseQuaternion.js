import { Quaternion } from 'three'

export function comparePoseQuaternion(actualPose, expectedPose, tolerance = 0.1) {
  if (!actualPose || !expectedPose) return true

  for (const bone in expectedPose.bones) {
    const expectedQuat = new Quaternion(...expectedPose.bones[bone].quaternion)
    const actualQuat = new Quaternion(...(actualPose.bones?.[bone]?.quaternion || [0, 0, 0, 1]))

    const angle = expectedQuat.angleTo(actualQuat)
    if (angle > tolerance) return false
  }

  return true
}