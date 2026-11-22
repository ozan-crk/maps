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
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

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
        <h1 style={{ fontSize: "24px", marginBottom: "12px", fontWeight: "600" }}>{mapDetails?.name || "Harita Yükleniyor..."}</h1>
        
        {/* Harita Açıklama ve Kaynaklar Butonu */}
        <button
          onClick={() => setShowInfoModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "8px 12px",
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: "8px",
            color: "#93c5fd",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: "16px",
            transition: "all 0.2s ease"
          }}
        >
          <span>ℹ️</span> Harita Bilgisi & Kaynaklar
        </button>
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

      {/* Harita Açıklama & Veri Kaynakları Modalı */}
      {showInfoModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "600px",
            width: "100%",
            padding: "24px",
            maxHeight: "85vh",
            overflowY: "auto",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#60a5fa", letterSpacing: "0.5px" }}>
                  Harita Bilgisi & Kaynaklar
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc", marginTop: "4px" }}>
                  {mapDetails?.name}
                </h2>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              fontSize: "14px",
              color: "#cbd5e1",
              lineHeight: "1.6",
              whiteSpace: "pre-line",
              background: "rgba(255,255,255,0.03)",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: "16px"
            }}>
              {mapDetails?.description || "Bu harita için henüz detaylı açıklama eklenmemiştir. Admin panelinden açıklama ekleyebilirsiniz."}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a
                href="/admin"
                style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none" }}
              >
                ✏️ Açıklamayı Düzenle (Admin)
              </a>
              <button
                className="btn"
                onClick={() => setShowInfoModal(false)}
                style={{ padding: "6px 16px", fontSize: "13px" }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
