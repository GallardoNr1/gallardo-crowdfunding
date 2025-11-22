import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SupportMessage } from '../../../lib/supabase';
import { getSupportMessages } from '../../../lib/supabase';
import SupportMessageComponent from './SupportMessage';
import { getTimeAgo } from '../../../helpers/timeFormating';
import './style.css';
import Spinner from '../../UI/react/Spinner/Spinner';

interface Props {
  allowComments?: boolean;
  supportMessages?: SupportMessage[];
  onAddComment?: (comment: SupportMessage) => void;
  projectId?: string;
}

// Hook mejorado con debouncing y deduplicación
export const useNewMessageListener = (onNewMessage: (data: any) => void) => {
  const lastEventRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  const handleNewMessage = useCallback(
    (event: CustomEvent) => {
      const eventKey = `${event.detail.action}-${event.detail.timestamp}-${
        event.detail.message?.id || 'no-id'
      }`;

      if (lastEventRef.current === eventKey) {
        console.warn('🚫 Evento duplicado ignorado:', eventKey);
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastEventRef.current = eventKey;
        onNewMessage(event.detail);

        setTimeout(() => {
          if (lastEventRef.current === eventKey) {
            lastEventRef.current = '';
          }
        }, 2000);
      }, 50);
    },
    [onNewMessage]
  );

  useEffect(() => {
    const handleEvent = (e: Event) => handleNewMessage(e as CustomEvent);

    document.addEventListener('newSupportMessage', handleEvent);
    window.addEventListener('newSupportMessage', handleEvent);

    return () => {
      document.removeEventListener('newSupportMessage', handleEvent);
      window.removeEventListener('newSupportMessage', handleEvent);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleNewMessage]);
};

const SupportMessageSection: React.FC<Props> = ({
  allowComments = true,
  supportMessages = [],
  onAddComment,
  projectId,
}) => {
  const [comments, setComments] = useState<SupportMessage[]>(supportMessages);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  const processedMessageIds = useRef<Set<string>>(new Set());
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const loadInitialComments = useCallback(async () => {
    if (hasLoadedInitial) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await getSupportMessages();
      if (response.success && response.data) {
        setComments(response.data);
        setHasLoadedInitial(true);

        processedMessageIds.current.clear();
        response.data.forEach((comment) => {
          if (comment.id) {
            processedMessageIds.current.add(comment.id);
          }
        });
      } else {
        throw new Error(response.error || 'Error al cargar comentarios');
      }
    } catch (error) {
      console.error('❌ Error al cargar iniciales:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedInitial]);

  const handleNewMessage = useCallback(
    (eventData: any) => {
      if (eventData.action === 'add' && eventData.message) {
        const messageId = eventData.message.id || `temp-${Date.now()}`;

        if (processedMessageIds.current.has(messageId)) {
          console.warn('⚠️ Mensaje ya procesado por ID:', messageId);
          return;
        }

        const newComment: SupportMessage = {
          id: messageId,
          author_name: eventData.message.author_name || 'Usuario',
          message: eventData.message.message || eventData.message.text || '',
          author_emoji: eventData.message.author_emoji || '👤',
          created_at: eventData.timestamp || new Date().toISOString(),
          is_from_contributor: eventData.message.is_from_contributor ?? false,
          is_approved: eventData.message.is_approved ?? true,
          updated_at:
            eventData.message.updated_at ||
            eventData.timestamp ||
            new Date().toISOString(),
        };

        setComments((prev) => {
          const existsById = prev.some(
            (comment) => comment.id === newComment.id
          );
          if (existsById) {
            console.warn('⚠️ Mensaje duplicado por ID:', newComment.id);
            return prev;
          }

          const existsByContent = prev.some(
            (comment) =>
              comment.message === newComment.message &&
              comment.author_name === newComment.author_name &&
              Math.abs(
                new Date(comment.created_at).getTime() -
                  new Date(newComment.created_at).getTime()
              ) < 10000
          );

          if (existsByContent) {
            console.warn('⚠️ Mensaje duplicado por contenido');
            return prev;
          }

          processedMessageIds.current.add(newComment.id);

          // 🔄 AGREGAR AL PRINCIPIO en lugar del final
          return [newComment, ...prev];
        });

        if (onAddComment) {
          onAddComment(newComment);
        }
      } else if (eventData.action === 'forceReload') {
        setHasLoadedInitial(false);
        processedMessageIds.current.clear();
        loadInitialComments();
      }
    },
    [onAddComment, loadInitialComments]
  );

  useNewMessageListener(handleNewMessage);

  // Carga inicial
  useEffect(() => {
    if (!supportMessages || supportMessages.length === 0) {
      loadInitialComments();
    } else {
      // 🔄 ORDENAR mensajes iniciales también
      const sortedMessages = [...supportMessages].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setComments(sortedMessages);
      setHasLoadedInitial(true);

      sortedMessages.forEach((comment) => {
        if (comment.id) {
          processedMessageIds.current.add(comment.id);
        }
      });
    }
  }, []);

  // Animaciones
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(
      '.photo-placeholder, .stat-item'
    );
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleManualRefresh = () => {
    setHasLoadedInitial(false);
    processedMessageIds.current.clear();
    loadInitialComments();
  };
  const pluralS = comments.length !== 1 ? 's' : '';

  return (
    <div className='message-section'>
      {allowComments && (
        <div className='comments-section'>
          <div className='comments-header'>
            <h4 className='comments-title'>💬 Mensajes de Apoyo</h4>
          </div>

          {error && (
            <div className='error-message'>
              <span>❌ Error: {error}</span>
              <button
                className='retry-button'
                onClick={handleManualRefresh}
              >
                Reintentar
              </button>
            </div>
          )}

          <div
            className='comments-container'
            ref={commentsContainerRef}
          >
            {isLoading && <Spinner />}
            {comments.length === 0 && !isLoading ? (
              <div className='no-comments'>
                <p>👋 ¡Sé el primero en dejar un mensaje de apoyo!</p>
              </div>
            ) : (
              comments.map((comment, index) => {
                const isNewest = index === 0;
                return (
                  <div
                    key={comment.id || index}
                    className={`message-wrapper ${
                      isNewest ? 'newest-message' : ''
                    }`}
                  >
                    <SupportMessageComponent
                      emoji={comment.author_emoji}
                      author={comment.author_name}
                      text={comment.message}
                      time={getTimeAgo(comment.created_at)}
                      isFromContributor={comment.is_from_contributor}
                    />
                  </div>
                );
              })
            )}
          </div>

          <div className='comments-footer'>
            <small className='comments-count'>
              {comments.length === 0
                ? 'Sin mensajes aún'
                : `${comments.length} mensaje${pluralS} de apoyo`}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportMessageSection;
