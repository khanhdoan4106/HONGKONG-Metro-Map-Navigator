// Cảnh 3D sân ga tương lai cho trang đăng nhập (Three.js r147, nạp qua <script> nên dùng THREE toàn cục).
//
// Bố cục cảnh (nhìn từ trên xuống, trục z chạy dọc ga, camera đứng trên sân ga nhìn về -z):
//
//   x: -3.5 ── tường ── 0 ── đường ray / tàu ── 2.2 ── vạch sân ga ── sân ga ── 16
//
// Vòng lặp mỗi chuyến: tàu vào ga → dừng, mở cửa → rời ga → đổi sang ga tiếp theo.

const T = window.THREE;

const LOOP = 15;                // giây cho một chuyến
const ARRIVE_END = 5;
const DOORS_OPEN = 5.7;
const DOORS_CLOSE = 9;
const DEPART_START = 9.6;
const DEPART_END = 14;
const STOP_Z = -13;             // vị trí mũi tàu khi dừng

const CAR_LEN = 24;
const CAR_GAP = 0.7;
const CARS = 3;
const TRAIN_W = 3.1;
const TRAIN_H = 3.2;

const easeOut = t => 1 - (1 - t) ** 3;
const easeIn = t => t ** 3;
const clamp01 = t => Math.min(1, Math.max(0, t));

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/** Ảnh biển tên ga điện tử vẽ bằng canvas 2D. */
function drawSignTexture(ctx, stop) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070b12';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = stop.color;
  ctx.fillRect(0, 0, 18, h);
  ctx.fillRect(0, h - 10, w, 10);

  ctx.fillStyle = '#f4f8fb';
  ctx.textBaseline = 'middle';
  ctx.font = '700 120px "Noto Sans TC", "Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText(stop.zh, 60, h * 0.45);

  const zhWidth = ctx.measureText(stop.zh).width;
  ctx.font = '600 58px "Chakra Petch", "Be Vietnam Pro", sans-serif';
  ctx.fillText(stop.en, 60 + zhWidth + 44, h * 0.38);

  ctx.font = '500 34px "Chakra Petch", "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = stop.color;
  ctx.fillText(`${stop.lineCode} · ${stop.lineName}`, 60 + zhWidth + 46, h * 0.66);
}

function makeFloorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0c1119';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(120,180,230,0.16)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 254);
  g.fillStyle = 'rgba(255,255,255,0.025)';
  g.fillRect(8, 8, 116, 116);
  g.fillRect(132, 132, 116, 116);
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(5, 60);
  tex.anisotropy = 8;
  return tex;
}

function buildTrain(accent) {
  const train = new T.Group();

  const bodyMat = new T.MeshStandardMaterial({ color: 0xdfe6ec, metalness: 0.45, roughness: 0.42, envMapIntensity: 0.45 });
  const darkMat = new T.MeshStandardMaterial({ color: 0x141b25, metalness: 0.4, roughness: 0.6, envMapIntensity: 0.2 });
  const glassMat = new T.MeshBasicMaterial({ color: 0xcff3ff, toneMapped: false });
  const doorMat = new T.MeshStandardMaterial({ color: 0x1a2330, metalness: 0.5, roughness: 0.4, emissive: 0x000000, envMapIntensity: 0.3 });
  const headMat = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

  const doors = [];

  for (let i = 0; i < CARS; i += 1) {
    const car = new T.Group();
    const zCenter = -(i * (CAR_LEN + CAR_GAP)) - CAR_LEN / 2;

    const body = new T.Mesh(new T.RoundedBoxGeometry(TRAIN_W, TRAIN_H, CAR_LEN, 4, 0.45), bodyMat);
    body.position.y = TRAIN_H / 2;
    car.add(body);

    const windows = new T.Mesh(new T.BoxGeometry(TRAIN_W + 0.04, 0.78, CAR_LEN - 1.6), glassMat);
    windows.position.y = 2.15;
    car.add(windows);

    const stripe = new T.Mesh(new T.BoxGeometry(TRAIN_W + 0.05, 0.16, CAR_LEN - 0.6), accent);
    stripe.position.y = 1.05;
    car.add(stripe);

    const skirt = new T.Mesh(new T.BoxGeometry(TRAIN_W - 0.3, 0.7, CAR_LEN - 1), darkMat);
    skirt.position.y = -0.25;
    car.add(skirt);

    // Cửa phía sân ga (x dương)
    for (let d = 0; d < 4; d += 1) {
      const door = new T.Mesh(new T.BoxGeometry(0.05, 2.3, 1.6), doorMat.clone());
      door.position.set(TRAIN_W / 2 + 0.03, 1.35, -CAR_LEN / 2 + 3.2 + d * 5.9);
      car.add(door);
      doors.push(door);
    }

    car.position.z = zCenter;
    train.add(car);
  }

  // Mũi tàu thuôn dài phía trước toa đầu
  const NOSE_LEN = 4.6;
  const noseGeo = new T.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const nose = new T.Mesh(noseGeo, bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.scale.set(TRAIN_W / 2, NOSE_LEN, TRAIN_H / 2);
  nose.position.set(0, TRAIN_H / 2, -0.3);
  train.add(nose);

  // Kính buồng lái: một mảnh của chính bán cầu mũi tàu, lấy phần phía trên-phía trước.
  // Trước khi xoay, trục mũi là +y; góc phi quanh trục, phi ∈ (π, 2π) ứng với phía trên sau khi xoay.
  const visor = new T.Mesh(
    new T.SphereGeometry(1, 64, 24, Math.PI + 0.42, Math.PI - 0.84, 0.18, 0.95),
    new T.MeshStandardMaterial({ color: 0x04070b, metalness: 0.1, roughness: 0.06, envMapIntensity: 0.35 })
  );
  visor.rotation.x = Math.PI / 2;
  visor.scale.set(TRAIN_W / 2 + 0.025, NOSE_LEN + 0.04, TRAIN_H / 2 + 0.025);
  visor.position.copy(nose.position);
  train.add(visor);

  // Dải đèn LED viền dưới kính
  const led = new T.Mesh(new T.TorusGeometry(1, 0.012, 6, 64, Math.PI), headMat);
  led.rotation.set(Math.PI / 2, 0, Math.PI);
  led.scale.set(TRAIN_W / 2 + 0.03, NOSE_LEN * 0.62, 1);
  led.position.set(0, 2.05, -0.3);
  train.add(led);

  [-0.82, 0.82].forEach(x => {
    const lamp = new T.Mesh(new T.BoxGeometry(0.46, 0.09, 0.5), headMat);
    lamp.position.set(x, 1.05, 3.3);
    lamp.rotation.x = -0.4;
    train.add(lamp);
  });

  // Đèn pha chỉ rọi về phía trước, không chiếu ngược lên mũi tàu
  const headLight = new T.SpotLight(0xd8f1ff, 3, 40, 0.5, 0.6, 1.5);
  headLight.position.set(0, 1.2, 4.2);
  headLight.target.position.set(0, -1.2, 24);
  train.add(headLight, headLight.target);

  const cabinLight = new T.PointLight(0xbfeaff, 0.9, 14, 2);
  cabinLight.position.set(3.5, 2.4, -CAR_LEN * 1.5);
  train.add(cabinLight);

  return { train, doors };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ stops: object[], onPhase?: (phase:string)=>void, onStation?: (stop:object)=>void }} opts
 */
export function createStationScene(canvas, { stops, onPhase, onStation }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const scene = new T.Scene();
  const bg = new T.Color(0x03060b);
  scene.background = bg;
  scene.fog = new T.Fog(bg, 16, 120);

  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;

  const camera = new T.PerspectiveCamera(48, 1, 0.1, 300);
  const lookTarget = new T.Vector3(-1.6, 2.2, -30);

  // ----- Ánh sáng chung -----
  scene.add(new T.HemisphereLight(0x8fb8ff, 0x05070c, 0.25));

  // ----- Vật liệu theo màu tuyến (cập nhật khi đổi ga) -----
  const accent = new T.MeshBasicMaterial({ color: stops[0].color, toneMapped: false });
  const accentSoft = new T.MeshBasicMaterial({ color: stops[0].color, toneMapped: false, transparent: true, opacity: 0.55 });

  // ----- Sân ga -----
  const floor = new T.Mesh(
    new T.PlaneGeometry(14, 170),
    new T.MeshStandardMaterial({ map: makeFloorTexture(), metalness: 0.6, roughness: 0.3, envMapIntensity: 0.12 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(9.2, 0, -70);
  scene.add(floor);

  const edge = new T.Mesh(new T.BoxGeometry(0.22, 0.05, 170), accent);
  edge.position.set(2.32, 0.03, -70);
  scene.add(edge);

  const edgeDots = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.02, 0.18), new T.MeshBasicMaterial({ color: 0xffe9a8, toneMapped: false }), 120);
  const m4 = new T.Matrix4();
  for (let i = 0; i < 120; i += 1) {
    m4.makeTranslation(2.95, 0.02, 8 - i * 1.4);
    edgeDots.setMatrixAt(i, m4);
  }
  scene.add(edgeDots);

  // ----- Đường ray -----
  const bed = new T.Mesh(new T.PlaneGeometry(6, 170), new T.MeshStandardMaterial({ color: 0x06090e, roughness: 0.9, envMapIntensity: 0.05 }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(-0.6, -1.2, -70);
  scene.add(bed);

  const railMat = new T.MeshBasicMaterial({ color: 0x3e6d8f, toneMapped: false });
  [-0.75, 0.75].forEach(x => {
    const rail = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 170), railMat);
    rail.position.set(x, -1.1, -70);
    scene.add(rail);
  });

  // ----- Tường đối diện với dải đèn -----
  const wall = new T.Mesh(new T.PlaneGeometry(170, 12), new T.MeshStandardMaterial({ color: 0x080c13, metalness: 0.2, roughness: 0.8, envMapIntensity: 0.06 }));
  wall.rotation.y = Math.PI / 2;
  wall.position.set(-3.6, 4, -70);
  scene.add(wall);

  [1.6, 4.6].forEach((y, i) => {
    const strip = new T.Mesh(new T.BoxGeometry(0.05, i ? 0.08 : 0.14, 170), i ? railMat : accentSoft);
    strip.position.set(-3.55, y, -70);
    scene.add(strip);
  });

  // ----- Vòm đèn neon trên trần -----
  const ribMat = new T.MeshBasicMaterial({ color: 0xbfe8ff, toneMapped: false });
  const ribDim = new T.MeshBasicMaterial({ color: 0x4f7896, toneMapped: false });
  const ribGeo = new T.TorusGeometry(10, 0.055, 8, 96, Math.PI);
  for (let i = 0; i < 26; i += 1) {
    const rib = new T.Mesh(ribGeo, i % 3 === 0 ? ribMat : ribDim);
    rib.position.set(6, -0.4, 10 - i * 6.5);
    scene.add(rib);
  }

  const beam = new T.Mesh(new T.BoxGeometry(0.12, 0.05, 170), ribMat);
  beam.position.set(6, 9.55, -70);
  scene.add(beam);

  // ----- Vách kính sân ga với cửa trượt -----
  const glassMat = new T.MeshBasicMaterial({ color: 0x7fd6ff, transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false });
  const frameMat = new T.MeshStandardMaterial({ color: 0x2a3644, metalness: 0.8, roughness: 0.3, envMapIntensity: 0.4 });
  const screenDoors = [];
  for (let i = 0; i < 16; i += 1) {
    const z = -4 - i * 5.9;
    const top = new T.Mesh(new T.BoxGeometry(0.12, 0.28, 5.9), frameMat);
    top.position.set(2.6, 2.65, z);
    scene.add(top);

    const indicator = new T.Mesh(new T.BoxGeometry(0.04, 0.06, 1.4), accent);
    indicator.position.set(2.67, 2.62, z);
    scene.add(indicator);

    const post = new T.Mesh(new T.BoxGeometry(0.1, 2.5, 0.1), frameMat);
    post.position.set(2.6, 1.25, z - 2.95);
    scene.add(post);

    const leaves = [-1, 1].map(side => {
      const leaf = new T.Mesh(new T.PlaneGeometry(0.88, 2.3), glassMat);
      leaf.rotation.y = Math.PI / 2;
      leaf.position.set(2.6, 1.2, z + side * 0.45);
      leaf.userData = { baseZ: z + side * 0.45, side };
      scene.add(leaf);
      return leaf;
    });
    screenDoors.push(...leaves);

    [-2.0, 2.0].forEach(offset => {
      const fixed = new T.Mesh(new T.PlaneGeometry(1.8, 2.3), glassMat);
      fixed.rotation.y = Math.PI / 2;
      fixed.position.set(2.6, 1.2, z + offset);
      scene.add(fixed);
    });
  }

  // ----- Biển tên ga điện tử treo trần -----
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024;
  signCanvas.height = 220;
  const signCtx = signCanvas.getContext('2d');
  const signTex = new T.CanvasTexture(signCanvas);
  signTex.encoding = T.sRGBEncoding;
  signTex.anisotropy = 8;

  const signs = [[3.6, -13], [3.6, -48]].map(([x, z]) => {
    const group = new T.Group();
    const housing = new T.Mesh(new T.BoxGeometry(7.4, 1.72, 0.22), frameMat);
    const face = new T.Mesh(new T.PlaneGeometry(7.2, 1.55), new T.MeshBasicMaterial({ map: signTex, toneMapped: false }));
    face.position.z = 0.12;
    group.add(housing, face);
    [-2.8, 2.8].forEach(dx => {
      const rod = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 3), frameMat);
      rod.position.set(dx, 2.3, 0);
      group.add(rod);
    });
    group.position.set(x, 5.6, z);
    group.rotation.y = 0.18;
    scene.add(group);
    return group;
  });

  // ----- Bụi sáng lơ lửng -----
  const dustGeo = new T.BufferGeometry();
  const dustCount = 500;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    dustPos[i * 3] = -3 + Math.random() * 18;
    dustPos[i * 3 + 1] = Math.random() * 9;
    dustPos[i * 3 + 2] = 8 - Math.random() * 120;
  }
  dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3));
  const dust = new T.Points(dustGeo, new T.PointsMaterial({ color: 0x9fd8ff, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  // ----- Đoàn tàu -----
  const { train, doors } = buildTrain(accent);
  scene.add(train);

  // ----- Hậu kỳ: bloom cho đèn neon -----
  const composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(scene, camera));
  const bloom = new T.UnrealBloomPass(new T.Vector2(1, 1), 0.85, 0.55, 0.62);
  composer.addPass(bloom);

  // ----- Kích thước -----
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    // màn hình dọc: lùi camera và mở rộng góc nhìn để vẫn thấy tàu
    const portrait = w / h < 1;
    camera.fov = portrait ? 66 : 48;
    camera.position.set(portrait ? 7.5 : 6.6, portrait ? 2.6 : 2.15, portrait ? 13 : 9.5);
    camera.lookAt(lookTarget);
    camera.updateProjectionMatrix();
  }

  // ----- Đổi ga -----
  let stopIndex = 0;
  function applyStop(stop) {
    accent.color.set(stop.color);
    accentSoft.color.set(stop.color);
    drawSignTexture(signCtx, stop);
    signTex.needsUpdate = true;
    onStation?.(stop);
  }

  // ----- Trạng thái theo thời gian -----
  let lastPhase = '';
  function setPhase(phase) {
    if (phase !== lastPhase) {
      lastPhase = phase;
      onPhase?.(phase);
    }
  }

  function update(t) {
    let frontZ;
    if (t < ARRIVE_END) {
      frontZ = STOP_Z - 240 * (1 - easeOut(t / ARRIVE_END));
      setPhase('arriving');
    } else if (t < DEPART_START) {
      frontZ = STOP_Z;
      setPhase(t < DOORS_OPEN || t > DOORS_CLOSE ? 'stopped' : 'doors');
    } else if (t < DEPART_END) {
      frontZ = STOP_Z + 260 * easeIn((t - DEPART_START) / (DEPART_END - DEPART_START));
      setPhase('departing');
    } else {
      frontZ = 400;
      setPhase('waiting');
    }
    train.position.z = frontZ;
    train.visible = frontZ < 200;

    // độ mở cửa 0..1
    const open = t < DOORS_OPEN ? 0
      : t < DOORS_OPEN + 0.8 ? clamp01((t - DOORS_OPEN) / 0.8)
      : t < DOORS_CLOSE - 0.8 ? 1
      : t < DOORS_CLOSE ? clamp01((DOORS_CLOSE - t) / 0.8)
      : 0;
    screenDoors.forEach(leaf => {
      leaf.position.z = leaf.userData.baseZ + leaf.userData.side * open * 0.85;
    });
    doors.forEach(door => {
      door.material.emissive.set(open > 0 ? accent.color : 0x000000);
      door.material.emissiveIntensity = open * 0.9;
    });
  }

  let start = performance.now();
  let frame = null;
  let running = false;

  function loop(now) {
    const elapsed = (now - start) / 1000;
    const t = elapsed % LOOP;
    const cycle = Math.floor(elapsed / LOOP);
    if (cycle !== stopIndex) {
      stopIndex = cycle;
      applyStop(stops[cycle % stops.length]);
    }
    update(t);
    dust.position.y = Math.sin(elapsed * 0.2) * 0.15;
    dust.rotation.y = Math.sin(elapsed * 0.05) * 0.01;
    signs.forEach((sign, i) => { sign.rotation.z = Math.sin(elapsed * 0.6 + i) * 0.004; });
    composer.render();
    if (running) frame = requestAnimationFrame(loop);
  }

  function play() {
    if (running) return;
    running = true;
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  resize();
  applyStop(stops[0]);
  stopIndex = 0;

  if (reduceMotion) {
    // Ảnh tĩnh: tàu đang dừng, cửa mở
    update(DOORS_OPEN + 1.5);
    composer.render();
    new ResizeObserver(() => { resize(); composer.render(); }).observe(canvas);
    return { pause() {}, play() {} };
  }

  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
    } else {
      play();
    }
  });
  play();

  // Đảm bảo chữ trên biển ga dùng đúng font sau khi tải xong
  document.fonts?.ready.then(() => applyStop(stops[stopIndex % stops.length]));

  return { pause, play };
}
