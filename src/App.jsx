import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "agenda-avf-r2c-v3";

const DEFAULT_CATEGORY_OPTIONS = {
  AVF: ["Entretien", "Atelier", "Visite", "Réunion", "Accompagnement", "Autre"],
  R2C: ["Marche nordique", "Course à pied", "Nordic tonic", "Réunion", "Autre"],
  Administratif: ["Dossier", "Réunion", "Compte-rendu", "Appel", "Autre"],
  Partenariat: ["Réunion", "Prospection", "Suivi", "Convention", "Autre"],
  Terrain: ["Visite", "Intervention", "Animation", "Repérage", "Autre"],
  Autre: ["Autre"],
};

const DEFAULT_ACTIVITIES = [
  {
    id: "act-r2c-marche",
    name: "Marche nordique",
    category: "R2C",
    subcategory: "Marche nordique",
    defaultDuration: 90,
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-r2c-course",
    name: "Course à pied",
    category: "R2C",
    subcategory: "Course à pied",
    defaultDuration: 60,
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-r2c-nordic",
    name: "Nordic tonic",
    category: "R2C",
    subcategory: "Nordic tonic",
    defaultDuration: 60,
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-r2c-reunion",
    name: "Réunion R2C",
    category: "R2C",
    subcategory: "Réunion",
    defaultDuration: 90,
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "act-avf-entretien",
    name: "Entretien AVF",
    category: "AVF",
    subcategory: "Entretien",
    defaultDuration: 60,
    notes: "",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_EVENT_FORM = {
  type: "rdv", // rdv | activite
  title: "",
  activityId: "",
  category: "AVF",
  subcategory: "Entretien",
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
  recurrence: {
    enabled: false,
    frequency: "weekly",
    interval: 1,
    count: 1,
    until: "",
  },
};

const INITIAL_ACTIVITY_FORM = {
  id: null,
  name: "",
  category: "AVF",
  subcategory: "Entretien",
  defaultDuration: 60,
  notes: "",
};

const INITIAL_STATS_FILTER = {
  mode: "current", // current | week | month | year | custom
  customStart: "",
  customEnd: "",
};

function App() {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          events: [],
          activities: DEFAULT_ACTIVITIES,
          categoryOptions: DEFAULT_CATEGORY_OPTIONS,
        };
      }

      const parsed = JSON.parse(raw);

      return {
        events: Array.isArray(parsed.events) ? parsed.events : [],
        activities:
          Array.isArray(parsed.activities) && parsed.activities.length > 0
            ? parsed.activities
            : DEFAULT_ACTIVITIES,
        categoryOptions:
          parsed.categoryOptions && typeof parsed.categoryOptions === "object"
            ? parsed.categoryOptions
            : DEFAULT_CATEGORY_OPTIONS,
      };
    } catch {
      return {
        events: [],
        activities: DEFAULT_ACTIVITIES,
        categoryOptions: DEFAULT_CATEGORY_OPTIONS,
      };
    }
  });

  const [activeMenu, setActiveMenu] = useState("agenda"); // agenda | event | activities | stats
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [activityForm, setActivityForm] = useState(INITIAL_ACTIVITY_FORM);

  const [editingEventId, setEditingEventId] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);

  const [viewMode, setViewMode] = useState("semaine");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [categoryFilter, setCategoryFilter] = useState("toutes");
  const [subcategoryFilter, setSubcategoryFilter] = useState("toutes");
  const [typeFilter, setTypeFilter] = useState("tous");
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  const [statsFilter, setStatsFilter] = useState(INITIAL_STATS_FILTER);

  const fileInputRef = useRef(null);

  const events = data.events;
  const activities = data.activities;
  const categoryOptions = data.categoryOptions;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  function uid(prefix = "id") {
    return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;
  }

  function setEvents(nextEvents) {
    setData((prev) => ({ ...prev, events: nextEvents }));
  }

  function setActivities(nextActivities) {
    setData((prev) => ({ ...prev, activities: nextActivities }));
  }

  function setCategoryOptions(nextCategoryOptions) {
    setData((prev) => ({ ...prev, categoryOptions: nextCategoryOptions }));
  }

  function getCategories() {
    return Object.keys(categoryOptions);
  }

  function getSubcategories(category) {
    return categoryOptions[category] || ["Autre"];
  }

  function ensureCategoryExists(category) {
    const clean = String(category || "").trim();
    if (!clean) return;

    if (!categoryOptions[clean]) {
      setCategoryOptions({
        ...categoryOptions,
        [clean]: ["Autre"],
      });
    }
  }

  function ensureSubcategoryExists(category, subcategory) {
    const cat = String(category || "").trim();
    const sub = String(subcategory || "").trim();
    if (!cat || !sub) return;

    if (!categoryOptions[cat]) {
      setCategoryOptions({
        ...categoryOptions,
        [cat]: [sub],
      });
      return;
    }

    if (!categoryOptions[cat].includes(sub)) {
      setCategoryOptions({
        ...categoryOptions,
        [cat]: [...categoryOptions[cat], sub],
      });
    }
  }

  function resetEventForm() {
    setEventForm(INITIAL_EVENT_FORM);
    setEditingEventId(null);
  }

  function resetActivityForm() {
    setActivityForm(INITIAL_ACTIVITY_FORM);
    setEditingActivityId(null);
  }

  function handleEventChange(e) {
    const { name, value, type, checked } = e.target;
    const numericFields = ["duration", "travelBefore", "travelAfter"];

    if (name.startsWith("recurrence.")) {
      const recurrenceKey = name.replace("recurrence.", "");
      setEventForm((prev) => ({
        ...prev,
        recurrence: {
          ...prev.recurrence,
          [recurrenceKey]:
            recurrenceKey === "enabled"
              ? checked
              : ["interval", "count"].includes(recurrenceKey)
                ? value === ""
                  ? ""
                  : Number(value)
                : value,
        },
      }));
      return;
    }

    if (name === "category") {
      const nextSubs = getSubcategories(value);
      setEventForm((prev) => ({
        ...prev,
        category: value,
        subcategory: nextSubs[0] || "Autre",
      }));
      return;
    }

    setEventForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : numericFields.includes(name)
            ? value === ""
              ? ""
              : Number(value)
            : value,
    }));
  }

  function handleActivityChange(e) {
    const { name, value } = e.target;

    if (name === "category") {
      const nextSubs = getSubcategories(value);
      setActivityForm((prev) => ({
        ...prev,
        category: value,
        subcategory: nextSubs[0] || "Autre",
      }));
      return;
    }

    setActivityForm((prev) => ({
      ...prev,
      [name]: name === "defaultDuration" ? (value === "" ? "" : Number(value)) : value,
    }));
  }

  function getActivityById(id) {
    return activities.find((a) => a.id === id) || null;
  }

  function resolveEventCategory(evt) {
    if (evt.type === "activite" && evt.activityId) {
      const activity = getActivityById(evt.activityId);
      return evt.category || activity?.category || "Autre";
    }
    return evt.category || "Autre";
  }

  function resolveEventSubcategory(evt) {
    if (evt.type === "activite" && evt.activityId) {
      const activity = getActivityById(evt.activityId);
      return evt.subcategory || activity?.subcategory || "Autre";
    }
    return evt.subcategory || "Autre";
  }

  function validateEvent(payload) {
    if (!["rdv", "activite"].includes(payload.type)) {
      return "Le type d'événement est invalide.";
    }
    if (!payload.whenDate) return "La date est obligatoire.";
    if (!payload.whenStart) return "L'heure est obligatoire.";
    if (!payload.title?.trim()) return "Le titre est obligatoire.";
    if (Number(payload.duration || 0) <= 0) return "La durée doit être supérieure à 0.";
    if (Number(payload.travelBefore || 0) < 0) return "Le trajet avant doit être positif.";
    if (Number(payload.travelAfter || 0) < 0) return "Le trajet après doit être positif.";

    if (payload.recurrence.enabled) {
      if (!["daily", "weekly", "monthly"].includes(payload.recurrence.frequency)) {
        return "La fréquence de récurrence est invalide.";
      }
      if (Number(payload.recurrence.interval || 0) <= 0) {
        return "L'intervalle de récurrence doit être supérieur à 0.";
      }
      const hasCount = Number(payload.recurrence.count || 0) > 0;
      const hasUntil = Boolean(payload.recurrence.until);
      if (!hasCount && !hasUntil) {
        return "Pour une récurrence, indiquez un nombre d'occurrences ou une date de fin.";
      }
    }

    return null;
  }

  function validateActivity(payload) {
    if (!payload.name?.trim()) return "Le nom de l'activité est obligatoire.";
    if (!payload.category?.trim()) return "La catégorie est obligatoire.";
    if (!payload.subcategory?.trim()) return "Le sous-type / sous-catégorie est obligatoire.";
    if (Number(payload.defaultDuration || 0) <= 0) {
      return "La durée par défaut doit être supérieure à 0.";
    }
    return null;
  }

  function formatDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function combineDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`);
  }

  function addInterval(date, frequency, interval) {
    const d = new Date(date);
    if (frequency === "daily") d.setDate(d.getDate() + interval);
    if (frequency === "weekly") d.setDate(d.getDate() + interval * 7);
    if (frequency === "monthly") d.setMonth(d.getMonth() + interval);
    return d;
  }

  function buildOccurrencesFromPayload(payload, baseId = null) {
    const recurrenceGroupId = payload.recurrence.enabled ? uid("rec") : null;
    const firstStart = combineDateTime(payload.whenDate, payload.whenStart);

    const maxCount = payload.recurrence.enabled
      ? Math.max(1, Number(payload.recurrence.count || 0) || 999)
      : 1;

    const untilDate = payload.recurrence.enabled && payload.recurrence.until
      ? new Date(`${payload.recurrence.until}T23:59:59`)
      : null;

    const list = [];
    let cursor = new Date(firstStart);
    let index = 0;

    while (index < maxCount) {
      if (untilDate && cursor > untilDate) break;

      list.push({
        id: baseId && index === 0 ? baseId : uid("evt"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recurrenceGroupId,
        recurrenceIndex: index,
        recurrenceRule: payload.recurrence.enabled
          ? {
              enabled: true,
              frequency: payload.recurrence.frequency,
              interval: Number(payload.recurrence.interval || 1),
              count: Number(payload.recurrence.count || 0),
              until: payload.recurrence.until || "",
            }
          : {
              enabled: false,
              frequency: "weekly",
              interval: 1,
              count: 1,
              until: "",
            },
        type: payload.type,
        title: payload.title,
        activityId: payload.activityId || "",
        category: payload.category,
        subcategory: payload.subcategory,
        who: payload.who,
        where: payload.where,
        whenDate: formatDateInputValue(cursor),
        whenStart: payload.whenStart,
        duration: Number(payload.duration || 0),
        how: payload.how,
        why: payload.why,
        notes: payload.notes,
        status: payload.status,
        travelBefore: Number(payload.travelBefore || 0),
        travelAfter: Number(payload.travelAfter || 0),
      });

      if (!payload.recurrence.enabled) break;

      cursor = addInterval(cursor, payload.recurrence.frequency, Number(payload.recurrence.interval || 1));
      index += 1;

      if (!untilDate && index >= maxCount) break;
      if (untilDate && Number(payload.recurrence.count || 0) > 0 && index >= maxCount) break;
      if (untilDate && Number(payload.recurrence.count || 0) <= 0 && cursor > untilDate) break;
    }

    return list;
  }

  function onActivitySelected(activityId) {
    const activity = getActivityById(activityId);

    setEventForm((prev) => ({
      ...prev,
      activityId,
      title: activity?.name || "",
      category: activity?.category || prev.category,
      subcategory: activity?.subcategory || prev.subcategory,
      duration: activity?.defaultDuration || prev.duration,
      notes: prev.notes || activity?.notes || "",
    }));
  }

  function addOrUpdateEvent() {
    const resolvedTitle = (() => {
      if (eventForm.type === "activite") {
        const activity = getActivityById(eventForm.activityId);
        return (activity?.name || eventForm.title || "").trim();
      }
      return (eventForm.title || "").trim();
    })();

    const payload = {
      type: String(eventForm.type || "rdv"),
      title: resolvedTitle,
      activityId: String(eventForm.activityId || ""),
      category: String(eventForm.category || "Autre").trim(),
      subcategory: String(eventForm.subcategory || "Autre").trim(),
      who: String(eventForm.who || "").trim(),
      where: String(eventForm.where || "").trim(),
      whenDate: String(eventForm.whenDate || ""),
      whenStart: String(eventForm.whenStart || ""),
      duration: Number(eventForm.duration || 0),
      how: String(eventForm.how || "").trim(),
      why: String(eventForm.why || "").trim(),
      notes: String(eventForm.notes || "").trim(),
      status: String(eventForm.status || "prévu"),
      travelBefore: Number(eventForm.travelBefore || 0),
      travelAfter: Number(eventForm.travelAfter || 0),
      recurrence: {
        enabled: Boolean(eventForm.recurrence.enabled),
        frequency: String(eventForm.recurrence.frequency || "weekly"),
        interval: Number(eventForm.recurrence.interval || 1),
        count: Number(eventForm.recurrence.count || 0),
        until: String(eventForm.recurrence.until || ""),
      },
    };

    const error = validateEvent(payload);
    if (error) {
      alert(error);
      return;
    }

    ensureCategoryExists(payload.category);
    ensureSubcategoryExists(payload.category, payload.subcategory);

    if (editingEventId) {
      setEvents(
        events.map((evt) =>
          evt.id === editingEventId
            ? {
                ...evt,
                ...buildOccurrencesFromPayload(
                  { ...payload, recurrence: { ...payload.recurrence, enabled: false } },
                  editingEventId
                )[0],
                updatedAt: new Date().toISOString(),
              }
            : evt
        )
      );
    } else {
      const created = buildOccurrencesFromPayload(payload);
      setEvents([...events, ...created]);
    }

    resetEventForm();
    setActiveMenu("agenda");
  }

  function editEvent(evt) {
    setEditingEventId(evt.id);
    setEventForm({
      type: evt.type || "rdv",
      title: evt.title || "",
      activityId: evt.activityId || "",
      category: evt.category || "Autre",
      subcategory: evt.subcategory || "Autre",
      who: evt.who || "",
      where: evt.where || "",
      whenDate: evt.whenDate || "",
      whenStart: evt.whenStart || "",
      duration: Number(evt.duration ?? 60),
      how: evt.how || "",
      why: evt.why || "",
      notes: evt.notes || "",
      status: evt.status || "prévu",
      travelBefore: Number(evt.travelBefore ?? 0),
      travelAfter: Number(evt.travelAfter ?? 0),
      recurrence: {
        enabled: false,
        frequency: "weekly",
        interval: 1,
        count: 1,
        until: "",
      },
    });

    setActiveMenu("event");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEvent(id) {
    setEvents(events.filter((evt) => evt.id !== id));
    if (editingEventId === id) resetEventForm();
  }

  function deleteRecurrenceGroup(groupId) {
    if (!groupId) return;
    setEvents(events.filter((evt) => evt.recurrenceGroupId !== groupId));

    if (editingEventId) {
      const current = events.find((evt) => evt.id === editingEventId);
      if (current?.recurrenceGroupId === groupId) {
        resetEventForm();
      }
    }
  }

  function saveActivity() {
    const payload = {
      id: activityForm.id || uid("act"),
      name: String(activityForm.name || "").trim(),
      category: String(activityForm.category || "").trim(),
      subcategory: String(activityForm.subcategory || "").trim(),
      defaultDuration: Number(activityForm.defaultDuration || 0),
      notes: String(activityForm.notes || "").trim(),
      createdAt: activityForm.id ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const error = validateActivity(payload);
    if (error) {
      alert(error);
      return;
    }

    ensureCategoryExists(payload.category);
    ensureSubcategoryExists(payload.category, payload.subcategory);

    if (editingActivityId) {
      setActivities(
        activities.map((activity) =>
          activity.id === editingActivityId
            ? {
                ...activity,
                name: payload.name,
                category: payload.category,
                subcategory: payload.subcategory,
                defaultDuration: payload.defaultDuration,
                notes: payload.notes,
                updatedAt: payload.updatedAt,
              }
            : activity
        )
      );

      setEvents(
        events.map((evt) =>
          evt.activityId === editingActivityId
            ? {
                ...evt,
                title: evt.type === "activite" ? payload.name : evt.title,
                category: payload.category,
                subcategory: payload.subcategory,
              }
            : evt
        )
      );
    } else {
      setActivities([...activities, payload]);
    }

    resetActivityForm();
    setActiveMenu("activities");
  }

  function editActivity(activity) {
    setEditingActivityId(activity.id);
    setActivityForm({
      id: activity.id,
      name: activity.name || "",
      category: activity.category || "Autre",
      subcategory: activity.subcategory || "Autre",
      defaultDuration: Number(activity.defaultDuration ?? 60),
      notes: activity.notes || "",
    });
    setActiveMenu("activities");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeActivity(activityId) {
    const linked = events.some((evt) => evt.activityId === activityId);
    if (linked) {
      const ok = window.confirm(
        "Cette activité est utilisée dans des événements. Elle sera supprimée du catalogue, mais les événements déjà créés seront conservés."
      );
      if (!ok) return;
    }

    setActivities(activities.filter((a) => a.id !== activityId));

    if (editingActivityId === activityId) {
      resetActivityForm();
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "agenda-avf-r2c-v3.json";
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

        const importedEvents = Array.isArray(parsed.events)
          ? parsed.events.map((item, index) => ({
              id: item.id ?? `import-evt-${Date.now()}-${index}`,
              createdAt: item.createdAt ?? new Date().toISOString(),
              updatedAt: item.updatedAt ?? new Date().toISOString(),
              recurrenceGroupId: item.recurrenceGroupId ?? null,
              recurrenceIndex: Number(item.recurrenceIndex ?? 0),
              recurrenceRule: item.recurrenceRule ?? {
                enabled: false,
                frequency: "weekly",
                interval: 1,
                count: 1,
                until: "",
              },
              type: item.type === "activite" ? "activite" : "rdv",
              title: String(item.title ?? ""),
              activityId: String(item.activityId ?? ""),
              category: String(item.category ?? "Autre"),
              subcategory: String(item.subcategory ?? "Autre"),
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
            }))
          : [];

        const importedActivities = Array.isArray(parsed.activities)
          ? parsed.activities.map((item, index) => ({
              id: item.id ?? `import-act-${Date.now()}-${index}`,
              name: String(item.name ?? ""),
              category: String(item.category ?? "Autre"),
              subcategory: String(item.subcategory ?? "Autre"),
              defaultDuration: Number(item.defaultDuration ?? 60),
              notes: String(item.notes ?? ""),
              createdAt: item.createdAt ?? new Date().toISOString(),
              updatedAt: item.updatedAt ?? new Date().toISOString(),
            }))
          : DEFAULT_ACTIVITIES;

        const importedCategoryOptions =
          parsed.categoryOptions && typeof parsed.categoryOptions === "object"
            ? parsed.categoryOptions
            : DEFAULT_CATEGORY_OPTIONS;

        setData({
          events: importedEvents,
          activities: importedActivities.length ? importedActivities : DEFAULT_ACTIVITIES,
          categoryOptions: importedCategoryOptions,
        });

        resetEventForm();
        resetActivityForm();
        alert("Import réussi.");
      } catch {
        alert("Fichier JSON invalide.");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  function getDateTimeFromEvent(evt) {
    return new Date(`${evt.whenDate}T${evt.whenStart}:00`);
  }

  function getEffectiveStart(evt) {
    const start = getDateTimeFromEvent(evt);
    start.setMinutes(start.getMinutes() - Number(evt.travelBefore || 0));
    return start;
  }

  function getEffectiveEnd(evt) {
    const end = getDateTimeFromEvent(evt);
    end.setMinutes(end.getMinutes() + Number(evt.duration || 0) + Number(evt.travelAfter || 0));
    return end;
  }

  function getMobilizedMinutes(evt) {
    return Number(evt.duration || 0) + Number(evt.travelBefore || 0) + Number(evt.travelAfter || 0);
  }

  function hasConflict(current, sourceEvents = events) {
    const currentStart = getEffectiveStart(current);
    const currentEnd = getEffectiveEnd(current);

    return sourceEvents.some((other) => {
      if (other.id === current.id) return false;
      if (other.whenDate !== current.whenDate) return false;
      if (other.status === "annulé" || current.status === "annulé") return false;

      const otherStart = getEffectiveStart(other);
      const otherEnd = getEffectiveEnd(other);

      return currentStart < otherEnd && currentEnd > otherStart;
    });
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
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

  function isInCurrentView(evt) {
    const evtDate = new Date(`${evt.whenDate}T12:00:00`);
    if (Number.isNaN(evtDate.getTime())) return false;

    if (viewMode === "jour") {
      return evtDate.toDateString() === currentDate.toDateString();
    }

    if (viewMode === "semaine") {
      const start = getStartOfWeek(currentDate);
      const end = getEndOfWeek(currentDate);
      return evtDate >= start && evtDate <= end;
    }

    if (viewMode === "mois") {
      return (
        evtDate.getMonth() === currentDate.getMonth() &&
        evtDate.getFullYear() === currentDate.getFullYear()
      );
    }

    if (viewMode === "annee") {
      return evtDate.getFullYear() === currentDate.getFullYear();
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

  function getStatsRange() {
    if (statsFilter.mode === "current") {
      if (viewMode === "jour") {
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
          label: "Période affichée : jour",
        };
      }
      if (viewMode === "semaine") {
        return {
          start: getStartOfWeek(currentDate),
          end: getEndOfWeek(currentDate),
          label: "Période affichée : semaine",
        };
      }
      if (viewMode === "mois") {
        return {
          start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0),
          end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999),
          label: "Période affichée : mois",
        };
      }
      return {
        start: new Date(currentDate.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999),
        label: "Période affichée : année",
      };
    }

    if (statsFilter.mode === "week") {
      return {
        start: getStartOfWeek(new Date()),
        end: getEndOfWeek(new Date()),
        label: "Cette semaine",
      };
    }

    if (statsFilter.mode === "month") {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        label: "Ce mois",
      };
    }

    if (statsFilter.mode === "year") {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        label: "Cette année",
      };
    }

    if (statsFilter.mode === "custom") {
      const start = statsFilter.customStart
        ? new Date(`${statsFilter.customStart}T00:00:00`)
        : null;
      const end = statsFilter.customEnd
        ? new Date(`${statsFilter.customEnd}T23:59:59`)
        : null;

      return {
        start,
        end,
        label: "Période personnalisée",
      };
    }

    return { start: null, end: null, label: "Toutes dates" };
  }

  function isEventInStatsRange(evt) {
    const { start, end } = getStatsRange();
    const evtDate = getDateTimeFromEvent(evt);

    if (start && evtDate < start) return false;
    if (end && evtDate > end) return false;
    return true;
  }

  function formatMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`;
    if (hours > 0) return `${hours} h`;
    return `${minutes} min`;
  }

  function formatRangeHour(start, end) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(start.getHours())}:${pad(start.getMinutes())} → ${pad(end.getHours())}:${pad(
      end.getMinutes()
    )}`;
  }

  const filteredAgendaEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...events]
      .filter((evt) => isInCurrentView(evt))
      .filter((evt) => {
        const haystack = [
          evt.title,
          evt.who,
          evt.where,
          evt.how,
          evt.why,
          evt.notes,
          resolveEventCategory(evt),
          resolveEventSubcategory(evt),
          evt.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return !q || haystack.includes(q);
      })
      .filter((evt) => statusFilter === "tous" || evt.status === statusFilter)
      .filter((evt) => categoryFilter === "toutes" || resolveEventCategory(evt) === categoryFilter)
      .filter(
        (evt) =>
          subcategoryFilter === "toutes" || resolveEventSubcategory(evt) === subcategoryFilter
      )
      .filter((evt) => typeFilter === "tous" || evt.type === typeFilter)
      .filter((evt) => !showOnlyConflicts || hasConflict(evt))
      .sort((a, b) => getDateTimeFromEvent(a) - getDateTimeFromEvent(b));
  }, [
    events,
    currentDate,
    viewMode,
    search,
    statusFilter,
    categoryFilter,
    subcategoryFilter,
    typeFilter,
    showOnlyConflicts,
  ]);

  const statsEvents = useMemo(() => {
    return [...events]
      .filter((evt) => isEventInStatsRange(evt))
      .filter((evt) => statusFilter === "tous" || evt.status === statusFilter)
      .filter((evt) => categoryFilter === "toutes" || resolveEventCategory(evt) === categoryFilter)
      .filter(
        (evt) =>
          subcategoryFilter === "toutes" || resolveEventSubcategory(evt) === subcategoryFilter
      )
      .filter((evt) => typeFilter === "tous" || evt.type === typeFilter)
      .sort((a, b) => getDateTimeFromEvent(a) - getDateTimeFromEvent(b));
  }, [events, statsFilter, statusFilter, categoryFilter, subcategoryFilter, typeFilter, currentDate, viewMode]);

  const stats = useMemo(() => {
    const count = statsEvents.length;
    const rdvCount = statsEvents.filter((e) => e.type === "rdv").length;
    const activityCount = statsEvents.filter((e) => e.type === "activite").length;
    const duration = statsEvents.reduce((sum, e) => sum + Number(e.duration || 0), 0);
    const travel = statsEvents.reduce(
      (sum, e) => sum + Number(e.travelBefore || 0) + Number(e.travelAfter || 0),
      0
    );
    const mobilized = statsEvents.reduce((sum, e) => sum + getMobilizedMinutes(e), 0);
    const conflicts = statsEvents.filter((e) => hasConflict(e)).length;
    const confirmed = statsEvents.filter((e) => e.status === "confirmé").length;
    const completed = statsEvents.filter((e) => e.status === "terminé").length;
    const cancelled = statsEvents.filter((e) => e.status === "annulé").length;
    const uniquePeople = new Set(
      statsEvents.map((e) => String(e.who || "").trim()).filter(Boolean)
    ).size;

    const byCategory = statsEvents.reduce((acc, e) => {
      const cat = resolveEventCategory(e);
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const bySubcategory = statsEvents.reduce((acc, e) => {
      const sub = resolveEventSubcategory(e);
      acc[sub] = (acc[sub] || 0) + 1;
      return acc;
    }, {});

    const activeBase = count - cancelled;
    const completionRate = activeBase > 0 ? Math.round((completed / activeBase) * 100) : 0;
    const confirmationRate = activeBase > 0 ? Math.round((confirmed / activeBase) * 100) : 0;

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || null;
    const topSubcategory = Object.entries(bySubcategory).sort((a, b) => b[1] - a[1])[0] || null;

    return {
      count,
      rdvCount,
      activityCount,
      duration,
      travel,
      mobilized,
      conflicts,
      confirmed,
      completed,
      cancelled,
      uniquePeople,
      completionRate,
      confirmationRate,
      topCategory: topCategory ? `${topCategory[0]} (${topCategory[1]})` : "—",
      topSubcategory: topSubcategory ? `${topSubcategory[0]} (${topSubcategory[1]})` : "—",
      byCategory,
      bySubcategory,
    };
  }, [statsEvents]);

  const timelineEvents = useMemo(() => {
    return [...filteredAgendaEvents].sort((a, b) => getEffectiveStart(a) - getEffectiveStart(b));
  }, [filteredAgendaEvents]);

  const currentSubcategoriesForFilter =
    categoryFilter !== "toutes" ? getSubcategories(categoryFilter) : [];

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

  const typeColors = {
    rdv: {
      background: "#eef2ff",
      color: "#4338ca",
    },
    activite: {
      background: "#f0fdf4",
      color: "#166534",
    },
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #eef2ff 0%, #f8fafc 35%, #f8fafc 100%)",
      padding: 20,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#0f172a",
    },
    wrapper: {
      maxWidth: 1440,
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
    menuBar: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 18,
    },
    menuButton: {
      padding: "12px 16px",
      borderRadius: 14,
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      color: "#0f172a",
      fontWeight: 800,
      cursor: "pointer",
    },
    card: {
      background: "rgba(255,255,255,0.96)",
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
    buttonDanger: {
      padding: "12px 16px",
      borderRadius: 14,
      border: "1px solid #fca5a5",
      background: "#fff",
      color: "#b91c1c",
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
      fontSize: 25,
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
    eventCard: {
      borderRadius: 20,
      padding: 18,
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      marginBottom: 14,
    },
    eventHeader: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },
    eventTitle: {
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
      background: "repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 59px, #eef2f7 60px)",
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
      background: "repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 59px, #eef2f7 60px)",
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
    inlineBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      marginRight: 8,
      marginBottom: 8,
    },
    listCompact: {
      display: "grid",
      gap: 10,
    },
    divider: {
      height: 1,
      background: "#e2e8f0",
      margin: "18px 0",
    },
  };

  function getTimelineEventStyle(evt, options = {}) {
    const start = getEffectiveStart(evt);
    const end = getEffectiveEnd(evt);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const totalMinutes = Math.max(endMinutes - startMinutes, 20);

    const top = Math.max(0, startMinutes);
    const height = Math.max(totalMinutes, 28);

    return {
      ...styles.timelineEvent,
      top,
      height,
      ...(hasConflict(evt)
        ? {
            border: "1px solid rgba(185, 28, 28, 0.25)",
            boxShadow: "0 8px 18px rgba(185, 28, 28, 0.12)",
            background: "linear-gradient(135deg, rgba(254,226,226,0.95) 0%, rgba(254,242,242,0.98) 100%)",
          }
        : {}),
      ...(evt.status === "confirmé"
        ? {
            background: "linear-gradient(135deg, rgba(220,252,231,0.95) 0%, rgba(236,253,245,0.98) 100%)",
          }
        : {}),
      ...(evt.status === "terminé"
        ? {
            background: "linear-gradient(135deg, rgba(219,234,254,0.95) 0%, rgba(239,246,255,0.98) 100%)",
          }
        : {}),
      ...(evt.status === "annulé"
        ? {
            background: "linear-gradient(135deg, rgba(254,226,226,0.95) 0%, rgba(254,242,242,0.98) 100%)",
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
    const dayEvents = timelineEvents.filter((evt) =>
      sameDay(new Date(`${evt.whenDate}T12:00:00`), currentDate)
    );

    return (
      <div style={styles.timelineShell}>
        <div style={styles.dayTimelineWrap}>
          <div style={styles.dayTimelineGrid}>
            <div style={styles.timeColumn}>{renderHourLabels()}</div>
            <div style={styles.dayCanvas}>
              {dayEvents.length === 0 ? (
                <div style={styles.timelineEmpty}>Aucun événement sur cette journée.</div>
              ) : (
                dayEvents.map((evt) => {
                  const start = getEffectiveStart(evt);
                  const end = getEffectiveEnd(evt);

                  return (
                    <div key={evt.id} style={getTimelineEventStyle(evt)}>
                      <div style={styles.timelineEventTitle}>{evt.title}</div>
                      <div style={styles.timelineEventMeta}>{formatRangeHour(start, end)}</div>
                      <div style={styles.timelineEventMeta}>
                        {evt.type === "rdv" ? "RDV" : "Activité"} · {resolveEventCategory(evt)} · {resolveEventSubcategory(evt)}
                      </div>
                      {evt.where ? <div style={styles.timelineEventMeta}>{evt.where}</div> : null}
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
                <div>{day.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                <div style={{ marginTop: 4, fontSize: 14 }}>
                  {day.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.weekGrid}>
            <div style={styles.weekTimeColumn}>{renderHourLabels()}</div>

            {weekDays.map((day) => {
              const dayEvents = timelineEvents.filter((evt) =>
                sameDay(new Date(`${evt.whenDate}T12:00:00`), day)
              );

              return (
                <div key={day.toISOString()} style={styles.weekDayColumn}>
                  {dayEvents.map((evt) => {
                    const start = getEffectiveStart(evt);
                    const end = getEffectiveEnd(evt);

                    return (
                      <div key={evt.id} style={getTimelineEventStyle(evt)}>
                        <div style={styles.timelineEventTitle}>{evt.title}</div>
                        <div style={styles.timelineEventMeta}>{formatRangeHour(start, end)}</div>
                        <div style={styles.timelineEventMeta}>{resolveEventSubcategory(evt)}</div>
                        {evt.who ? <div style={styles.timelineEventMeta}>{evt.who}</div> : null}
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
            const dayEvents = timelineEvents.filter((evt) =>
              sameDay(new Date(`${evt.whenDate}T12:00:00`), day)
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
                  {dayEvents.length > 0 ? (
                    <div style={styles.monthCountBadge}>{dayEvents.length} év.</div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {dayEvents.slice(0, 3).map((evt) => (
                    <div key={evt.id} style={styles.monthEventMini}>
                      {evt.whenStart} · {evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <div style={{ ...styles.subtle, fontSize: 12 }}>
                      + {dayEvents.length - 3} autre(s)
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
    return timelineEvents.filter((evt) => {
      const d = new Date(`${evt.whenDate}T12:00:00`);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    }).length;
  }

  function getMonthMiniDays(year, monthIndex) {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: lastDay }, (_, i) => {
      const day = new Date(year, monthIndex, i + 1);
      const count = timelineEvents.filter((evt) =>
        sameDay(new Date(`${evt.whenDate}T12:00:00`), day)
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
                <strong>{monthDate.toLocaleDateString("fr-FR", { month: "long" })}</strong>
                <span style={styles.monthCountBadge}>{count} év.</span>
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
                    title={`${day.toLocaleDateString("fr-FR")} · ${dayCount} événement(s)`}
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

  function renderMenu() {
    const items = [
      { key: "agenda", label: "Agenda" },
      { key: "event", label: editingEventId ? "Modifier événement" : "Nouvel événement" },
      { key: "activities", label: "Activités" },
      { key: "stats", label: "Statistiques" },
    ];

    return (
      <div style={styles.menuBar}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            style={{
              ...styles.menuButton,
              background:
                activeMenu === item.key
                  ? "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
                  : "#ffffff",
              color: activeMenu === item.key ? "#ffffff" : "#0f172a",
              border: activeMenu === item.key ? "none" : "1px solid #cbd5e1",
            }}
            onClick={() => setActiveMenu(item.key)}
          >
            {item.label}
          </button>
        ))}

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
    );
  }

  function renderEventForm() {
    const eventSubcategories = getSubcategories(eventForm.category);

    return (
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          {editingEventId ? "Modifier un événement" : "Créer un événement"}
        </h2>
        <p style={styles.sectionText}>
          Parcours optimisé : type, catégorie, sous-type, puis date et durée.
        </p>

        <div style={styles.grid}>
          <div>
            <label style={styles.label}>Type</label>
            <select
              style={styles.input}
              name="type"
              value={eventForm.type}
              onChange={handleEventChange}
            >
              <option value="rdv">Rendez-vous</option>
              <option value="activite">Activité</option>
            </select>
          </div>

          {eventForm.type === "activite" ? (
            <div>
              <label style={styles.label}>Activité du catalogue</label>
              <select
                style={styles.input}
                name="activityId"
                value={eventForm.activityId}
                onChange={(e) => onActivitySelected(e.target.value)}
              >
                <option value="">Sélectionner une activité</option>
                {activities
                  .filter((a) => !eventForm.category || a.category === eventForm.category)
                  .map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name} · {activity.category} · {activity.subcategory}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}

          <div>
            <label style={styles.label}>Catégorie</label>
            <select
              style={styles.input}
              name="category"
              value={eventForm.category}
              onChange={handleEventChange}
            >
              {getCategories().map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Sous-type</label>
            <select
              style={styles.input}
              name="subcategory"
              value={eventForm.subcategory}
              onChange={handleEventChange}
            >
              {eventSubcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Titre *</label>
            <input
              style={styles.input}
              name="title"
              value={eventForm.title}
              onChange={handleEventChange}
              placeholder="Titre de l’événement"
            />
          </div>

          <div>
            <label style={styles.label}>Qui</label>
            <input
              style={styles.input}
              name="who"
              value={eventForm.who}
              onChange={handleEventChange}
              placeholder="Personne / groupe / partenaire"
            />
          </div>

          <div>
            <label style={styles.label}>Où</label>
            <input
              style={styles.input}
              name="where"
              value={eventForm.where}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Comment</label>
            <input
              style={styles.input}
              name="how"
              value={eventForm.how}
              onChange={handleEventChange}
              placeholder="présentiel, téléphone, visio..."
            />
          </div>

          <div>
            <label style={styles.label}>Objectif</label>
            <input
              style={styles.input}
              name="why"
              value={eventForm.why}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Date *</label>
            <input
              style={styles.input}
              type="date"
              name="whenDate"
              value={eventForm.whenDate}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Heure *</label>
            <input
              style={styles.input}
              type="time"
              name="whenStart"
              value={eventForm.whenStart}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Durée (min)</label>
            <input
              style={styles.input}
              type="number"
              name="duration"
              value={eventForm.duration}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Trajet avant (min)</label>
            <input
              style={styles.input}
              type="number"
              name="travelBefore"
              value={eventForm.travelBefore}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Trajet après (min)</label>
            <input
              style={styles.input}
              type="number"
              name="travelAfter"
              value={eventForm.travelAfter}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Statut</label>
            <select
              style={styles.input}
              name="status"
              value={eventForm.status}
              onChange={handleEventChange}
            >
              <option value="prévu">Prévu</option>
              <option value="confirmé">Confirmé</option>
              <option value="terminé">Terminé</option>
              <option value="annulé">Annulé</option>
            </select>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}>
            <input
              type="checkbox"
              name="recurrence.enabled"
              checked={eventForm.recurrence.enabled}
              onChange={handleEventChange}
              disabled={Boolean(editingEventId)}
            />
            Activer la récurrence
          </label>

          {editingEventId ? (
            <p style={{ ...styles.subtle, marginTop: 10 }}>
              En modification, seule l’occurrence sélectionnée est modifiée.
            </p>
          ) : null}

          {eventForm.recurrence.enabled && !editingEventId ? (
            <div style={{ ...styles.grid, marginTop: 12 }}>
              <div>
                <label style={styles.label}>Fréquence</label>
                <select
                  style={styles.input}
                  name="recurrence.frequency"
                  value={eventForm.recurrence.frequency}
                  onChange={handleEventChange}
                >
                  <option value="daily">Tous les jours</option>
                  <option value="weekly">Toutes les semaines</option>
                  <option value="monthly">Tous les mois</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>Intervalle</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  name="recurrence.interval"
                  value={eventForm.recurrence.interval}
                  onChange={handleEventChange}
                />
              </div>

              <div>
                <label style={styles.label}>Nombre d’occurrences</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  name="recurrence.count"
                  value={eventForm.recurrence.count}
                  onChange={handleEventChange}
                />
              </div>

              <div>
                <label style={styles.label}>Ou date de fin</label>
                <input
                  style={styles.input}
                  type="date"
                  name="recurrence.until"
                  value={eventForm.recurrence.until}
                  onChange={handleEventChange}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={styles.label}>Notes</label>
          <textarea
            style={styles.textarea}
            name="notes"
            value={eventForm.notes}
            onChange={handleEventChange}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <button type="button" style={styles.buttonPrimary} onClick={addOrUpdateEvent}>
            {editingEventId ? "Enregistrer" : "Ajouter"}
          </button>

          <button type="button" style={styles.buttonSecondary} onClick={resetEventForm}>
            Réinitialiser
          </button>
        </div>
      </div>
    );
  }

  function renderActivitiesPanel() {
    const activitySubcategories = getSubcategories(activityForm.category);

    return (
      <>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {editingActivityId ? "Modifier une activité" : "Créer une activité"}
          </h2>
          <p style={styles.sectionText}>
            Une activité peut appartenir à n’importe quelle catégorie. Exemple : R2C → marche nordique, course à pied, nordic tonic, réunion, autre.
          </p>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Nom de l’activité *</label>
              <input
                style={styles.input}
                name="name"
                value={activityForm.name}
                onChange={handleActivityChange}
                placeholder="Ex. Marche nordique"
              />
            </div>

            <div>
              <label style={styles.label}>Catégorie *</label>
              <select
                style={styles.input}
                name="category"
                value={activityForm.category}
                onChange={handleActivityChange}
              >
                {getCategories().map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Sous-type *</label>
              <select
                style={styles.input}
                name="subcategory"
                value={activityForm.subcategory}
                onChange={handleActivityChange}
              >
                {activitySubcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Durée par défaut (min)</label>
              <input
                style={styles.input}
                type="number"
                name="defaultDuration"
                value={activityForm.defaultDuration}
                onChange={handleActivityChange}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={styles.textarea}
              name="notes"
              value={activityForm.notes}
              onChange={handleActivityChange}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <button type="button" style={styles.buttonPrimary} onClick={saveActivity}>
              {editingActivityId ? "Enregistrer l’activité" : "Ajouter l’activité"}
            </button>

            <button type="button" style={styles.buttonSecondary} onClick={resetActivityForm}>
              Réinitialiser
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Catalogue des activités</h2>

          {activities.length === 0 ? (
            <p style={styles.subtle}>Aucune activité enregistrée.</p>
          ) : (
            <div style={styles.listCompact}>
              {activities
                .slice()
                .sort((a, b) => {
                  if (a.category !== b.category) return a.category.localeCompare(b.category);
                  if (a.subcategory !== b.subcategory) return a.subcategory.localeCompare(b.subcategory);
                  return a.name.localeCompare(b.name);
                })
                .map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 14,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <strong>{activity.name}</strong>
                        <div style={{ marginTop: 6 }}>
                          <span
                            style={{
                              ...styles.inlineBadge,
                              background: "#eef2ff",
                              color: "#4338ca",
                            }}
                          >
                            {activity.category}
                          </span>

                          <span
                            style={{
                              ...styles.inlineBadge,
                              background: "#f8fafc",
                              color: "#334155",
                            }}
                          >
                            {activity.subcategory}
                          </span>

                          <span
                            style={{
                              ...styles.inlineBadge,
                              background: "#f0fdf4",
                              color: "#166534",
                            }}
                          >
                            {activity.defaultDuration} min
                          </span>
                        </div>

                        {activity.notes ? (
                          <div style={{ marginTop: 8, color: "#475569", fontSize: 14 }}>
                            {activity.notes}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <button
                          type="button"
                          style={styles.buttonSecondary}
                          onClick={() => editActivity(activity)}
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          style={styles.buttonDanger}
                          onClick={() => removeActivity(activity.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </>
    );
  }

  function renderAgendaPanel() {
    return (
      <>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Navigation</h2>
          <p style={styles.sectionText}>
            Parcours rapide : navigation temporelle, filtres, puis liste ou timeline.
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
            <strong>Période affichée :</strong> {getPeriodLabel()}
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Filtres agenda</h2>

          <div style={styles.filterRow}>
            <div>
              <label style={styles.label}>Recherche</label>
              <input
                style={styles.input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="titre, lieu, personne, catégorie..."
              />
            </div>

            <div>
              <label style={styles.label}>Statut</label>
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

            <div>
              <label style={styles.label}>Catégorie</label>
              <select
                style={styles.input}
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setSubcategoryFilter("toutes");
                }}
              >
                <option value="toutes">Toutes</option>
                {getCategories().map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Sous-type</label>
              <select
                style={styles.input}
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                disabled={categoryFilter === "toutes"}
              >
                <option value="toutes">Tous</option>
                {currentSubcategoriesForFilter.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Type</label>
              <select
                style={styles.input}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="tous">Tous</option>
                <option value="rdv">Rendez-vous</option>
                <option value="activite">Activités</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={showOnlyConflicts}
                  onChange={(e) => setShowOnlyConflicts(e.target.checked)}
                />
                Seulement les conflits
              </label>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Timeline</h2>
          <p style={styles.sectionText}>Visualisation directe de la charge et des chevauchements.</p>

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
          <h2 style={styles.sectionTitle}>Liste des événements</h2>

          {filteredAgendaEvents.length === 0 ? (
            <p style={styles.subtle}>Aucun événement sur cette période.</p>
          ) : (
            filteredAgendaEvents.map((evt) => (
              <div key={evt.id} style={styles.eventCard}>
                <div style={styles.eventHeader}>
                  <div>
                    <div style={styles.badge}>{evt.whenDate}</div>
                    <h3 style={styles.eventTitle}>{evt.title}</h3>

                    <div style={{ marginBottom: 6 }}>
                      <span
                        style={{
                          ...styles.inlineBadge,
                          ...(typeColors[evt.type] || typeColors.rdv),
                        }}
                      >
                        {evt.type === "rdv" ? "Rendez-vous" : "Activité"}
                      </span>

                      <span
                        style={{
                          ...styles.inlineBadge,
                          background: "#f8fafc",
                          color: "#334155",
                        }}
                      >
                        {resolveEventCategory(evt)}
                      </span>

                      <span
                        style={{
                          ...styles.inlineBadge,
                          background: "#fff7ed",
                          color: "#9a3412",
                        }}
                      >
                        {resolveEventSubcategory(evt)}
                      </span>

                      {evt.recurrenceGroupId ? (
                        <span
                          style={{
                            ...styles.inlineBadge,
                            background: "#faf5ff",
                            color: "#7c3aed",
                          }}
                        >
                          Récurrent
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    style={{
                      ...(statusColors[evt.status] || statusColors["prévu"]),
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {evt.status}
                  </div>
                </div>

                {hasConflict(evt) && <p style={styles.conflict}>Conflit de planning détecté</p>}

                <div style={styles.metaGrid}>
                  <div style={styles.metaBox}>
                    <strong>Heure</strong>
                    <div>{evt.whenStart}</div>
                  </div>

                  <div style={styles.metaBox}>
                    <strong>Durée</strong>
                    <div>{evt.duration} min</div>
                  </div>

                  <div style={styles.metaBox}>
                    <strong>Temps mobilisé</strong>
                    <div>{formatMinutes(getMobilizedMinutes(evt))}</div>
                  </div>

                  <div style={styles.metaBox}>
                    <strong>Trajet</strong>
                    <div>
                      avant {evt.travelBefore} min / après {evt.travelAfter} min
                    </div>
                  </div>

                  {evt.who && (
                    <div style={styles.metaBox}>
                      <strong>Qui</strong>
                      <div>{evt.who}</div>
                    </div>
                  )}

                  {evt.where && (
                    <div style={styles.metaBox}>
                      <strong>Lieu</strong>
                      <div>{evt.where}</div>
                    </div>
                  )}

                  {evt.how && (
                    <div style={styles.metaBox}>
                      <strong>Comment</strong>
                      <div>{evt.how}</div>
                    </div>
                  )}

                  {evt.why && (
                    <div style={styles.metaBox}>
                      <strong>Objectif</strong>
                      <div>{evt.why}</div>
                    </div>
                  )}
                </div>

                {evt.notes && (
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
                    <div style={{ marginTop: 6 }}>{evt.notes}</div>
                  </div>
                )}

                <div>
                  <button type="button" style={styles.buttonSecondary} onClick={() => editEvent(evt)}>
                    Modifier
                  </button>

                  <button
                    type="button"
                    style={styles.buttonDanger}
                    onClick={() => deleteEvent(evt.id)}
                  >
                    Supprimer
                  </button>

                  {evt.recurrenceGroupId ? (
                    <button
                      type="button"
                      style={styles.buttonDanger}
                      onClick={() => deleteRecurrenceGroup(evt.recurrenceGroupId)}
                    >
                      Supprimer la série
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  }

  function renderStatsPanel() {
    const range = getStatsRange();

    return (
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Statistiques</h2>
        <p style={styles.sectionText}>
          Les statistiques peuvent être calculées sur la période affichée ou sur une plage indépendante.
        </p>

        <div style={styles.filterRow}>
          <div>
            <label style={styles.label}>Période statistiques</label>
            <select
              style={styles.input}
              value={statsFilter.mode}
              onChange={(e) => setStatsFilter((prev) => ({ ...prev, mode: e.target.value }))}
            >
              <option value="current">Période affichée</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
              <option value="custom">Dates personnalisées</option>
            </select>
          </div>

          {statsFilter.mode === "custom" ? (
            <>
              <div>
                <label style={styles.label}>Date début</label>
                <input
                  style={styles.input}
                  type="date"
                  value={statsFilter.customStart}
                  onChange={(e) =>
                    setStatsFilter((prev) => ({ ...prev, customStart: e.target.value }))
                  }
                />
              </div>

              <div>
                <label style={styles.label}>Date fin</label>
                <input
                  style={styles.input}
                  type="date"
                  value={statsFilter.customEnd}
                  onChange={(e) =>
                    setStatsFilter((prev) => ({ ...prev, customEnd: e.target.value }))
                  }
                />
              </div>
            </>
          ) : null}

          <div>
            <label style={styles.label}>Période retenue</label>
            <div style={{ ...styles.input, display: "flex", alignItems: "center" }}>
              {range.label}
            </div>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.badge}>Événements</div>
            <div style={styles.statValue}>{stats.count}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Rendez-vous</div>
            <div style={styles.statValue}>{stats.rdvCount}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Activités</div>
            <div style={styles.statValue}>{stats.activityCount}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Temps activité / RDV</div>
            <div style={styles.statValue}>{formatMinutes(stats.duration)}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Temps trajet</div>
            <div style={styles.statValue}>{formatMinutes(stats.travel)}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Temps mobilisé</div>
            <div style={styles.statValue}>{formatMinutes(stats.mobilized)}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Conflits</div>
            <div style={styles.statValue}>{stats.conflicts}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Personnes distinctes</div>
            <div style={styles.statValue}>{stats.uniquePeople}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Tx confirmation</div>
            <div style={styles.statValue}>{stats.confirmationRate}%</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Tx réalisation</div>
            <div style={styles.statValue}>{stats.completionRate}%</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Catégorie dominante</div>
            <div style={{ ...styles.statValue, fontSize: 18 }}>{stats.topCategory}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Sous-type dominant</div>
            <div style={{ ...styles.statValue, fontSize: 18 }}>{stats.topSubcategory}</div>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.grid}>
          <div>
            <h3 style={{ marginTop: 0 }}>Répartition par catégorie</h3>
            <div style={styles.listCompact}>
              {Object.keys(stats.byCategory).length === 0 ? (
                <p style={styles.subtle}>Aucune donnée.</p>
              ) : (
                Object.entries(stats.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, value]) => (
                    <div
                      key={cat}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: "10px 12px",
                        background: "#fff",
                      }}
                    >
                      <span>{cat}</span>
                      <strong>{value}</strong>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>Répartition par sous-type</h3>
            <div style={styles.listCompact}>
              {Object.keys(stats.bySubcategory).length === 0 ? (
                <p style={styles.subtle}>Aucune donnée.</p>
              ) : (
                Object.entries(stats.bySubcategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([sub, value]) => (
                    <div
                      key={sub}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: "10px 12px",
                        background: "#fff",
                      }}
                    >
                      <span>{sub}</span>
                      <strong>{value}</strong>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Agenda RDV / Activités</h1>
          <p style={styles.heroText}>
            Version optimisée : menus, activités modifiables, catégories et sous-types,
            récurrence, timeline et statistiques filtrables sur dates, semaine, mois ou année.
          </p>
        </div>

        {renderMenu()}

        {activeMenu === "agenda" && renderAgendaPanel()}
        {activeMenu === "event" && renderEventForm()}
        {activeMenu === "activities" && renderActivitiesPanel()}
        {activeMenu === "stats" && renderStatsPanel()}
      </div>
    </div>
  );
}

export default App;