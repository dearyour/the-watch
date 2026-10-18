import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type Finish = "silver" | "black" | "gold" | "rose";
type Callbacks = {
  onReady: () => void;
  onProgress: (progress: number) => void;
  onError: (message: string) => void;
};
type Surface = {
  material: THREE.MeshStandardMaterial;
  color: THREE.Color;
  roughness: number;
  metalness: number;
  exterior: boolean;
  brushed: boolean;
};
type Part = {
  object: THREE.Object3D;
  name: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  children: Array<{ object: THREE.Object3D; z: number }>;
};
type Pose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  distance: number;
  explosion: number;
  open: number;
  dial: number;
  alpha: number;
  particles: number;
  strap: number;
};
type Frame = Partial<Pose> & { at: number };

const TAU = Math.PI * 2;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const ramp = (n: number, start: number, end: number) =>
  ease(clamp((n - start) / (end - start)));
const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

const BASE_POSE: Pose = {
  x: 0,
  y: 0,
  z: 0,
  rx: -0.06,
  ry: 0.08,
  rz: 0,
  distance: 9.2,
  explosion: 0,
  open: 0,
  dial: 0,
  alpha: 1,
  particles: 0,
  strap: 0,
};

// Each chapter keeps the same object in the scene, including transitions backwards.
const FRAMES: Frame[] = [
  { at: 0, ...BASE_POSE },
  { at: 0.7, rx: -0.47, ry: 0.64, distance: 9.2 },
  { at: 1.45, rx: 0, ry: TAU, rz: 0, distance: 8.2 },
  { at: 2.35, rx: 0, ry: Math.PI * 1.55, distance: 7.5 },
  { at: 3.05, ry: Math.PI * 1.55, distance: 7.8 },
  { at: 3.42, explosion: 1, open: 1, distance: 7.1 },
  { at: 3.86, explosion: 1, open: 1, distance: 7.1 },
  {
    at: 4.25,
    explosion: 0,
    open: 1,
    dial: 1,
    rx: -0.25,
    ry: TAU - 0.35,
    distance: 5.7,
    particles: 1,
  },
  { at: 4.8, rx: -0.6, ry: TAU, distance: 5.4, particles: 1 },
  {
    at: 5.35,
    open: 0,
    dial: 0,
    rx: -0.8,
    ry: TAU + 0.18,
    y: -0.4,
    distance: 6,
    particles: 0,
  },
  { at: 6.25, x: 0.58, y: -0.3, rx: -0.8, ry: TAU, rz: -0.12, distance: 5.3 },
  {
    at: 7.25,
    x: -0.55,
    y: -0.4,
    rx: -0.35,
    ry: Math.PI,
    rz: -0.08,
    distance: 6.2,
  },
  { at: 8.22, x: 0.2, y: -0.42, rx: -0.09, ry: 0, rz: 0, distance: 5.6 },
  {
    at: 8.82,
    x: 0,
    y: -0.9,
    z: 0.5,
    rx: -1.15,
    ry: 0,
    rz: -Math.PI / 2,
    distance: 4.8,
  },
  { at: 9.05, alpha: 0, strap: 1, distance: 7.2 },
  { at: 9.74, strap: 1, alpha: 0 },
  {
    at: 10.02,
    strap: 0,
    alpha: 0,
    x: 0,
    y: 0,
    z: 0,
    rx: -0.4,
    ry: 0.6,
    rz: 0,
    distance: 10,
  },
  { at: 10.85, alpha: 0 },
  { at: 11, alpha: 1, rx: -0.4, ry: 0.65, distance: 9.3 },
  { at: 11.78, rx: -0.1, ry: 0.08, distance: 8.4 },
  { at: 12, alpha: 0, rx: 0, ry: 0, distance: 10 },
  { at: 12.85, alpha: 0 },
  { at: 13, alpha: 1, rx: -0.06, ry: 0.08, rz: 0, distance: 9.2, y: 0.05 },
  { at: 14, alpha: 1, rx: 0, ry: 0, distance: 9.5 },
];

const POSES = FRAMES.map((frame, i, all) => {
  const pose = { ...BASE_POSE };
  for (let k = 0; k <= i; k++) Object.assign(pose, all[k]);
  return { at: frame.at, pose };
});

const FINISHES: Record<
  Finish,
  { brushed: string; polished: string; roughness: number }
> = {
  silver: { brushed: "#ffffff", polished: "#dfdfdf", roughness: 0.3 },
  black: { brushed: "#525258", polished: "#6e6e75", roughness: 0.7 },
  gold: { brushed: "#ffebc6", polished: "#ffebc6", roughness: 0.21 },
  rose: { brushed: "#fde2d2", polished: "#fdd8c3", roughness: 0.2 },
};

export class WatchScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(25, 1, 0.1, 40);
  private readonly watchPivot = new THREE.Group();
  private readonly bracelet = new THREE.Group();
  private readonly particleGroup = new THREE.Group();
  private readonly target = new THREE.Vector3();
  private readonly currentTarget = new THREE.Vector3();
  private readonly pointer = new THREE.Vector2();
  private readonly currentPointer = new THREE.Vector2();
  private readonly vector = new THREE.Vector3();
  private readonly inspectionBounds = new THREE.Box3();
  private readonly pose: Pose = { ...BASE_POSE };
  private readonly surfaces: Surface[] = [];
  private readonly parts: Part[] = [];
  private readonly rotations: Array<{
    object: THREE.Object3D;
    seconds: number;
    offset: number;
  }> = [];
  private readonly screws: Array<{
    object: THREE.Object3D;
    position: THREE.Vector3;
    rotation: THREE.Euler;
  }> = [];
  private readonly ownedTextures = new Set<THREE.Texture>();
  private readonly environmentTargets: THREE.WebGLRenderTarget[] = [];
  private watch: THREE.Object3D | null = null;
  private strap: THREE.Object3D | null = null;
  private glass: THREE.Object3D | null = null;
  private movement: THREE.Object3D | null = null;
  private hairSpring: THREE.Object3D | null = null;
  private balanceWheel: THREE.Object3D | null = null;
  private rotor: THREE.Object3D | null = null;
  private strapZ = 0;
  private glassZ = 0;
  private movementZ = 0;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private linkMesh: THREE.InstancedMesh | null = null;
  private centerMesh: THREE.InstancedMesh | null = null;
  private readonly dummy = new THREE.Object3D();
  private finish: Finish = "silver";
  private inspection: string | null = null;
  private currentInspection = 0;
  private explosionOverride: boolean | null = null;
  private activeSection = 0;
  private currentExplosion = 0;
  private currentOpening = 0;
  private currentFullExpansion = 0;
  private scroll = 0;
  private currentScroll = 0;
  private paused = false;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private disposed = false;
  private contextLost = false;
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private loadedAt = 0;
  private ready = false;
  private visible = true;
  private observer: IntersectionObserver | null = null;
  private readonly motionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: Callbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.scene.add(this.watchPivot, this.bracelet, this.particleGroup);
    this.scene.add(new THREE.HemisphereLight(0xdbe5ff, 0x101016, 0.75));
    const key = new THREE.DirectionalLight(0xeef1ff, 2.1);
    key.position.set(-3, 4, 5);
    const edge = new THREE.DirectionalLight(0xffffff, 1.6);
    edge.position.set(4, -1, -2);
    this.scene.add(key, edge);
    this.camera.position.z = 10;
    this.resize();
    this.createParticles();
    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.motionQuery.addEventListener("change", this.onMotionChange);
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.restart();
      });
      this.observer.observe(canvas);
    }
    void this.load();
    this.restart();
  }

  setScroll(section: number, progress: number): void {
    if (section !== this.activeSection) {
      this.explosionOverride = null;
      this.activeSection = section;
    }
    const reducedViewpoints = [
      0, 1.45, 2.35, 3.6, 4.6, 5.5, 6.25, 7.25, 8.55, 9.5, 10, 11.6, 12, 13.4,
    ];
    this.scroll = this.reducedMotion
      ? reducedViewpoints[Math.max(0, Math.min(13, Math.floor(section)))]
      : clamp(section + clamp(progress), 0, 14);
    if (!this.ready || this.reducedMotion) this.currentScroll = this.scroll;
    this.restart();
  }

  setFinish(finish: Finish): void {
    this.finish = finish;
    const palette = FINISHES[finish];
    for (const surface of this.surfaces) {
      if (!surface.exterior) continue;
      surface.color.set(surface.brushed ? palette.brushed : palette.polished);
      surface.roughness = surface.brushed
        ? palette.roughness
        : finish === "black"
          ? 0.12
          : 0.09;
      surface.metalness = finish === "black" && surface.brushed ? 0.72 : 1;
    }
    this.restart();
  }

  setExploded(value: boolean): void {
    this.explosionOverride = value;
    this.inspection = null;
    this.restart();
  }

  setInspection(part: string | null): void {
    const aliases: Record<string, string> = {
      rotor: "weight",
      "oscillating-weight": "weight",
      "balance-wheel": "tourbillon",
      movement: "mainplate",
      face: "dial",
      barrel: "barrel",
    };
    this.inspection = part ? aliases[part] || part : null;
    this.restart();
  }

  setPaused(value: boolean): void {
    this.paused = value;
    // An explicit Play action may opt into motion after the system default.
    this.reducedMotion = this.motionQuery.matches && value;
    this.restart();
  }

  setPointer(x: number, y: number): void {
    this.pointer.set(clamp(x, -1, 1), clamp(y, -1, 1));
  }

  resize(): void {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, width < 720 ? 1.5 : 1.8),
    );
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = 25 / Math.min(1, this.camera.aspect * 1.5);
    this.camera.updateProjectionMatrix();
    this.restart();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.onContextRestored,
    );
    this.motionQuery.removeEventListener("change", this.onMotionChange);
    this.observer?.disconnect();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points))
        return;
      geometries.add(object.geometry);
      const list = Array.isArray(object.material)
        ? object.material
        : [object.material];
      list.forEach((material) => {
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) this.ownedTextures.add(value);
        });
      });
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.ownedTextures.forEach((texture) => texture.dispose());
    this.environmentTargets.forEach((target) => target.dispose());
    this.renderer.dispose();
  }

  private readonly onVisibility = () => this.restart();
  private readonly onMotionChange = (event: MediaQueryListEvent) => {
    this.reducedMotion = event.matches;
    this.restart();
  };
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.callbacks.onError(
      "The 3D view is temporarily unavailable. Reload to try again.",
    );
  };
  private readonly onContextRestored = () => {
    this.contextLost = false;
    this.restart();
  };

  private async load(): Promise<void> {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const fallback = pmrem.fromScene(room, 0.04);
    this.environmentTargets.push(fallback);
    this.scene.environment = fallback.texture;
    room.dispose();
    const environment = new EXRLoader()
      .loadAsync(asset("envmap.exr"))
      .then((texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const map = pmrem.fromEquirectangular(texture);
        this.environmentTargets.push(map);
        this.scene.environment = map.texture;
        this.scene.environmentIntensity = 1;
        texture.dispose();
      })
      .catch(() => {
        /* Studio lighting remains available while offline. */
      });

    try {
      const gltf = await new GLTFLoader().loadAsync(
        asset("watch.glb"),
        (event) => {
          if (!this.disposed)
            this.callbacks.onProgress(
              event.total ? clamp(event.loaded / event.total) * 0.9 : 0.35,
            );
        },
      );
      if (this.disposed) {
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        });
        return;
      }
      this.watch = gltf.scene.getObjectByName("theWatch") || gltf.scene;
      this.watch.scale.setScalar(30);
      this.configureMaterials(gltf.scene);
      this.watchPivot.add(this.watch);
      this.collectParts();
      this.createBracelet(gltf.scene);
      this.setFinish(this.finish);
      await environment;
      if (this.disposed) return;
      this.loadedAt = performance.now();
      this.currentScroll = this.scroll;
      this.ready = true;
      this.callbacks.onProgress(1);
      this.update(1 / 60, performance.now());
      this.renderer.render(this.scene, this.camera);
      this.callbacks.onReady();
    } catch (error) {
      if (!this.disposed)
        this.callbacks.onError(
          error instanceof Error
            ? error.message
            : "The watch could not be loaded.",
        );
    } finally {
      await environment;
      pmrem.dispose();
    }
  }

  private configureMaterials(root: THREE.Object3D): void {
    const visited = new Set<THREE.Material>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.frustumCulled = false;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        if (
          !(material instanceof THREE.MeshStandardMaterial) ||
          visited.has(material)
        )
          continue;
        visited.add(material);
        const name = material.name;
        const exterior = /-ext|single-metal/.test(name);
        const brushed = /brushed/.test(name);
        if (/metal|dial/.test(name)) {
          material.metalness = 1;
          material.roughness = brushed
            ? 0.3
            : name === "metal-geneva"
              ? 0.17
              : 0.11;
          material.color.set(
            name === "dial" ? "#80848b" : brushed ? "#ededed" : "#d5d5d5",
          );
          material.envMapIntensity = name === "dial" ? 1.2 : 1.05;
          if (material.normalMap)
            material.normalScale.set(
              brushed ? 0.65 : 0.25,
              brushed ? -0.65 : -0.25,
            );
        }
        if (name === "dial") this.configureDial(material);
        if (/^white/.test(name)) {
          material.color.set("#ffffff");
          material.roughness = 0.42;
          material.metalness = 0.45;
        }
        if (name === "-glass") {
          material.color.set("#e3edf7");
          material.transparent = true;
          material.opacity = 0.11;
          material.roughness = 0.035;
          material.metalness = 0.95;
          material.depthWrite = false;
          material.alphaTest = 0;
          if (material instanceof THREE.MeshPhysicalMaterial)
            material.transmission = 0;
          material.envMapIntensity = 0.9;
        }
        if (name === "-ruby") {
          material.color.set("#713e72");
          material.metalness = 0.9;
          material.roughness = 0.13;
          material.envMapIntensity = 1.7;
          if (material instanceof THREE.MeshPhysicalMaterial)
            material.transmission = 0;
        }
        if (name === "-numbers-nekst") {
          material.color.set("#ffffff");
          material.metalness = 0.05;
          material.roughness = 0.7;
          material.normalScale.set(1, -1);
        }
        if (["fs60p", "automaticChronograph"].includes(name)) {
          material.roughness = 0.45;
          material.metalness = 0.3;
          material.alphaTest = 0.05;
          material.depthWrite = false;
        }
        if (name === "shadow-planes") {
          material.depthWrite = false;
          material.opacity = 0.7;
        }
        material.needsUpdate = true;
        this.surfaces.push({
          material,
          color: material.color.clone(),
          roughness: material.roughness,
          metalness: material.metalness,
          exterior,
          brushed,
        });
      }
    });
  }

  private configureDial(material: THREE.MeshStandardMaterial): void {
    material.color.set("#353940");
    material.roughness = 0.2;
    material.envMapIntensity = 0.88;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec2 vDialPosition;
          varying vec3 vDialTangent;
        `,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vDialPosition = position.xy;
          vDialTangent = normalMatrix * vec3(-position.y, position.x, 0.0);
        `,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec2 vDialPosition;
          varying vec3 vDialTangent;
        `,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float dialAngle = atan(vDialPosition.y, vDialPosition.x);
          float dialRadius = length(vDialPosition);
          float dialBrushing = 0.5 + 0.5 * sin(dialAngle * 680.0 + sin(dialAngle * 93.0) * 1.4);
          diffuseColor.rgb *= 0.76 + 0.24 * dialBrushing;
        `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          vec3 dialTangent = normalize(vDialTangent + vec3(0.00001));
          float dialGroove = sin(dialAngle * 680.0 + dialRadius * 1800.0) * 0.11;
          dialGroove += sin(dialAngle * 1439.0) * 0.035;
          normal = normalize(normal + dialTangent * dialGroove);
        `,
        );
    };
    material.customProgramCacheKey = () => "watch-radial-metal-v1";
  }

  private collectParts(): void {
    if (!this.watch) return;
    this.strap = this.watch.getObjectByName("empty-strap") || null;
    this.glass = this.watch.getObjectByName("crystal-front") || null;
    this.movement = this.watch.getObjectByName("xploded") || null;
    this.strapZ = this.strap?.position.z || 0;
    this.glassZ = this.glass?.position.z || 0;
    this.movementZ = this.movement?.position.z || 0;
    this.hairSpring =
      this.watch.getObjectByName("tourbillon-xploded-3") || null;
    this.balanceWheel =
      this.watch.getObjectByName("tourbillon-xploded-4") || null;
    this.rotor = this.watch.getObjectByName("weight-xploded-2") || null;
    this.watch.traverse((object) => {
      const period = Number(object.userData.rotationTick);
      if (Number.isFinite(period) && period !== 0) {
        const offset =
          object.name === "dial-xploded-3"
            ? -Math.PI / 3
            : object.name === "dial-xploded-4"
              ? Math.PI / 3
              : object.rotation.z;
        this.rotations.push({ object, seconds: period, offset });
      }
      if (/^screw/.test(object.name)) {
        this.screws.push({
          object,
          position: object.position.clone(),
          rotation: object.rotation.clone(),
        });
      }
      if (!/^xploded-\d+$/.test(object.name)) return;
      const children: Part["children"] = [];
      object.traverse((child) => {
        if (child !== object && child.name.includes("-xploded-"))
          children.push({ object: child, z: child.position.z });
      });
      children.sort(
        (a, b) =>
          Number(a.object.name.split("-").pop()) -
          Number(b.object.name.split("-").pop()),
      );
      this.parts.push({
        object,
        name: String(object.userData.hover || object.name),
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        children,
      });
    });
    this.parts.sort(
      (a, b) =>
        Number(a.object.name.split("-").pop()) -
        Number(b.object.name.split("-").pop()),
    );
  }

  private createBracelet(root: THREE.Object3D): void {
    const outer = root.getObjectByName("single-link");
    const center = root.getObjectByName("single-central-link");
    if (!(outer instanceof THREE.Mesh) || !(center instanceof THREE.Mesh))
      return;
    this.linkMesh = new THREE.InstancedMesh(outer.geometry, outer.material, 20);
    this.centerMesh = new THREE.InstancedMesh(
      center.geometry,
      center.material,
      20,
    );
    this.linkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.centerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.linkMesh.frustumCulled = this.centerMesh.frustumCulled = false;
    this.bracelet.add(this.linkMesh, this.centerMesh);
    this.bracelet.scale.setScalar(40);
    this.bracelet.visible = false;
  }

  private createParticles(): void {
    const count = window.innerWidth < 720 ? 8000 : 16000;
    const filaments = 6;
    const samples = Math.ceil(count / filaments);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const random = Math.sin((i + 1) * 12.9898) * 43758.5453;
      const seed = random - Math.floor(random);
      const t = (i % samples) / samples;
      positions.set([t, (seed - 0.5) * 2, Math.floor(i / samples)], i * 3);
      seeds[i] = seed;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    this.particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.8) },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vSeed;
        varying float vEnergy;
        void main() {
          vSeed = aSeed;
          float filament = position.z;
          float t = position.x * 6.2831853 + uTime * (0.13 + filament * 0.007);
          float angle = t + filament * 0.84;
          float radius = 1.23 + 0.22 * sin(t * 3.0 + filament * 0.67 + uTime * 0.08);
          float width = 0.035 + 0.06 * pow(sin(t * 2.0 + filament), 2.0);
          radius += position.y * width;
          vec3 p = vec3(
            cos(angle) * radius * 1.56 + 0.26 * sin(t * 2.0 + filament),
            sin(angle) * radius * 0.83 + 0.25 * sin(t * 3.0 + filament * 0.5),
            sin(t * 2.0 + filament * 0.72) * 0.62
          );
          float tilt = filament * 0.17 - 0.4 + sin(uTime * 0.07) * 0.12;
          p.xy = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p.xy;
          p.z += position.y * 0.045;
          vEnergy = 0.48 + 0.52 * pow(0.5 + 0.5 * sin(t * 2.0 - uTime * 0.6 + filament), 2.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.25 + vSeed * 1.6) * uPixelRatio * (5.0 / -mv.z);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vSeed;
        varying float vEnergy;
        void main() {
          float d = length(gl_PointCoord - .5);
          float alpha = exp(-d * d * 16.0) * uOpacity * vEnergy * (0.38 + 0.62 * vSeed);
          alpha *= 1.0 - smoothstep(0.38, 0.5, d);
          vec3 color = mix(vec3(.38, .47, .66), vec3(.92, .95, 1.), vSeed);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    const points = new THREE.Points(geometry, this.particleMaterial);
    points.frustumCulled = false;
    this.particleGroup.add(points);
    this.particleGroup.position.z = -1;
  }

  private restart(): void {
    if (this.disposed || this.contextLost || document.hidden || !this.visible) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastTime = 0;
      return;
    }
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number) => {
    this.frame = 0;
    if (this.disposed || this.contextLost || document.hidden || !this.visible)
      return;
    const dt = Math.min(
      this.lastTime ? (now - this.lastTime) / 1000 : 1 / 60,
      0.05,
    );
    this.lastTime = now;
    if (!this.paused && !this.reducedMotion) this.elapsed += dt;
    this.update(dt, now);
    if (this.ready) this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };

  private samplePose(progress: number): Pose {
    let left = POSES[0];
    let right = POSES[POSES.length - 1];
    for (let i = 1; i < POSES.length; i++) {
      if (POSES[i].at >= progress) {
        right = POSES[i];
        left = POSES[i - 1];
        break;
      }
    }
    const t = ease(clamp((progress - left.at) / (right.at - left.at)));
    const pose = { ...BASE_POSE };
    for (const key of Object.keys(BASE_POSE) as Array<keyof Pose>)
      pose[key] = mix(left.pose[key], right.pose[key], t);
    return pose;
  }

  private update(dt: number, now: number): void {
    if (!this.watch) return;
    const follow = this.reducedMotion ? 1 : 1 - Math.exp(-7 * dt);
    this.currentScroll = mix(this.currentScroll, this.scroll, follow);
    Object.assign(this.pose, this.samplePose(this.currentScroll));
    const p = this.pose;
    p.particles =
      ramp(this.currentScroll, 3.86, 4.25) *
      (1 - ramp(this.currentScroll, 5.68, 6));
    const chapter = Math.floor(this.currentScroll);
    const mobile = this.camera.aspect < 0.8;
    const inspection = this.parts.find((part) => part.name === this.inspection);
    this.currentInspection = mix(
      this.currentInspection,
      inspection ? 1 : 0,
      follow,
    );
    const explosionTarget =
      this.explosionOverride === null
        ? p.explosion
        : Number(this.explosionOverride);
    const openingTarget =
      this.explosionOverride === null ? p.open : Number(this.explosionOverride);
    this.currentExplosion = mix(this.currentExplosion, explosionTarget, follow);
    this.currentOpening = mix(this.currentOpening, openingTarget, follow);
    this.currentFullExpansion = mix(
      this.currentFullExpansion,
      this.explosionOverride === true ? 1 : 0,
      follow,
    );
    const spread = Math.max(this.currentExplosion, this.currentInspection);
    const opening = Math.max(this.currentOpening, this.currentInspection);
    const entry =
      this.reducedMotion || this.currentScroll > 0.3
        ? 1
        : ramp((now - this.loadedAt) / 1000, 0, 1.8);
    this.currentPointer.lerp(
      this.pointer,
      this.paused || this.reducedMotion ? 0 : Math.min(1, dt * 3),
    );
    const parallax = this.paused || this.reducedMotion ? 0 : 0.055;
    this.watchPivot.position.set(
      p.x * (mobile ? 0.4 : 1),
      p.y,
      p.z - (1 - entry) * 3,
    );
    this.watchPivot.rotation.set(
      p.rx + this.currentPointer.y * parallax,
      p.ry + this.currentPointer.x * parallax,
      p.rz,
    );
    this.watchPivot.visible = p.alpha > 0.005;
    this.canvas.style.opacity = String(Math.max(p.alpha, p.strap, p.particles));
    if (this.strap) {
      this.strap.position.z = this.strapZ - opening * 0.12;
      this.strap.visible = opening < 0.97;
    }
    if (this.glass) {
      this.glass.position.z = this.glassZ + opening * 0.12;
      this.glass.visible = opening < 0.9;
    }
    if (this.movement)
      this.movement.position.z = mix(this.movementZ, 0, opening);
    const separation =
      0.013 * (1 + this.currentFullExpansion * 0.65) * (mobile ? 1.1 : 1);
    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i];
      const centered = i - (this.parts.length - 1) / 2;
      part.object.position.copy(part.position);
      part.object.rotation.copy(part.rotation);
      const selected = inspection === part;
      let offset = centered * separation * spread;
      if (inspection && !selected)
        offset +=
          Math.sign(centered - (this.parts.indexOf(inspection) - 2.5)) *
          0.022 *
          this.currentInspection;
      part.object.position.z += offset;
      part.object.rotation.y += spread * 0.23;
      if (selected)
        part.object.rotation.y +=
          Math.sin(this.elapsed * 0.25) * 0.12 * this.currentInspection;
      part.object.visible = !(
        part.name === "dial" &&
        p.dial > 0.98 &&
        !inspection
      );
      if (part.name === "dial")
        part.object.position.z += p.dial * 0.18 * (1 - this.currentInspection);
      for (let n = 0; n < part.children.length; n++) {
        const child = part.children[n];
        const amount =
          (n - (part.children.length - 1) / 2) /
          Math.max(1, part.children.length);
        child.object.position.z =
          child.z +
          amount *
            (0.022 * this.currentFullExpansion +
              (selected ? 0.035 * this.currentInspection : 0));
      }
    }
    this.screws.forEach((screw, i) => {
      screw.object.position.copy(screw.position);
      screw.object.position.z += opening * (0.12 + i * 0.003);
      screw.object.rotation.copy(screw.rotation);
      screw.object.rotation.y -= opening * TAU;
      screw.object.visible = opening < 0.98;
    });
    const mechanicalSpeed = mix(1, 8, this.currentFullExpansion);
    for (const part of this.rotations)
      part.object.rotation.z =
        part.offset - ((this.elapsed * mechanicalSpeed) / part.seconds) * TAU;
    if (this.hairSpring) {
      const pulse = 2 + Math.sin(this.elapsed * 20) * 0.25;
      this.hairSpring.scale.set(pulse, pulse, this.hairSpring.scale.z);
      this.hairSpring.rotation.z = Math.sin(this.elapsed * 20) * 0.7;
    }
    if (this.balanceWheel)
      this.balanceWheel.rotation.z = Math.sin(this.elapsed * 20) * 1.7;
    if (this.rotor)
      this.rotor.rotation.z = -0.3 + Math.sin(this.elapsed * 0.45) * 0.65;
    const surfaceFollow = this.reducedMotion ? 1 : 1 - Math.exp(-5 * dt);
    for (const surface of this.surfaces) {
      surface.material.color.lerp(surface.color, surfaceFollow);
      surface.material.roughness = mix(
        surface.material.roughness,
        surface.roughness,
        surfaceFollow,
      );
      surface.material.metalness = mix(
        surface.material.metalness,
        surface.metalness,
        surfaceFollow,
      );
      if (surface.material.name === "shadow-planes")
        surface.material.opacity = 0.7 * (1 - opening);
      surface.material.aoMapIntensity = mix(1, 0.25, spread);
    }
    this.scene.environmentRotation.set(
      0.05 * Math.sin(this.elapsed * 0.08),
      -0.5 + this.currentScroll * 0.08,
      0,
    );
    this.target.set(0, 0, 0);
    this.watchPivot.updateMatrixWorld(true);
    if (inspection) {
      this.inspectionBounds
        .setFromObject(inspection.object)
        .getCenter(this.vector);
      this.target.copy(this.vector);
      // Reserve a separate area for the selected part and its description.
      this.target.x += mobile ? 0.3 : 0.5;
      this.target.y -= mobile ? 0.65 : 0;
      this.target.multiplyScalar(this.currentInspection);
    }
    this.currentTarget.lerp(this.target, follow);
    const distance =
      p.distance * mix(1, mobile ? 0.76 : 0.62, this.currentInspection);
    this.camera.position.set(
      this.currentTarget.x,
      this.currentTarget.y,
      distance + this.currentTarget.z,
    );
    this.camera.lookAt(this.currentTarget);
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = this.elapsed;
      this.particleMaterial.uniforms.uOpacity.value = p.particles * 0.8;
      this.particleGroup.visible = p.particles > 0.001;
    }
    this.bracelet.visible = p.strap > 0.01;
    if (this.bracelet.visible && this.linkMesh && this.centerMesh) {
      const local = clamp(this.currentScroll - 9);
      const assembly = ramp(local, 0, 0.35) * (1 - ramp(local, 0.65, 1));
      for (let i = 0; i < 20; i++) {
        const x = (i - 9.5) * 0.0058;
        const twist = (i - 9.5) * 0.12 * (1 - assembly);
        this.dummy.position.set(
          x * mix(4.5, 1, assembly),
          -0.003,
          mix(0.045, 0, assembly),
        );
        this.dummy.rotation.set(twist, 0.05 * this.currentPointer.x, 0);
        this.dummy.updateMatrix();
        this.linkMesh.setMatrixAt(i, this.dummy.matrix);
        this.dummy.position.x += 0.0029;
        this.dummy.updateMatrix();
        this.centerMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.linkMesh.instanceMatrix.needsUpdate = true;
      this.centerMesh.instanceMatrix.needsUpdate = true;
      this.bracelet.rotation.set(-0.2, 0, mobile ? -0.28 : -0.08);
    }
    if (chapter === 10 || chapter === 12) this.renderer.setClearAlpha(0);
  }
}
