import React, { useEffect, useState } from 'react';
import {
  subscribeToProjectEvents,
  type ProjectContributionEvent,
} from '../../../lib/supabase';
import './style.css';

export interface PublicContribution {
  id: string;
  contributor_name: string;
  contributor_emoji?: string;
  amount: number;
  level_name?: string;
  level_color?: string;
  level_emoji?: string;
  message?: string;
  created_at: string;
}

export interface ContributorsListProps {
  contributors?: PublicContribution[];
  currency?: string;
  showTotal?: boolean;
  maxDisplay?: number;
  contributorsTitle?: string;
  /** Necesario para recibir en tiempo real las contribuciones confirmadas de este proyecto. */
  projectId?: string;
  /** Etiqueta del contador de personas ("Héroes"), según el tema. */
  contributorsStat?: string;
}

function fromEvent(ev: ProjectContributionEvent): PublicContribution {
  return {
    id: ev.id,
    contributor_name: ev.contributor_name || 'Anónimo',
    contributor_emoji: ev.contributor_emoji || '🎉',
    amount: Number(ev.amount) || 0,
    level_name: ev.level_name ?? '',
    level_color: ev.level_color || '#9e9e9e',
    level_emoji: ev.level_emoji || '⭐',
    message: ev.message ?? undefined,
    created_at: ev.created_at || new Date().toISOString(),
  };
}

export const ContributorsList: React.FC<ContributorsListProps> = ({
  contributors = [],
  currency = '€',
  showTotal = true,
  maxDisplay = 20,
  contributorsTitle = '',
  projectId,
  contributorsStat = 'Héroes',
}) => {
  const [items, setItems] = useState<PublicContribution[]>(contributors);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setItems(contributors);
  }, [contributors]);

  useEffect(() => {
    if (!projectId) return;
    return subscribeToProjectEvents(projectId, {
      onContribution: (ev) => {
        // Deduplicación por id de fila: el mismo evento puede llegar más de una vez.
        setItems((prev) => (prev.some((c) => c.id === ev.id) ? prev : [fromEvent(ev), ...prev]));
        document.dispatchEvent(
          new CustomEvent('contributionCompleted', {
            detail: {
              amount: Number(ev.amount) || 0,
              contributor: {
                name: ev.contributor_name,
                emoji: ev.contributor_emoji,
                level: ev.level_name,
                message: ev.message,
                color: ev.level_color,
              },
            },
          })
        );
      },
    });
  }, [projectId]);

  const totalContributors = items.length;
  const totalAmount = items.reduce((sum, c) => sum + (c.amount || 0), 0);
  const displayedContributors = showAll ? items : items.slice(0, maxDisplay);
  const hiddenCount = Math.max(0, totalContributors - displayedContributors.length);

  return (
    <div className='contributors-section'>
      <div className='section-header'>
        <h3 className='section-title'>{contributorsTitle}</h3>
        <div className='section-stats'>
          <div className='stat-badge'>
            <span className='stat-number'>{totalContributors}</span>
            <span className='stat-label'>{contributorsStat}</span>
          </div>

          {showTotal && (
            <div className='stat-badge total'>
              <span className='stat-number'>
                {totalAmount.toFixed(2)} {currency}
              </span>
              <span className='stat-label'>Recaudado</span>
            </div>
          )}
        </div>
      </div>

      <div className='contributors-grid' id='contributorsGrid'>
        {displayedContributors.map((contributor, index) => (
          <div
            key={contributor.id}
            className='contributor-card'
            data-contributor-id={contributor.id}
            style={
              {
                '--contributor-color': contributor.level_color || '#9e9e9e',
                animationDelay: `${Math.min(index, 20) * 0.1}s`,
              } as React.CSSProperties
            }
          >
            <div className='contributor-avatar'>
              <span className='avatar-emoji'>{contributor.contributor_emoji}</span>
              <div className='avatar-ring' />
              <div className='level-badge' title={`Nivel: ${contributor.level_name ?? ''}`}>
                {contributor.level_emoji}
              </div>
            </div>

            <div className='contributor-info'>
              <div className='contributor-name'>{contributor.contributor_name}</div>
              <div className='contributor-amount'>
                {contributor.amount} {currency}
              </div>
              <div className='contributor-level'>{contributor.level_name}</div>
              <div className='contributor-date'>
                {new Date(contributor.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            </div>

            {contributor.message && (
              <div className='contributor-message'>
                <div className='message-bubble'>
                  <span className='message-text'>"{contributor.message}"</span>
                  <div className='message-arrow' />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className='more-contributors'>
          <button
            type='button'
            className='show-more-btn'
            id='showMoreBtn'
            onClick={() => setShowAll(true)}
          >
            <span className='btn-text'>Ver {hiddenCount} héroes más</span>
            <span className='btn-icon'>👥</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ContributorsList;
