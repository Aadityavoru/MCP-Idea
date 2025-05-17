import React, { useState } from 'react';
import './App.css';

// Import components
import SearchBar from './components/SearchBar';
import RecentArticles from './components/RecentArticles';
import USAMap from './components/USAMap';
import StateResponse from './components/StateResponse';
import Modal from './components/Modal';

// Import data sources
import { mockNewsArticles } from './data/newsArticles';
import { mockStateResponses } from './data/stateResponses';

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleSearch = (query) => {
    setSearchQuery(query);
    setShowMap(true);
  };
  
  const handleStateClick = (stateName) => {
    setSelectedState(stateName);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    // Don't clear selectedState immediately to avoid animation issues
    setTimeout(() => setSelectedState(null), 300);
  };
  
  // Get state response data
  const getStateResponseData = (stateName) => {
    return mockStateResponses[stateName] || mockStateResponses.default;
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
        <USAMap 
          onStateClick={handleStateClick} 
          isVisible={showMap}
        />
      )}
      
      {selectedState && (
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <StateResponse 
            data={getStateResponseData(selectedState)}
            stateName={selectedState}
            onClose={closeModal}
          />
        </Modal>
      )}
    </div>
  );
}

export default App;