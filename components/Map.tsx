"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, FeatureGroup, LayersControl, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { EditControl } from "react-leaflet-draw";

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
    id?: string | null;
    name?: string | null;
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

function ZoomHandler({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => {
      onZoom(e.target.getZoom());
    },
  });
  return null;
}

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

// 10 Farklı Kategori için Özel SVG İkon Yolları (Asla karışmaz ve yüksek çözünürlüklü)
const SVG_ICONS: Record<string, string> = {
  // 1. İşçi Direnişi / Grev: Havaya kalkmış işçi yumruğu
  fist: `<path fill="currentColor" d="M12 2C8 2 6 5 6 7c0 .7.2 1.3.5 1.8C5.6 9.4 5 10.3 5 11.5c0 .8.3 1.5.8 2.1-.5.6-.8 1.4-.8 2.4 0 2.2 1.8 4 4 4h5c3.3 0 6-2.7 6-6V9c0-1.7-1.3-3-3-3-.3 0-.7.1-1 .2C15.6 4.4 14 3 12 2zm0 2c1 0 2 .7 2 2v2h-1V6c0-.6-.4-1-1-1s-1 .4-1 1v2H9V7c0-1.7 1.3-3 3-3z"/>`,
  // 2. Ekoloji / Çevre Mücadelesi: Yaşam yaprağı
  leaf: `<path fill="currentColor" d="M17 2C10 2 5 7 5 14c0 1.5.3 3 .8 4.2L3 21l2.8-2.8c1.2.5 2.7.8 4.2.8 7 0 12-5 12-12 0-2.8-1.5-5.5-5-5zm-3 14c-2.8 0-5.2-1.6-6.4-4 2.2-.4 4.4-1.6 5.8-3.4 1.4-1.8 2-4.1 1.6-6.6 2.5 1.3 4 3.7 4 6 0 4.4-2.2 8-5 8z"/>`,
  // 3. İş Cinayeti Davası / Adalet: Hukuk terazisi
  scale: `<path fill="currentColor" d="M12 2v2H4c-.6 0-1 .4-1 1v1c0 2.2 1.8 4 4 4h.2c-1.3 1.2-2.2 3-2.2 5v2h14v-2c0-2-.9-3.8-2.2-5h.2c2.2 0 4-1.8 4-4V5c0-.6-.4-1-1-1h-8V2h-2zm-5 6H5c-.6 0-1-.4-1-1V6h4v1c0 .6-.4 1-1 1zm10 0h-2c-.6 0-1-.4-1-1V6h4v1c0 .6-.4 1-1 1z"/>`,
  // 4. Hapishane Direnişleri: Kilit
  lock: `<path fill="currentColor" d="M12 2C9.2 2 7 4.2 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.8-2.2-5-5-5zm0 2c1.7 0 3 1.3 3 3v3H9V7c0-1.7 1.3-3 3-3zm0 10c1.1 0 2 .9 2 2 0 .7-.4 1.4-1 1.7V19h-2v-1.3c-.6-.3-1-1-1-1.7 0-1.1.9-2 2-2z"/>`,
  // 5. Kayıp Yakınları / Adalet Nöbeti: Kalp
  heart: `<path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`,
  // 6. Organize Sanayi Bölgesi (OSB): Fabrika
  industry: `<path fill="currentColor" d="M4 22V10l5 3V8l5 3V2h6v20H4zm8-4h2v-2h-2v2zm0-4h2v-2h-2v2zm4 4h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2z"/>`,
  // 7. Teknokent (TGB): Deney Tüpü
  flask: `<path fill="currentColor" d="M19 19L14 9V4h1V2H9v2h1v5l-5 10c-.8 1.4.2 3.2 1.8 3.2h10.4c1.6 0 2.6-1.8 1.8-3.2zm-7.9-6l2.1 4.2c.2.4-.1.8-.5.8H7.3c-.4 0-.7-.4-.5-.8L8.9 13h2.2z"/>`,
  // 8. Endüstri Bölgesi (EB): Depo / Tesis
  warehouse: `<path fill="currentColor" d="M12 3L2 9v12h20V9L12 3zm0 2.5L18.5 9H5.5L12 5.5zM19 19h-4v-5h-6v5H5v-8.2l7-4.2 7 4.2V19z"/>`,
  // 9. Ön Tahsis: Pusula / Cetvel
  compass: `<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.19V17h-2v-.81c-2.36-.45-4.18-2.27-4.63-4.63H7v-2h-.63C6.82 7.18 8.64 5.36 11 4.91V4h2v.91c2.36.45 4.18 2.27 4.63 4.63H17v2h.63c-.45 2.36-2.27 4.18-4.63 4.65z"/>`,
  // 10. Yatırım Alanı: Yıldız
  star: `<path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>`,
  // 11. Varsayılan Konum Pini
  pin: `<path fill="currentColor" d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"/>`
};

// Katman ID, Katman Adı veya Başlıktan otomatik ayırt edici kategori seçen fonksiyon
function getIconAndColor(feature: FeatureType): { iconKey: string; color: string; label: string } {
  const layerId = (feature.layerId || feature.layer?.id || "").toLowerCase();
  const layerName = (feature.layer?.name || "").toLowerCase();
  const title = (feature.title || "").toLowerCase();
  const desc = (feature.description || "").toLowerCase();

  // 1. İşçi Direnişleri ve Grevler (Kırmızı)
  if (layerId.includes("isci") || layerName.includes("işçi") || title.includes("grev") || title.includes("işçi") || desc.includes("grev")) {
    return { iconKey: "fist", color: "#dc2626", label: "İşçi Direnişi" };
  }
  // 2. Ekoloji Mücadeleleri (Canlı Doğa Yeşili)
  if (layerId.includes("ekoloji") || layerName.includes("ekoloji") || title.includes("maden") || title.includes("orman") || title.includes("jes") || desc.includes("ekoloji")) {
    return { iconKey: "leaf", color: "#16a34a", label: "Ekoloji Mücadelesi" };
  }
  // 3. İş Cinayeti Davaları (Koyu Grafit / Adalet Siyahı)
  if (layerId.includes("cinayet") || layerName.includes("cinayet") || title.includes("katliam") || title.includes("cinayeti") || desc.includes("iş cinayeti")) {
    return { iconKey: "scale", color: "#0f172a", label: "İş Cinayeti Davası" };
  }
  // 4. Hapishane Direnişleri (Canlı Turuncu)
  if (layerId.includes("hapishane") || layerName.includes("hapishane") || title.includes("açlık grevi") || title.includes("mahpus") || desc.includes("hapishane")) {
    return { iconKey: "lock", color: "#ea580c", label: "Hapishane Direnişi" };
  }
  // 5. Kayıp Yakınları / Adalet Nöbetleri (Asil Derin Mor)
  if (layerId.includes("kayip") || layerName.includes("kayıp") || title.includes("anneleri") || title.includes("adalet") || desc.includes("kayıp")) {
    return { iconKey: "heart", color: "#9333ea", label: "Kayıp Yakınları / Adalet" };
  }

  // 6. Organize Sanayi Bölgesi (Sanayi Mavisi)
  if (layerId.includes("osb") || layerName.includes("organize") || layerName.includes("osb") || title.includes("osb")) {
    return { iconKey: "industry", color: "#2563eb", label: "OSB" };
  }
  // 7. Teknokent (TGB - Neon Mor)
  if (layerId.includes("tgb") || layerName.includes("teknoloji") || layerName.includes("tgb") || title.includes("teknokent")) {
    return { iconKey: "flask", color: "#7c3aed", label: "Teknokent" };
  }
  // 8. Endüstri Bölgesi (EB - Zümrüt Yeşili)
  if (layerId.includes("eb") || layerName.includes("endüstri") || layerName.includes("eb")) {
    return { iconKey: "warehouse", color: "#059669", label: "Endüstri Bölgesi" };
  }
  // 9. Ön Tahsis Alanı (Kehribar)
  if (layerId.includes("ontahsis") || layerName.includes("tahsis")) {
    return { iconKey: "compass", color: "#d97706", label: "Ön Tahsis Alanı" };
  }
  // 10. Yatırım Alanı (Açık Mavi)
  if (layerId.includes("yatirim") || layerName.includes("yatırım")) {
    return { iconKey: "star", color: "#0284c7", label: "Yatırım Alanı" };
  }

  const defaultColor = feature.layer?.color || "#3b82f6";
  return { iconKey: "pin", color: defaultColor, label: feature.layer?.name || "Konum" };
}

// Bütün haritalarda (tek veya birleşik) ASLA karışmayan, son derece şık damla pin ikonu
function createDistinctPin(color: string, iconKey: string) {
  const svgPath = SVG_ICONS[iconKey] || SVG_ICONS.pin;
  return L.divIcon({
    className: "custom-distinct-pin-marker",
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease-out;
      ">
        <svg viewBox="0 0 24 24" style="
          width: 17px;
          height: 17px;
          fill: #ffffff;
          transform: rotate(45deg);
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
        ">
          ${svgPath}
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function Map({ features, isAdmin, onFeatureCreated, selectedLayerId }: MapProps) {
  const [currentZoom, setCurrentZoom] = useState(6);
  const ZOOM_THRESHOLD = 10;

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
    <MapContainer center={[39.0, 35.2]} zoom={6} style={{ height: "100%", width: "100%" }}>
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

        const { iconKey, color, label } = getIconAndColor(feature);
        const distinctPinIcon = createDistinctPin(color, iconKey);

        if (feature.type === "POINT") {
          return (
            <Marker key={feature.id} position={coords} icon={distinctPinIcon}>
              <Popup>
                <div style={{ minWidth: "220px", padding: "4px" }}>
                  <div style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#ffffff",
                    background: color,
                    marginBottom: "6px"
                  }}>
                    {feature.layer?.name || label}
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "bold", color: "#1e293b" }}>
                    {feature.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                    {feature.description}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        } else if (feature.type === "POLYGON") {
          // Uzak Zoom (< 10): Ayırt Edici Pin Simgesi
          if (currentZoom < ZOOM_THRESHOLD) {
            const center = getPolygonCenter(coords);
            if (!center) return null;

            return (
              <Marker key={`pin-${feature.id}`} position={center} icon={distinctPinIcon}>
                <Popup>
                  <div style={{ minWidth: "220px", padding: "4px" }}>
                    <div style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#ffffff",
                      background: color,
                      marginBottom: "6px"
                    }}>
                      {feature.layer?.name || label}
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "bold", color: "#1e293b" }}>
                      {feature.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                      {feature.description}
                    </p>
                    <small style={{ color: "#64748b", marginTop: "6px", display: "block" }}>
                      🔍 Sınırları görmek için haritada yaklaşın
                    </small>
                  </div>
                </Popup>
              </Marker>
            );
          }

          // Yakın Zoom (>= 10): Gerçek Poligon Sınır Alanı
          return (
            <Polygon key={feature.id} positions={coords} pathOptions={{ color, fillColor: color, fillOpacity: 0.4 }}>
              <Popup>
                <div style={{ minWidth: "220px", padding: "4px" }}>
                  <div style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#ffffff",
                    background: color,
                    marginBottom: "6px"
                  }}>
                    {feature.layer?.name || label}
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "bold", color: "#1e293b" }}>
                    {feature.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                    {feature.description}
                  </p>
                </div>
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
