import React, { useEffect, useState } from 'react';
import type { SupportMessage } from '../../../lib/supabase';
import { getSupportMessages, subscribeToProjectEvents } from '../../../lib/supabase';
import SupportMessageComponent from './SupportMessage';
import { getTimeAgo } from '../../../helpers/timeFormating';
import './style.css';
import Spinner from '../../UI/react/Spinner/Spinner';

interface Props {
  allowComments?: boolean;
  project_id: string;
}

const byNewest = (a: SupportMessage, b: SupportMessage) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const SupportMessageSection: React.FC<Props> = ({ allowComments = true, project_id = '' }) => {
  const [comments, setComments] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial: solo mensajes aprobados (la política RLS también lo garantiza).
  useEffect(() => {
    if (!project_id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getSupportMessages(project_id, 50)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setComments([...res.data].sort(byNewest));
          setError(null);
        } else {
          setError(res.error ?? 'Error al cargar mensajes');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project_id]);

  // Mensajes aprobados por la familia llegan por broadcast del proyecto.
  useEffect(() => {
    if (!project_id) return;
    return subscribeToProjectEvents(project_id, {
      onSupportMessage: (ev) => {
        setComments((prev) =>
          prev.some((c) => c.id === ev.id)
            ? prev
            : [
                {
                  id: ev.id,
                  author_name: ev.author_name,
                  author_emoji: ev.author_emoji,
                  message: ev.message,
                  is_from_contributor: ev.is_from_contributor,
                  is_approved: true,
                  created_at: ev.created_at,
                  updated_at: ev.created_at,
                },
                ...prev,
              ]
        );
      },
    });
  }, [project_id]);

  if (!allowComments) return null;

  return (
    <div className='message-section'>
      <div className='comments-section'>
        <div className='comments-header'>
          <h4 className='comments-title'>💬 Mensajes de Apoyo</h4>
        </div>

        {error && (
          <div className='error-message'>
            <span>❌ Error: {error}</span>
          </div>
        )}

        <div className='comments-container'>
          {isLoading && <Spinner />}

          {!isLoading && comments.length === 0 ? (
            <div className='no-comments'>
              <p>👋 ¡Sé el primero en dejar un mensaje de apoyo!</p>
            </div>
          ) : (
            comments.map((comment, index) => (
              <div
                key={comment.id}
                className={`message-wrapper ${index === 0 ? 'newest-message' : ''}`}
              >
                <SupportMessageComponent
                  emoji={comment.author_emoji}
                  author={comment.author_name}
                  text={comment.message}
                  time={getTimeAgo(comment.created_at)}
                  isFromContributor={comment.is_from_contributor}
                />
              </div>
            ))
          )}
        </div>

        <div className='comments-footer'>
          <small className='comments-count'>
            {comments.length === 0
              ? 'Sin mensajes aún'
              : `${comments.length} mensaje${comments.length > 1 ? 's' : ''} de apoyo`}
          </small>
        </div>
      </div>
    </div>
  );
};

export default SupportMessageSection;
