import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import OpenCampaignSection from '../src/components/OpenCampaignSection.astro';

const base = {
  title: '🎯 Progreso',
  raised: 130.5,
  base: 150,
  baseLabel: 'Papá y mamá',
  total: 280.5,
  currency: '€',
  endDateLabel: '29 de octubre',
};

describe('OpenCampaignSection', () => {
  it('shows raised, base, total and the countdown while open', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(OpenCampaignSection, {
      props: { ...base, daysLeft: 37, closed: false },
    });
    expect(html).toContain('130.50 €');
    expect(html).toContain('Papá y mamá');
    expect(html).toContain('280.50 €');
    expect(html).toContain('Quedan 37 días');
    expect(html).toContain('cierra el 29 de octubre');
  });

  it('says last day at day 0 and closed after the deadline', async () => {
    const container = await AstroContainer.create();
    const lastDay = await container.renderToString(OpenCampaignSection, {
      props: { ...base, daysLeft: 0, closed: false },
    });
    expect(lastDay).toContain('¡Último día!');

    const closed = await container.renderToString(OpenCampaignSection, {
      props: { ...base, daysLeft: 0, closed: true },
    });
    expect(closed).toContain('Campaña cerrada');
    expect(closed).toContain('cerró el 29 de octubre');
    expect(closed).not.toContain('No hay objetivo');
  });

  it('renders the time bar with the current day when a timeline is given', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(OpenCampaignSection, {
      props: {
        ...base,
        daysLeft: 37,
        closed: false,
        startDateLabel: '22 de septiembre',
        timeline: { totalDays: 38, dayNumber: 1, percent: 1.1 },
      },
    });
    expect(html).toContain('Día 1 de 38');
    expect(html).toContain('22 de septiembre');
    expect(html).toContain('aria-valuenow="1"');
  });

  it('omits the base block when there is no base amount', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(OpenCampaignSection, {
      props: { ...base, base: 0, total: 130.5, daysLeft: 5, closed: false },
    });
    expect(html).not.toContain('Papá y mamá');
    expect(html).toContain('Quedan 5 días');
  });
});
