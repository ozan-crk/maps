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

  const [routeStart, setRouteStart] = useState("");
  const [routeEnd, setRouteEnd] = useState("");
  const [isRouting, setIsRouting] = useState(false);

  const [uploadedIcons, setUploadedIcons] = useState<{name: string, url: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newIconName, setNewIconName] = useState("");

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

  const fetchIcons = async () => {
    try {
      const res = await fetch("/api/icons");
      if (!res.ok) throw new Error("Failed to fetch icons");
      const data = await res.json();
      setUploadedIcons(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLayers();
    fetchIcons();
  }, []);

  const uploadIcon = async (e: any) => {
    if (!newIconName.trim()) {
      alert("Lütfen önce ikon için bir isim belirleyin.");
      e.target.value = "";
      return;
    }
    
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", newIconName);
    
    try {
      const res = await fetch("/api/icons", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload");
      await fetchIcons();
      setNewIconName("");
      alert("İkon başarıyla yüklendi!");
    } catch (error: any) {
      alert("İkon yüklenemedi: " + error.message);
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

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

  const onFeatureCreated = async (type: string, coordinates: any, customTitle?: string) => {
    if (!selectedLayerId) return alert("Önce bir katman seçin!");
    const finalTitle = customTitle || featureTitle;
    if (!finalTitle) return alert("Önce nokta/çizgi için bir başlık girin!");

    await fetch("/api/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layerId: selectedLayerId,
        title: finalTitle,
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

  const findAndAddRoute = async () => {
    if (!selectedLayerId) return alert("Önce bir katman seçin!");
    if (!routeStart || !routeEnd) return alert("Kalkış ve varış noktalarını girin!");
    
    setIsRouting(true);
    try {
      // Get Start Coords
      const startRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(routeStart)}&format=json&limit=1`);
      const startData = await startRes.json();
      if (!startData.length) throw new Error("Kalkış noktası bulunamadı.");
      const startLon = startData[0].lon;
      const startLat = startData[0].lat;

      // Get End Coords
      const endRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(routeEnd)}&format=json&limit=1`);
      const endData = await endRes.json();
      if (!endData.length) throw new Error("Varış noktası bulunamadı.");
      const endLon = endData[0].lon;
      const endLat = endData[0].lat;

      // Get Route from OSRM
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?geometries=geojson`);
      const osrmData = await osrmRes.json();
      
      if (osrmData.code !== "Ok" || !osrmData.routes.length) {
        throw new Error("Rota hesaplanamadı.");
      }

      // OSRM returns [lon, lat], Leaflet expects [lat, lon]
      const coords = osrmData.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
      
      // Save route
      await onFeatureCreated("LINESTRING", coords, `${routeStart} - ${routeEnd} Rotası`);
      
      setRouteStart("");
      setRouteEnd("");
      alert("Rota başarıyla eklendi!");
    } catch (error: any) {
      alert(error.message || "Bir hata oluştu.");
    } finally {
      setIsRouting(false);
    }
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
            {uploadedIcons.length > 0 && (
              <optgroup label="Yüklenen İkonlar">
                {uploadedIcons.map((icon, idx) => (
                  <option key={idx} value={icon.url}>{icon.name}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Hazır İkonlar">
              <option value="https://cdn-icons-png.flaticon.com/512/3050/3050410.png">Fabrika</option>
              <option value="https://cdn-icons-png.flaticon.com/512/33/33777.png">Hastane</option>
              <option value="https://cdn-icons-png.flaticon.com/512/167/167707.png">Okul</option>
              <option value="https://cdn-icons-png.flaticon.com/512/684/684908.png">Konum İşareti</option>
            </optgroup>
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

        {/* İkon Yönetimi */}
        <div style={{ marginBottom: "30px", background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "10px" }}>
          <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>İkon Yönetimi</h3>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
            Katmanlarda kullanmak üzere ikon yükleyin. Önce ismini girip sonra dosyayı seçin.
          </p>
          <input
            type="text"
            className="input-field"
            placeholder="İkon İsmi (Örn: Karakol)"
            value={newIconName}
            onChange={(e) => setNewIconName(e.target.value)}
          />
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/svg+xml" 
            style={{ marginBottom: "10px", fontSize: "12px", width: "100%" }}
            onChange={uploadIcon}
            disabled={uploading}
          />
          {uploading && <div style={{ fontSize: "12px", marginBottom: "10px", color: "var(--primary)" }}>Yükleniyor...</div>}
          
          {uploadedIcons.length > 0 && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
              {uploadedIcons.map((icon, idx) => (
                <div key={idx} style={{ background: "rgba(255,255,255,0.1)", padding: "5px", borderRadius: "5px", textAlign: "center", width: "60px" }}>
                  <img src={icon.url} alt={icon.name} style={{ width: "32px", height: "32px", objectFit: "contain", margin: "0 auto" }} />
                  <div style={{ fontSize: "10px", marginTop: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{icon.name}</div>
                </div>
              ))}
            </div>
          )}
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
              {selectedFeatureId ? "Özelliği Düzenle" : "Haritada Çizim Yap"}
            </h3>
            {!selectedFeatureId && (
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "15px" }}>
                Nokta, Poligon veya Çizgi aracını haritadan seçin.
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

        {/* Otomatik Rota Bulucu */}
        {selectedLayerId && !selectedFeatureId && (
          <div style={{ background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "10px", marginBottom: "30px" }}>
            <h3 style={{ marginBottom: "10px", fontSize: "16px" }}>Otomatik Rota Çiz</h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "15px" }}>
              İki nokta arası güzergahı otomatik hesaplayıp haritaya ekleyin. (Örn: İzmir - İstanbul)
            </p>
            <input
              type="text"
              className="input-field"
              placeholder="Kalkış (Örn: İstanbul)"
              value={routeStart}
              onChange={(e) => setRouteStart(e.target.value)}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Varış (Örn: İzmir)"
              value={routeEnd}
              onChange={(e) => setRouteEnd(e.target.value)}
            />
            <button className="btn" style={{ width: "100%" }} onClick={findAndAddRoute} disabled={isRouting}>
              {isRouting ? "Hesaplanıyor..." : "Rotayı Bul ve Ekle"}
            </button>
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
          onFeatureCreated={(type: string, coords: any) => onFeatureCreated(type, coords)}
        />
      </div>
    </div>
  );
}
