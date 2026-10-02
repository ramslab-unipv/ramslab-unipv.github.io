import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ramslab-unipv.github.io',
  trailingSlash: 'always',
  vite: {
    optimizeDeps: {
      include: [
        'three',
        'three/examples/jsm/loaders/GLTFLoader.js',
        'three/examples/jsm/controls/OrbitControls.js',
        'three/examples/jsm/environments/RoomEnvironment.js',
        'gsap',
      ],
    },
  },
});
