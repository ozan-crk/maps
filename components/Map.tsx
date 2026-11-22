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

// maps22 ile BİREBİR AYNI - FontAwesome İkon ve Kategori Belirleyici
function getIconAndColor(feature: FeatureType): { iconClass: string; color: string; label: string } {
  const layerId = (feature.layerId || feature.layer?.id || "").toLowerCase();
  const layerName = (feature.layer?.name || "").toLowerCase();
  const title = (feature.title || "").toLowerCase();
  const desc = (feature.description || "").toLowerCase();

  // 1. İşçi Direnişleri ve Grevler (Canlı Kırmızı + Yumruk)
  if (layerId.includes("isci") || layerName.includes("işçi") || title.includes("grev") || title.includes("işçi") || desc.includes("grev")) {
    return { iconClass: "fa-fist-raised", color: "#dc2626", label: "İşçi Direnişi / Grev" };
  }
  // 2. Ekoloji Mücadeleleri (Doğa Yeşili + Yaprak)
  if (layerId.includes("ekoloji") || layerName.includes("ekoloji") || title.includes("maden") || title.includes("orman") || title.includes("jes") || desc.includes("ekoloji")) {
    return { iconClass: "fa-leaf", color: "#16a34a", label: "Ekoloji Mücadelesi" };
  }
  // 3. İş Cinayeti Davaları (Koyu Grafit / Adalet Siyahı + Terazi)
  if (layerId.includes("cinayet") || layerName.includes("cinayet") || title.includes("katliam") || title.includes("cinayeti") || desc.includes("iş cinayeti")) {
    return { iconClass: "fa-scale-balanced", color: "#1e293b", label: "İş Cinayeti Davası" };
  }
  // 4. Hapishane Direnişleri (Canlı Turuncu + Kilit)
  if (layerId.includes("hapishane") || layerName.includes("hapishane") || title.includes("açlık grevi") || title.includes("mahpus") || desc.includes("hapishane")) {
    return { iconClass: "fa-lock", color: "#ea580c", label: "Hapishane Direnişi" };
  }
  // 5. Kayıp Yakınları / Adalet Nöbetleri (Asil Derin Mor + Kalp)
  if (layerId.includes("kayip") || layerName.includes("kayıp") || title.includes("anneleri") || title.includes("adalet") || desc.includes("kayıp")) {
    return { iconClass: "fa-heart", color: "#9333ea", label: "Kayıp Yakınları / Adalet" };
  }

  // 6. Organize Sanayi Bölgesi (Sanayi Mavisi + Fabrika)
  if (layerId.includes("osb") || layerName.includes("organize") || layerName.includes("osb") || title.includes("osb")) {
    return { iconClass: "fa-industry", color: "#2563eb", label: "Organize Sanayi Bölgesi" };
  }
  // 7. Teknokent (TGB - Neon Mor + Deney Tüpü)
  if (layerId.includes("tgb") || layerName.includes("teknoloji") || layerName.includes("tgb") || title.includes("teknokent")) {
    return { iconClass: "fa-flask", color: "#7c3aed", label: "Teknoloji Geliştirme Bölgesi" };
  }
  // 8. Endüstri Bölgesi (EB - Zümrüt Yeşili + Depo / Tesis)
  if (layerId.includes("eb") || layerName.includes("endüstri") || layerName.includes("eb")) {
    return { iconClass: "fa-warehouse", color: "#059669", label: "Endüstri Bölgesi" };
  }
  // 9. Ön Tahsis Alanı (Kehribar + Pusula / Plan)
  if (layerId.includes("ontahsis") || layerName.includes("tahsis")) {
    return { iconClass: "fa-drafting-compass", color: "#d97706", label: "Ön Tahsis Alanı" };
  }
  // 10. Yatırım Alanı (Açık Mavi + Çanta)
  if (layerId.includes("yatirim") || layerName.includes("yatırım")) {
    return { iconClass: "fa-briefcase", color: "#0284c7", label: "Yatırım Alanı" };
  }

  // 11. Ekstraktivizm: Maden İhale Alanları (MAPEG - Çekiç / Balyoz)
  if (layerId.includes("ekst_ihaleler") || layerName.includes("ihale")) {
    return { iconClass: "fa-hammer", color: "#dc2626", label: "Maden İhale Alanı (MAPEG)" };
  }
  // 12. Ekstraktivizm: ÇED Maden Projeleri
  if (layerId.includes("ekst_ced") || layerName.includes("çed")) {
    return { iconClass: "fa-flask", color: "#059669", label: "ÇED Maden Projesi" };
  }
  // 13. Ekstraktivizm: Taşınmaz & Ruhsat Kararları (Sözleşme / Belge)
  if (layerId.includes("ekst_tasinmaz") || layerName.includes("taşınmaz")) {
    return { iconClass: "fa-file-contract", color: "#2563eb", label: "Taşınmaz Kararı" };
  }
  // 14. Ekstraktivizm: Korunan Alanlar & Milli Parklar (DKMP - Ağaç)
  if (layerId.includes("ekst_dkmp") || layerName.includes("koruma") || layerName.includes("milli park")) {
    return { iconClass: "fa-tree", color: "#16a34a", label: "Milli Park & Koruma (DKMP)" };
  }
  // 15. Ekstraktivizm: Su Havzaları (Su Damlası)
  if (layerId.includes("ekst_havzalar") || layerName.includes("havza")) {
    return { iconClass: "fa-water", color: "#0284c7", label: "Su Havzası" };
  }
  // 16. Ekstraktivizm: Taş Ocakları (Dağ / Taş)
  if (layerId.includes("ekst_quarries") || layerName.includes("ocak")) {
    return { iconClass: "fa-mountain", color: "#d97706", label: "Maden & Taş Ocağı" };
  }

  const defaultColor = feature.layer?.color || "#3b82f6";
  return { iconClass: "fa-map-pin", color: defaultColor, label: feature.layer?.name || "Konum" };
}

// maps22 ile BİREBİR AYNI - Kusursuz FontAwesome İkonlu Damla Pin
function createDistinctPin(color: string, iconClass: string) {
  return L.divIcon({
    className: "custom-distinct-pin-marker",
    html: `
      <div class="custom-map-pin" style="background: ${color};">
        <i class="fa-solid ${iconClass}"></i>
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

        const { iconClass, color, label } = getIconAndColor(feature);
        const distinctPinIcon = createDistinctPin(color, iconClass);

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
