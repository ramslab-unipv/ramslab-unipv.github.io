import { getCollection } from 'astro:content';

interface PublicationMetadata {
  title: string;
  year: number;
  publicationDate: string;
  venue?: string;
  doi?: string;
}

/** Sort the cited editions newest first, retaining the precision supplied by the source. */
export function comparePublications(a: PublicationMetadata, b: PublicationMetadata) {
  const dateKey = (date: string) => {
    const [year, month = '00', day = '00'] = date.split('-');
    return `${year}${month}${day}`;
  };
  return b.year - a.year
    || dateKey(b.publicationDate).localeCompare(dateKey(a.publicationDate))
    || a.title.localeCompare(b.title, 'en')
    || (a.doi ?? '').localeCompare(b.doi ?? '');
}

/** Shared bibliographic details for the archive, homepage and activity recaps. */
export function formatPublicationDetails(publication: Pick<PublicationMetadata, 'venue' | 'year'>) {
  const venue = publication.venue?.trim().replace(/\.$/, '');
  return `${venue ? `${venue}, ` : ''}${publication.year}.`;
}

/** Publications linked to a project page (via `relatedProjects` in each publication),
 *  newest first, shaped for the project recap. */
export async function getProjectPublications(project: string) {
  const all = await getCollection('publications');
  return all
    .filter((p) => p.data.relatedProjects.includes(project))
    .sort((a, b) => comparePublications(a.data, b.data))
    .map((p) => ({
      title: p.data.title,
      url: p.data.url,
      authors: p.data.authors.join(', '),
      venue: formatPublicationDetails(p.data),
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
