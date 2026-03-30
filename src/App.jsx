import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "rdvs";
const INITIAL_FORM = {
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  const [viewMode, setViewMode] = useState("jour");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rdvs));
  }, [rdvs]);

  function handleChange(e) {
    const { name, value } = e.target;
    const numericFields = ["duration", "travelBefore", "travelAfter"];

    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name)
        ? value === ""
          ? ""
          : Number(value)
        : value,
    }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  function generateTitle(rdv) {
    const parts = [
      rdv.what?.trim(),
      rdv.who?.trim() ? `avec ${rdv.who.trim()}` : "",
      rdv.where?.trim() ? `à ${rdv.where.trim()}` : "",
      rdv.why?.trim() ? `pour ${rdv.why.trim()}` : "",
      rdv.how?.trim() ? `via ${rdv.how.trim()}` : "",
    ].filter(Boolean);

    return parts.length ? parts.join(" · ") : "Rendez-vous sans titre";
  }

  function validateRdv(data) {
    if (!data.what?.trim()) return "Le champ 'Quoi' est obligatoire.";
    if (!data.whenDate) return "La date est obligatoire.";
    if (!data.whenStart) return "L'heure est obligatoire.";
    if (Number(data.duration || 0) < 0) return "La durée doit être positive.";
    if (Number(data.travelBefore || 0) < 0) return "Le trajet avant doit être positif.";
    if (Number(data.travelAfter || 0) < 0) return "Le trajet après doit être positif.";
    return null;
  }

  function addOrUpdateRdv() {
    const payload = {
      what: String(form.what || "").trim(),
      who: String(form.who || "").trim(),
      where: String(form.where || "").trim(),
      whenDate: String(form.whenDate || ""),
      whenStart: String(form.whenStart || ""),
      duration: Number(form.duration || 0),
      how: String(form.how || "").trim(),
      why: String(form.why || "").trim(),
      notes: String(form.notes || "").trim(),
      status: String(form.status || "prévu"),
      travelBefore: Number(form.travelBefore || 0),
      travelAfter: Number(form.travelAfter || 0),
    };

    const error = validateRdv(payload);
    if (error) {
      alert(error);
      return;
    }

    if (editingId) {
      setRdvs((prev) =>
        prev.map((rdv) => (rdv.id === editingId ? { ...rdv, ...payload } : rdv))
      );
    } else {
      const newRdv = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date().toISOString(),
        ...payload,
      };

      setRdvs((prev) => [...prev, newRdv]);
    }

    resetForm();
  }

  function deleteRdv(id) {
    setRdvs((prev) => prev.filter((rdv) => rdv.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  function editRdv(rdv) {
    setEditingId(rdv.id);
    setForm({
      what: rdv.what || "",
      who: rdv.who || "",
      where: rdv.where || "",
      whenDate: rdv.whenDate || "",
      whenStart: rdv.whenStart || "",
      duration: Number(rdv.duration ?? 60),
      how: rdv.how || "",
      why: rdv.why || "",
      notes: rdv.notes || "",
      status: rdv.status || "prévu",
      travelBefore: Number(rdv.travelBefore ?? 0),
      travelAfter: Number(rdv.travelAfter ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(rdvs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rendez-vous.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (!Array.isArray(parsed)) {
          alert("Le fichier doit contenir une liste de rendez-vous.");
          return;
        }

        const sanitized = parsed.map((item, index) => ({
          id: item.id ?? `import-${Date.now()}-${index}`,
          createdAt: item.createdAt ?? new Date().toISOString(),
          what: String(item.what ?? ""),
          who: String(item.who ?? ""),
          where: String(item.where ?? ""),
          whenDate: String(item.whenDate ?? ""),
          whenStart: String(item.whenStart ?? ""),
          duration: Number(item.duration ?? 60),
          how: String(item.how ?? ""),
          why: String(item.why ?? ""),
          notes: String(item.notes ?? ""),
          status: String(item.status ?? "prévu"),
          travelBefore: Number(item.travelBefore ?? 0),
          travelAfter: Number(item.travelAfter ?? 0),
        }));

        setRdvs(sanitized);
        resetForm();
        alert("Import réussi.");
      } catch {
        alert("Fichier JSON invalide.");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  function getDateTimeFromRdv(rdv) {
    return new Date(`${rdv.whenDate}T${rdv.whenStart}`);
  }

  function getEffectiveStart(rdv) {
    const start = getDateTimeFromRdv(rdv);
    start.setMinutes(start.getMinutes() - Number(rdv.travelBefore || 0));
    return start;
  }

  function getEffectiveEnd(rdv) {
    const end = getDateTimeFromRdv(rdv);
    end.setMinutes(
      end.getMinutes() +
        Number(rdv.duration || 0) +
        Number(rdv.travelAfter || 0)
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

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getEndOfWeek(date) {
    const d = getStartOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function getDaysOfWeek(date) {
    const start = getStartOfWeek(date);
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
  }

  function getMonthGridStart(date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const day = first.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    first.setDate(first.getDate() + diff);
    first.setHours(0, 0, 0, 0);
    return first;
  }

  function getMonthGridDays(date) {
    const start = getMonthGridStart(date);
    return Array.from({ length: 42 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
  }

  function formatDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatMonthInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function getISOWeekInfo(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNumber =
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      );
    return {
      year: d.getFullYear(),
      week: weekNumber,
    };
  }

  function formatWeekInputValue(date) {
    const { year, week } = getISOWeekInfo(date);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  function parseWeekInputValue(value) {
    const match = /^(\d{4})-W(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const week = Number(match[2]);

    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setDate(jan4.getDate() - jan4Day + 1);

    const result = new Date(mondayWeek1);
    result.setDate(mondayWeek1.getDate() + (week - 1) * 7);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function isInCurrentView(rdv) {
    const rdvDate = new Date(`${rdv.whenDate}T12:00:00`);
    if (Number.isNaN(rdvDate.getTime())) return false;

    if (viewMode === "jour") {
      return rdvDate.toDateString() === currentDate.toDateString();
    }

    if (viewMode === "semaine") {
      const start = getStartOfWeek(currentDate);
      const end = getEndOfWeek(currentDate);
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

  function changeDate(step) {
    const next = new Date(currentDate);

    if (viewMode === "jour") next.setDate(next.getDate() + step);
    if (viewMode === "semaine") next.setDate(next.getDate() + step * 7);
    if (viewMode === "mois") next.setMonth(next.getMonth() + step);
    if (viewMode === "annee") next.setFullYear(next.getFullYear() + step);

    setCurrentDate(next);
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
      const end = getEndOfWeek(currentDate);
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

  function formatRangeHour(start, end) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(start.getHours())}:${pad(start.getMinutes())} → ${pad(end.getHours())}:${pad(
      end.getMinutes()
    )}`;
  }

  function handlePeriodPickerChange(value) {
    if (!value) return;

    if (viewMode === "jour") {
      const d = new Date(`${value}T12:00:00`);
      if (!Number.isNaN(d.getTime())) setCurrentDate(d);
      return;
    }

    if (viewMode === "semaine") {
      const d = parseWeekInputValue(value);
      if (d) setCurrentDate(d);
      return;
    }

    if (viewMode === "mois") {
      const [year, month] = value.split("-").map(Number);
      if (year && month) setCurrentDate(new Date(year, month - 1, 1, 12, 0, 0));
      return;
    }

    if (viewMode === "annee") {
      const year = Number(value);
      if (!Number.isNaN(year)) setCurrentDate(new Date(year, 0, 1, 12, 0, 0));
    }
  }

  const filteredRdvs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...rdvs]
      .filter((rdv) => isInCurrentView(rdv))
      .filter((rdv) => {
        const haystack = [
          rdv.what,
          rdv.who,
          rdv.where,
          rdv.how,
          rdv.why,
          rdv.notes,
          generateTitle(rdv),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return !q || haystack.includes(q);
      })
      .filter((rdv) => statusFilter === "tous" || rdv.status === statusFilter)
      .filter((rdv) => !showOnlyConflicts || hasConflict(rdv))
      .sort((a, b) => getDateTimeFromRdv(a) - getDateTimeFromRdv(b));
  }, [rdvs, currentDate, viewMode, search, statusFilter, showOnlyConflicts]);

  const stats = useMemo(() => {
    return {
      count: filteredRdvs.length,
      duration: filteredRdvs.reduce((sum, rdv) => sum + Number(rdv.duration || 0), 0),
      travel: filteredRdvs.reduce(
        (sum, rdv) =>
          sum + Number(rdv.travelBefore || 0) + Number(rdv.travelAfter || 0),
        0
      ),
      conflicts: filteredRdvs.filter((rdv) => hasConflict(rdv)).length,
    };
  }, [filteredRdvs, rdvs]);

  const timelineRdvs = useMemo(() => {
    return [...filteredRdvs].sort((a, b) => getEffectiveStart(a) - getEffectiveStart(b));
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
      maxWidth: 1320,
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
      boxSizing: "border-box",
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
      boxSizing: "border-box",
      resize: "vertical",
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
      background: "#ffffff",
      border: "1px solid #e2e8f0",
    },
    statValue: {
      fontSize: 28,
      fontWeight: 800,
      marginTop: 6,
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
      background: "#ffffff",
      border: "1px solid #e2e8f0",
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
      background: "#f8fafc",
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
    pickerWrap: {
      display: "grid",
      gridTemplateColumns: "minmax(220px, 320px)",
      gap: 12,
      marginTop: 10,
      marginBottom: 4,
    },
    timelineShell: {
      overflowX: "auto",
      overflowY: "hidden",
      border: "1px solid #e2e8f0",
      borderRadius: 20,
      background: "#fff",
    },
    timelineLegend: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 14,
    },
    timelineLegendItem: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      color: "#475569",
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      background: "#2563eb",
    },
    dayTimelineWrap: {
      minWidth: 760,
    },
    dayTimelineGrid: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "72px 1fr",
      minHeight: 1440,
    },
    timeColumn: {
      borderRight: "1px solid #e2e8f0",
      background: "#f8fafc",
    },
    timeSlot: {
      height: 60,
      borderBottom: "1px solid #eef2f7",
      padding: "4px 8px",
      fontSize: 12,
      color: "#64748b",
      boxSizing: "border-box",
    },
    dayCanvas: {
      position: "relative",
      minHeight: 1440,
      background:
        "repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 59px, #eef2f7 60px)",
    },
    weekTimelineWrap: {
      minWidth: 1120,
    },
    weekHeader: {
      display: "grid",
      gridTemplateColumns: "72px repeat(7, minmax(140px, 1fr))",
      borderBottom: "1px solid #e2e8f0",
      background: "#f8fafc",
      position: "sticky",
      top: 0,
      zIndex: 2,
    },
    weekHeaderCell: {
      padding: 12,
      borderRight: "1px solid #e2e8f0",
      fontSize: 13,
      fontWeight: 700,
      color: "#334155",
      textAlign: "center",
      boxSizing: "border-box",
    },
    weekGrid: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "72px repeat(7, minmax(140px, 1fr))",
      minHeight: 1440,
    },
    weekTimeColumn: {
      borderRight: "1px solid #e2e8f0",
      background: "#f8fafc",
    },
    weekDayColumn: {
      position: "relative",
      minHeight: 1440,
      borderRight: "1px solid #eef2f7",
      background:
        "repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 59px, #eef2f7 60px)",
    },
    timelineEvent: {
      position: "absolute",
      left: 8,
      right: 8,
      borderRadius: 14,
      padding: 10,
      boxSizing: "border-box",
      overflow: "hidden",
      boxShadow: "0 8px 20px rgba(37, 99, 235, 0.12)",
      border: "1px solid rgba(37,99,235,0.15)",
      background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.12) 100%)",
      color: "#0f172a",
    },
    timelineEventTitle: {
      fontSize: 13,
      fontWeight: 800,
      marginBottom: 4,
      lineHeight: 1.2,
    },
    timelineEventMeta: {
      fontSize: 12,
      color: "#475569",
      lineHeight: 1.35,
    },
    monthGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(120px, 1fr))",
      gap: 10,
    },
    monthDayName: {
      fontSize: 12,
      fontWeight: 800,
      color: "#475569",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      padding: "4px 8px",
    },
    monthCell: {
      minHeight: 130,
      borderRadius: 18,
      border: "1px solid #e2e8f0",
      background: "#fff",
      padding: 12,
      boxSizing: "border-box",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    monthCellMuted: {
      background: "#f8fafc",
      color: "#94a3b8",
    },
    monthCellToday: {
      border: "2px solid #2563eb",
      boxShadow: "0 8px 20px rgba(37,99,235,0.08)",
    },
    monthCellHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    monthDayNumber: {
      fontWeight: 800,
      fontSize: 14,
    },
    monthCountBadge: {
      fontSize: 11,
      padding: "4px 8px",
      borderRadius: 999,
      background: "#eef2ff",
      color: "#4338ca",
      fontWeight: 800,
    },
    monthEventMini: {
      fontSize: 12,
      padding: "6px 8px",
      borderRadius: 10,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    yearGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 14,
    },
    yearMonthCard: {
      borderRadius: 20,
      border: "1px solid #e2e8f0",
      background: "#fff",
      padding: 14,
      cursor: "pointer",
    },
    yearMonthTitle: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      gap: 8,
    },
    yearMiniGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 4,
    },
    yearMiniCell: {
      aspectRatio: "1 / 1",
      borderRadius: 8,
      background: "#f1f5f9",
      border: "1px solid #e2e8f0",
    },
    timelineEmpty: {
      padding: 18,
      color: "#64748b",
      fontSize: 14,
    },
  };

  function getTimelineEventStyle(rdv, options = {}) {
    const start = getEffectiveStart(rdv);
    const end = getEffectiveEnd(rdv);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const totalMinutes = Math.max(endMinutes - startMinutes, 20);

    const top = Math.max(0, startMinutes);
    const height = Math.max(totalMinutes, 28);

    return {
      ...styles.timelineEvent,
      top,
      height,
      ...(hasConflict(rdv)
        ? {
            border: "1px solid rgba(185, 28, 28, 0.25)",
            boxShadow: "0 8px 18px rgba(185, 28, 28, 0.12)",
            background:
              "linear-gradient(135deg, rgba(254,226,226,0.95) 0%, rgba(254,242,242,0.98) 100%)",
          }
        : {}),
      ...(rdv.status === "confirmé"
        ? {
            background:
              "linear-gradient(135deg, rgba(220,252,231,0.95) 0%, rgba(236,253,245,0.98) 100%)",
          }
        : {}),
      ...(rdv.status === "terminé"
        ? {
            background:
              "linear-gradient(135deg, rgba(219,234,254,0.95) 0%, rgba(239,246,255,0.98) 100%)",
          }
        : {}),
      ...(rdv.status === "annulé"
        ? {
            background:
              "linear-gradient(135deg, rgba(254,226,226,0.95) 0%, rgba(254,242,242,0.98) 100%)",
            opacity: 0.8,
          }
        : {}),
      ...options,
    };
  }

  function renderHourLabels() {
    return Array.from({ length: 24 }, (_, hour) => (
      <div key={hour} style={styles.timeSlot}>
        {String(hour).padStart(2, "0")}:00
      </div>
    ));
  }

  function renderDayTimeline() {
    const dayDate = startOfDay(currentDate);
    const dayRdvs = timelineRdvs.filter((rdv) =>
      sameDay(new Date(`${rdv.whenDate}T12:00:00`), dayDate)
    );

    return (
      <div style={styles.timelineShell}>
        <div style={styles.dayTimelineWrap}>
          <div style={styles.dayTimelineGrid}>
            <div style={styles.timeColumn}>{renderHourLabels()}</div>

            <div style={styles.dayCanvas}>
              {dayRdvs.length === 0 ? (
                <div style={styles.timelineEmpty}>
                  Aucun rendez-vous sur cette journée.
                </div>
              ) : (
                dayRdvs.map((rdv) => {
                  const start = getEffectiveStart(rdv);
                  const end = getEffectiveEnd(rdv);

                  return (
                    <div key={rdv.id} style={getTimelineEventStyle(rdv)}>
                      <div style={styles.timelineEventTitle}>{generateTitle(rdv)}</div>
                      <div style={styles.timelineEventMeta}>
                        {formatRangeHour(start, end)}
                      </div>
                      <div style={styles.timelineEventMeta}>
                        RDV {rdv.whenStart} · {rdv.duration} min
                      </div>
                      {rdv.where ? (
                        <div style={styles.timelineEventMeta}>{rdv.where}</div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderWeekTimeline() {
    const weekDays = getDaysOfWeek(currentDate);

    return (
      <div style={styles.timelineShell}>
        <div style={styles.weekTimelineWrap}>
          <div style={styles.weekHeader}>
            <div style={styles.weekHeaderCell}></div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} style={styles.weekHeaderCell}>
                <div>
                  {day.toLocaleDateString("fr-FR", {
                    weekday: "short",
                  })}
                </div>
                <div style={{ marginTop: 4, fontSize: 14 }}>
                  {day.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.weekGrid}>
            <div style={styles.weekTimeColumn}>{renderHourLabels()}</div>

            {weekDays.map((day) => {
              const dayRdvs = timelineRdvs.filter((rdv) =>
                sameDay(new Date(`${rdv.whenDate}T12:00:00`), day)
              );

              return (
                <div key={day.toISOString()} style={styles.weekDayColumn}>
                  {dayRdvs.map((rdv) => {
                    const start = getEffectiveStart(rdv);
                    const end = getEffectiveEnd(rdv);

                    return (
                      <div key={rdv.id} style={getTimelineEventStyle(rdv)}>
                        <div style={styles.timelineEventTitle}>{rdv.what}</div>
                        <div style={styles.timelineEventMeta}>
                          {formatRangeHour(start, end)}
                        </div>
                        {rdv.who ? (
                          <div style={styles.timelineEventMeta}>{rdv.who}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderMonthTimeline() {
    const weekDayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const days = getMonthGridDays(currentDate);

    return (
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(120px, 1fr))",
            gap: 10,
            marginBottom: 10,
          }}
        >
          {weekDayNames.map((label) => (
            <div key={label} style={styles.monthDayName}>
              {label}
            </div>
          ))}
        </div>

        <div style={styles.monthGrid}>
          {days.map((day) => {
            const dayRdvs = timelineRdvs.filter((rdv) =>
              sameDay(new Date(`${rdv.whenDate}T12:00:00`), day)
            );
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = sameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                style={{
                  ...styles.monthCell,
                  ...(!isCurrentMonth ? styles.monthCellMuted : {}),
                  ...(isToday ? styles.monthCellToday : {}),
                }}
                onClick={() => {
                  setCurrentDate(new Date(day));
                  setViewMode("jour");
                }}
                title="Cliquer pour ouvrir la journée"
              >
                <div style={styles.monthCellHeader}>
                  <div style={styles.monthDayNumber}>{day.getDate()}</div>
                  {dayRdvs.length > 0 ? (
                    <div style={styles.monthCountBadge}>
                      {dayRdvs.length} RDV
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {dayRdvs.slice(0, 3).map((rdv) => (
                    <div key={rdv.id} style={styles.monthEventMini}>
                      {rdv.whenStart} · {rdv.what}
                    </div>
                  ))}
                  {dayRdvs.length > 3 ? (
                    <div style={{ ...styles.subtle, fontSize: 12 }}>
                      + {dayRdvs.length - 3} autre(s)
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function getMonthCount(year, monthIndex) {
    return timelineRdvs.filter((rdv) => {
      const d = new Date(`${rdv.whenDate}T12:00:00`);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    }).length;
  }

  function getMonthMiniDays(year, monthIndex) {
    const first = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: lastDay }, (_, i) => {
      const day = new Date(year, monthIndex, i + 1);
      const count = timelineRdvs.filter((rdv) =>
        sameDay(new Date(`${rdv.whenDate}T12:00:00`), day)
      ).length;
      return { day, count };
    });
  }

  function renderYearTimeline() {
    const year = currentDate.getFullYear();

    return (
      <div style={styles.yearGrid}>
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const monthDate = new Date(year, monthIndex, 1);
          const count = getMonthCount(year, monthIndex);
          const miniDays = getMonthMiniDays(year, monthIndex);

          return (
            <div
              key={monthIndex}
              style={styles.yearMonthCard}
              onClick={() => {
                setCurrentDate(monthDate);
                setViewMode("mois");
              }}
              title="Cliquer pour ouvrir le mois"
            >
              <div style={styles.yearMonthTitle}>
                <strong>
                  {monthDate.toLocaleDateString("fr-FR", {
                    month: "long",
                  })}
                </strong>
                <span style={styles.monthCountBadge}>{count} RDV</span>
              </div>

              <div style={styles.yearMiniGrid}>
                {miniDays.map(({ day, count: dayCount }) => (
                  <div
                    key={day.toISOString()}
                    style={{
                      ...styles.yearMiniCell,
                      background:
                        dayCount === 0
                          ? "#f1f5f9"
                          : dayCount === 1
                            ? "#dbeafe"
                            : dayCount === 2
                              ? "#93c5fd"
                              : "#2563eb",
                      border:
                        sameDay(day, new Date()) && day.getFullYear() === new Date().getFullYear()
                          ? "2px solid #7c3aed"
                          : "1px solid #e2e8f0",
                    }}
                    title={`${day.toLocaleDateString("fr-FR")} · ${dayCount} rendez-vous`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderTimeline() {
    if (viewMode === "jour") return renderDayTimeline();
    if (viewMode === "semaine") return renderWeekTimeline();
    if (viewMode === "mois") return renderMonthTimeline();
    return renderYearTimeline();
  }

  function renderPeriodPicker() {
    if (viewMode === "jour") {
      return (
        <div style={styles.pickerWrap}>
          <div>
            <label style={styles.label}>Sélectionner un jour</label>
            <input
              style={styles.input}
              type="date"
              value={formatDateInputValue(currentDate)}
              onChange={(e) => handlePeriodPickerChange(e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (viewMode === "semaine") {
      return (
        <div style={styles.pickerWrap}>
          <div>
            <label style={styles.label}>Sélectionner une semaine</label>
            <input
              style={styles.input}
              type="week"
              value={formatWeekInputValue(currentDate)}
              onChange={(e) => handlePeriodPickerChange(e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (viewMode === "mois") {
      return (
        <div style={styles.pickerWrap}>
          <div>
            <label style={styles.label}>Sélectionner un mois</label>
            <input
              style={styles.input}
              type="month"
              value={formatMonthInputValue(currentDate)}
              onChange={(e) => handlePeriodPickerChange(e.target.value)}
            />
          </div>
        </div>
      );
    }

    return (
      <div style={styles.pickerWrap}>
        <div>
          <label style={styles.label}>Sélectionner une année</label>
          <input
            style={styles.input}
            type="number"
            min="1900"
            max="2100"
            step="1"
            value={currentDate.getFullYear()}
            onChange={(e) => handlePeriodPickerChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Gestion des rendez-vous</h1>
          <p style={styles.heroText}>
            Application moderne avec ajout fiable, import/export JSON,
            vues temporelles, trajets, conflits et timeline interactive.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {editingId ? "Modifier un rendez-vous" : "Créer un rendez-vous"}
          </h2>
          <p style={styles.sectionText}>
            Le titre est généré automatiquement à partir de QQOQCP.
          </p>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Quoi *</label>
              <input style={styles.input} name="what" value={form.what} onChange={handleChange} />
            </div>

            <div>
              <label style={styles.label}>Qui</label>
              <input style={styles.input} name="who" value={form.who} onChange={handleChange} />
            </div>

            <div>
              <label style={styles.label}>Où</label>
              <input style={styles.input} name="where" value={form.where} onChange={handleChange} />
            </div>

            <div>
              <label style={styles.label}>Comment</label>
              <input style={styles.input} name="how" value={form.how} onChange={handleChange} />
            </div>

            <div>
              <label style={styles.label}>Pourquoi</label>
              <input style={styles.input} name="why" value={form.why} onChange={handleChange} />
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
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={styles.badge}>Titre automatique</div>
            <div style={{ fontWeight: 700 }}>{generateTitle(form)}</div>
          </div>

          <div style={{ marginTop: 18 }}>
            <button type="button" style={styles.buttonPrimary} onClick={addOrUpdateRdv}>
              {editingId ? "Enregistrer les modifications" : "Ajouter le rendez-vous"}
            </button>

            <button type="button" style={styles.buttonSecondary} onClick={resetForm}>
              Réinitialiser
            </button>

            <button type="button" style={styles.buttonSecondary} onClick={exportData}>
              Exporter JSON
            </button>

            <button
              type="button"
              style={styles.buttonSecondary}
              onClick={() => fileInputRef.current?.click()}
            >
              Importer JSON
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={importData}
            />
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Navigation</h2>
          <p style={styles.sectionText}>
            Navigue par jour, semaine, mois ou année et sélectionne directement la période.
          </p>

          <div style={styles.topNav}>
            <button type="button" style={styles.buttonSecondary} onClick={() => changeDate(-1)}>
              ◀ Précédent
            </button>
            <button type="button" style={styles.buttonSecondary} onClick={() => changeDate(1)}>
              Suivant ▶
            </button>
            <button type="button" style={styles.buttonSecondary} onClick={goToday}>
              Aujourd’hui
            </button>
          </div>

          <div style={styles.topNav}>
            {["jour", "semaine", "mois", "annee"].map((mode) => (
              <button
                key={mode}
                type="button"
                style={{
                  ...styles.buttonSecondary,
                  background:
                    viewMode === mode
                      ? "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
                      : "#ffffff",
                  color: viewMode === mode ? "#ffffff" : "#0f172a",
                  border: viewMode === mode ? "none" : "1px solid #cbd5e1",
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

          {renderPeriodPicker()}

          <p>
            <strong>Mode actif :</strong> {viewMode}
          </p>
          <p>
            <strong>Période affichée :</strong> {getPeriodLabel()}
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Timeline</h2>
          <p style={styles.sectionText}>
            Vue visuelle des rendez-vous sur la période sélectionnée.
          </p>

          <div style={styles.timelineLegend}>
            <div style={styles.timelineLegendItem}>
              <span style={{ ...styles.legendDot, background: "#2563eb" }} />
              Prévu
            </div>
            <div style={styles.timelineLegendItem}>
              <span style={{ ...styles.legendDot, background: "#22c55e" }} />
              Confirmé
            </div>
            <div style={styles.timelineLegendItem}>
              <span style={{ ...styles.legendDot, background: "#60a5fa" }} />
              Terminé
            </div>
            <div style={styles.timelineLegendItem}>
              <span style={{ ...styles.legendDot, background: "#ef4444" }} />
              Annulé / conflit
            </div>
          </div>

          {renderTimeline()}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Filtres et résumé</h2>

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

          {filteredRdvs.length === 0 ? (
            <p style={styles.subtle}>Aucun rendez-vous sur cette période.</p>
          ) : (
            filteredRdvs.map((rdv) => (
              <div key={rdv.id} style={styles.rdvCard}>
                <div style={styles.rdvHeader}>
                  <div>
                    <div style={styles.badge}>{rdv.whenDate}</div>
                    <h3 style={styles.rdvTitle}>{generateTitle(rdv)}</h3>
                  </div>

                  <div
                    style={{
                      ...(statusColors[rdv.status] || statusColors["prévu"]),
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {rdv.status}
                  </div>
                </div>

                {hasConflict(rdv) && (
                  <p style={styles.conflict}>Conflit de planning détecté</p>
                )}

                <div style={styles.metaGrid}>
                  <div style={styles.metaBox}>
                    <strong>Heure</strong>
                    <div>{rdv.whenStart}</div>
                  </div>

                  <div style={styles.metaBox}>
                    <strong>Durée</strong>
                    <div>{rdv.duration} min</div>
                  </div>

                  <div style={styles.metaBox}>
                    <strong>Trajet</strong>
                    <div>
                      avant {rdv.travelBefore} min / après {rdv.travelAfter} min
                    </div>
                  </div>

                  {rdv.who && (
                    <div style={styles.metaBox}>
                      <strong>Qui</strong>
                      <div>{rdv.who}</div>
                    </div>
                  )}

                  {rdv.where && (
                    <div style={styles.metaBox}>
                      <strong>Lieu</strong>
                      <div>{rdv.where}</div>
                    </div>
                  )}

                  {rdv.how && (
                    <div style={styles.metaBox}>
                      <strong>Comment</strong>
                      <div>{rdv.how}</div>
                    </div>
                  )}

                  {rdv.why && (
                    <div style={styles.metaBox}>
                      <strong>Pourquoi</strong>
                      <div>{rdv.why}</div>
                    </div>
                  )}
                </div>

                {rdv.notes && (
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
                    <div style={{ marginTop: 6 }}>{rdv.notes}</div>
                  </div>
                )}

                <div>
                  <button type="button" style={styles.buttonSecondary} onClick={() => editRdv(rdv)}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.buttonSecondary,
                      borderColor: "#fca5a5",
                      color: "#b91c1c",
                    }}
                    onClick={() => deleteRdv(rdv.id)}
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