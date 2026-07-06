import { defineCollection, z } from 'astro:content';

const people = defineCollection({ type: 'content', schema: z.object({
  name: z.string(), role: z.string(), email: z.string().optional(),
  image: z.string().optional(), shortBio: z.string().optional(),
  areas: z.array(z.string()).default([]), order: z.number().default(999),
  links: z.array(z.object({ label: z.string(), url: z.string() })).default([])
}) });

const activities = defineCollection({ type: 'content', schema: z.object({
  title: z.string(), excerpt: z.string(), cover: z.string().optional(),
  year: z.number().optional(), status: z.string().optional(),
  tags: z.array(z.string()).default([]), people: z.array(z.string()).default([]),
  publications: z.array(z.string()).default([]), consortium: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  coverFit: z.enum(['cover','contain','horizontal']).default('cover'),
  // ─── Immersive layout fields (optional) ───
  accentColor: z.string().optional(),          // e.g. "#10b981"
  heroVideo: z.string().optional(),            // path to hero background video
  heroSubtitle: z.string().optional(),         // tagline shown under title in hero
  description: z.string().optional(),          // long description for recap section
  funding: z.string().optional(),              // funding info for recap section
  sections: z.array(z.object({
    label: z.string(),                         // section heading (e.g. "Digital Twin")
    text: z.string(),                          // paragraph text
    bgVideo: z.string().optional(),            // full-bleed background video
    bgImage: z.string().optional(),            // full-bleed background image
    sideVideo: z.string().optional(),          // small video on the side
    sideImage: z.string().optional(),          // image on the side
    model3d: z.string().optional(),            // GLB model path for Three.js viewer
    flip: z.boolean().default(false),          // if true, text is on the right
  })).optional(),
}) });

const publications = defineCollection({ type: 'content', schema: z.object({
  title: z.string(), authors: z.array(z.string()), year: z.number(),
  venue: z.string().optional(), doi: z.string().optional(), url: z.string().optional(),
  relatedProjects: z.array(z.string()).default([]), featured: z.boolean().default(false)
}) });

const settings = defineCollection({ type: 'data', schema: z.object({
  siteTitle: z.string(),
  siteDescription: z.string(),
  siteMotto: z.string().optional(),
  contactEmail: z.string().optional(),
  address: z.string().optional()
}) });

export const collections = { people, activities, publications, settings };
