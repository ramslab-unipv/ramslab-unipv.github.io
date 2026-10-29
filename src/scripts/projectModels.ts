/* 3D models: they animate on their own (never driven by the scroll) and can
   be turned by dragging. Every model is centred and framed from its own size. */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function initModels() {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('.ps-model'));
  if (!boxes.length) return;
  try {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
    const { default: gsap } = await import('gsap');
    const accentCss = getComputedStyle(document.querySelector('.ps, .pd') ?? document.body).getPropertyValue('--accent').trim() || '#22c55e';

    boxes.forEach((box) => {
      const build = box.dataset.build === '1';
      // on a light page the points and lines stay as the drawing, in a deeper shade of the accent
      const light = box.dataset.ink === 'light-page';
      const shears = box.dataset.anim === 'shears';
      const drive = box.dataset.anim === 'drive';
      const top = box.dataset.view === 'top';
      const sizeTweak = parseFloat((innerWidth <= 768 && box.dataset.sizeM) || box.dataset.size || '1') || 1;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      box.appendChild(renderer.domElement);
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(4, 10, 6); scene.add(sun);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.06;
      controls.enablePan = false; controls.enableZoom = false;
      controls.minPolarAngle = top ? 0.5 : Math.PI / 2.4;
      controls.maxPolarAngle = top ? 1.25 : Math.PI / 1.7;
      controls.autoRotate = !reduce && !shears && !drive; controls.autoRotateSpeed = 0.8;
      renderer.domElement.style.touchAction = 'pan-y';

      const group = new THREE.Group(); scene.add(group);
      const points = new THREE.Group(), wire = new THREE.Group(), solid = new THREE.Group();
      group.add(points, wire, solid);
      let radius = 5, blade: any = null, trigger: any = null;
      let car: any = null, path: any = null, carLift = 0;

      // camera distance from the model's size and the box shape, so nothing is cut
      const frame = (far = 1) => {
        const w = box.clientWidth || 1, h = box.clientHeight || 1;
        camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
        const fitH = radius / Math.sin((camera.fov * Math.PI) / 360);
        const dist = fitH * Math.max(1, 1 / camera.aspect) * far / sizeTweak;
        if (top) camera.position.set(0, dist * 0.62, dist * 0.82); else camera.position.set(0, radius * 0.05, dist);
      };

      let visible = false, loaded = false;
      new IntersectionObserver((es) => es.forEach((e) => {
        visible = e.isIntersecting;
        if (visible && !loaded) { loaded = true; load(); }
      }), { threshold: 0.2 }).observe(box);

      function load() {
        new GLTFLoader().load(box.dataset.model!, (gltf) => {
          const model = gltf.scene;
          const bb = new THREE.Box3().setFromObject(model);
          const center = bb.getCenter(new THREE.Vector3());
          const size = bb.getSize(new THREE.Vector3());
          const k = 10 / Math.max(size.x, size.y, size.z);
          radius = size.clone().multiplyScalar(k).length() / 2;
          const accent = new THREE.Color(accentCss);
          if (light) accent.multiplyScalar(0.62);

          if (build) {
            model.traverse((child: any) => {
              if (!child.isMesh) return;
              child.updateMatrixWorld();
              const geo = child.geometry.clone(); geo.applyMatrix4(child.matrixWorld);
              points.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: accent, size: 0.03, transparent: true, opacity: 0 })));
              wire.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0 })));
              const fin = child.clone(false); fin.geometry = geo; fin.position.set(0, 0, 0); fin.rotation.set(0, 0, 0); fin.scale.set(1, 1, 1);
              const mk = (m: any) => { const n = m.clone(); n.transparent = true; n.opacity = 0; return n; };
              fin.material = Array.isArray(fin.material) ? fin.material.map(mk) : mk(fin.material);
              solid.add(fin);
            });
          } else {
            model.traverse((child: any) => {
              const n = (child.name || '').toLowerCase();
              if (n.includes('blade') && !blade) blade = child;
              if (n.includes('trigger') && !trigger) trigger = child;
              const m = child.material;
              if (shears && child.isMesh && m instanceof THREE.MeshStandardMaterial) { m.metalness = 0.9; m.roughness = 0.2; m.envMapIntensity = 1; m.needsUpdate = true; }
            });
            solid.add(model);
            if (drive) {
              // on a light page a white car body would vanish: give it a silver tone
              if (box.closest('.pd')) model.traverse((c: any) => {
                const m = c.material;
                if (c.isMesh && m && m.color && /carpaint/i.test(m.name || '')) { m.color.setRGB(0.22, 0.24, 0.27); m.roughness = 0.35; m.needsUpdate = true; }
              });
              // the cones are white in the model: on a light page they would vanish, so make them traffic-cone orange
              if (box.closest('.pd')) model.traverse((c: any) => {
                if (!/cone/i.test(c.name || '')) return;
                c.traverse((m: any) => { if (m.isMesh) m.material = [].concat(m.material).map((x: any) => { const n = x.clone(); n.color = new THREE.Color(0xf26a1b); n.needsUpdate = true; return n; })[0]; });
              });
              // the car drives along the trajectory strip: its centre line is found by
              // averaging the strip's vertices in slices along its length
              model.updateMatrixWorld(true);
              let strip: any = null;
              model.traverse((c: any) => {
                const n = (c.name || '').toLowerCase();
                if (!car && n.includes('player_car')) car = c;
                if (!strip && c.isMesh && n.includes('curve')) strip = c;
              });
              if (car && strip) {
                const pos = strip.geometry.attributes.position, v = new THREE.Vector3();
                const pts: any[] = [];
                for (let i = 0; i < pos.count; i++) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(strip.matrixWorld).clone());
                const sb = new THREE.Box3().setFromPoints(pts), ss = sb.getSize(new THREE.Vector3());
                const ax = ss.x > ss.z ? 'x' : 'z', lo = (sb.min as any)[ax], span = (ss as any)[ax];
                const N = 24, sum = Array.from({ length: N }, () => new THREE.Vector3()), cnt = new Array(N).fill(0);
                pts.forEach((p) => { const b = Math.min(N - 1, Math.floor(((p as any)[ax] - lo) / span * N)); sum[b].add(p); cnt[b]++; });
                const line = sum.filter((_, i) => cnt[i]).map((p, i) => p.divideScalar(cnt.filter(Boolean)[i]));
                const cb = new THREE.Box3().setFromObject(car), cc = cb.getCenter(new THREE.Vector3());
                // start from the end of the strip nearest to the car
                if (line[0].distanceTo(cc) > line[line.length - 1].distanceTo(cc)) line.reverse();
                path = new THREE.CatmullRomCurve3(line);
                model.attach(car);
                car.updateMatrixWorld(true);
                carLift = car.position.y;
                // wheels: front ("A", anteriore) and rear ("P", posteriore) axles
                const wheels: any[] = [];
                car.traverse((c: any) => { if (/^ruota_(ad|as|pd|ps)$/i.test(c.name || '')) wheels.push(c); });
                const mid = (ws: any[]) => ws.reduce((acc, w) => acc.add(w.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).divideScalar(Math.max(1, ws.length));
                const front = wheels.filter((w) => /^ruota_a/i.test(w.name)), rear = wheels.filter((w) => /^ruota_p/i.test(w.name));
                const fMid = mid(front), rMid = mid(rear);
                const fwd = fMid.clone().sub(rMid).setY(0);
                const wb = fwd.length() || 1;
                const wr = wheels.length ? new THREE.Box3().setFromObject(wheels[0]).getSize(new THREE.Vector3()).y / 2 : 0.3;
                // axes in the car's own frame: up (to steer), and the axle a wheel rolls around
                const toLocal = car.getWorldQuaternion(new THREE.Quaternion()).invert();
                const upL = new THREE.Vector3(0, 1, 0).applyQuaternion(toLocal).normalize();
                const fwdL = fwd.clone().normalize().applyQuaternion(toLocal).normalize();
                const rollL = new THREE.Vector3().crossVectors(upL, fwdL).normalize();
                wheels.forEach((w) => { w.userData.q0 = w.quaternion.clone(); });
                const mats: any[] = [];
                car.traverse((c: any) => { if (c.isMesh) [].concat(c.material).forEach((m: any) => { if (m && !mats.includes(m)) { m.userData.t0 = m.transparent; mats.push(m); } }); });
                car.userData = {
                  q0: car.quaternion.clone(), yaw0: Math.atan2(fwd.x, fwd.z),
                  rearOff: rMid.clone().sub(car.position).setY(0),
                  wb, wr, front, rear, wheels, mats, len: path.getLength(), spin: 0, last: 0, upL, rollL,
                };
              }
            }
          }
          group.scale.setScalar(k);
          group.position.copy(center).multiplyScalar(-k);
          if (shears) group.rotation.x = Math.PI / 12;

          frame(build ? 0.8 : 1);
          if (build) {
            const mats = (g: any, test: (o: any) => boolean) => { const out: any[] = []; g.traverse((c: any) => { if (test(c)) out.push(...([] as any[]).concat(c.material)); }); return out; };
            const pM = mats(points, (c) => c.isPoints), wM = mats(wire, (c) => c.isMesh), fM = mats(solid, (c) => c.isMesh);
            const end = camera.position.clone().multiplyScalar(1.25);
            const tl = gsap.timeline({ paused: true });
            tl.to(camera.position, { x: end.x, y: end.y, z: end.z, duration: 8, ease: 'power1.inOut' }, 0);
            tl.to(pM, { opacity: 1, duration: 2.5, stagger: 0.1 }, 0);
            tl.to(wM, { opacity: 0.3, duration: 2.5, stagger: 0.1 }, 1.5);
            tl.to(fM, { opacity: 1, duration: 4, stagger: 0.15 }, 3.5);
            tl.to(pM, { opacity: light ? 0.55 : 0.1, duration: 3 }, 5);
            tl.to(wM, { opacity: light ? 0.22 : 0.1, duration: 3 }, 5);
            if (reduce) tl.progress(1); else tl.play();
          }
        });
      }

      frame();
      const t0 = performance.now();
      (function tick() {
        requestAnimationFrame(tick);
        if (!visible) return;
        if (shears) {
          const t = (performance.now() - t0) / 1000;
          const close = reduce ? 0 : Math.pow((1 - Math.cos(t * Math.PI * 2 / 2.6)) / 2, 2);
          if (blade) blade.rotation.z = -close * (Math.PI / 3.5);
          if (trigger) trigger.rotation.z = -close * (Math.PI / 7);
          // swing around the side profile, never far enough to show the shears end-on
          solid.rotation.y = reduce ? 0 : Math.sin(t * 0.45) * 0.5;
        }
        if (drive && path && car) {
          // the rear axle follows the trajectory and the car points at a spot one wheelbase
          // ahead (as a steered car does); it eases off the line, cruises, brakes, then fades
          // out and back in at the start. Wheels roll with the distance, front wheels steer.
          const U = car.userData, D = 7, HOLD = 0.9, FADE = 0.45, T = D + HOLD + 2 * FADE;
          const t = reduce ? 0 : ((performance.now() - t0) / 1000) % T;
          const k = Math.min(1, t / D);
          const u = k * k * (3 - 2 * k);
          const at = (s2: number) => {
            if (s2 <= 1) return path.getPointAt(Math.max(0, s2));
            const end = path.getPointAt(1), tg = path.getTangentAt(1);
            return end.add(tg.multiplyScalar((s2 - 1) * U.len));
          };
          const rearP = at(u), aheadP = at(u + U.wb / U.len), farP = at(u + 2 * U.wb / U.len);
          const heading = Math.atan2(aheadP.x - rearP.x, aheadP.z - rearP.z);
          const headingFar = Math.atan2(farP.x - aheadP.x, farP.z - aheadP.z);
          let steer = headingFar - heading;
          steer = Math.atan2(Math.sin(steer), Math.cos(steer));
          steer = Math.max(-0.55, Math.min(0.55, steer * 1.6));
          const yaw = heading - U.yaw0;
          const up = new THREE.Vector3(0, 1, 0);
          car.quaternion.setFromAxisAngle(up, yaw).multiply(U.q0);
          const off = U.rearOff.clone().applyAxisAngle(up, yaw);
          car.position.set(rearP.x - off.x, carLift, rearP.z - off.z);
          const dist = u * U.len;
          U.spin += Math.max(0, dist - U.last) / U.wr; U.last = dist < U.last ? 0 : dist;
          const qSpin = new THREE.Quaternion().setFromAxisAngle(U.rollL, U.spin);
          const qSteer = new THREE.Quaternion().setFromAxisAngle(U.upL, steer);
          U.wheels.forEach((w: any) => {
            const q = U.front.includes(w) ? qSteer.clone().multiply(qSpin) : qSpin.clone();
            w.quaternion.copy(q.multiply(w.userData.q0));
          });
          const fadeOut = t > D + HOLD ? Math.min(1, (t - D - HOLD) / FADE) : 0;
          const fadeIn = t < FADE ? 1 - t / FADE : 0;
          const op = 1 - Math.max(fadeOut, t > D + HOLD + FADE ? 1 : 0, fadeIn * (reduce ? 0 : 1));
          // transparency only while fading, so the car renders solid the rest of the time
          const fading = op < 0.999;
          U.mats.forEach((m: any) => {
            const tr = fading || m.userData.t0;
            if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
            m.opacity = fading ? op : 1;
          });
        }
        controls.update();
        renderer.render(scene, camera);
      })();
      window.addEventListener('resize', () => frame(build ? 1 : 1));
    });
  } catch (e) {
    console.error('Three.js failed to load:', e);
  }
}
initModels();
