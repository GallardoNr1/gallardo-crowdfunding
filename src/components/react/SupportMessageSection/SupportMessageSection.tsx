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
  project_id: string;
}

// 🔔 Listener de nuevos mensajes
const useNewMessageListener = (onNewMessage: (data: any) => void) => {
  const lastEventRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNewMessage = useCallback(
    (event: CustomEvent) => {
      const eventKey = `${event.detail.action}-${event.detail.timestamp}-${
        event.detail.message?.id || 'no-id'
      }`;

      if (lastEventRef.current === eventKey) return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        lastEventRef.current = eventKey;
        onNewMessage(event.detail);

        setTimeout(() => {
          if (lastEventRef.current === eventKey) lastEventRef.current = '';
        }, 2000);
      }, 50);
    },
    [onNewMessage]
  );

  useEffect(() => {
    const handler = (e: Event) => handleNewMessage(e as CustomEvent);

    document.addEventListener('newSupportMessage', handler);
    window.addEventListener('newSupportMessage', handler);

    return () => {
      document.removeEventListener('newSupportMessage', handler);
      window.removeEventListener('newSupportMessage', handler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleNewMessage]);
};

const SupportMessageSection: React.FC<Props> = ({
  allowComments = true,
  supportMessages = [],
  onAddComment,
  project_id = '',
}) => {
  const [comments, setComments] = useState<SupportMessage[]>(supportMessages);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [projectId, setProjectId] = useState<string>(project_id);

  const processedMessageIds = useRef<Set<string>>(new Set());
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    loadInitialComments();
  }, [projectId]);

  const loadInitialComments = useCallback(async () => {
    if (!projectId) return;
    if (hasLoadedInitial) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getSupportMessages(projectId, 50);

      if (response.success && response.data) {
        const sorted = [...response.data].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setComments(sorted);
        setHasLoadedInitial(true);

        processedMessageIds.current.clear();
        sorted.forEach((c) => c.id && processedMessageIds.current.add(c.id));
      } else {
        throw new Error(response.error || 'Error al cargar mensajes');
      }
    } catch (error) {
      console.error('❌ Error al cargar iniciales:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, hasLoadedInitial]);

  // 🔔 Manejar nuevos mensajes
  const handleNewMessage = useCallback(
    (eventData: any) => {
      if (!eventData || eventData.action !== 'add' || !eventData.message)
        return;

      const messageId = eventData.message.id || `temp-${Date.now()}`;

      if (processedMessageIds.current.has(messageId)) return;

      const newComment: SupportMessage = {
        id: messageId,
        author_name: eventData.message.author_name || 'Usuario',
        message: eventData.message.message || eventData.message.text || '',
        author_emoji: eventData.message.author_emoji || '👤',
        created_at: eventData.timestamp || new Date().toISOString(),
        is_from_contributor: eventData.message.is_from_contributor ?? false,
        is_approved: eventData.message.is_approved ?? true,
        updated_at: new Date().toISOString(),
      };

      processedMessageIds.current.add(messageId);

      setComments((prev) => [newComment, ...prev]);

      if (onAddComment) onAddComment(newComment);
    },
    [onAddComment]
  );

  useNewMessageListener(handleNewMessage);

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
            </div>
          )}

          <div
            className='comments-container'
            ref={commentsContainerRef}
          >
            {isLoading && <Spinner />}

            {!isLoading && comments.length === 0 ? (
              <div className='no-comments'>
                <p>👋 ¡Sé el primero en dejar un mensaje de apoyo!</p>
              </div>
            ) : (
              comments.map((comment, index) => (
                <div
                  key={comment.id || index}
                  className={`message-wrapper ${
                    index === 0 ? 'newest-message' : ''
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
              ))
            )}
          </div>

          <div className='comments-footer'>
            <small className='comments-count'>
              {comments.length === 0
                ? 'Sin mensajes aún'
                : `${comments.length} mensaje${
                    comments.length > 1 ? 's' : ''
                  } de apoyo`}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportMessageSection;
