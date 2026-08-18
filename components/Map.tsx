"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, FeatureGroup } from "react-leaflet";
import L from "leaflet";
import { EditControl } from "react-leaflet-draw";

// Fix for default Leaflet marker icons not showing up correctly in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

type FeatureType = {
  id: string;
  layerId: string;
  title: string;
  description: string | null;
  iconUrl?: string | null;
  type: string;
  coordinates: string;
  layer?: {
    color?: string | null;
    iconUrl?: string | null;
  };
};

interface MapProps {
  features: FeatureType[];
  isAdmin?: boolean;
  onFeatureCreated?: (type: string, coordinates: any) => void;
  selectedLayerId?: string;
}

export default function Map({ features, isAdmin, onFeatureCreated, selectedLayerId }: MapProps) {
  const onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === "marker") {
      const latlng = layer.getLatLng();
      if (onFeatureCreated) onFeatureCreated("POINT", [latlng.lat, latlng.lng]);
    } else if (layerType === "polygon") {
      const latlngs = layer.getLatLngs()[0]; // Outer ring
      const coords = latlngs.map((ll: any) => [ll.lat, ll.lng]);
      if (onFeatureCreated) onFeatureCreated("POLYGON", coords);
    } else if (layerType === "polyline") {
      const latlngs = layer.getLatLngs();
      const coords = latlngs.map((ll: any) => [ll.lat, ll.lng]);
      if (onFeatureCreated) onFeatureCreated("LINESTRING", coords);
    }
    // Remove the drawn layer from the map so it can be re-rendered via features prop
    layer.remove();
  };

  return (
    <MapContainer center={[39.92077, 32.85411]} zoom={6} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {isAdmin && selectedLayerId && (
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={onCreated}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              polyline: true,
              polygon: true,
              marker: true,
            }}
          />
        </FeatureGroup>
      )}

      {features.map((feature) => {
        let coords;
        try {
          coords = JSON.parse(feature.coordinates);
        } catch (e) {
          return null;
        }

        const iconUrl = feature.iconUrl || feature.layer?.iconUrl;
        const customIcon = iconUrl
          ? new L.Icon({
              iconUrl: iconUrl,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32],
            })
          : new L.Icon.Default();

        const color = feature.layer?.color || "#3b82f6";

        if (feature.type === "POINT") {
          return (
            <Marker key={feature.id} position={coords} icon={customIcon}>
              <Popup>
                <h3 style={{ margin: "0 0 5px", fontSize: "16px", fontWeight: "bold" }}>{feature.title}</h3>
                <p style={{ margin: 0, fontSize: "14px" }}>{feature.description}</p>
              </Popup>
            </Marker>
          );
        } else if (feature.type === "POLYGON") {
          return (
            <Polygon key={feature.id} positions={coords} pathOptions={{ color, fillColor: color, fillOpacity: 0.4 }}>
              <Popup>
                <h3 style={{ margin: "0 0 5px", fontSize: "16px", fontWeight: "bold" }}>{feature.title}</h3>
                <p style={{ margin: 0, fontSize: "14px" }}>{feature.description}</p>
              </Popup>
            </Polygon>
          );
        } else if (feature.type === "LINESTRING") {
          return (
            <Polyline key={feature.id} positions={coords} pathOptions={{ color, weight: 5 }}>
              <Popup>
                <h3 style={{ margin: "0 0 5px", fontSize: "16px", fontWeight: "bold" }}>{feature.title}</h3>
                <p style={{ margin: 0, fontSize: "14px" }}>{feature.description}</p>
              </Popup>
            </Polyline>
          );
        }

        return null;
      })}
    </MapContainer>
  );
}
