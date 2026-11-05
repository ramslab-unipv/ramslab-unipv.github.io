import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ramslab-unipv.github.io',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // These routes only redirect visitors to another page.
      filter: (page) => !['/login/', '/activities/demetra/'].includes(new URL(page).pathname),
    }),
  ],
  redirects: {
    '/activities/demetra/': '/activities/lidia/',
  },
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
