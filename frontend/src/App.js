import React, { useState } from 'react';
import './App.css';

// Import components
import SearchBar from './components/SearchBar';
import RecentArticles from './components/RecentArticles';
import USAMap from './components/USAMap';
import StateResponse from './components/StateResponse';
import Modal from './components/Modal';
import LoadingSpinner from './components/LoadingSpinner';

// Import data sources
import { mockNewsArticles } from './data/newsArticles';

// Import API service
import { fetchNewsAnalysis } from './services/newsService';

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stateNewsData, setStateNewsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSearch = (query) => {
    setSearchQuery(query);
    setShowMap(true);
  };
  
  const handleStateClick = async (stateName) => {
    setSelectedState(stateName);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchNewsAnalysis(searchQuery, stateName);
      setStateNewsData(result.data);
      setIsModalOpen(true);
    } catch (err) {
      setError(`Failed to load news for ${stateName}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    // Don't clear selectedState immediately to avoid animation issues
    setTimeout(() => {
      setSelectedState(null);
      setStateNewsData(null);
    }, 300);
  };
  
  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">US News Explorer</h1>
      </header>
      
      <SearchBar 
        onSearch={handleSearch} 
        initialQuery={searchQuery || ""}
      />
      
      {!searchQuery ? (
        <RecentArticles articles={mockNewsArticles} />
      ) : (
        <>
          <USAMap 
            onStateClick={handleStateClick} 
            isVisible={showMap && !isLoading}
          />
          
          {isLoading && <LoadingSpinner />}
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
        </>
      )}
      
      {selectedState && stateNewsData && (
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <StateResponse 
            data={stateNewsData}
            stateName={selectedState}
            searchTopic={searchQuery}
            onClose={closeModal}
          />
        </Modal>
      )}
    </div>
  );
}

export default App;