import * as THREE from "three"

// Shared 4-step toon gradient map so every material in the scene gets the
// same hard, comic-book style light/shadow banding instead of smooth PBR shading.
let cachedGradientMap: THREE.DataTexture | null = null

export function getToonGradientMap(): THREE.DataTexture {
  if (cachedGradientMap) return cachedGradientMap

  const bands = new Uint8Array([40, 110, 190, 255])
  const texture = new THREE.DataTexture(bands, bands.length, 1, THREE.RedFormat)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true

  cachedGradientMap = texture
  return texture
}

export const OUTLINE_COLOR = "#160b14"
