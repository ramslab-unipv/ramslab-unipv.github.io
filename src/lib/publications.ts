import { getCollection } from 'astro:content';

/** Publications linked to a project page (via `relatedProjects` in each publication),
 *  newest first, shaped for the project recap. */
export async function getProjectPublications(project: string) {
  const all = await getCollection('publications');
  return all
    .filter((p) => p.data.relatedProjects.includes(project))
    .sort((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title))
    .map((p) => ({
      title: p.data.title,
      url: p.data.doi ? `https://doi.org/${p.data.doi}` : p.data.url,
      authors: p.data.authors.join(', '),
      venue: p.data.venue,
    }));
}

/** Names of the project pages a publication can link to (keys are /activities/<key>/). */
export const projectNames: Record<string, string> = {
  'demetra': 'DEMETRA',
  'drivesim': 'Driving Simulator',
  '3d-human-poses-estimation': 'Real-time 3D Human Pose Estimation',
  'balance-platform-simulator': 'Balance Platform Simulator',
  'human-centric-skeleton-simulator': 'Human-in-the-Loop Skeleton Simulator',
  'robotic-liquid-handling': 'Robotic Liquid Handling',
  'air-flow-dynamic': 'Airflow Dynamics',
  'dynamica': 'DYNAMICA',
  'ahbi': 'AHBI',
};
