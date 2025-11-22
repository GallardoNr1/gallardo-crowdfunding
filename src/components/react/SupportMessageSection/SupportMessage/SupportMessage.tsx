import React from 'react';
import './stye.css'; // Ensure the correct path to your CSS file

export interface SupportMessage {
  author: string;
  text: string;
  emoji: string;
  time?: string;
  isFromContributor?: boolean;
}

const SupportMessageComponent: React.FC<SupportMessage> = ({
  emoji,
  author,
  text,
  time = 'Hace 2 días',
  isFromContributor = false,
}) => {
  return (
    <div className='comment-item'>
      {isFromContributor && <span className='comment-bandage'>⭐</span>}
      <div className='comment-avatar'>{emoji}</div>
      <div className='comment-content'>
        <div className='comment-author'>{author}</div>
        <div className='comment-text'>{text}</div>
        <div className='comment-time'>{time}</div>
      </div>
    </div>
  );
};

export default SupportMessageComponent;
