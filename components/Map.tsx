"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, FeatureGroup, LayersControl, useMapEvents } from "react-leaflet";
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

// Zoom seviyesini anlik takip eden bilesen
function ZoomHandler({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoom(e.target.getZoom());
    },
  });
  return null;
}

// Poligonun agirlik merkezini hesaplar
function getPolygonCenter(coords: any): [number, number] | null {
  try {
    let points: [number, number][] = [];
    const extractPoints = (arr: any) => {
      if (!Array.isArray(arr)) return;
      if (arr.length >= 2 && typeof arr[0] === "number" && typeof arr[1] === "number") {
        points.push([arr[0], arr[1]]);
      } else {
        arr.forEach(extractPoints);
      }
    };
    extractPoints(coords);

    if (points.length === 0) return null;
    let sumLat = 0;
    let sumLng = 0;
    points.forEach(([lat, lng]) => {
      sumLat += lat;
      sumLng += lng;
    });
    return [sumLat / points.length, sumLng / points.length];
  } catch {
    return null;
  }
}

// Katman rengine gore modern pin ikonu uretir
function createPinIcon(color: string = "#3b82f6") {
  return L.divIcon({
    className: "custom-polygon-pin",
    html: `
      <div style="
        background: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

export default function Map({ features, isAdmin, onFeatureCreated, selectedLayerId }: MapProps) {
  const [currentZoom, setCurrentZoom] = useState(6);
  const ZOOM_THRESHOLD = 10; // Zoom < 10: Pin, Zoom >= 10: Alan (Polygon)

  const onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === "marker") {
      const latlng = layer.getLatLng();
      if (onFeatureCreated) onFeatureCreated("POINT", [latlng.lat, latlng.lng]);
    } else if (layerType === "polygon") {
      const latlngs = layer.getLatLngs()[0];
      const coords = latlngs.map((ll: any) => [ll.lat, ll.lng]);
      if (onFeatureCreated) onFeatureCreated("POLYGON", coords);
    } else if (layerType === "polyline") {
      const latlngs = layer.getLatLngs();
      const coords = latlngs.map((ll: any) => [ll.lat, ll.lng]);
      if (onFeatureCreated) onFeatureCreated("LINESTRING", coords);
    }
    layer.remove();
  };

  return (
    <MapContainer center={[39.92077, 32.85411]} zoom={6} style={{ height: "100%", width: "100%" }}>
      <ZoomHandler onZoom={setCurrentZoom} />

      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Standart Harita (OpenStreetMap)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Uydu Görünümü (Esri Satellite)">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Topografik (OpenTopoMap)">
          <TileLayer
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            maxZoom={17}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

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
          // Uzakta iken Pin, yakinda iken Alan goster
          if (currentZoom < ZOOM_THRESHOLD) {
            const center = getPolygonCenter(coords);
            if (!center) return null;

            const polygonPinIcon = iconUrl ? customIcon : createPinIcon(color);

            return (
              <Marker key={`pin-${feature.id}`} position={center} icon={polygonPinIcon}>
                <Popup>
                  <h3 style={{ margin: "0 0 5px", fontSize: "16px", fontWeight: "bold", color }}>{feature.title}</h3>
                  <p style={{ margin: 0, fontSize: "14px" }}>{feature.description}</p>
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>🔍 Sınırları görmek için haritada yaklaşın</small>
                </Popup>
              </Marker>
            );
          }

          return (
            <Polygon key={feature.id} positions={coords} pathOptions={{ color, fillColor: color, fillOpacity: 0.4 }}>
              <Popup>
                <h3 style={{ margin: "0 0 5px", fontSize: "16px", fontWeight: "bold", color }}>{feature.title}</h3>
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
