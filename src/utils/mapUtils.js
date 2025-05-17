// State center coordinates for map zooming
export const getStateCenterCoordinates = (stateName) => {
    // These coordinates are centers for states
    const stateCoordinates = {
      "California": [-119.4179, 36.7783],
      "New York": [-75.0152, 43.2994],
      "Texas": [-99.9018, 31.9686],
      "Florida": [-81.5158, 27.6648],
      "Illinois": [-89.3985, 40.6331],
      "Washington": [-120.7401, 47.7511],
      "Pennsylvania": [-77.1945, 41.2033],
      "Ohio": [-82.7755, 40.4173],
      "Michigan": [-84.5603, 44.3148],
      // Default coordinates (center of USA)
      "default": [-95.7129, 37.0902]
    };
    
    return stateCoordinates[stateName] || stateCoordinates.default;
  };