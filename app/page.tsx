export default function Home() {
  return (
    <main style={{ 
      width: "100vw", 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center",
      background: "#0f172a",
      color: "#f8fafc",
      fontFamily: "sans-serif"
    }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Harita Bulunamadı</h1>
      <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
        Lütfen size verilen geçerli bir harita bağlantısı (URL) ile giriş yapın.
      </p>
      <a 
        href="/admin" 
        style={{
          background: "var(--primary)",
          color: "white",
          padding: "10px 20px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "bold"
        }}
      >
        Admin Paneline Git
      </a>
    </main>
  );
}
