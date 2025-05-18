import React, { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";

// USA GeoJSON map data
const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const USAMap = ({ onStateClick, isVisible }) => {
  const [hoveredState, setHoveredState] = useState(null);
  
  return (
    <div className={`map-container ${isVisible ? 'map-visible' : 'map-hidden'}`}>
      <ComposableMap 
        projection="geoAlbersUsa"
        projectionConfig={{
          scale: 1000,
        }}
        style={{
          width: "100%",
          height: "100%"
        }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => {
                const isHovered = geo.properties.name === hoveredState;
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      onStateClick(geo.properties.name);
                    }}
                    onMouseEnter={() => {
                      setHoveredState(geo.properties.name);
                    }}
                    onMouseLeave={() => {
                      setHoveredState(null);
                    }}
                    style={{
                      default: {
                        fill: "#E0E8F0",
                        stroke: "#FFFFFF",
                        strokeWidth: 0.5,
                        outline: "none"
                      },
                      hover: {
                        fill: "#4285F4",
                        stroke: "#FFFFFF",
                        strokeWidth: 0.5,
                        outline: "none"
                      },
                      pressed: {
                        fill: "#3367D6",
                        stroke: "#FFFFFF",
                        strokeWidth: 0.5,
                        outline: "none"
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      
      {hoveredState && (
        <div className="map-tooltip">
          <div className="tooltip-state">{hoveredState}</div>
          <div className="tooltip-hint">Click to analyze news</div>
        </div>
      )}
    </div>
  );
};

export default USAMap;