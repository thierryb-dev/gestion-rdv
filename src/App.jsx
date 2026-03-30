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

    if (viewMode === "jour") newDate.setDate(newDate.getDate() + step);
    if (viewMode === "semaine") newDate.setDate(newDate.getDate() + step * 7);
    if (viewMode === "mois") newDate.setMonth(newDate.getMonth() + step);
    if (viewMode === "annee") newDate.setFullYear(newDate.getFullYear() + step);

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
      duration: filteredRdvs.reduce((sum, r) => sum + Number(r.duration || 0), 0),
      travel: filteredRdvs.reduce(
        (sum, r) => sum + Number(r.travelBefore || 0) + Number(r.travelAfter || 0),
        0
      ),
      conflicts: filteredRdvs.filter((r) => hasConflict(r)).length,
    };
  }, [filteredRdvs]);

  const statusColors = {
    prévu: {
      background: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #fdba74",
    },
    confirmé: {
      background: "#ecfdf5",
      color: "#047857",
      border: "1px solid #6ee7b7",
    },
    terminé: {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #93c5fd",
    },
    annulé: {
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fca5a5",
    },
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "linear-gradient(180deg, #eef2ff 0%, #f8fafc 35%, #f8fafc 100%)",
      padding: 20,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#0f172a",
    },
    wrapper: {
      maxWidth: 1240,
      margin: "0 auto",
    },
    hero: {
      background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
      borderRadius: 24,
      padding: 24,
      color: "white",
      boxShadow: "0 18px 45px rgba(37, 99, 235, 0.25)",
      marginBottom: 18,
    },
    heroTitle: {
      margin: 0,
      fontSize: 32,
      fontWeight: 800,
    },
    heroText: {
      marginTop: 8,
      marginBottom: 0,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
    },
    card: {
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(10px)",
      borderRadius: 22,
      padding: 20,
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
      border: "1px solid rgba(255,255,255,0.7)",
      marginBottom: 18,
    },
    sectionTitle: {
      margin: 0,
      marginBottom: 6,
      fontSize: 22,
      fontWeight: 800,
      color: "#0f172a",
    },
    sectionText: {
      marginTop: 0,
      marginBottom: 16,
      color: "#64748b",
      fontSize: 14,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
      gap: 14,
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid #dbeafe",
      background: "#ffffff",
      marginTop: 8,
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
    },
    textarea: {
      width: "100%",
      minHeight: 100,
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid #dbeafe",
      background: "#ffffff",
      marginTop: 8,
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      resize: "vertical",
      boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
    },
    label: {
      fontSize: 13,
      fontWeight: 700,
      color: "#334155",
    },
    buttonPrimary: {
      padding: "12px 16px",
      borderRadius: 14,
      border: "none",
      background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
      color: "white",
      fontWeight: 800,
      cursor: "pointer",
      marginRight: 10,
      marginBottom: 10,
      boxShadow: "0 8px 18px rgba(37,99,235,0.25)",
    },
    buttonSecondary: {
      padding: "12px 16px",
      borderRadius: 14,
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      color: "#0f172a",
      fontWeight: 700,
      cursor: "pointer",
      marginRight: 10,
      marginBottom: 10,
    },
    badge: {
      display: "inline-block",
      padding: "6px 12px",
      borderRadius: 999,
      background: "#eef2ff",
      color: "#4338ca",
      fontSize: 12,
      fontWeight: 800,
      marginBottom: 8,
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 14,
    },
    statBox: {
      borderRadius: 18,
      padding: 16,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 8px 22px rgba(15, 23, 42, 0.04)",
    },
    statValue: {
      fontSize: 28,
      fontWeight: 800,
      marginTop: 6,
      color: "#0f172a",
    },
    topNav: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "center",
      marginBottom: 14,
    },
    filterRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
      alignItems: "end",
      marginBottom: 16,
    },
    rdvCard: {
      borderRadius: 20,
      padding: 18,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
      marginBottom: 14,
    },
    rdvHeader: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },
    rdvTitle: {
      marginTop: 0,
      marginBottom: 8,
      fontSize: 18,
      fontWeight: 800,
    },
    metaGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 10,
      marginTop: 12,
      marginBottom: 12,
    },
    metaBox: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: 12,
      fontSize: 14,
    },
    subtle: {
      color: "#64748b",
      fontSize: 14,
    },
    conflict: {
      color: "#b91c1c",
      fontWeight: 800,
      margin: "8px 0",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Gestion des rendez-vous</h1>
          <p style={styles.heroText}>
            Une interface moderne pour organiser tes rendez-vous, gérer les
            trajets, visualiser les périodes et repérer rapidement les conflits.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {editingId ? "Modifier un rendez-vous" : "Créer un rendez-vous"}
          </h2>
          <p style={styles.sectionText}>
            Le titre est généré automatiquement à partir de la logique QQOQCP.
          </p>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Quoi *</label>
              <input
                style={styles.input}
                name="what"
                value={form.what}
                onChange={handleChange}
                placeholder="Ex : Visite client"
              />
            </div>

            <div>
              <label style={styles.label}>Qui</label>
              <input
                style={styles.input}
                name="who"
                value={form.who}
                onChange={handleChange}
                placeholder="Nom du contact"
              />
            </div>

            <div>
              <label style={styles.label}>Où</label>
              <input
                style={styles.input}
                name="where"
                value={form.where}
                onChange={handleChange}
                placeholder="Adresse ou lieu"
              />
            </div>

            <div>
              <label style={styles.label}>Comment</label>
              <input
                style={styles.input}
                name="how"
                value={form.how}
                onChange={handleChange}
                placeholder="Présentiel, visio, téléphone"
              />
            </div>

            <div>
              <label style={styles.label}>Pourquoi</label>
              <input
                style={styles.input}
                name="why"
                value={form.why}
                onChange={handleChange}
                placeholder="Objectif"
              />
            </div>

            <div>
              <label style={styles.label}>Date *</label>
              <input
                style={styles.input}
                type="date"
                name="whenDate"
                value={form.whenDate}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={styles.label}>Heure *</label>
              <input
                style={styles.input}
                type="time"
                name="whenStart"
                value={form.whenStart}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={styles.label}>Durée RDV (min)</label>
              <input
                style={styles.input}
                type="number"
                name="duration"
                value={form.duration}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={styles.label}>Temps trajet avant (min)</label>
              <input
                style={styles.input}
                type="number"
                name="travelBefore"
                value={form.travelBefore}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={styles.label}>Temps trajet après (min)</label>
              <input
                style={styles.input}
                type="number"
                name="travelAfter"
                value={form.travelAfter}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={styles.label}>Statut</label>
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

          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={styles.textarea}
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Informations complémentaires"
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={styles.badge}>Titre automatique</div>
            <div style={{ fontWeight: 700 }}>{generateTitle(form)}</div>
          </div>

          <div style={{ marginTop: 18 }}>
            <button style={styles.buttonPrimary} onClick={addOrUpdateRdv}>
              {editingId ? "Enregistrer les modifications" : "Ajouter le rendez-vous"}
            </button>
            <button style={styles.buttonSecondary} onClick={resetForm}>
              Réinitialiser
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Navigation</h2>
          <p style={styles.sectionText}>
            Navigue par jour, semaine, mois ou année.
          </p>

          <div style={styles.topNav}>
            <button style={styles.buttonSecondary} onClick={() => changeDate(-1)}>
              ◀ Précédent
            </button>
            <button style={styles.buttonSecondary} onClick={() => changeDate(1)}>
              Suivant ▶
            </button>
            <button style={styles.buttonSecondary} onClick={goToday}>
              Aujourd’hui
            </button>
          </div>

          <div style={styles.topNav}>
            {["jour", "semaine", "mois", "annee"].map((mode) => (
              <button
                key={mode}
                style={{
                  ...styles.buttonSecondary,
                  background:
                    viewMode === mode
                      ? "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
                      : "#ffffff",
                  color: viewMode === mode ? "#ffffff" : "#0f172a",
                  border: viewMode === mode ? "none" : "1px solid #cbd5e1",
                  boxShadow:
                    viewMode === mode
                      ? "0 8px 18px rgba(37,99,235,0.2)"
                      : "none",
                }}
                onClick={() => setViewMode(mode)}
              >
                {mode === "jour"
                  ? "Jour"
                  : mode === "semaine"
                    ? "Semaine"
                    : mode === "mois"
                      ? "Mois"
                      : "Année"}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <p style={{ margin: "6px 0" }}>
              <strong>Mode actif :</strong> {viewMode}
            </p>
            <p style={{ margin: "6px 0" }}>
              <strong>Période affichée :</strong> {getPeriodLabel()}
            </p>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Filtres et résumé</h2>
          <p style={styles.sectionText}>
            Recherche rapide, filtre par statut et conflits.
          </p>

          <div style={styles.filterRow}>
            <div>
              <label style={styles.label}>Recherche</label>
              <input
                style={styles.input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="client, lieu, objectif..."
              />
            </div>

            <div>
              <label style={styles.label}>Filtre statut</label>
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
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}>
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
              <div style={styles.statValue}>{stats.count}</div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.badge}>Temps RDV</div>
              <div style={styles.statValue}>{stats.duration} min</div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.badge}>Temps trajet</div>
              <div style={styles.statValue}>{stats.travel} min</div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.badge}>Conflits</div>
              <div style={styles.statValue}>{stats.conflicts}</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Liste des rendez-vous</h2>
          <p style={styles.sectionText}>
            Vue chronologique avec statut, conflit et détails.
          </p>

          {filteredRdvs.length === 0 ? (
            <p style={styles.subtle}>Aucun rendez-vous sur cette période.</p>
          ) : (
            filteredRdvs.map((r) => (
              <div key={r.id} style={styles.rdvCard}>
                <div style={styles.rdvHeader}>
                  <div>
                    <div style={styles.badge}>{r.whenDate}</div>
                    <h3 style={styles.rdvTitle}>{generateTitle(r)}</h3>
                  </div>

                  <div
                    style={{
                      ...(statusColors[r.status] || statusColors["prévu"]),
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "capitalize",
                    }}
                  >
                    {r.status}
                  </div>
                </div>

                {hasConflict(r) && (
                  <p style={styles.conflict}>Conflit de planning détecté</p>
                )}

                <div style={styles.metaGrid}>
                  <div style={styles.metaBox}>
                    <strong>Heure</strong>
                    <div>{r.whenStart}</div>
                  </div>

                  <div style={styles.metaBox}>
                    <strong>Durée</strong>
                    <div>{r.duration} min</div>
                  </div>

                  <div style={styles.metaBox}>
                    <strong>Trajet</strong>
                    <div>
                      avant {r.travelBefore} min / après {r.travelAfter} min
                    </div>
                  </div>

                  {r.who && (
                    <div style={styles.metaBox}>
                      <strong>Qui</strong>
                      <div>{r.who}</div>
                    </div>
                  )}

                  {r.where && (
                    <div style={styles.metaBox}>
                      <strong>Lieu</strong>
                      <div>{r.where}</div>
                    </div>
                  )}

                  {r.how && (
                    <div style={styles.metaBox}>
                      <strong>Comment</strong>
                      <div>{r.how}</div>
                    </div>
                  )}

                  {r.why && (
                    <div style={styles.metaBox}>
                      <strong>Pourquoi</strong>
                      <div>{r.why}</div>
                    </div>
                  )}
                </div>

                {r.notes && (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 14,
                    }}
                  >
                    <strong>Notes</strong>
                    <div style={{ marginTop: 6 }}>{r.notes}</div>
                  </div>
                )}

                <div>
                  <button style={styles.buttonSecondary} onClick={() => editRdv(r)}>
                    Modifier
                  </button>
                  <button
                    style={{
                      ...styles.buttonSecondary,
                      borderColor: "#fca5a5",
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
    </div>
  );
}

export default App;