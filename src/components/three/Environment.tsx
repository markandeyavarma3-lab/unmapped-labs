"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { frame } from "./frame-state";
import { COAST_X } from "./city-layout";
import { sky as light, updateSky } from "./time-of-day";
import type { Tier } from "./Scene";

/**
 * The light of the journey (see time-of-day.ts): morning on the hills, day
 * in the city, golden hour, then sunset. Soft shadows follow the camera; the
 * sky, haze and sea pick up the light of the moment.
 */

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // always at the far plane
  }
`;
const skyFragment = /* glsl */ `
  uniform vec3 uSun; uniform vec3 uHorizon; uniform vec3 uMid; uniform vec3 uZenith; uniform vec3 uGlow;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
    col = mix(col, uZenith, smoothstep(0.15, 0.75, h));
    float s = max(dot(d, uSun), 0.0);
    col += uGlow * (pow(s, 6.0) * 0.45 + pow(s, 64.0) * 0.8);
    col = mix(col, uHorizon, smoothstep(0.02, -0.12, h)); // below the horizon: haze
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const seaPatch = (shader: THREE.WebGLProgramParametersWithUniforms, uniforms: { uTime: THREE.IUniform }) => {
  shader.uniforms.uTime = uniforms.uTime;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vSeaWorld;")
    .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvSeaWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vSeaWorld; uniform float uTime;
      float seaWave(vec2 p) {
        return sin(p.x * 1.7 + uTime * 0.9) * 0.5 + sin(p.y * 2.3 - uTime * 1.1 + p.x * 0.6) * 0.35 + sin((p.x + p.y) * 4.1 + uTime * 1.7) * 0.15;
      }`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float off = vSeaWorld.x - ${COAST_X.toFixed(2)};
      vec3 shallow = vec3(0.32, 0.78, 0.76);
      vec3 deep = vec3(0.07, 0.36, 0.55);
      diffuseColor.rgb = mix(shallow, deep, smoothstep(0.0, 9.0, off));
      float foam = (1.0 - smoothstep(0.0, 0.35 + 0.12 * sin(vSeaWorld.z * 1.3 + uTime * 1.4), off)) * 0.9;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.98, 0.92), foam);`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      {
        vec2 p = vSeaWorld.xz;
        float e = 0.08;
        float hx = seaWave(p + vec2(e, 0.0)) - seaWave(p - vec2(e, 0.0));
        float hz = seaWave(p + vec2(0.0, e)) - seaWave(p - vec2(0.0, e));
        vec3 wn = normalize(vec3(-hx * 0.9, 1.0, -hz * 0.9));
        normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
      }`,
    );
};

export function Environment({ tier }: { tier: Tier }) {
  const get = useThree((s) => s.get);

  const built = useMemo(() => {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 16),
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uSun: { value: light.sun },
          uHorizon: { value: light.horizon },
          uMid: { value: light.mid },
          uZenith: { value: light.zenith },
          uGlow: { value: light.glow },
        },
      }),
    );
    sky.frustumCulled = false;
    sky.renderOrder = -10;

    const sun = new THREE.DirectionalLight("#ffc98a", 3.1);
    sun.castShadow = true;
    const size = tier === "high" ? 2048 : 1024;
    sun.shadow.mapSize.set(size, size);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 2.5;
    const hemi = new THREE.HemisphereLight("#ffe9cc", "#7d6a55", 1.15);
    const fill = new THREE.DirectionalLight("#9fc4ff", 0.35); // cool skylight from the other side
    fill.position.set(0.6, 0.5, -0.6);

    const seaUniforms = { uTime: { value: 0 } };
    const seaMat = new THREE.MeshStandardMaterial({ color: "#2f8fa0", roughness: 0.22, metalness: 0.05 });
    seaMat.onBeforeCompile = (s) => seaPatch(s, seaUniforms);
    const seaGeo = new THREE.PlaneGeometry(400, 600);
    seaGeo.rotateX(-Math.PI / 2);
    seaGeo.translate(COAST_X + 200, 0.015, 0);
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.receiveShadow = true;

    return { sky, sun, hemi, fill, sea, seaUniforms };
  }, [tier]);

  useEffect(() => {
    const { scene } = get();
    scene.fog = new THREE.Fog(light.haze.clone(), 40, 160);
    scene.add(built.sun.target);
    return () => {
      scene.fog = null;
      scene.remove(built.sun.target);
      built.sky.geometry.dispose();
      (built.sky.material as THREE.Material).dispose();
      built.sea.geometry.dispose();
      (built.sea.material as THREE.Material).dispose();
      built.sun.shadow.map?.dispose();
    };
  }, [built, get]);

  const ref = useRef(built);
  useEffect(() => {
    ref.current = built;
  }, [built]);
  const texel = useRef(new THREE.Vector3());

  useFrame((state) => {
    const { sun, sky, hemi, seaUniforms } = ref.current;
    updateSky(frame.chapter);
    sun.color.copy(light.sunColor);
    sun.intensity = light.sunIntensity;
    hemi.color.copy(light.hemiSky);
    hemi.groundColor.copy(light.hemiGround);
    hemi.intensity = light.hemiIntensity;
    sky.position.copy(state.camera.position);
    seaUniforms.uTime.value = state.clock.elapsedTime;

    // Shadows cover what the camera is looking at: wider when it's further away.
    const extent = THREE.MathUtils.clamp(frame.camDist * 0.85, 16, 75);
    const cam = sun.shadow.camera;
    if (cam.right !== extent) {
      cam.left = -extent;
      cam.right = extent;
      cam.top = extent;
      cam.bottom = -extent;
      cam.near = 1;
      cam.far = 220;
      cam.updateProjectionMatrix();
    }
    // Snap the target to whole shadow texels so edges don't shimmer as the camera glides.
    const step = (extent * 2) / sun.shadow.mapSize.x;
    const t = texel.current.copy(frame.target);
    t.x = Math.round(t.x / step) * step;
    t.z = Math.round(t.z / step) * step;
    t.y = 0;
    sun.target.position.copy(t);
    sun.position.copy(t).addScaledVector(light.sun, 100);
    sun.target.updateMatrixWorld();

    // Haze scales with the view, so the wide shots stay clear and the close-ups get depth.
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(light.haze);
      fog.near = frame.camDist * 1.1 + 6;
      fog.far = frame.camDist * 3.2 + 70;
    }
  });

  return (
    <>
      <primitive object={built.sky} />
      <primitive object={built.sun} />
      <primitive object={built.hemi} />
      <primitive object={built.fill} />
      <primitive object={built.sea} />
    </>
  );
}
