import React, { useEffect, useState } from 'react';
import { subscribeToContributionsNormalized } from '../../../lib/supabase';
import './style.css';

export interface LevelInfo {
  name: string;
  color: string;
  emoji: string;
}

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
  contributorsLevels?: LevelInfo[];
}

export const ContributorsList: React.FC<ContributorsListProps> = ({
  contributors = [],
  currency = '€',
  showTotal = true,
  maxDisplay = 20,
  contributorsTitle = '',
}) => {
  const [items, setItems] = useState<PublicContribution[]>(contributors || []);
  const recentKeysRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    setItems(contributors || []);
  }, [contributors]);

  useEffect(() => {
    const sub = subscribeToContributionsNormalized((p) => {
      try {
        if (!p) return;
        const eventType = (p.eventType || '').toString().toUpperCase();
        if (eventType.includes('INSERT')) {
          const rec = p.newRecord || p.raw?.record || p.raw || {};
          const newItem: PublicContribution = {
            id: rec.id || String(Math.random()),
            contributor_name:
              rec.contributor_name || rec.contributorName || 'Anon',
            contributor_emoji:
              rec.contributor_emoji || rec.contributorEmoji || '🎉',
            amount: Number(rec.amount || rec.value || 0),
            level_name: rec.level_name || rec.levelName || '',
            message: rec.message || '',
            created_at: rec.created_at || new Date().toISOString(),
            level_color: rec.level_color || '#9e9e9e',
            level_emoji: rec.level_emoji || '⭐',
          };

          setItems((prev) => [newItem, ...prev]);

          // store recent key to avoid duplicate when modal also dispatches
          try {
            const key = `${newItem.contributor_name}-${newItem.amount}-${newItem.created_at}`;
            recentKeysRef.current.add(key);
            setTimeout(() => recentKeysRef.current.delete(key), 5000);
          } catch (e) {
            // ignore
          }

          // Emitir evento global para celebraciones
          try {
            document.dispatchEvent(
              new CustomEvent('contributionCompleted', {
                detail: {
                  amount: newItem.amount,
                  contributor: {
                    name: newItem.contributor_name,
                    emoji: newItem.contributor_emoji,
                    level: newItem.level_name,
                    message: newItem.message,
                    color: newItem.level_color,
                  },
                },
              })
            );
          } catch (e) {
            // no bloquear en SSR o entornos sin DOM
          }
        }
      } catch (err) {
        console.error(
          'Error handling realtime payload in ContributorsList:',
          err
        );
      }
    });

    return () => {
      try {
        if (sub && typeof (sub as any).unsubscribe === 'function') {
          (sub as any).unsubscribe();
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // Escuchar eventos locales emitidos por el modal (contributionCompleted)
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const e = ev as CustomEvent;
        const payload = e.detail || {};
        const amount = Number(payload.amount || 0);
        const contributor = payload.contributor || {};

        // Crear clave para deduplicar
        const key = `${contributor.name || 'anon'}-${amount}-${
          contributor.message || ''
        }`;
        if (recentKeysRef.current.has(key)) {
          return; // ya procesado por realtime o por este mismo handler
        }

        const newItem: PublicContribution = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          contributor_name: contributor.name || 'Anon',
          contributor_emoji: contributor.emoji || '🎉',
          amount: amount,
          level_name: contributor.level || contributor.level_name || '',
          message: contributor.message || '',
          created_at: new Date().toISOString(),
          level_color: contributor.color || '#9e9e9e',
          level_emoji: contributor.levelEmoji || '⭐',
        };

        recentKeysRef.current.add(key);
        setTimeout(() => recentKeysRef.current.delete(key), 5000);

        setItems((prev) => [newItem, ...prev]);

        // también emitir evento global para compatibilidad
        try {
          document.dispatchEvent(
            new CustomEvent('contributionLocalInserted', { detail: newItem })
          );
        } catch (err) {}
      } catch (err) {
        console.error('Error handling local contributionCompleted event:', err);
      }
    };

    document.addEventListener(
      'contributionCompleted',
      handler as EventListener
    );
    window.addEventListener('contributionCompleted', handler as EventListener);

    return () => {
      document.removeEventListener(
        'contributionCompleted',
        handler as EventListener
      );
      window.removeEventListener(
        'contributionCompleted',
        handler as EventListener
      );
    };
  }, []);

  const totalContributors = items.length;
  const totalAmount = items.reduce((sum, c) => sum + (c.amount || 0), 0);
  const displayedContributors = items.slice(0, maxDisplay);
  const hiddenCount = Math.max(0, totalContributors - maxDisplay);

  const handleShowMore = (e: React.MouseEvent) => {
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    btn.innerText = 'Cargando...';
    setTimeout(() => {
      btn.style.display = 'none';
    }, 800);
  };

  return (
    <div className='contributors-section'>
      <div className='section-header'>
        <h3 className='section-title'>{contributorsTitle}</h3>
        <div className='section-stats'>
          <div className='stat-badge'>
            <span className='stat-number'>{totalContributors}</span>
            <span className='stat-label'>Héroes</span>
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

      <div
        className='contributors-grid'
        id='contributorsGrid'
      >
        {displayedContributors.map((contributor, index) => (
          <div
            key={contributor.id}
            className='contributor-card'
            data-contributor-id={contributor.id}
            style={{
              //@ts-ignore
              ['--contributor-color' as any]:
                contributor.level_color || '#9e9e9e',
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <div className='contributor-avatar'>
              <span className='avatar-emoji'>
                {contributor.contributor_emoji}
              </span>
              <div className='avatar-ring' />
              <div
                className='level-badge'
                title={`Nivel: ${contributor.level_name}`}
              >
                {contributor.level_emoji}
              </div>
            </div>

            <div className='contributor-info'>
              <div className='contributor-name'>
                {contributor.contributor_name}
              </div>
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
            className='show-more-btn'
            id='showMoreBtn'
            onClick={handleShowMore}
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
