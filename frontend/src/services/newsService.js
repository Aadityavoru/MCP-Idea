// src/services/newsService.js

// Function to fetch news analysis from the API
export const fetchNewsAnalysis = async (topic, state) => {
    try {
      const response = await fetch('http://192.168.3.141:8000/api/analyze-news/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          topic: topic,
          country: state  // The API uses 'country' parameter for states
        })
      });
  
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching news analysis:', error);
      throw error;
    }
  };
  
  // Function to handle follow-up questions as new topics while referencing original
  export const sendFollowUpQuestion = async (question, originalTopic, state) => {
    try {
      // Create a new topic that includes both the question and reference to original topic
      const newTopic = `${question} regarding ${originalTopic} in ${state}`;
      
      const response = await fetch('http://192.168.3.141:8000/api/analyze-news/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          topic: newTopic,
          country: state
        })
      });
  
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending follow-up question:', error);
      throw error;
    }
  };