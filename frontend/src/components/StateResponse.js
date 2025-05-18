import React, { useState, useEffect } from 'react';
import ZoomedStateMap from './ZoomedStateMap';
import SentimentBar from './SentimentBar';
import { sendFollowUpQuestion } from '../services/newsService';

const StateResponse = ({ data, stateName, searchTopic, onClose }) => {
  const [userQuestion, setUserQuestion] = useState("");
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [followUpData, setFollowUpData] = useState(null);
  const [personalizedQuestions, setPersonalizedQuestions] = useState([]);
  
  // Generate personalized questions based on article content
  useEffect(() => {
    if (data && data.length > 0) {
      const newQuestions = [];
      
      // Look for specific themes in the articles
      const allText = data.map(article => 
        (article.summary || "") + " " + (article.headline || "")
      ).join(" ").toLowerCase();
      
      // Legal challenges
      if (allText.includes("sue") || allText.includes("lawsuit") || allText.includes("legal")) {
        newQuestions.push(`What legal challenges is ${stateName} pursuing against the tariffs?`);
      }
      
      // Economic impact
      if (allText.includes("economy") || allText.includes("economic") || allText.includes("business")) {
        newQuestions.push(`How will the tariffs specifically impact ${stateName}'s economy?`);
      }
      
      // Agriculture
      if (allText.includes("farm") || allText.includes("agriculture") || allText.includes("crop")) {
        newQuestions.push(`Which agricultural products in ${stateName} are most affected?`);
      }
      
      // Governor's response
      if (allText.includes("governor") || allText.includes("newsom")) {
        newQuestions.push(`What steps is the governor of ${stateName} taking in response?`);
      }
      
      // Add generic questions if we don't have enough specific ones
      if (newQuestions.length < 3) {
        newQuestions.push(`What industries in ${stateName} will be most affected by the tariffs?`);
        newQuestions.push(`How do ${stateName} residents feel about the new tariffs?`);
        newQuestions.push(`What alternatives is ${stateName} exploring to mitigate tariff impacts?`);
      }
      
      // Limit to 3 questions
      setPersonalizedQuestions(newQuestions.slice(0, 3));
    }
  }, [data, stateName]);
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!userQuestion.trim()) return;
    
    const question = userQuestion;
    setUserQuestion("");
    
    // Add user question to conversation
    setConversation(prev => [...prev, { 
      role: 'user', 
      content: question,
      timestamp: new Date().toISOString()
    }]);
    
    // Show loading state
    setIsLoading(true);
    
    try {
      // Call API with follow-up question as a new topic
      const response = await sendFollowUpQuestion(
        question, 
        searchTopic,
        stateName
      );
      
      // Store the follow-up data
      setFollowUpData(response.data);
      
      // Create answer from response data
      let answer = "";
      
      if (response.data && response.data.length > 0) {
        // Create a summarized response
        answer = `Here's what I found about "${question}" in ${stateName}:`;
        
        // Add assistant message to conversation
        setConversation(prev => [...prev, { 
          role: 'assistant', 
          content: answer,
          timestamp: new Date().toISOString(),
          articles: response.data
        }]);
      } else if (response.error_message) {
        answer = `I'm sorry, I encountered an error: ${response.error_message}`;
        setConversation(prev => [...prev, { 
          role: 'assistant', 
          content: answer,
          timestamp: new Date().toISOString()
        }]);
      } else {
        answer = `I couldn't find specific information about "${question}" in ${stateName}'s news sources. Is there something else you'd like to know about ${searchTopic} in ${stateName}?`;
        setConversation(prev => [...prev, { 
          role: 'assistant', 
          content: answer,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      // Handle error
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: `I'm sorry, I couldn't process your question. Please try again later.`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle clicking a suggested question
  const handleSuggestedQuestion = (question) => {
    setUserQuestion(question);
    setTimeout(() => handleSubmit(), 100);
  };
  
  // Calculate overall sentiment based on weighted average of all sources
  const calculateSentiment = (articles) => {
    const articlesToAnalyze = articles || data;
    
    if (!articlesToAnalyze || articlesToAnalyze.length === 0) return 0;
    
    // Convert text sentiments to numeric values and calculate weighted average
    let sentimentSum = 0;
    let articleCount = 0;
    
    articlesToAnalyze.forEach(article => {
      // If sentiment is already a number, use it directly
      if (typeof article.sentiment === 'number') {
        sentimentSum += article.sentiment;
        articleCount++;
      } 
      // Convert text sentiment to numeric value
      else if (typeof article.sentiment === 'string') {
        const sentimentText = article.sentiment.toLowerCase();
        
        if (sentimentText === 'positive') {
          sentimentSum += 1;
          articleCount++;
        } else if (sentimentText === 'negative') {
          sentimentSum += -1;
          articleCount++;
        } else if (sentimentText === 'neutral') {
          sentimentSum += 0;
          articleCount++;
        }
        // Skip if sentiment is N/A or unrecognized
      }
    });
    
    // Return weighted average, or 0 if no valid sentiments
    return articleCount > 0 ? sentimentSum / articleCount : 0;
  };
  
  // Extract main topics from the articles
  const getMainTopic = () => {
    if (data && data.length > 0) {
      // Find common themes in summaries
      const summaries = data.map(article => article.summary);
      
      if (summaries.some(s => s.toLowerCase().includes("agriculture") || s.toLowerCase().includes("farm"))) {
        return "Agricultural Impact";
      } else if (summaries.some(s => s.toLowerCase().includes("economy"))) {
        return "Economic Impact";
      } else if (summaries.some(s => s.toLowerCase().includes("lawsuit") || s.toLowerCase().includes("sue"))) {
        return "Legal Challenges";
      }
      
      return "Regional Response";
    }
    return "State Perspective";
  };
  
  const sentiment = calculateSentiment();
  
  // Get the latest set of articles (either initial or from last follow-up)
  const currentArticles = followUpData || data;
  
  return (
    <div className="state-response">
      <div className="state-response-header">
        <h2 className="state-title">{stateName}</h2>
        <div className="main-topic">
          <span className="topic-label">Main focus:</span> {getMainTopic()}
        </div>
        <div className="search-topic">
          <span className="topic-label">Topic:</span> {searchTopic}
        </div>
        
        {/* Sentiment bar placed below state info */}
        <SentimentBar sentiment={sentiment} />
      </div>
      
      <div className="state-response-content">
        <div className="map-column">
          <ZoomedStateMap stateName={stateName} />
          
          <div className="sources-section">
            <h3 className="sources-title">News Sources</h3>
            <div className="sources-list">
              {currentArticles.map((article, index) => (
                <div key={index} className="source-item">
                  <span className="source-name">{article.source_domain}</span>
                  {article.source_background && (
                    <div className="source-background-tooltip">
                      <span className="info-icon">ⓘ</span>
                      <div className="tooltip-content">
                        {article.source_background}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="sources-note">
              <small>
                <strong>Note:</strong> Source data provided by news analysis API. Hover over the info icon to see more about each source.
              </small>
            </div>
          </div>
        </div>
        
        <div className="chat-column">
          {/* Initial news articles if no conversation yet */}
          {conversation.length === 0 && (
            <div className="news-articles">
              {data.map((article, index) => (
                <div key={index} className="article-item">
                  <h3 className="article-title">
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.headline}
                    </a>
                  </h3>
                  <p className="article-summary">{article.summary}</p>
                  <div className="article-source">Source: {article.source_domain}</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Conversation history */}
          {conversation.length > 0 && (
            <div className="conversation-history">
              {conversation.map((message, index) => (
                <div 
                  key={index} 
                  className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  <div className="message-content">
                    <p>{message.content}</p>
                    
                    {/* Show articles if available in assistant message */}
                    {message.role === 'assistant' && message.articles && (
                      <div className="message-articles">
                        {message.articles.map((article, artIndex) => (
                          <div key={artIndex} className="message-article-item">
                            <h4>
                              <a href={article.url} target="_blank" rel="noopener noreferrer">
                                {article.headline}
                              </a>
                            </h4>
                            <p>{article.summary}</p>
                            <small>Source: {article.source_domain}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Initial greeting or loading indicator */}
          <div className="chat-avatar-container">
            <div className="chat-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            {isLoading ? (
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <p>I can provide more details about {stateName}'s perspective on {searchTopic}. What would you like to know?</p>
            )}
          </div>
          
          {/* Suggested questions */}
          <div className="questions-container">
            {personalizedQuestions.map((question, index) => (
              <button 
                key={index} 
                className="question-button"
                onClick={() => handleSuggestedQuestion(question)}
                disabled={isLoading}
              >
                {question}
              </button>
            ))}
          </div>
          
          {/* Question input */}
          <div className="question-input-container">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder={`Ask about ${searchTopic} in ${stateName}...`}
              className="question-input"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={isLoading}
            />
            <button 
              className={`send-button ${isLoading ? 'disabled' : ''}`}
              onClick={handleSubmit}
              aria-label="Send message"
              disabled={isLoading}
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