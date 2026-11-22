"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker, FeatureGroup, LayersControl, useMapEvents } from "react-leaflet";
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

// Orijinal Ekoloji Enstitüsü & Umut-Sen & MEYDİP Renk ve İkon Motoru
function getIconAndColor(feature: FeatureType): { iconClass: string; color: string; label: string } {
  const layerId = (feature.layerId || feature.layer?.id || "").toLowerCase();
  const layerName = (feature.layer?.name || "").toLowerCase();
  const title = (feature.title || "");
  const desc = (feature.description || "");
  const combined = (title + " " + desc).toUpperCase();

  // ==========================================
  // 1. ÇED MADEN PROJELERİ (Orijinal Ekoloji Enstitüsü Renk Paleti)
  // ==========================================
  if (layerId.includes("ekst_ced") || layerName.includes("çed")) {
    if (combined.includes("ÇED OLUMLU") && !combined.includes("GEREKLİ DEĞİL")) {
      return { iconClass: "fa-circle-check", color: "#991b1b", label: "ÇED Olumlu (Nihai Onay)" };
    }
    if (combined.includes("ÇED GEREKLİ DEĞİL")) {
      return { iconClass: "fa-circle-exclamation", color: "#dc2626", label: "ÇED Gerekli Değil / Olumlu" };
    }
    if (combined.includes("NİHAİ KARAR")) {
      return { iconClass: "fa-gavel", color: "#f87171", label: "Bakanlık Nihai Karar Aşamasında" };
    }
    if (combined.includes("İDK")) {
      return { iconClass: "fa-users-gear", color: "#ea580c", label: "İDK Komisyon İncelemesinde" };
    }
    if (combined.includes("HKT")) {
      return { iconClass: "fa-bullhorn", color: "#fb923c", label: "Halkın Katılımı Toplantısı (HKT)" };
    }
    if (combined.includes("ÇED SÜRECİ BAŞLAYAN")) {
      return { iconClass: "fa-hourglass-start", color: "#fdba74", label: "ÇED Süreci Başlayan" };
    }
    if (combined.includes("ÇED GEREKLİ") || combined.includes("RAPORU HAZIRLANMALIDIR")) {
      return { iconClass: "fa-file-lines", color: "#eab308", label: "Tam ÇED Raporu Hazırlanmalı" };
    }
    if (combined.includes("İPTAL") || combined.includes("İADE")) {
      return { iconClass: "fa-ban", color: "#4ade80", label: "ÇED Başvurusu İptal / İade Edildi" };
    }
    if (combined.includes("ÇED OLUMSUZ")) {
      return { iconClass: "fa-circle-xmark", color: "#16a34a", label: "ÇED Olumsuz (Maden Durduruldu)" };
    }
    return { iconClass: "fa-flask", color: "#dc2626", label: "ÇED Maden Projesi" };
  }

  // ==========================================
  // 2. MADEN İHALE ALANLARI (MAPEG - Satılan / Satılmayan)
  // ==========================================
  if (layerId.includes("ekst_ihaleler") || layerName.includes("ihale")) {
    if (combined.includes("İŞLETME RUHSATI") || combined.includes("ARAMA RUHSATI") || combined.includes("SATIL")) {
      return { iconClass: "fa-hammer", color: "#9333ea", label: "İhalede Satılan Maden Sahası" };
    }
    return { iconClass: "fa-hammer", color: "#e11d48", label: "Maden İhale Sahası" };
  }

  // ==========================================
  // 3. TAŞINMAZ / KAMULAŞTIRMA / RUHSAT KARARLARI
  // ==========================================
  if (layerId.includes("ekst_tasinmaz") || layerName.includes("taşınmaz")) {
    if (combined.includes("İŞLETME RUHSATI")) {
      return { iconClass: "fa-file-contract", color: "#2563eb", label: "İşletme Ruhsatı Talebi" };
    }
    if (combined.includes("ARAMA RUHSATI")) {
      return { iconClass: "fa-file-signature", color: "#0284c7", label: "Arama Ruhsatı Talebi" };
    }
    if (combined.includes("İHALE")) {
      return { iconClass: "fa-gavel", color: "#9333ea", label: "İhale Kararı" };
    }
    if (combined.includes("DEVİR")) {
      return { iconClass: "fa-right-left", color: "#059669", label: "Ruhsat Devir Kararı" };
    }
    if (combined.includes("TEMDİT")) {
      return { iconClass: "fa-clock-rotate-left", color: "#d97706", label: "Ruhsat Temdit (Uzatma)" };
    }
    return { iconClass: "fa-file-contract", color: "#337ab7", label: "Taşınmaz / Kamulaştırma Kararı" };
  }

  // ==========================================
  // 4. DOĞA KORUMA ALANLARI, SU HAVZALARI & TAŞ OCAKLARI
  // ==========================================
  if (layerId.includes("ekst_dkmp") || layerName.includes("milli park") || layerName.includes("koruma")) {
    return { iconClass: "fa-tree", color: "#16a34a", label: "Milli Park & Doğa Koruma (DKMP)" };
  }
  if (layerId.includes("ekst_kba") || layerName.includes("önemli doğa")) {
    return { iconClass: "fa-leaf", color: "#10b981", label: "Önemli Doğa Alanı (KBA)" };
  }
  if (layerId.includes("ekst_havzalar") || layerName.includes("havza")) {
    return { iconClass: "fa-water", color: "#0284c7", label: "Su Havzası" };
  }
  if (layerId.includes("ekst_quarries") || layerName.includes("ocak")) {
    return { iconClass: "fa-mountain", color: "#d97706", label: "Maden & Taş Ocağı" };
  }

  // ==========================================
  // 5. UMUT-SEN DİRENİŞ KATMANLARI
  // ==========================================
  const lowerLayer = layerName.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerDesc = desc.toLowerCase();

  if (layerId.includes("isci") || lowerLayer.includes("işçi") || lowerTitle.includes("grev") || lowerTitle.includes("işçi") || lowerDesc.includes("grev")) {
    return { iconClass: "fa-fist-raised", color: "#dc2626", label: "İşçi Direnişi / Grev" };
  }
  if (layerId.includes("ekoloji") || lowerLayer.includes("ekoloji") || lowerTitle.includes("maden") || lowerTitle.includes("orman") || lowerTitle.includes("jes") || lowerDesc.includes("ekoloji")) {
    return { iconClass: "fa-leaf", color: "#16a34a", label: "Ekoloji Mücadelesi" };
  }
  if (layerId.includes("cinayet") || lowerLayer.includes("cinayet") || lowerTitle.includes("katliam") || lowerTitle.includes("cinayeti") || lowerDesc.includes("iş cinayeti")) {
    return { iconClass: "fa-scale-balanced", color: "#1e293b", label: "İş Cinayeti Davası" };
  }
  if (layerId.includes("hapishane") || lowerLayer.includes("hapishane") || lowerTitle.includes("açlık grevi") || lowerTitle.includes("mahpus") || lowerDesc.includes("hapishane")) {
    return { iconClass: "fa-lock", color: "#ea580c", label: "Hapishane Direnişi" };
  }
  if (layerId.includes("kayip") || lowerLayer.includes("kayıp") || lowerTitle.includes("anneleri") || lowerTitle.includes("adalet") || lowerDesc.includes("kayıp")) {
    return { iconClass: "fa-heart", color: "#9333ea", label: "Kayıp Yakınları / Adalet" };
  }

  // ==========================================
  // 6. SANAYİ VE OSB KATMANLARI
  // ==========================================
  if (layerId.includes("osb") || lowerLayer.includes("organize") || lowerLayer.includes("osb") || lowerTitle.includes("osb")) {
    return { iconClass: "fa-industry", color: "#2563eb", label: "Organize Sanayi Bölgesi" };
  }
  if (layerId.includes("tgb") || lowerLayer.includes("teknoloji") || lowerLayer.includes("tgb") || lowerTitle.includes("teknokent")) {
    return { iconClass: "fa-flask", color: "#7c3aed", label: "Teknoloji Geliştirme Bölgesi" };
  }
  if (layerId.includes("eb") || lowerLayer.includes("endüstri") || lowerLayer.includes("eb")) {
    return { iconClass: "fa-warehouse", color: "#059669", label: "Endüstri Bölgesi" };
  }
  if (layerId.includes("ontahsis") || lowerLayer.includes("tahsis")) {
    return { iconClass: "fa-drafting-compass", color: "#d97706", label: "Ön Tahsis Alanı" };
  }
  if (layerId.includes("yatirim") || lowerLayer.includes("yatırım")) {
    return { iconClass: "fa-briefcase", color: "#0284c7", label: "Yatırım Alanı" };
  }

  const defaultColor = feature.layer?.color || "#3b82f6";
  return { iconClass: "fa-map-pin", color: defaultColor, label: feature.layer?.name || "Konum" };
}

// FontAwesome İkonlu Damla Pin (Direniş ve Sanayi için)
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

// Şık, Okunaklı ve Yapılandırılmış Popup İçeriği
function FeaturePopupContent({ feature, color, label }: { feature: FeatureType; color: string; label: string }) {
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

  return (
    <div style={{ minWidth: "270px", maxWidth: "360px", padding: "6px 2px", color: "#f8fafc" }}>
      {/* Kategori Rozeti */}
      <div style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: "700",
        color: "#ffffff",
        background: color,
        marginBottom: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
      }}>
        {feature.layer?.name || label}
      </div>

      {/* Başlık */}
      <h3 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: "700", color: "#ffffff", lineHeight: "1.35" }}>
        {feature.title}
      </h3>

      {/* Yapılandırılmış Bilgi Satırları */}
      {hasPipes ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
          {rows.map((r, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "10px",
              paddingBottom: "5px",
              borderBottom: "1px solid rgba(255,255,255,0.08)"
            }}>
              {r.key ? (
                <>
                  <span style={{ color: "#94a3b8", fontWeight: "500", whiteSpace: "nowrap" }}>{r.key}:</span>
                  <span style={{
                    color: r.key.toLowerCase().includes("durum") ? (r.val.toLowerCase().includes("olumsuz") || r.val.toLowerCase().includes("iptal") ? "#4ade80" : "#f87171") : "#f1f5f9",
                    fontWeight: "600",
                    textAlign: "right"
                  }}>
                    {r.val}
                  </span>
                </>
              ) : (
                <span style={{ color: "#cbd5e1" }}>{r.val}</span>
              )}
            </div>
          ))}

          {detailedNotes && (
            <div style={{
              marginTop: "6px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              padding: "9px 11px",
              fontSize: "12px",
              color: "#e2e8f0",
              lineHeight: "1.45"
            }}>
              <span style={{ color: "#93c5fd", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                {detailedNotes.split(":")[0]}:
              </span>
              <span style={{ color: "#cbd5e1" }}>{detailedNotes.substring(detailedNotes.indexOf(":") + 1).trim()}</span>
            </div>
          )}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", lineHeight: "1.55" }}>
          {desc || "Açıklama bulunmuyor."}
        </p>
      )}
    </div>
  );
}

export default function Map({ features, isAdmin, onFeatureCreated, selectedLayerId }: MapProps) {
  const [currentZoom, setCurrentZoom] = useState(6);
  const ZOOM_THRESHOLD = 10;

  // Performans Optimizasyonu: Çok sayıda nokta (> 500) varsa Canvas CircleMarker kullanarak 60 FPS hız sağla
  const isHighDensity = features.length > 500;

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
    <MapContainer center={[39.0, 35.2]} zoom={6} preferCanvas={true} style={{ height: "100%", width: "100%" }}>
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

        if (feature.type === "POINT") {
          // Yüksek yoğunluklu katmanlar (ÇED, Taşınmaz 10.000+ nokta): GPU Canvas CircleMarker (SIFIR KASMA, 60 FPS)
          if (isHighDensity) {
            return (
              <CircleMarker
                key={feature.id}
                center={coords}
                radius={currentZoom >= 11 ? 7 : 5}
                pathOptions={{
                  fillColor: color,
                  color: "#ffffff",
                  weight: 1.2,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <FeaturePopupContent feature={feature} color={color} label={label} />
                </Popup>
              </CircleMarker>
            );
          }

          // Düşük yoğunluklu katmanlar (Direniş Haritası vb.): Özel FontAwesome Damla Pin
          const distinctPinIcon = createDistinctPin(color, iconClass);
          return (
            <Marker key={feature.id} position={coords} icon={distinctPinIcon}>
              <Popup>
                <FeaturePopupContent feature={feature} color={color} label={label} />
              </Popup>
            </Marker>
          );
        } else if (feature.type === "POLYGON") {
          // Uzak Zoom (< 10)
          if (currentZoom < ZOOM_THRESHOLD) {
            const center = getPolygonCenter(coords);
            if (!center) return null;

            if (isHighDensity) {
              return (
                <CircleMarker
                  key={`pin-${feature.id}`}
                  center={center}
                  radius={5}
                  pathOptions={{
                    fillColor: color,
                    color: "#ffffff",
                    weight: 1.2,
                    fillOpacity: 0.85,
                  }}
                >
                  <Popup>
                    <div>
                      <FeaturePopupContent feature={feature} color={color} label={label} />
                      <small style={{ color: "#94a3b8", marginTop: "8px", display: "block" }}>
                        🔍 Sınırları görmek için haritada yaklaşın
                      </small>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            }

            const distinctPinIcon = createDistinctPin(color, iconClass);
            return (
              <Marker key={`pin-${feature.id}`} position={center} icon={distinctPinIcon}>
                <Popup>
                  <div>
                    <FeaturePopupContent feature={feature} color={color} label={label} />
                    <small style={{ color: "#94a3b8", marginTop: "8px", display: "block" }}>
                      🔍 Sınırları görmek için haritada yaklaşın
                    </small>
                  </div>
                </Popup>
              </Marker>
            );
          }

          // Yakın Zoom (>= 10): Gerçek Poligon Sınır Alanı
          return (
            <Polygon
              key={feature.id}
              positions={coords}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 1.5,
              }}
            >
              <Popup>
                <FeaturePopupContent feature={feature} color={color} label={label} />
              </Popup>
            </Polygon>
          );
        } else if (feature.type === "LINESTRING") {
          return (
            <Polyline key={feature.id} positions={coords} pathOptions={{ color, weight: 4 }}>
              <Popup>
                <h3 style={{ margin: "0 0 5px", fontSize: "16px", fontWeight: "bold", color: "#ffffff" }}>{feature.title}</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1" }}>{feature.description}</p>
              </Popup>
            </Polyline>
          );
        }

        return null;
      })}
    </MapContainer>
  );
}
