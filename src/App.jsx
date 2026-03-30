import { useEffect, useMemo, useState } from "react";

function App() {
  const [rdvs, setRdvs] = useState(() => {
    const saved = localStorage.getItem("rdvs");
    return saved ? JSON.parse(saved) : [];
  });

  const [viewMode, setViewMode] = useState("jour");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [form, setForm] = useState({
    what: "",
    who: "",
    where: "",
    whenDate: "",
    whenStart: "",
    duration: 60,
    how: "",
    why: "",
    notes: "",
    travelBefore: 0,
    travelAfter: 0,
  });

  useEffect(() => {
    localStorage.setItem("rdvs", JSON.stringify(rdvs));
  }, [rdvs]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "duration" || name === "travelBefore" || name === "travelAfter"
          ? Number(value)
          : value,
    }));
  }

  function resetForm() {
    setForm({
      what: "",
      who: "",
      where: "",
      whenDate: "",
      whenStart: "",
      duration: 60,
      how: "",
      why: "",
      notes: "",
      travelBefore: 0,
      travelAfter: 0,
    });
  }

  function addRdv() {
    if (!form.what || !form.whenDate || !form.whenStart) {
      alert("Merci de renseigner au minimum : Quoi, Date, Heure.");
      return;
    }

    const newRdv = {
      ...form,
      id: Date.now(),
    };

    setRdvs((prev) => [...prev, newRdv]);
    resetForm();
  }

  function deleteRdv(id) {
    setRdvs((prev) => prev.filter((r) => r.id !== id));
  }

  function generateTitle(r) {
    const parts = [
      r.what?.trim(),
      r.who?.trim() ? `avec ${r.who.trim()}` : "",
      r.where?.trim() ? `à ${r.where.trim()}` : "",
      r.why?.trim() ? `pour ${r.why.trim()}` : "",
      r.how?.trim() ? `via ${r.how.trim()}` : "",
    ].filter(Boolean);

    return parts.length ? parts.join(" · ") : "Rendez-vous sans titre";
  }

  function changeDate(step) {
    const newDate = new Date(currentDate);

    if (viewMode === "jour") {
      newDate.setDate(newDate.getDate() + step);
    }

    if (viewMode === "semaine") {
      newDate.setDate(newDate.getDate() + step * 7);
    }

    if (viewMode === "mois") {
      newDate.setMonth(newDate.getMonth() + step);
    }

    if (viewMode === "annee") {
      newDate.setFullYear(newDate.getFullYear() + step);
    }

    setCurrentDate(newDate);
  }

  function getPeriodLabel() {
    if (viewMode === "jour") {
      return currentDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }

    if (viewMode === "semaine") {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return `Semaine du ${start.toLocaleDateString("fr-FR")} au ${end.toLocaleDateString("fr-FR")}`;
    }

    if (viewMode === "mois") {
      return currentDate.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });
    }

    return currentDate.getFullYear().toString();
  }

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isInCurrentView(r) {
    const rdvDate = new Date(`${r.whenDate}T12:00:00`);

    if (viewMode === "jour") {
      return rdvDate.toDateString() === currentDate.toDateString();
    }

    if (viewMode === "semaine") {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return rdvDate >= start && rdvDate <= end;
    }

    if (viewMode === "mois") {
      return (
        rdvDate.getMonth() === currentDate.getMonth() &&
        rdvDate.getFullYear() === currentDate.getFullYear()
      );
    }

    if (viewMode === "annee") {
      return rdvDate.getFullYear() === currentDate.getFullYear();
    }

    return true;
  }

  function getEffectiveStart(r) {
    const start = new Date(`${r.whenDate}T${r.whenStart}`);
    start.setMinutes(start.getMinutes() - Number(r.travelBefore || 0));
    return start;
  }

  function getEffectiveEnd(r) {
    const end = new Date(`${r.whenDate}T${r.whenStart}`);
    end.setMinutes(
      end.getMinutes() +
        Number(r.duration || 0) +
        Number(r.travelAfter || 0)
    );
    return end;
  }

  function hasConflict(current) {
    const currentStart = getEffectiveStart(current);
    const currentEnd = getEffectiveEnd(current);

    return rdvs.some((other) => {
      if (other.id === current.id) return false;
      if (other.whenDate !== current.whenDate) return false;

      const otherStart = getEffectiveStart(other);
      const otherEnd = getEffectiveEnd(other);

      return currentStart < otherEnd && currentEnd > otherStart;
    });
  }

  const filteredRdvs = useMemo(() => {
    return [...rdvs]
      .filter(isInCurrentView)
      .sort((a, b) => {
        const aDate = new Date(`${a.whenDate}T${a.whenStart}`);
        const bDate = new Date(`${b.whenDate}T${b.whenStart}`);
        return aDate - bDate;
      });
  }, [rdvs, currentDate, viewMode]);

  const stats = useMemo(() => {
    const totalDuration = filteredRdvs.reduce(
      (sum, r) => sum + Number(r.duration || 0),
      0
    );
    const totalTravel = filteredRdvs.reduce(
      (sum, r) =>
        sum + Number(r.travelBefore || 0) + Number(r.travelAfter || 0),
      0
    );

    return {
      count: filteredRdvs.length,
      totalDuration,
      totalTravel,
    };
  }, [filteredRdvs]);

  const styles = {
    page: {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 20,
      fontFamily: "Arial, sans-serif",
      background: "#f5f7fb",
      minHeight: "100vh",
    },
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      marginBottom: 16,
    },
    title: {
      marginTop: 0,
      marginBottom: 8,
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: 12,
    },
    input: {
      width: "100%",
      padding: 10,
      borderRadius: 8,
      border: "1px solid #ccc",
      marginTop: 6,
    },
    textarea: {
      width: "100%",
      padding: 10,
      borderRadius: 8,
      border: "1px solid #ccc",
      marginTop: 6,
      minHeight: 90,
      resize: "vertical",
    },
    button: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      background: "#2563eb",
      color: "#fff",
      fontWeight: 600,
      marginRight: 8,
      marginBottom: 8,
    },
    buttonSecondary: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #ccc",
      cursor: "pointer",
      background: "#fff",
      color: "#111",
      fontWeight: 600,
      marginRight: 8,
      marginBottom: 8,
    },
    stats: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    },
    badge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      background: "#eef2ff",
      color: "#3730a3",
      fontSize: 12,
      fontWeight: 700,
      marginBottom: 8,
    },
    conflict: {
      color: "#b91c1c",
      fontWeight: "bold",
      marginTop: 8,
    },
    small: {
      color: "#555",
      fontSize: 14,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Gestion des rendez-vous</h1>
        <p style={styles.small}>
          Application de planning avec QQOQCP, vues temporelles, temps de trajet
          et détection de conflits.
        </p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Créer un rendez-vous</h2>

        <div style={styles.grid2}>
          <div>
            <label>Quoi *</label>
            <input
              style={styles.input}
              name="what"
              value={form.what}
              onChange={handleChange}
              placeholder="Ex : Visite client"
            />
          </div>

          <div>
            <label>Qui</label>
            <input
              style={styles.input}
              name="who"
              value={form.who}
              onChange={handleChange}
              placeholder="Nom du contact"
            />
          </div>

          <div>
            <label>Où</label>
            <input
              style={styles.input}
              name="where"
              value={form.where}
              onChange={handleChange}
              placeholder="Adresse ou lieu"
            />
          </div>

          <div>
            <label>Comment</label>
            <input
              style={styles.input}
              name="how"
              value={form.how}
              onChange={handleChange}
              placeholder="Présentiel, téléphone, visio..."
            />
          </div>

          <div>
            <label>Pourquoi</label>
            <input
              style={styles.input}
              name="why"
              value={form.why}
              onChange={handleChange}
              placeholder="Objectif du rendez-vous"
            />
          </div>

          <div>
            <label>Date *</label>
            <input
              style={styles.input}
              type="date"
              name="whenDate"
              value={form.whenDate}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Heure *</label>
            <input
              style={styles.input}
              type="time"
              name="whenStart"
              value={form.whenStart}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Durée du rendez-vous (min)</label>
            <input
              style={styles.input}
              type="number"
              name="duration"
              value={form.duration}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Temps trajet avant (min)</label>
            <input
              style={styles.input}
              type="number"
              name="travelBefore"
              value={form.travelBefore}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Temps trajet après (min)</label>
            <input
              style={styles.input}
              type="number"
              name="travelAfter"
              value={form.travelAfter}
              onChange={handleChange}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Notes</label>
          <textarea
            style={styles.textarea}
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Informations complémentaires"
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={styles.badge}>Titre automatique</div>
          <div>{generateTitle(form)}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button style={styles.button} onClick={addRdv}>
            Ajouter le rendez-vous
          </button>
          <button style={styles.buttonSecondary} onClick={resetForm}>
            Réinitialiser
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Navigation</h2>

        <div style={{ marginBottom: 12 }}>
          <button style={styles.buttonSecondary} onClick={() => changeDate(-1)}>
            ◀ Précédent
          </button>
          <button style={styles.buttonSecondary} onClick={() => changeDate(1)}>
            Suivant ▶
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button
            style={viewMode === "jour" ? styles.button : styles.buttonSecondary}
            onClick={() => setViewMode("jour")}
          >
            Jour
          </button>
          <button
            style={viewMode === "semaine" ? styles.button : styles.buttonSecondary}
            onClick={() => setViewMode("semaine")}
          >
            Semaine
          </button>
          <button
            style={viewMode === "mois" ? styles.button : styles.buttonSecondary}
            onClick={() => setViewMode("mois")}
          >
            Mois
          </button>
          <button
            style={viewMode === "annee" ? styles.button : styles.buttonSecondary}
            onClick={() => setViewMode("annee")}
          >
            Année
          </button>
        </div>

        <div>
          <strong>Période affichée :</strong> {getPeriodLabel()}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Résumé de la période</h2>
        <div style={styles.stats}>
          <div>
            <div style={styles.badge}>Rendez-vous</div>
            <div>{stats.count}</div>
          </div>
          <div>
            <div style={styles.badge}>Temps RDV</div>
            <div>{stats.totalDuration} min</div>
          </div>
          <div>
            <div style={styles.badge}>Temps trajet</div>
            <div>{stats.totalTravel} min</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Liste des rendez-vous</h2>

        {filteredRdvs.length === 0 ? (
          <p>Aucun rendez-vous sur cette période.</p>
        ) : (
          filteredRdvs.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 14,
                marginBottom: 12,
                background: "#fafafa",
              }}
            >
              <div style={styles.badge}>{r.whenDate}</div>
              <h3 style={{ marginTop: 0 }}>{generateTitle(r)}</h3>

              {hasConflict(r) && (
                <p style={styles.conflict}>Conflit de planning</p>
              )}

              <p>
                <strong>Heure :</strong> {r.whenStart}
              </p>
              <p>
                <strong>Durée :</strong> {r.duration} min
              </p>
              <p>
                <strong>Temps trajet :</strong> avant {r.travelBefore} min / après{" "}
                {r.travelAfter} min
              </p>

              {r.where && (
                <p>
                  <strong>Lieu :</strong> {r.where}
                </p>
              )}

              {r.how && (
                <p>
                  <strong>Comment :</strong> {r.how}
                </p>
              )}

              {r.why && (
                <p>
                  <strong>Pourquoi :</strong> {r.why}
                </p>
              )}

              {r.notes && (
                <p>
                  <strong>Notes :</strong> {r.notes}
                </p>
              )}

              <button
                style={{ ...styles.buttonSecondary, borderColor: "#ef4444", color: "#b91c1c" }}
                onClick={() => deleteRdv(r.id)}
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;