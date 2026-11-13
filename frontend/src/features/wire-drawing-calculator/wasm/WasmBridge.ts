import init, {
  initSync,
  DrawingEngine,
  compute_pass_physics_js,
  evaluate_central_burst_js,
  InitOutput,
} from './pkg/wasm_drawing_engine.js';
import wasmUrl from './pkg/wasm_drawing_engine_bg.wasm?url';

export type DefectRisk = 'Safe' | 'Warning' | 'CriticalBurstRisk';

export interface WasmPassPhysics {
  d_in_mm: number;
  d_out_mm: number;
  area_in_mm2: number;
  area_out_mm2: number;
  area_reduction_percent: number;
  elongation_percent: number;
  true_strain_epsilon: number;
  flow_stress_mpa: number;
  redundant_work_phi: number;
  drawing_stress_sigma_d_mpa: number;
  drawing_force_n: number;
  drawing_power_kw: number;
  delta_param: number;
  central_burst_risk: DefectRisk;
  adiabatic_temp_rise_c: number;
  friction_temp_rise_c: number;
  total_exit_temp_c: number;
}

export interface WasmFeaMeshConfig {
  dInMm: number;
  dOutMm: number;
  approachAngle2AlphaDeg: number;
  bearingLengthLbRatioPct?: number;
  backRelief2BetaDeg?: number;
  frictionMu?: number;
  materialStr?: string;
  wireSpeedMpm?: number;
  numAxialSlices?: number;
  numRadialRings?: number;
  numAngularSegments?: number;
}

export interface WasmFeaMeshResult {
  nodeCount: number;
  stride: number;
  numAxialSlices: number;
  numRadialRings: number;
  numAngularSegments: number;
  maxVonMises: number;
  maxTemperature: number;
  nodes: Float32Array;
}

export interface WasmFeaMeshSample {
  xMm: number;
  vonMisesMpa: number;
  temperatureC: number;
  strain: number;
  zoneId: number;
}

/** Samples the generated axisymmetric field by axial and radial fraction. */
export function sampleWasmFeaMesh(
  mesh: WasmFeaMeshResult,
  axialFraction: number,
  radialFraction = 1
): WasmFeaMeshSample | null {
  const { numAxialSlices, numRadialRings, numAngularSegments, stride, nodes } = mesh;
  if (
    numAxialSlices < 1 ||
    numRadialRings < 1 ||
    numAngularSegments < 1 ||
    stride < 7 ||
    nodes.length < numAxialSlices * numRadialRings * numAngularSegments * stride
  ) {
    return null;
  }

  const axialPosition = Math.max(0, Math.min(1, axialFraction)) * (numAxialSlices - 1);
  const lowerSlice = Math.floor(axialPosition);
  const upperSlice = Math.min(numAxialSlices - 1, lowerSlice + 1);
  const axialBlend = axialPosition - lowerSlice;
  const radialIndex = Math.round(
    Math.max(0, Math.min(1, radialFraction)) * (numRadialRings - 1)
  );

  const lowerBase = (lowerSlice * numRadialRings + radialIndex) * numAngularSegments * stride;
  const upperBase = (upperSlice * numRadialRings + radialIndex) * numAngularSegments * stride;
  const read = (base: number, offset: number) => nodes[base + offset];
  if (lowerSlice === upperSlice) {
    return {
      xMm: read(lowerBase, 0),
      vonMisesMpa: read(lowerBase, 3),
      temperatureC: read(lowerBase, 4),
      strain: read(lowerBase, 5),
      zoneId: read(lowerBase, 6),
    };
  }
  const interpolate = (offset: number) =>
    read(lowerBase, offset) + (read(upperBase, offset) - read(lowerBase, offset)) * axialBlend;
  return {
    xMm: interpolate(0),
    vonMisesMpa: interpolate(3),
    temperatureC: interpolate(4),
    strain: interpolate(5),
    zoneId: Math.round(interpolate(6)),
  };
}

let wasmInitPromise: Promise<InitOutput> | null = null;
let activeEngine: DrawingEngine | null = null;
let initOutputInstance: InitOutput | null = null;

export async function ensureWasmInitialized(): Promise<boolean> {
  if (initOutputInstance && activeEngine) {
    return true;
  }

  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      // In Node.js / Vitest testing environment (including jsdom), read file from disk
      const isNodeOrTest =
        typeof process !== 'undefined' &&
        Boolean(process.env?.VITEST || process.versions?.node);

      if (isNodeOrTest) {
        try {
          const fsMod = 'fs';
          const pathMod = 'path';
          const fs = await import(/* @vite-ignore */ fsMod);
          const path = await import(/* @vite-ignore */ pathMod);
          const wasmPath = path.resolve(__dirname, './pkg/wasm_drawing_engine_bg.wasm');
          const buffer = fs.readFileSync(wasmPath);
          initOutputInstance = initSync({ module: buffer });
          activeEngine = new DrawingEngine();
          return initOutputInstance;
        } catch (readErr) {
          console.warn('[WasmBridge] Failed node/test wasm read:', readErr);
        }
      }

      // In browser Vite environment, fetch via asset URL
      const output = await init({ module_or_path: wasmUrl });
      initOutputInstance = output;
      activeEngine = new DrawingEngine();
      return output;
    })();
  }

  try {
    await wasmInitPromise;
    return true;
  } catch (err) {
    console.warn('[WasmBridge] Failed to initialize WebAssembly engine:', err);
    return false;
  }
}

/**
 * Calculates complete pass mechanics (stress, strain, force, power, thermal rise, central burst risk)
 * using the Rust WebAssembly engine.
 */
export async function computePassPhysicsWasm(
  dInMm: number,
  dOutMm: number,
  approachAngle2AlphaDeg: number,
  frictionMu: number = 0.06,
  materialStr: string = 'copper',
  wireSpeedMpm: number = 600
): Promise<WasmPassPhysics | null> {
  const ready = await ensureWasmInitialized();
  if (!ready) return null;

  try {
    const res = compute_pass_physics_js(
      dInMm,
      dOutMm,
      approachAngle2AlphaDeg,
      frictionMu,
      materialStr,
      wireSpeedMpm
    );
    return res as WasmPassPhysics;
  } catch (err) {
    console.error('[WasmBridge] Error executing compute_pass_physics_js:', err);
    return null;
  }
}

/**
 * Generates an equation-based analytical nodal field for visualization.
 * The output is a stable copy of the generated values, not a validated FEM result.
 */
export async function computeFeaMeshWasm(
  cfg: WasmFeaMeshConfig
): Promise<WasmFeaMeshResult | null> {
  const ready = await ensureWasmInitialized();
  if (!ready || !activeEngine || !initOutputInstance) return null;

  try {
    activeEngine.compute_mesh(
      cfg.dInMm,
      cfg.dOutMm,
      cfg.approachAngle2AlphaDeg,
      cfg.bearingLengthLbRatioPct ?? 35.0,
      cfg.backRelief2BetaDeg ?? 30.0,
      cfg.frictionMu ?? 0.06,
      cfg.materialStr ?? 'copper',
      cfg.wireSpeedMpm ?? 600,
      cfg.numAxialSlices ?? 36,
      cfg.numRadialRings ?? 4,
      cfg.numAngularSegments ?? 16
    );

    const ptr = activeEngine.get_mesh_buffer_ptr();
    const len = activeEngine.get_mesh_buffer_len();
    const nodeCount = activeEngine.get_node_count();
    const stride = activeEngine.get_node_stride();
    const maxVonMises = activeEngine.get_max_von_mises();
    const maxTemperature = activeEngine.get_max_temperature();

    if (ptr === 0 || len === 0) {
      return null;
    }

    // Keep the result stable if the shared Wasm engine generates another mesh.
    const memoryBuffer = initOutputInstance.memory.buffer;
    const nodes = new Float32Array(memoryBuffer, ptr, len).slice();

    return {
      nodeCount,
      stride,
      numAxialSlices: cfg.numAxialSlices ?? 36,
      numRadialRings: cfg.numRadialRings ?? 4,
      numAngularSegments: cfg.numAngularSegments ?? 16,
      maxVonMises,
      maxTemperature,
      nodes,
    };
  } catch (err) {
    console.error('[WasmBridge] Error generating analytical field:', err);
    return null;
  }
}

/**
 * Checks central burst hazard index
 */
export async function checkCentralBurstWasm(
  alphaHalfDeg: number,
  rFraction: number
): Promise<[number, DefectRisk] | null> {
  const ready = await ensureWasmInitialized();
  if (!ready) return null;

  try {
    const res = evaluate_central_burst_js(alphaHalfDeg, rFraction);
    return res as [number, DefectRisk];
  } catch (err) {
    console.error('[WasmBridge] Error evaluating central burst:', err);
    return null;
  }
}
