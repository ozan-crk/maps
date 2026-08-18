"use client";

import { useEffect, useState } from "react";
import DynamicMap from "@/components/DynamicMap";

export default function AdminPage() {
  const [layers, setLayers] = useState<any[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>("");
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerColor, setNewLayerColor] = useState("#3b82f6");
  const [newLayerIconType, setNewLayerIconType] = useState(""); // predefined or custom
  const [newLayerIconUrl, setNewLayerIconUrl] = useState("");

  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const fetchLayers = async () => {
    try {
      const res = await fetch("/api/layers");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setLayers(data);
      if (data.length > 0 && !selectedLayerId) {
        setSelectedLayerId(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  const createLayer = async () => {
    if (!newLayerName) return;
    const finalIconUrl = newLayerIconType === "custom" ? newLayerIconUrl : newLayerIconType;
    await fetch("/api/layers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLayerName, color: newLayerColor, iconUrl: finalIconUrl || null }),
    });
    setNewLayerName("");
    setNewLayerIconType("");
    setNewLayerIconUrl("");
    fetchLayers();
  };

  const deleteLayer = async (id: string) => {
    if (!confirm("Emin misiniz? Katman ve içindeki tüm noktalar silinecek.")) return;
    await fetch(`/api/layers/${id}`, { method: "DELETE" });
    if (selectedLayerId === id) setSelectedLayerId("");
    fetchLayers();
  };

  const onFeatureCreated = async (type: string, coordinates: any) => {
    if (!selectedLayerId) return alert("Önce bir katman seçin!");
    if (!featureTitle) return alert("Önce nokta/çizgi için bir başlık girin!");

    await fetch("/api/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layerId: selectedLayerId,
        title: featureTitle,
        description: featureDesc,
        type,
        coordinates: JSON.stringify(coordinates),
      }),
    });
    
    setFeatureTitle("");
    setFeatureDesc("");
    fetchLayers();
  };

  const updateFeature = async () => {
    if (!selectedFeatureId) return;
    await fetch(`/api/features/${selectedFeatureId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: featureTitle,
        description: featureDesc,
      }),
    });
    setSelectedFeatureId(null);
    setFeatureTitle("");
    setFeatureDesc("");
    fetchLayers();
  };

  const deleteFeature = async (id: string) => {
    if (!confirm("Emin misiniz? Bu özellik silinecek.")) return;
    await fetch(`/api/features/${id}`, { method: "DELETE" });
    if (selectedFeatureId === id) {
      setSelectedFeatureId(null);
      setFeatureTitle("");
      setFeatureDesc("");
    }
    fetchLayers();
  };

  const selectedLayerFeatures = layers.find((l) => l.id === selectedLayerId)?.features || [];
  const mapFeatures = selectedLayerFeatures.map((f: any) => ({
    ...f,
    layer: layers.find((l) => l.id === selectedLayerId),
  }));

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* Sidebar */}
      <div className="glass-panel" style={{ width: "350px", height: "100%", padding: "20px", borderRadius: 0, overflowY: "auto", zIndex: 10 }}>
        <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>Admin Paneli</h1>

        {/* Yeni Katman Ekleme */}
        <div style={{ marginBottom: "30px", background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "10px" }}>
          <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Yeni Katman Ekle</h3>
          <input
            type="text"
            className="input-field"
            placeholder="Katman Adı"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
          />
          
          <select 
            className="input-field" 
            value={newLayerIconType} 
            onChange={(e) => setNewLayerIconType(e.target.value)}
          >
            <option value="">Varsayılan İkon</option>
            <option value="https://cdn-icons-png.flaticon.com/512/3050/3050410.png">Fabrika</option>
            <option value="https://cdn-icons-png.flaticon.com/512/33/33777.png">Hastane</option>
            <option value="https://cdn-icons-png.flaticon.com/512/167/167707.png">Okul</option>
            <option value="https://cdn-icons-png.flaticon.com/512/684/684908.png">Konum İşareti</option>
            <option value="custom">Özel URL...</option>
          </select>
          
          {newLayerIconType === "custom" && (
            <input
              type="text"
              className="input-field"
              placeholder="Görsel URL'si (http://...)"
              value={newLayerIconUrl}
              onChange={(e) => setNewLayerIconUrl(e.target.value)}
            />
          )}

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
            <label>Renk:</label>
            <input type="color" value={newLayerColor} onChange={(e) => setNewLayerColor(e.target.value)} style={{ background: "none", border: "none", cursor: "pointer" }} />
          </div>
          <button className="btn" style={{ width: "100%" }} onClick={createLayer}>
            Katman Ekle
          </button>
        </div>

        {/* Katman Listesi */}
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Katmanlar</h3>
          {layers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => setSelectedLayerId(layer.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px",
                background: selectedLayerId === layer.id ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                border: selectedLayerId === layer.id ? "1px solid var(--primary)" : "1px solid transparent",
                borderRadius: "8px",
                marginBottom: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {layer.iconUrl ? (
                  <img src={layer.iconUrl} alt="icon" style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "12px", height: "12px", backgroundColor: layer.color, borderRadius: "50%" }} />
                )}
                <span>{layer.name} ({layer.features.length})</span>
              </div>
              <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}>Sil</button>
            </div>
          ))}
        </div>

        {/* Yeni Nokta/Poligon Ekleme veya Düzenleme Ayarları */}
        {selectedLayerId && (
          <div style={{ background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "10px", marginBottom: "30px" }}>
            <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>
              {selectedFeatureId ? "Özelliği Düzenle" : "Haritaya Ekleme Yap"}
            </h3>
            {!selectedFeatureId && (
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "15px" }}>
                Bilgileri doldurup haritada çizim yapın.
              </p>
            )}
            <input
              type="text"
              className="input-field"
              placeholder="Başlık (Örn: OSB 1)"
              value={featureTitle}
              onChange={(e) => setFeatureTitle(e.target.value)}
            />
            <textarea
              className="input-field"
              placeholder="Açıklama"
              rows={3}
              value={featureDesc}
              onChange={(e) => setFeatureDesc(e.target.value)}
              style={{ resize: "none" }}
            />
            
            {selectedFeatureId && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn" style={{ flex: 1 }} onClick={updateFeature}>Güncelle</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => {
                  setSelectedFeatureId(null);
                  setFeatureTitle("");
                  setFeatureDesc("");
                }}>İptal</button>
              </div>
            )}
          </div>
        )}

        {/* Seçili Katmanın Özellikleri */}
        {selectedLayerId && selectedLayerFeatures.length > 0 && (
          <div style={{ marginBottom: "30px" }}>
             <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Eklenen Öğeler</h3>
             {selectedLayerFeatures.map((f: any) => (
                <div key={f.id} style={{
                  background: "rgba(255,255,255,0.05)",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "5px" }}>{f.title} ({f.type})</div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button className="btn" style={{ padding: "4px 8px", fontSize: "12px", flex: 1 }} onClick={() => {
                      setSelectedFeatureId(f.id);
                      setFeatureTitle(f.title);
                      setFeatureDesc(f.description || "");
                    }}>Düzenle</button>
                    <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "12px", flex: 1 }} onClick={() => deleteFeature(f.id)}>Sil</button>
                  </div>
                </div>
             ))}
          </div>
        )}
        
        <div style={{ marginTop: "20px" }}>
          <a href="/" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "14px" }}>&larr; Genel Haritaya Dön</a>
        </div>
      </div>

      {/* Harita */}
      <div style={{ flex: 1, position: "relative" }}>
        <DynamicMap
          features={mapFeatures}
          isAdmin={true}
          selectedLayerId={selectedLayerId}
          onFeatureCreated={onFeatureCreated}
        />
      </div>
    </div>
  );
}
