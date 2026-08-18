"use client";

import { useEffect, useState } from "react";
import DynamicMap from "@/components/DynamicMap";

export default function Home() {
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayerIds, setActiveLayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/layers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch layers");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return;
        setLayers(data);
        const initialActive = new Set<string>();
        data.forEach((l: any) => {
          if (l.isActive) initialActive.add(l.id);
        });
        setActiveLayerIds(initialActive);
      })
      .catch(err => console.error(err));
  }, []);

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
        <h1 style={{ fontSize: "24px", marginBottom: "20px", fontWeight: "600" }}>Harita Katmanları</h1>
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
