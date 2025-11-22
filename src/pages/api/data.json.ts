// src/pages/api/data.json.ts
export const prerender = false; // Esta página será SSR

import type { APIRoute } from 'astro';
import {
  getContributionLevels,
  getFamilyMembers,
  getProjectConfig,
  getPublicContributions,
} from '../../lib/supabase';

export const GET: APIRoute = async () => {
  try {
    const [projectConfig, contributionLevels, contributions, familyMembers] =
      await Promise.all([
        getProjectConfig(),
        getContributionLevels(),
        getPublicContributions(),
        getFamilyMembers(),
      ]);

    return new Response(
      JSON.stringify({
        projectConfig,
        contributionLevels,
        contributions,
        familyMembers,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
