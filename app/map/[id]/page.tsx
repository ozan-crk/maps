"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DynamicMap from "@/components/DynamicMap";

export default function Home() {
  const params = useParams();
  const mapId = params?.id as string;
  
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayerIds, setActiveLayerIds] = useState<Set<string>>(new Set());
  const [mapDetails, setMapDetails] = useState<any>(null);

  useEffect(() => {
    if (!mapId) return;
    fetch(`/api/maps/${mapId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch map");
        return res.json();
      })
      .then((data) => {
        setMapDetails(data);
        if (data.layers && Array.isArray(data.layers)) {
          setLayers(data.layers);
          const initialActive = new Set<string>();
          data.layers.forEach((l: any) => {
            if (l.isActive) initialActive.add(l.id);
          });
          setActiveLayerIds(initialActive);
        }
      })
      .catch(err => console.error(err));
  }, [mapId]);

  const toggleLayer = (layerId: string) => {
    setActiveLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const activeFeatures = layers
    .filter((layer) => activeLayerIds.has(layer.id))
    .flatMap((layer) => layer.features.map((f: any) => ({ ...f, layer })));

  return (
    <main style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <DynamicMap features={activeFeatures} />

      <div
        className="glass-panel"
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "300px",
          padding: "20px",
          zIndex: 1000,
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "20px", fontWeight: "600" }}>{mapDetails?.name || "Harita Yükleniyor..."}</h1>
        {mapDetails?.description && (
          <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "20px" }}>{mapDetails.description}</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {layers.map((layer) => (
            <div
              key={layer.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {layer.iconUrl && (
                  <img src={layer.iconUrl} alt={layer.name} style={{ width: "24px", height: "24px" }} />
                )}
                {!layer.iconUrl && layer.color && (
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "4px",
                      backgroundColor: layer.color,
                    }}
                  />
                )}
                <span style={{ fontSize: "15px" }}>{layer.name}</span>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={activeLayerIds.has(layer.id)}
                  onChange={() => toggleLayer(layer.id)}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))}
          {layers.length === 0 && (
            <p style={{ fontSize: "14px", color: "#94a3b8" }}>Henüz katman eklenmemiş.</p>
          )}
        </div>
      </div>
    </main>
  );
}
