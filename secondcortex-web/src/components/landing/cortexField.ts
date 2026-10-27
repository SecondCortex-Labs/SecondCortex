export type Vec3 = readonly [number, number, number];

export type View = {
  cy: number;
  sy: number;
  cp: number;
  sp: number;
  dir: Vec3;
};

export const BOUND = 1.5;
const CAMERA_Z = 3;
const LIGHT: Vec3 = [-0.35, 0.65, -0.68];

function ellipsoid(x: number, y: number, z: number, rx: number, ry: number, rz: number) {
  const ax = x / rx;
  const ay = y / ry;
  const az = z / rz;
  const bx = ax / rx;
  const by = ay / ry;
  const bz = az / rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return (k0 * (k0 - 1)) / k1;
}

function smoothMin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function brain(x: number, y: number, z: number) {
  const left = ellipsoid(x, y, z - 0.3, 1.1, 0.8, 0.62);
  const right = ellipsoid(x, y, z + 0.3, 1.1, 0.8, 0.62);
  const cerebellum = ellipsoid(x + 0.72, y + 0.46, z, 0.42, 0.28, 0.58);
  const cortex = smoothMin(smoothMin(left, right, 0.1), cerebellum, 0.18);
  if (cortex > 0.1) {
    return cortex;
  }
  return cortex + SULCUS_DEPTH * (1 - Math.abs(gyroid(x * SULCUS_FREQ, y * SULCUS_FREQ, z * SULCUS_FREQ)) / 1.5);
}

// Grooves follow the gyroid's zero set, which makes the maze of folds a cortex has.
function gyroid(x: number, y: number, z: number) {
  return Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x);
}

const SULCUS_DEPTH = 0.05;
const SULCUS_FREQ = 8;

export function makeView(yaw: number, pitch: number): View {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return { cy, sy, cp, sp, dir: [-sy * cp, sp, cy * cp] };
}

/** Rotates an object space point or normal into view space, where the camera looks down +z. */
export function toView({ cy, sy, cp, sp }: View, [x, y, z]: Vec3): Vec3 {
  const vx = cy * x + sy * z;
  const vz = -sy * x + cy * z;
  return [vx, cp * y - sp * vz, sp * y + cp * vz];
}

/** Shade in [0, 1] of the surface hit by the ray through screen point (u, v), or -1 on a miss. */
export function shadeAt(view: View, u: number, v: number): number {
  const rr = u * u + v * v;
  if (rr >= BOUND * BOUND) {
    return -1;
  }

  const { cy, sy, cp, sp, dir } = view;
  const ry = cp * v - sp * CAMERA_Z;
  const rz = -sp * v - cp * CAMERA_Z;
  const ox = cy * u - sy * rz;
  const oz = sy * u + cy * rz;
  const tEnd = CAMERA_Z + BOUND;
  let t = CAMERA_Z - Math.sqrt(BOUND * BOUND - rr);

  for (let step = 0; step < 48 && t < tEnd; step += 1) {
    const px = ox + dir[0] * t;
    const py = ry + dir[1] * t;
    const pz = oz + dir[2] * t;
    const d = brain(px, py, pz);
    if (d < 0.002) {
      const e = 0.004;
      const a = brain(px + e, py - e, pz - e);
      const b = brain(px - e, py - e, pz + e);
      const g = brain(px - e, py + e, pz - e);
      const k = brain(px + e, py + e, pz + e);
      const nx = a - b - g + k;
      const ny = -a - b + g + k;
      const nz = -a + b - g + k;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const [wx, wy, wz] = toView(view, [nx / len, ny / len, nz / len]);
      const diffuse = Math.max(0, LIGHT[0] * wx + LIGHT[1] * wy + LIGHT[2] * wz);
      const rim = (1 - Math.abs(wz)) ** 3;
      return Math.min(1, 0.08 + 0.75 * diffuse + 0.35 * rim);
    }
    t += d * 0.85;
  }

  return -1;
}
