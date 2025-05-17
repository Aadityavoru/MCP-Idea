import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import { getStateCenterCoordinates } from '../utils/mapUtils';

// USA GeoJSON map data
const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const ZoomedStateMap = ({ stateName }) => {
  const centerCoordinates = getStateCenterCoordinates(stateName);
  
  return (
    <div className="zoomed-map">
      <ComposableMap 
        projection="geoAlbersUsa"
        projectionConfig={{
          scale: 1000,
        }}
        style={{
          width: "100%",
          height: "auto",
        }}
      >
        <ZoomableGroup center={centerCoordinates} zoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: geo.properties.name === stateName ? "#4285F4" : "#E0E8F0",
                      stroke: "#FFFFFF",
                      strokeWidth: 0.5,
                      outline: "none"
                    },
                    hover: {
                      fill: geo.properties.name === stateName ? "#4285F4" : "#E0E8F0",
                      stroke: "#FFFFFF",
                      strokeWidth: 0.5,
                      outline: "none"
                    },
                    pressed: {
                      fill: geo.properties.name === stateName ? "#4285F4" : "#E0E8F0",
                      stroke: "#FFFFFF",
                      strokeWidth: 0.5,
                      outline: "none"
                    }
                  }}
                />
              ))
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export default ZoomedStateMap;