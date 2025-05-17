import React, { useState } from 'react';
import ZoomedStateMap from './ZoomedStateMap';

const StateResponse = ({ data, stateName, onClose }) => {
  const [userQuestion, setUserQuestion] = useState("");
  
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    console.log("Follow-up question:", userQuestion);
    setUserQuestion("");
  };
  
  return (
    <div className="state-response">
      <div className="state-response-header">
        <h2 className="state-title">{stateName}</h2>
        <div className="main-topic">
          <span className="topic-label">Main focus:</span> {data.mainTopic}
        </div>
      </div>
      
      <div className="state-response-content">
        <div className="map-column">
          <ZoomedStateMap stateName={stateName} />
          
          <div className="sources-section">
            <h3 className="sources-title">Sources</h3>
            <div className="sources-list">
              {data.sources.map((source, index) => (
                <div key={index} className="source-item">
                  <span className="source-name">{source.name}</span>
                  <span className={`source-leaning ${source.leaning.toLowerCase().replace('-', '-')}`}>
                    {source.leaning}
                  </span>
                </div>
              ))}
            </div>
            <div className="sources-note">
              <small>
                <strong>Note:</strong> Media bias labels are approximate and based on multiple media bias charts.
              </small>
            </div>
          </div>
        </div>
        
        <div className="chat-column">
          <div className="chat-bubble">
            <h3 className="response-title">{data.title}</h3>
            <p className="response-summary">{data.summary}</p>
          </div>
          
          <div className="chat-avatar-container">
            <div className="chat-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <p>I can provide more details about {stateName}'s perspective. What would you like to know?</p>
          </div>
          
          <div className="questions-container">
            {data.suggestedQuestions.map((question, index) => (
              <button 
                key={index} 
                className="question-button"
              >
                {question}
              </button>
            ))}
          </div>
          
          <div className="question-input-container">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Ask a follow-up"
              className="question-input"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button 
              className="send-button"
              onClick={handleSubmit}
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateResponse;