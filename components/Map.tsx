"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  Polygon,
  FeatureGroup,
  LayersControl,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import { EditControl } from "react-leaflet-draw";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export interface FeatureType {
  id: string;
  layerId: string;
  title: string;
  description?: string | null;
  iconUrl?: string | null;
  type: string;
  coordinates: string;
  layer?: {
    id: string;
    name: string;
    color?: string | null;
  };
}

interface MapProps {
  features: FeatureType[];
  isAdmin?: boolean;
  onFeatureCreated?: (type: string, coordinates: any) => void;
  selectedLayerId?: string;
}

function ZoomHandler({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoom(map.getZoom());
    },
  });
  return null;
}

function getPolygonCenter(coords: any): [number, number] | null {
  try {
    const points: [number, number][] = [];
    function extractPoints(arr: any) {
      if (!Array.isArray(arr) || arr.length === 0) return;
      if (typeof arr[0] === "number" && typeof arr[1] === "number") {
        if (!isNaN(arr[0]) && !isNaN(arr[1]) && isFinite(arr[0]) && isFinite(arr[1])) {
          points.push([arr[0], arr[1]]);
        }
        return;
      }
      for (const item of arr) {
        extractPoints(item);
      }
    }
    extractPoints(coords);
    if (points.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;
    for (const p of points) {
      sumLat += p[0];
      sumLng += p[1];
    }
    const centerLat = sumLat / points.length;
    const centerLng = sumLng / points.length;
    if (isNaN(centerLat) || isNaN(centerLng) || !isFinite(centerLat) || !isFinite(centerLng)) {
      return null;
    }
    return [centerLat, centerLng];
  } catch {
    return null;
  }
}

function isValidPolygonCoords(coords: any): boolean {
  if (!Array.isArray(coords) || coords.length === 0) return false;
  function check(arr: any): boolean {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    if (typeof arr[0] === "number" && typeof arr[1] === "number") {
      return !isNaN(arr[0]) && !isNaN(arr[1]) && isFinite(arr[0]) && isFinite(arr[1]);
    }
    return arr.every(check);
  }
  return check(coords);
}

function getIconAndColor(feature: FeatureType): { iconClass: string; color: string; label: string } {
  const title = (feature.title || "").toLowerCase();
  const desc = (feature.description || "").toLowerCase();
  const layerName = (feature.layer?.name || "").toLowerCase();
  const layerColor = feature.layer?.color;

  if (feature.layerId === "layer_ekst_ced" || layerName.includes("çed")) {
    if (desc.includes("çed olumlu")) {
      return { iconClass: "fa-circle-exclamation", color: "#991b1b", label: "ÇED Olumlu" };
    }
    if (desc.includes("çed gerekli değildir")) {
      return { iconClass: "fa-triangle-exclamation", color: "#dc2626", label: "ÇED Gerekli Değil" };
    }
    if (desc.includes("nihai")) {
      return { iconClass: "fa-hourglass-end", color: "#f87171", label: "Nihai ÇED" };
    }
    if (desc.includes("idk")) {
      return { iconClass: "fa-users-gear", color: "#ea580c", label: "İDK Toplantısı" };
    }
    if (desc.includes("hkt") || desc.includes("halkın")) {
      return { iconClass: "fa-bullhorn", color: "#fb923c", label: "HKT Toplantısı" };
    }
    if (desc.includes("süreç başla") || desc.includes("başvuru")) {
      return { iconClass: "fa-clock", color: "#fdba74", label: "Süreç Başladı" };
    }
    if (desc.includes("rapor")) {
      return { iconClass: "fa-file-lines", color: "#eab308", label: "ÇED Raporu" };
    }
    if (desc.includes("iptal")) {
      return { iconClass: "fa-circle-check", color: "#4ade80", label: "İptal Edildi" };
    }
    if (desc.includes("olumsuz")) {
      return { iconClass: "fa-ban", color: "#16a34a", label: "ÇED Olumsuz" };
    }
    return { iconClass: "fa-industry", color: "#dc2626", label: "ÇED Maden" };
  }

  if (feature.layerId === "layer_ekst_ihaleler" || layerName.includes("ihale")) {
    return { iconClass: "fa-gavel", color: "#ea580c", label: "Maden İhalesi" };
  }
  if (feature.layerId === "layer_ekst_tasinmaz" || layerName.includes("taşınmaz") || layerName.includes("kamulaştırma")) {
    return { iconClass: "fa-house-circle-exclamation", color: "#8b5cf6", label: "Acele Kamulaştırma" };
  }
  if (feature.layerId === "layer_ekst_dkmp" || layerName.includes("korunan") || layerName.includes("milli park")) {
    return { iconClass: "fa-shield-halved", color: "#059669", label: "Korunan Alan (DKMP)" };
  }
  if (feature.layerId === "layer_ekst_kba" || layerName.includes("doğa alanı") || layerName.includes("kba")) {
    return { iconClass: "fa-tree", color: "#10b981", label: "Önemli Doğa Alanı" };
  }
  if (feature.layerId === "layer_ekst_havzalar" || layerName.includes("havza")) {
    return { iconClass: "fa-water", color: "#0284c7", label: "Su Havzası" };
  }
  if (feature.layerId === "layer_ekst_quarries" || layerName.includes("taş oca") || layerName.includes("quarr")) {
    return { iconClass: "fa-mountain", color: "#d97706", label: "Taş Ocağı / Maden" };
  }

  if (layerName.includes("direniş") || title.includes("direniş") || desc.includes("direniş")) {
    return { iconClass: "fa-fist-raised", color: layerColor || "#ef4444", label: "İşçi & Ekoloji Direnişi" };
  }
  if (layerName.includes("hukuk") || layerName.includes("dava")) {
    return { iconClass: "fa-scale-balanced", color: layerColor || "#3b82f6", label: "Hukuki Süreç" };
  }
  if (layerName.includes("çevre") || layerName.includes("ekoloji")) {
    return { iconClass: "fa-leaf", color: layerColor || "#10b981", label: "Çevre Mücadelesi" };
  }
  if (layerName.includes("grev") || desc.includes("grev")) {
    return { iconClass: "fa-hand-back-fist", color: layerColor || "#f59e0b", label: "Grev & Eylem" };
  }

  return { iconClass: "fa-location-dot", color: layerColor || "#6366f1", label: feature.layer?.name || "Konum" };
}

function createDistinctPin(color: string, iconClass: string) {
  return L.divIcon({
    className: "custom-map-pin",
    html: `
      <div class="pin-marker" style="background-color: ${color};">
        <i class="fa-solid ${iconClass}"></i>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function createPopupHtml(feature: FeatureType, color: string, label: string): string {
  const desc = feature.description || "";
  const hasPipes = desc.includes(" | ");
  const rows: { key: string; val: string }[] = [];
  let detailedNotes = "";

  if (hasPipes) {
    const parts = desc.split(" | ");
    parts.forEach((p) => {
      const colIdx = p.indexOf(":");
      if (colIdx !== -1) {
        const k = p.substring(0, colIdx).trim();
        const v = p.substring(colIdx + 1).trim();
        if (
          k.toLowerCase().includes("talep") ||
          k.toLowerCase().includes("neden") ||
          k.toLowerCase().includes("bilgi") ||
          k.toLowerCase().includes("not")
        ) {
          detailedNotes = `${k}: ${v}`;
        } else {
          rows.push({ key: k, val: v });
        }
      } else {
        rows.push({ key: "", val: p.trim() });
      }
    });
  }

  let rowsHtml = "";
  if (rows.length > 0) {
    rowsHtml = `
      <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
        ${rows
          .map(
            (r, i) => `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 4px 6px; background-color: ${
            i % 2 === 0 ? "rgba(255, 255, 255, 0.05)" : "transparent"
          }; border-radius: 4px; font-size: 11.5px; line-height: 1.35;">
            ${r.key ? `<span style="color: #cbd5e1; font-weight: 500; margin-right: 8px;">${escapeHtml(r.key)}:</span>` : ""}
            <span style="color: #ffffff; font-weight: 600; text-align: right; word-break: break-word;">${escapeHtml(r.val)}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  } else if (desc && !hasPipes) {
    rowsHtml = `<div style="font-size: 12px; color: #f1f5f9; line-height: 1.5; margin-bottom: 8px;">${escapeHtml(desc)}</div>`;
  }

  let notesHtml = "";
  if (detailedNotes) {
    notesHtml = `
      <div style="margin-top: 6px; padding: 8px 10px; background-color: rgba(15, 23, 42, 0.7); border-left: 3px solid ${color}; border-radius: 0 4px 4px 0; font-size: 11.5px; color: #e2e8f0; line-height: 1.45;">
        ${escapeHtml(detailedNotes)}
      </div>
    `;
  }

  return `
    <div style="min-width: 270px; max-width: 360px; padding: 6px 2px; color: #f8fafc; font-family: inherit;">
      <div style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; color: #ffffff; background-color: ${color}; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        ${escapeHtml(label)}
      </div>
      <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.3; border-bottom: 1px solid rgba(255, 255, 255, 0.15); padding-bottom: 6px;">
        ${escapeHtml(feature.title || "Detay")}
      </h3>
      ${rowsHtml}
      ${notesHtml}
    </div>
  `;
}

// 60 FPS Asenkron MarkerCluster Katmanı
function MarkerClusterLayer({ features }: { features: FeatureType[] }) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map || typeof window === "undefined") return;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current.clearLayers();
    }

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 40,
      chunkDelay: 20,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: true,
      disableClusteringAtZoom: 16,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let sizeClass = "cluster-small";
        let size = 38;
        if (count >= 1000) {
          sizeClass = "cluster-large";
          size = 52;
        } else if (count >= 100) {
          sizeClass = "cluster-medium";
          size = 44;
        }
        const displayCount = count >= 10000 ? (count / 1000).toFixed(1) + "k" : count.toLocaleString("tr-TR");
        return L.divIcon({
          html: `<div class="modern-cluster-bubble ${sizeClass}"><span>${displayCount}</span></div>`,
          className: "modern-cluster-wrapper",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    const markers: L.Marker[] = [];

    features.forEach((feature) => {
      let coords: [number, number] | null = null;
      if (feature.type === "POINT") {
        try {
          coords = JSON.parse(feature.coordinates);
        } catch {
          coords = null;
        }
      } else if (feature.type === "POLYGON") {
        try {
          const polyCoords = JSON.parse(feature.coordinates);
          coords = getPolygonCenter(polyCoords);
        } catch {
          coords = null;
        }
      }

      if (
        !coords ||
        !Array.isArray(coords) ||
        coords.length < 2 ||
        typeof coords[0] !== "number" ||
        typeof coords[1] !== "number" ||
        isNaN(coords[0]) ||
        isNaN(coords[1]) ||
        !isFinite(coords[0]) ||
        !isFinite(coords[1])
      ) {
        return;
      }

      const { iconClass, color, label } = getIconAndColor(feature);
      const icon = createDistinctPin(color, iconClass);
      const marker = L.marker(coords, { icon });
      const popupHtml = createPopupHtml(feature, color, label);
      marker.bindPopup(popupHtml, { maxWidth: 360 });
      markers.push(marker);
    });

    clusterGroup.addLayers(markers);
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map, features]);

  return null;
}

export default function Map({ features, isAdmin, onFeatureCreated, selectedLayerId }: MapProps) {
  const [currentZoom, setCurrentZoom] = useState(6);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");

  // İlleri description alanındaki 'il: İSİM' kalıbından otomatik toparla
  const cityList = useMemo(() => {
    const cityCounts: Record<string, number> = {};
    features.forEach((f) => {
      const desc = f.description || "";
      const m = desc.match(/il:\s*([^|\n]+)/i);
      if (m && m[1]) {
        const cityName = m[1].trim().toUpperCase();
        if (cityName.length >= 2 && cityName.length <= 25) {
          cityCounts[cityName] = (cityCounts[cityName] || 0) + 1;
        }
      }
    });
    return Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1]) // En çok kaydı olandan aza doğru
      .map(([name, count]) => ({ name, count }));
  }, [features]);

  // İl Filtresi uygulanmış feature listesi
  const filteredFeatures = useMemo(() => {
    if (selectedCity === "ALL") return features;
    return features.filter((f) => {
      const desc = (f.description || "").toUpperCase();
      return desc.includes(`IL: ${selectedCity}`) || desc.includes(`IL:${selectedCity}`);
    });
  }, [features, selectedCity]);

  // Çizim aracıyla yeni kayıt oluşturma
  const _handleCreated = (e: any) => {
    if (!onFeatureCreated) return;
    const { layerType, layer } = e;
    let type = "POINT";
    let coordinates: any = "";

    if (layerType === "marker") {
      type = "POINT";
      const { lat, lng } = layer.getLatLng();
      coordinates = [lat, lng];
    } else if (layerType === "polygon") {
      type = "POLYGON";
      const latlngs = layer.getLatLngs()[0].map((ll: any) => [ll.lat, ll.lng]);
      latlngs.push(latlngs[0]);
      coordinates = [latlngs];
    } else if (layerType === "polyline") {
      type = "LINESTRING";
      coordinates = layer.getLatLngs().map((ll: any) => [ll.lat, ll.lng]);
    }

    onFeatureCreated(type, coordinates);
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Şık İl Seçici ve İstatistik Rozeti (Harita Üzerinde Floating Bar) */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "12px",
          padding: "6px 12px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }}
      >
        <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
          <i className="fa-solid fa-location-dot" style={{ color: "#38bdf8" }}></i> İl:
        </span>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          style={{
            backgroundColor: "rgba(30, 41, 59, 0.9)",
            color: "#f8fafc",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="ALL">🇹🇷 Tüm Türkiye ({features.length.toLocaleString("tr-TR")} Alan)</option>
          {cityList.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.count.toLocaleString("tr-TR")})
            </option>
          ))}
        </select>
      </div>

      <MapContainer
        center={[39.0, 35.2]}
        zoom={6}
        preferCanvas={true}
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomHandler onZoom={setCurrentZoom} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Koyu Harita (Esri Dark)">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Uydu Görüntüsü (Esri World Imagery)">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Sokak Haritası (OpenStreetMap)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {isAdmin && (
          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={_handleCreated}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: true,
                polygon: true,
                polyline: true,
              }}
            />
          </FeatureGroup>
        )}

        {/* 60 FPS Asenkron MarkerCluster Katmanı */}
        <MarkerClusterLayer features={filteredFeatures} />

        {/* Yakın Zoom Seviyesinde (>= 10) Poligon Sınırlarını da Detaylı Çiz */}
        {currentZoom >= 10 &&
          filteredFeatures.map((feature) => {
            if (feature.type !== "POLYGON") return null;
            let coords;
            try {
              coords = JSON.parse(feature.coordinates);
            } catch {
              return null;
            }
            if (!isValidPolygonCoords(coords)) return null;
            const { color, label } = getIconAndColor(feature);
            return (
              <Polygon
                key={`poly-${feature.id}`}
                positions={coords}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Popup>
                  <div dangerouslySetInnerHTML={{ __html: createPopupHtml(feature, color, label) }} />
                </Popup>
              </Polygon>
            );
          })}
      </MapContainer>
    </div>
  );
}
