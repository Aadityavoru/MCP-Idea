import React from 'react';

const SentimentBar = ({ sentiment, label = true }) => {
  // Normalize sentiment to a value between -1 (negative) and 1 (positive)
  const normalizedSentiment = typeof sentiment === 'number'
    ? Math.max(-1, Math.min(1, sentiment)) 
    : 0;
  
  // Calculate the position of the indicator (50% is neutral)
  const indicatorPosition = ((normalizedSentiment + 1) / 2) * 100;
  
  // Determine the gradient colors based on the sentiment
  const getGradientColor = () => {
    return `linear-gradient(to right, 
      #EF4444 0%, 
      #F59E0B 33%, 
      #FBBF24 45%, 
      #D1D5DB 50%, 
      #A3E635 55%, 
      #34D399 67%, 
      #10B981 100%)`;
  };

  // Determine the sentiment label
  const getSentimentLabel = () => {
    if (normalizedSentiment > 0.33) return "Positive";
    if (normalizedSentiment < -0.33) return "Negative";
    return "Neutral";
  };
  
  return (
    <div className="sentiment-container-compact">
      <div className="sentiment-header-compact">
        <span className="sentiment-title-compact">Public Opinion:</span>
        <span className={`sentiment-label-compact ${getSentimentLabel().toLowerCase()}`}>
          {getSentimentLabel()}
        </span>
        {typeof normalizedSentiment === 'number' && (
          <span className="sentiment-score-compact">
            {(normalizedSentiment * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="sentiment-bar-container">
        <div className="sentiment-labels-compact">
          <span>-</span>
          <span>+</span>
        </div>
        <div 
          className="sentiment-bar-compact"
          style={{ background: getGradientColor() }}
        >
          <div 
            className="sentiment-indicator-compact"
            style={{ left: `${indicatorPosition}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SentimentBar;