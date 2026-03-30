import { useEffect, useMemo, useState } from "react";

const initialForm = {
  what: "",
  who: "",
  where: "",
  whenDate: "",
  whenStart: "",
  duration: 60,
  how: "",
  why: "",
  notes: "",
  status: "prévu",
  travelBefore: 0,
  travelAfter: 0,
};

function App() {
  const [rdvs, setRdvs] = useState(() => {
    const saved = localStorage.getItem("rdvs");
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [viewMode, setViewMode] = useState("jour");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  useEffect(() => {
    localStorage.setItem("rdvs", JSON.stringify(rdvs));
  }, [rdvs]);

  function handleChange(e) {
    const { name, value } = e.target;

    const numericFields = ["duration", "travelBefore", "travelAfter"];

    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
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

  function addOrUpdateRdv() {
    if (!form.what || !form.whenDate || !form.whenStart) {
      alert("Merci de renseigner au minimum : Quoi, Date, Heure.");
      return;
    }

    const payload = {
      ...form,
      duration: Number(form.duration || 0),
      travelBefore: Number(form.travelBefore || 0),
      travelAfter: Number(form.travelAfter || 0),
    };

    if (editingId) {
      setRdvs((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r))
      );
    } else {
      setRdvs((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...payload,
        },
      ]);
    }

    resetForm();
  }

  function deleteRdv(id) {
    setRdvs((prev) => prev.filter((r) => r.id !== id));
  }

  function editRdv(r) {
    setEditingId(r.id);
    setForm({
      what: r.what || "",
      who: r.who || "",
      where: r.where || "",
      whenDate: r.whenDate || "",
      whenStart: r.whenStart || "",
      duration: Number(r.duration || 60),
      how: r.how || "",
      why: r.why || "",
      notes: r.notes || "",
      status: r.status || "prévu",
      travelBefore: Number(r.travelBefore || 0),
      travelAfter: Number(r.travelAfter || 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
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

  function goToday() {
    setCurrentDate(new Date());
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

    return String(currentDate.getFullYear());
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

  function getStartDateTime(r) {
    return new Date(`${r.whenDate}T${r.whenStart}`);
  }

  function getEffectiveStart(r) {
    const start = getStartDateTime(r);
    start.setMinutes(start.getMinutes() - Number(r.travelBefore || 0));
    return start;
  }

  function getEffectiveEnd(r) {
    const end = getStartDateTime(r);
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
    const q = search.trim().toLowerCase();

    return [...rdvs]
      .filter((r) => isInCurrentView(r))
      .filter((r) => {
        const haystack = [
          r.what,
          r.who,
          r.where,
          r.how,
          r.why,
          r.notes,
          generateTitle(r),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return !q || haystack.includes(q);
      })
      .filter((r) => statusFilter === "tous" || r.status === statusFilter)
      .filter((r) => !showOnlyConflicts || hasConflict(r))
      .sort((a, b) => {
        const da = new Date(`${a.whenDate}T${a.whenStart}`);
        const db = new Date(`${b.whenDate}T${b.whenStart}`);
        return da - db;
      });
  }, [rdvs, currentDate, viewMode, search, statusFilter, showOnlyConflicts]);

  const stats = useMemo(() => {
    return {
      count: filteredRdvs.length,
      duration: filteredRdvs.reduce(
        (sum, r) => sum + Number(r.duration || 0),
        0
      ),
      travel: filteredRdvs.reduce(
        (sum, r) =>
          sum + Number(r.travelBefore || 0) + Number(r.travelAfter || 0),
        0
      ),
      conflicts: filteredRdvs.filter((r) => hasConflict(r)).length,
    };
  }, [filteredRdvs]);

  const styles = {
    page: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: 20,
      fontFamily: "Arial, sans-serif",
      background: "#f4f7fb",
      minHeight: "100vh",
      color: "#1f2937",
    },
    card: {
      background: "#fff",
      borderRadius: 14,
      padding: 18,
      marginBottom: 16,
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    },
    title: {
      margin: 0,
      marginBottom: 8,
    },
    subtitle: {
      marginTop: 0,
      color: "#6b7280",
      fontSize: 14,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
      gap: 12,
    },
    input: {
      width: "100%",
      padding: 10,
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      marginTop: 6,
      fontSize: 14,
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      minHeight: 90,
      padding: 10,
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      marginTop: 6,
      fontSize: 14,
      boxSizing: "border-box",
      resize: "vertical",
    },
    primaryBtn: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "none",
      background: "#2563eb",
      color: "white",
      fontWeight: 700,
      cursor: "pointer",
      marginRight: 8,
      marginBottom: 8,
    },
    secondaryBtn: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "white",
      color: "#111827",
      fontWeight: 700,
      cursor: "pointer",
      marginRight: 8,
      marginBottom: 8,
    },
    badge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      background: "#e0e7ff",
      color: "#3730a3",
      fontSize: 12,
      fontWeight: 700,
      marginBottom: 8,
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    },
    statBox: {
      background: "#f8fafc",
      borderRadius: 10,
      padding: 12,
      border: "1px solid #e5e7eb",
    },
    rdvCard: {
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 14,
      background: "#fafafa",
      marginBottom: 12,
    },
    conflict: {
      color: "#b91c1c",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Gestion des rendez-vous</h1>
        <p style={styles.subtitle}>
          Planning responsive PC / mobile avec QQOQCP, temps de trajet,
          conflits, filtres et vues temporelles.
        </p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? "Modifier un rendez-vous" : "Créer un rendez-vous"}
        </h2>

        <div style={styles.grid}>
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
              placeholder="Présentiel, visio, téléphone"
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
            <label>Durée RDV (min)</label>
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

          <div>
            <label>Statut</label>
            <select
              style={styles.input}
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="prévu">Prévu</option>
              <option value="confirmé">Confirmé</option>
              <option value="terminé">Terminé</option>
              <option value="annulé">Annulé</option>
            </select>
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
          <div style={styles.badge}>Titre automatique QQOQCP</div>
          <div>{generateTitle(form)}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button style={styles.primaryBtn} onClick={addOrUpdateRdv}>
            {editingId ? "Enregistrer les modifications" : "Ajouter le rendez-vous"}
          </button>
          <button style={styles.secondaryBtn} onClick={resetForm}>
            Réinitialiser
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Navigation</h2>

        <div style={{ marginBottom: 12 }}>
          <button style={styles.secondaryBtn} onClick={() => changeDate(-1)}>
            ◀ Précédent
          </button>
          <button style={styles.secondaryBtn} onClick={() => changeDate(1)}>
            Suivant ▶
          </button>
          <button style={styles.secondaryBtn} onClick={goToday}>
            Aujourd’hui
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button
            style={{
              ...styles.secondaryBtn,
              background: viewMode === "jour" ? "#2563eb" : "#fff",
              color: viewMode === "jour" ? "#fff" : "#111",
              border: viewMode === "jour" ? "none" : "1px solid #cbd5e1",
            }}
            onClick={() => setViewMode("jour")}
          >
            Jour
          </button>

          <button
            style={{
              ...styles.secondaryBtn,
              background: viewMode === "semaine" ? "#2563eb" : "#fff",
              color: viewMode === "semaine" ? "#fff" : "#111",
              border: viewMode === "semaine" ? "none" : "1px solid #cbd5e1",
            }}
            onClick={() => setViewMode("semaine")}
          >
            Semaine
          </button>

          <button
            style={{
              ...styles.secondaryBtn,
              background: viewMode === "mois" ? "#2563eb" : "#fff",
              color: viewMode === "mois" ? "#fff" : "#111",
              border: viewMode === "mois" ? "none" : "1px solid #cbd5e1",
            }}
            onClick={() => setViewMode("mois")}
          >
            Mois
          </button>

          <button
            style={{
              ...styles.secondaryBtn,
              background: viewMode === "annee" ? "#2563eb" : "#fff",
              color: viewMode === "annee" ? "#fff" : "#111",
              border: viewMode === "annee" ? "none" : "1px solid #cbd5e1",
            }}
            onClick={() => setViewMode("annee")}
          >
            Année
          </button>
        </div>

        <p>
          <strong>Mode actif :</strong> {viewMode}
        </p>
        <p>
          <strong>Période affichée :</strong> {getPeriodLabel()}
        </p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Filtres et résumé</h2>

        <div style={{ ...styles.grid, marginBottom: 16 }}>
          <div>
            <label>Recherche</label>
            <input
              style={styles.input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="client, lieu, objectif..."
            />
          </div>

          <div>
            <label>Filtre statut</label>
            <select
              style={styles.input}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="tous">Tous</option>
              <option value="prévu">Prévu</option>
              <option value="confirmé">Confirmé</option>
              <option value="terminé">Terminé</option>
              <option value="annulé">Annulé</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={showOnlyConflicts}
                onChange={(e) => setShowOnlyConflicts(e.target.checked)}
              />
              Afficher seulement les conflits
            </label>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.badge}>Rendez-vous</div>
            <div>{stats.count}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Temps RDV</div>
            <div>{stats.duration} min</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Temps trajet</div>
            <div>{stats.travel} min</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Conflits</div>
            <div>{stats.conflicts}</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>Liste des rendez-vous</h2>

        {filteredRdvs.length === 0 ? (
          <p>Aucun rendez-vous sur cette période.</p>
        ) : (
          filteredRdvs.map((r) => (
            <div key={r.id} style={styles.rdvCard}>
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
                <strong>Statut :</strong> {r.status}
              </p>
              <p>
                <strong>Temps trajet :</strong> avant {r.travelBefore} min / après{" "}
                {r.travelAfter} min
              </p>

              {r.who && (
                <p>
                  <strong>Qui :</strong> {r.who}
                </p>
              )}

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

              <div style={{ marginTop: 12 }}>
                <button style={styles.secondaryBtn} onClick={() => editRdv(r)}>
                  Modifier
                </button>
                <button
                  style={{
                    ...styles.secondaryBtn,
                    borderColor: "#ef4444",
                    color: "#b91c1c",
                  }}
                  onClick={() => deleteRdv(r.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;