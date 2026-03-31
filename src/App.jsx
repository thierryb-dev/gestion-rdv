import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "agenda-v5-ergonomique";

const DEFAULT_STRUCTURE = {
  AVF: {
    "Réunion": [],
    "Activité": ["Pétanque", "Théâtre d'improvisation", "Belote"],
    "Événement": [],
  },
  R2C: {
    "Réunion": [],
    "Sortie club": [],
    "Activité": ["Course à pied", "Nordic tonic", "Marche nordique"],
  },
  "Université permanente de Nantes": {
    "Conférence": ["Guérande", "Nantes"],
  },
};

const DEFAULT_MODELS = [
  {
    id: "model-avf-petanque",
    domain: "AVF",
    typeLabel: "Activité",
    subTypeLabel: "Pétanque",
    label: "AVF · Activité · Pétanque",
    defaultDuration: 120,
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "model-r2c-course",
    domain: "R2C",
    typeLabel: "Activité",
    subTypeLabel: "Course à pied",
    label: "R2C · Activité · Course à pied",
    defaultDuration: 60,
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "model-upn-conf-nantes",
    domain: "Université permanente de Nantes",
    typeLabel: "Conférence",
    subTypeLabel: "Nantes",
    label: "Université permanente de Nantes · Conférence · Nantes",
    defaultDuration: 90,
    notes: "",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_EVENT_FORM = {
  title: "",
  domain: "AVF",
  typeLabel: "Réunion",
  subTypeLabel: "",
  modelId: "",
  withWho: "",
  place: "",
  date: "",
  startTime: "",
  duration: 60,
  channel: "",
  objective: "",
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

const INITIAL_MODEL_FORM = {
  id: null,
  label: "",
  domain: "AVF",
  typeLabel: "Réunion",
  subTypeLabel: "",
  defaultDuration: 60,
  notes: "",
};

const INITIAL_STATS_FILTER = {
  mode: "current", // current | week | month | year | custom
  customStart: "",
  customEnd: "",
};

function App() {
  const [store, setStore] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          events: [],
          structure: DEFAULT_STRUCTURE,
          models: DEFAULT_MODELS,
        };
      }
      const parsed = JSON.parse(raw);

    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      structure:
        parsed.structure && typeof parsed.structure === "object"
          ? parsed.structure
          : DEFAULT_STRUCTURE,
      models:
        Array.isArray(parsed.models) && parsed.models.length > 0
          ? parsed.models
          : DEFAULT_MODELS,
    };
  } catch {
    return {
      events: [],
      structure: DEFAULT_STRUCTURE,
      models: DEFAULT_MODELS,
    };
  }
});

  const [activeMenu, setActiveMenu] = useState("agenda"); // agenda | event | models | structure | stats
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [modelForm, setModelForm] = useState(INITIAL_MODEL_FORM);
  const [isMobile, setIsMobile] = useState(() =>
  typeof window !== "undefined" ? window.innerWidth <= 768 : false
);
  const [agendaMobileTab, setAgendaMobileTab] = useState("liste"); // liste | timeline | filtres


  const [editingEventId, setEditingEventId] = useState(null);
  const [editingSeriesGroupId, setEditingSeriesGroupId] = useState(null);
  const [editingModelId, setEditingModelId] = useState(null);

  const [viewMode, setViewMode] = useState("semaine");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [domainFilter, setDomainFilter] = useState("tous");
  const [typeFilter, setTypeFilter] = useState("tous");
  const [subTypeFilter, setSubTypeFilter] = useState("tous");
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);

  const [statsFilter, setStatsFilter] = useState(INITIAL_STATS_FILTER);

  const [newDomainName, setNewDomainName] = useState("");
  const [newTypeDomain, setNewTypeDomain] = useState("AVF");
  const [newTypeName, setNewTypeName] = useState("");
  const [newSubDomain, setNewSubDomain] = useState("AVF");
  const [newSubTypeParent, setNewSubTypeParent] = useState("Réunion");
  const [newSubTypeName, setNewSubTypeName] = useState("");

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    eventId: null,
    x: 0,
    y: 0,
  });

  const fileInputRef = useRef(null);

  const events = store.events;
  const structure = store.structure;
  const models = store.models;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    function closeMenu() {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

 useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function uid(prefix = "id") {
    return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;
  }

  function setEvents(nextEvents) {
    setStore((prev) => ({ ...prev, events: nextEvents }));
  }

  function setStructure(nextStructure) {
    setStore((prev) => ({ ...prev, structure: nextStructure }));
  }

  function setModels(nextModels) {
    setStore((prev) => ({ ...prev, models: nextModels }));
  }

  function getDomains() {
    return Object.keys(structure).sort((a, b) => a.localeCompare(b));
  }

  function getTypes(domain) {
    if (!domain || !structure[domain]) return [];
    return Object.keys(structure[domain]).sort((a, b) => a.localeCompare(b));
  }

  function getSubTypes(domain, typeLabel) {
    if (!domain || !typeLabel || !structure[domain] || !structure[domain][typeLabel]) return [];
    return [...structure[domain][typeLabel]].sort((a, b) => a.localeCompare(b));
  }

  function ensureDomainExists(domain) {
    const clean = String(domain || "").trim();
    if (!clean) return;
    if (!structure[clean]) {
      setStructure({
        ...structure,
        [clean]: {},
      });
    }
  }

  function ensureTypeExists(domain, typeLabel) {
    const cleanDomain = String(domain || "").trim();
    const cleanType = String(typeLabel || "").trim();
    if (!cleanDomain || !cleanType) return;

    const currentDomain = structure[cleanDomain] || {};
    if (!currentDomain[cleanType]) {
      setStructure({
        ...structure,
        [cleanDomain]: {
          ...currentDomain,
          [cleanType]: [],
        },
      });
    }
  }

  function ensureSubTypeExists(domain, typeLabel, subTypeLabel) {
    const cleanDomain = String(domain || "").trim();
    const cleanType = String(typeLabel || "").trim();
    const cleanSub = String(subTypeLabel || "").trim();
    if (!cleanDomain || !cleanType || !cleanSub) return;

    const currentDomain = structure[cleanDomain] || {};
    const currentSubs = Array.isArray(currentDomain[cleanType]) ? currentDomain[cleanType] : [];

    if (!currentSubs.includes(cleanSub)) {
      setStructure({
        ...structure,
        [cleanDomain]: {
          ...currentDomain,
          [cleanType]: [...currentSubs, cleanSub],
        },
      });
    }
  }

  function normalizeChain(domain, typeLabel, subTypeLabel) {
    const safeDomain = String(domain || "").trim();
    const safeType = String(typeLabel || "").trim();
    const safeSub = String(subTypeLabel || "").trim();

    return {
      domain: safeDomain,
      typeLabel: safeType,
      subTypeLabel: safeSub,
    };
  }

  function getModelById(id) {
    return models.find((m) => m.id === id) || null;
  }

  function resetEventForm() {
    setEventForm(INITIAL_EVENT_FORM);
    setEditingEventId(null);
    setEditingSeriesGroupId(null);
  }

  function resetModelForm() {
    setModelForm(INITIAL_MODEL_FORM);
    setEditingModelId(null);
  }

  function handleEventChange(e) {
    const { name, value, type, checked } = e.target;
    const numericFields = ["duration", "travelBefore", "travelAfter"];

    if (name.startsWith("recurrence.")) {
      const key = name.replace("recurrence.", "");
      setEventForm((prev) => ({
        ...prev,
        recurrence: {
          ...prev.recurrence,
          [key]:
            key === "enabled"
              ? checked
              : ["interval", "count"].includes(key)
                ? value === ""
                  ? ""
                  : Number(value)
                : value,
        },
      }));
      return;
    }

    if (name === "domain") {
      const nextTypes = getTypes(value);
      const nextType = nextTypes[0] || "";
      const nextSubs = getSubTypes(value, nextType);
      setEventForm((prev) => ({
        ...prev,
        domain: value,
        typeLabel: nextType,
        subTypeLabel: nextSubs[0] || "",
        modelId: "",
      }));
      return;
    }

    if (name === "typeLabel") {
      const nextSubs = getSubTypes(eventForm.domain, value);
      setEventForm((prev) => ({
        ...prev,
        typeLabel: value,
        subTypeLabel: nextSubs[0] || "",
        modelId: "",
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

  function handleModelChange(e) {
    const { name, value } = e.target;

    if (name === "domain") {
      const nextTypes = getTypes(value);
      const nextType = nextTypes[0] || "";
      const nextSubs = getSubTypes(value, nextType);
      setModelForm((prev) => ({
        ...prev,
        domain: value,
        typeLabel: nextType,
        subTypeLabel: nextSubs[0] || "",
      }));
      return;
    }

    if (name === "typeLabel") {
      const nextSubs = getSubTypes(modelForm.domain, value);
      setModelForm((prev) => ({
        ...prev,
        typeLabel: value,
        subTypeLabel: nextSubs[0] || "",
      }));
      return;
    }

    setModelForm((prev) => ({
      ...prev,
      [name]: name === "defaultDuration" ? (value === "" ? "" : Number(value)) : value,
    }));
  }

  function validateEvent(payload) {
    if (!payload.title.trim()) return "Le titre est obligatoire.";
    if (!payload.domain.trim()) return "Le domaine est obligatoire.";
    if (!payload.typeLabel.trim()) return "Le type est obligatoire.";
    if (!payload.date) return "La date est obligatoire.";
    if (!payload.startTime) return "L'heure est obligatoire.";
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

  function validateModel(payload) {
    if (!payload.domain.trim()) return "Le domaine est obligatoire.";
    if (!payload.typeLabel.trim()) return "Le type est obligatoire.";
    if (!payload.label.trim()) return "Le libellé du modèle est obligatoire.";
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

  function buildOccurrencesFromPayload(payload, options = {}) {
    const {
      existingSeriesGroupId = null,
      preserveIds = false,
      seriesEvents = [],
    } = options;

    const firstStart = combineDateTime(payload.date, payload.startTime);
    const seriesGroupId = payload.recurrence.enabled
      ? existingSeriesGroupId || uid("series")
      : null;

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

      const existingSeriesEvent = preserveIds
        ? seriesEvents.find((evt) => Number(evt.seriesIndex || 0) === index)
        : null;

      list.push({
        id: existingSeriesEvent?.id || uid("evt"),
        createdAt: existingSeriesEvent?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        seriesGroupId,
        seriesIndex: index,
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
        title: payload.title,
        modelId: payload.modelId || "",
        domain: payload.domain,
        typeLabel: payload.typeLabel,
        subTypeLabel: payload.subTypeLabel,
        withWho: payload.withWho,
        place: payload.place,
        date: formatDateInputValue(cursor),
        startTime: payload.startTime,
        duration: Number(payload.duration || 0),
        channel: payload.channel,
        objective: payload.objective,
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

  function applyModelToEvent(modelId) {
    const model = getModelById(modelId);
    if (!model) return;

    setEventForm((prev) => ({
      ...prev,
      modelId,
      title: model.label || prev.title,
      domain: model.domain || prev.domain,
      typeLabel: model.typeLabel || prev.typeLabel,
      subTypeLabel: model.subTypeLabel || prev.subTypeLabel,
      duration: model.defaultDuration || prev.duration,
      notes: prev.notes || model.notes || "",
    }));
  }

  function saveEvent() {
    const chain = normalizeChain(eventForm.domain, eventForm.typeLabel, eventForm.subTypeLabel);

    const payload = {
      title: String(eventForm.title || "").trim(),
      modelId: String(eventForm.modelId || ""),
      domain: chain.domain,
      typeLabel: chain.typeLabel,
      subTypeLabel: chain.subTypeLabel,
      withWho: String(eventForm.withWho || "").trim(),
      place: String(eventForm.place || "").trim(),
      date: String(eventForm.date || ""),
      startTime: String(eventForm.startTime || ""),
      duration: Number(eventForm.duration || 0),
      channel: String(eventForm.channel || "").trim(),
      objective: String(eventForm.objective || "").trim(),
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

    ensureDomainExists(payload.domain);
    ensureTypeExists(payload.domain, payload.typeLabel);
    if (payload.subTypeLabel) {
      ensureSubTypeExists(payload.domain, payload.typeLabel, payload.subTypeLabel);
    }

    if (editingSeriesGroupId) {
      const seriesEvents = events
        .filter((evt) => evt.seriesGroupId === editingSeriesGroupId)
        .sort((a, b) => Number(a.seriesIndex || 0) - Number(b.seriesIndex || 0));

      const rebuiltSeries = buildOccurrencesFromPayload(payload, {
        existingSeriesGroupId: editingSeriesGroupId,
        preserveIds: true,
        seriesEvents,
      });

      const nextEvents = [
        ...events.filter((evt) => evt.seriesGroupId !== editingSeriesGroupId),
        ...rebuiltSeries,
      ].sort((a, b) => getDateTimeFromEvent(a) - getDateTimeFromEvent(b));

      setEvents(nextEvents);
      resetEventForm();
      setActiveMenu("agenda");
      return;
    }

    if (editingEventId) {
      const nextEvents = events.map((evt) =>
        evt.id === editingEventId
          ? {
              ...evt,
              title: payload.title,
              modelId: payload.modelId,
              domain: payload.domain,
              typeLabel: payload.typeLabel,
              subTypeLabel: payload.subTypeLabel,
              withWho: payload.withWho,
              place: payload.place,
              date: payload.date,
              startTime: payload.startTime,
              duration: payload.duration,
              channel: payload.channel,
              objective: payload.objective,
              notes: payload.notes,
              status: payload.status,
              travelBefore: payload.travelBefore,
              travelAfter: payload.travelAfter,
              updatedAt: new Date().toISOString(),
            }
          : evt
      );
      setEvents(nextEvents);
      resetEventForm();
      setActiveMenu("agenda");
      return;
    }

    const created = buildOccurrencesFromPayload(payload);
    setEvents([...events, ...created].sort((a, b) => getDateTimeFromEvent(a) - getDateTimeFromEvent(b)));
    resetEventForm();
    setActiveMenu("agenda");
  }

  function saveModel() {
    const chain = normalizeChain(modelForm.domain, modelForm.typeLabel, modelForm.subTypeLabel);

    const payload = {
      id: modelForm.id || uid("model"),
      label: String(modelForm.label || "").trim(),
      domain: chain.domain,
      typeLabel: chain.typeLabel,
      subTypeLabel: chain.subTypeLabel,
      defaultDuration: Number(modelForm.defaultDuration || 0),
      notes: String(modelForm.notes || "").trim(),
      createdAt: editingModelId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const error = validateModel(payload);
    if (error) {
      alert(error);
      return;
    }

    ensureDomainExists(payload.domain);
    ensureTypeExists(payload.domain, payload.typeLabel);
    if (payload.subTypeLabel) {
      ensureSubTypeExists(payload.domain, payload.typeLabel, payload.subTypeLabel);
    }

    if (editingModelId) {
      setModels(
        models.map((model) =>
          model.id === editingModelId
            ? {
                ...model,
                label: payload.label,
                domain: payload.domain,
                typeLabel: payload.typeLabel,
                subTypeLabel: payload.subTypeLabel,
                defaultDuration: payload.defaultDuration,
                notes: payload.notes,
                updatedAt: payload.updatedAt,
              }
            : model
        )
      );
    } else {
      setModels([...models, payload]);
    }

    resetModelForm();
    setActiveMenu("models");
  }

  function editModel(model) {
    setEditingModelId(model.id);
    setModelForm({
      id: model.id,
      label: model.label || "",
      domain: model.domain || getDomains()[0] || "",
      typeLabel: model.typeLabel || getTypes(model.domain)[0] || "",
      subTypeLabel: model.subTypeLabel || "",
      defaultDuration: Number(model.defaultDuration ?? 60),
      notes: model.notes || "",
    });
    setActiveMenu("models");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteModel(modelId) {
    setModels(models.filter((m) => m.id !== modelId));
    if (editingModelId === modelId) {
      resetModelForm();
    }
  }

  function editOccurrence(evt) {
    setEditingEventId(evt.id);
    setEditingSeriesGroupId(null);
    setEventForm({
      title: evt.title || "",
      domain: evt.domain || getDomains()[0] || "",
      typeLabel: evt.typeLabel || "",
      subTypeLabel: evt.subTypeLabel || "",
      modelId: evt.modelId || "",
      withWho: evt.withWho || "",
      place: evt.place || "",
      date: evt.date || "",
      startTime: evt.startTime || "",
      duration: Number(evt.duration ?? 60),
      channel: evt.channel || "",
      objective: evt.objective || "",
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

  function editSeries(evt) {
    if (!evt.seriesGroupId) {
      editOccurrence(evt);
      return;
    }

    const seriesEvents = events
      .filter((item) => item.seriesGroupId === evt.seriesGroupId)
      .sort((a, b) => Number(a.seriesIndex || 0) - Number(b.seriesIndex || 0));

    const first = seriesEvents[0] || evt;
    const rule = first.recurrenceRule || {
      enabled: true,
      frequency: "weekly",
      interval: 1,
      count: seriesEvents.length,
      until: "",
    };

    setEditingEventId(null);
    setEditingSeriesGroupId(evt.seriesGroupId);
    setEventForm({
      title: first.title || "",
      domain: first.domain || getDomains()[0] || "",
      typeLabel: first.typeLabel || "",
      subTypeLabel: first.subTypeLabel || "",
      modelId: first.modelId || "",
      withWho: first.withWho || "",
      place: first.place || "",
      date: first.date || "",
      startTime: first.startTime || "",
      duration: Number(first.duration ?? 60),
      channel: first.channel || "",
      objective: first.objective || "",
      notes: first.notes || "",
      status: first.status || "prévu",
      travelBefore: Number(first.travelBefore ?? 0),
      travelAfter: Number(first.travelAfter ?? 0),
      recurrence: {
        enabled: Boolean(rule.enabled),
        frequency: String(rule.frequency || "weekly"),
        interval: Number(rule.interval || 1),
        count: Number(rule.count || seriesEvents.length || 1),
        until: String(rule.until || ""),
      },
    });
    setActiveMenu("event");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteOccurrence(id) {
    setEvents(events.filter((evt) => evt.id !== id));
    if (editingEventId === id) {
      resetEventForm();
    }
  }

  function deleteSeries(seriesGroupId) {
    if (!seriesGroupId) return;
    setEvents(events.filter((evt) => evt.seriesGroupId !== seriesGroupId));

    if (editingSeriesGroupId === seriesGroupId) {
      resetEventForm();
    }
  }

  function duplicateEvent(evt) {
    setEventForm({
      title: evt.title || "",
      domain: evt.domain || getDomains()[0] || "",
      typeLabel: evt.typeLabel || "",
      subTypeLabel: evt.subTypeLabel || "",
      modelId: evt.modelId || "",
      withWho: evt.withWho || "",
      place: evt.place || "",
      date: evt.date || "",
      startTime: evt.startTime || "",
      duration: Number(evt.duration ?? 60),
      channel: evt.channel || "",
      objective: evt.objective || "",
      notes: evt.notes || "",
      status: "prévu",
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
    setEditingEventId(null);
    setEditingSeriesGroupId(null);
    setActiveMenu("event");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(store, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "agenda-v5.json";
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
        const imported = {
          events: Array.isArray(parsed.events) ? parsed.events : [],
          structure:
            parsed.structure && typeof parsed.structure === "object"
              ? parsed.structure
              : DEFAULT_STRUCTURE,
          models:
            Array.isArray(parsed.models) && parsed.models.length > 0
              ? parsed.models
              : DEFAULT_MODELS,
        };
        setStore(imported);
        resetEventForm();
        resetModelForm();
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
    return new Date(`${evt.date}T${evt.startTime}:00`);
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
      if (other.date !== current.date) return false;
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
    const evtDate = new Date(`${evt.date}T12:00:00`);
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
        return { start: startOfDay(currentDate), end: endOfDay(currentDate), label: "Période affichée : jour" };
      }
      if (viewMode === "semaine") {
        return { start: getStartOfWeek(currentDate), end: getEndOfWeek(currentDate), label: "Période affichée : semaine" };
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
      return { start: getStartOfWeek(new Date()), end: getEndOfWeek(new Date()), label: "Cette semaine" };
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
      const start = statsFilter.customStart ? new Date(`${statsFilter.customStart}T00:00:00`) : null;
      const end = statsFilter.customEnd ? new Date(`${statsFilter.customEnd}T23:59:59`) : null;
      return { start, end, label: "Période personnalisée" };
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
    return `${pad(start.getHours())}:${pad(start.getMinutes())} → ${pad(end.getHours())}:${pad(end.getMinutes())}`;
  }

  const currentTypeOptionsForFilter = domainFilter !== "tous" ? getTypes(domainFilter) : [];
  const currentSubTypeOptionsForFilter =
    domainFilter !== "tous" && typeFilter !== "tous" ? getSubTypes(domainFilter, typeFilter) : [];

  const filteredAgendaEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...events]
      .filter((evt) => isInCurrentView(evt))
      .filter((evt) => {
        const haystack = [
          evt.title,
          evt.domain,
          evt.typeLabel,
          evt.subTypeLabel,
          evt.withWho,
          evt.place,
          evt.channel,
          evt.objective,
          evt.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return !q || haystack.includes(q);
      })
      .filter((evt) => statusFilter === "tous" || evt.status === statusFilter)
      .filter((evt) => domainFilter === "tous" || evt.domain === domainFilter)
      .filter((evt) => typeFilter === "tous" || evt.typeLabel === typeFilter)
      .filter((evt) => subTypeFilter === "tous" || evt.subTypeLabel === subTypeFilter)
      .filter((evt) => !showOnlyConflicts || hasConflict(evt))
      .sort((a, b) => getDateTimeFromEvent(a) - getDateTimeFromEvent(b));
  }, [events, currentDate, viewMode, search, statusFilter, domainFilter, typeFilter, subTypeFilter, showOnlyConflicts]);

  const statsEvents = useMemo(() => {
    return [...events]
      .filter((evt) => isEventInStatsRange(evt))
      .filter((evt) => statusFilter === "tous" || evt.status === statusFilter)
      .filter((evt) => domainFilter === "tous" || evt.domain === domainFilter)
      .filter((evt) => typeFilter === "tous" || evt.typeLabel === typeFilter)
      .filter((evt) => subTypeFilter === "tous" || evt.subTypeLabel === subTypeFilter)
      .sort((a, b) => getDateTimeFromEvent(a) - getDateTimeFromEvent(b));
  }, [events, statsFilter, statusFilter, domainFilter, typeFilter, subTypeFilter, currentDate, viewMode]);

  const stats = useMemo(() => {
    const count = statsEvents.length;
    const duration = statsEvents.reduce((sum, e) => sum + Number(e.duration || 0), 0);
    const travel = statsEvents.reduce((sum, e) => sum + Number(e.travelBefore || 0) + Number(e.travelAfter || 0), 0);
    const mobilized = statsEvents.reduce((sum, e) => sum + getMobilizedMinutes(e), 0);
    const conflicts = statsEvents.filter((e) => hasConflict(e)).length;
    const confirmed = statsEvents.filter((e) => e.status === "confirmé").length;
    const completed = statsEvents.filter((e) => e.status === "terminé").length;
    const cancelled = statsEvents.filter((e) => e.status === "annulé").length;
    const uniquePeople = new Set(statsEvents.map((e) => String(e.withWho || "").trim()).filter(Boolean)).size;

    const byDomain = statsEvents.reduce((acc, e) => {
      acc[e.domain] = (acc[e.domain] || 0) + 1;
      return acc;
    }, {});

    const byType = statsEvents.reduce((acc, e) => {
      acc[e.typeLabel] = (acc[e.typeLabel] || 0) + 1;
      return acc;
    }, {});

    const bySubType = statsEvents.reduce((acc, e) => {
      const key = e.subTypeLabel || "Sans sous-type";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const activeBase = count - cancelled;
    const completionRate = activeBase > 0 ? Math.round((completed / activeBase) * 100) : 0;
    const confirmationRate = activeBase > 0 ? Math.round((confirmed / activeBase) * 100) : 0;

    const topDomain = Object.entries(byDomain).sort((a, b) => b[1] - a[1])[0] || null;
    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0] || null;
    const topSubType = Object.entries(bySubType).sort((a, b) => b[1] - a[1])[0] || null;

    return {
      count,
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
      topDomain: topDomain ? `${topDomain[0]} (${topDomain[1]})` : "—",
      topType: topType ? `${topType[0]} (${topType[1]})` : "—",
      topSubType: topSubType ? `${topSubType[0]} (${topSubType[1]})` : "—",
      byDomain,
      byType,
      bySubType,
    };
  }, [statsEvents]);

  const timelineEvents = useMemo(() => {
    return [...filteredAgendaEvents].sort((a, b) => getEffectiveStart(a) - getEffectiveStart(b));
  }, [filteredAgendaEvents]);

  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top left, rgba(59,130,246,0.12) 0%, rgba(124,58,237,0.08) 25%, #f8fafc 55%, #f8fafc 100%)",
      padding: isMobile ? "12px 12px 92px" : 20,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#0f172a",
    },
    wrapper: {
      maxWidth: 1500,
      margin: "0 auto",
    },
    hero: {
      background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
      borderRadius: isMobile ? 20 : 28,
      padding: isMobile ? 18 : 26,
      color: "white",
      boxShadow: "0 18px 45px rgba(37, 99, 235, 0.22)",
      marginBottom: 16,
      position: "relative",
      overflow: "hidden",
    },
    heroTitle: {
      margin: 0,
      fontSize: isMobile ? 24 : 32,
      fontWeight: 900,
      lineHeight: 1.05,
    },
    heroText: {
      marginTop: 10,
      marginBottom: 0,
      color: "rgba(255,255,255,0.92)",
      lineHeight: 1.5,
      fontSize: isMobile ? 14 : 15,
      maxWidth: 900,
    },
    menuBar: {
      display: "flex",
      flexWrap: isMobile ? "nowrap" : "wrap",
      overflowX: isMobile ? "auto" : "visible",
      gap: 10,
      marginBottom: 16,
      paddingBottom: isMobile ? 4 : 0,
      scrollbarWidth: "none",
    },
    menuButton: {
      padding: isMobile ? "12px 14px" : "12px 16px",
      borderRadius: 16,
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      color: "#0f172a",
      fontWeight: 800,
      cursor: "pointer",
      whiteSpace: "nowrap",
      flex: isMobile ? "0 0 auto" : "initial",
      boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
    },
    card: {
      background: "rgba(255,255,255,0.96)",
      backdropFilter: "blur(8px)",
      borderRadius: isMobile ? 18 : 24,
      padding: isMobile ? 16 : 20,
      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
      border: "1px solid rgba(255,255,255,0.75)",
      marginBottom: 16,
    },
    sectionTitle: {
      margin: 0,
      marginBottom: 6,
      fontSize: isMobile ? 19 : 22,
      fontWeight: 900,
      letterSpacing: -0.2,
    },
    sectionText: {
      marginTop: 0,
      marginBottom: 16,
      color: "#64748b",
      fontSize: 14,
      lineHeight: 1.5,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : "repeat(auto-fit, minmax(230px, 1fr))",
      gap: 14,
    },
    input: {
  width: "100%",
  padding: isMobile ? "13px 14px" : "12px 14px",
  borderRadius: 16,
  border: "1px solid #dbeafe",
  background: "#ffffff",
  color: "#0f172a",
  WebkitTextFillColor: "#0f172a",
  marginTop: 8,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
},
    textarea: {
  width: "100%",
  minHeight: 110,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid #dbeafe",
  background: "#ffffff",
  color: "#0f172a",
  WebkitTextFillColor: "#0f172a",
  marginTop: 8,
  fontSize: 14,
  boxSizing: "border-box",
  resize: "vertical",
  outline: "none",
},
    label: {
      fontSize: 13,
      fontWeight: 800,
      color: "#334155",
    },
    buttonPrimary: {
      padding: isMobile ? "13px 16px" : "12px 16px",
      borderRadius: 16,
      border: "none",
      background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
      color: "white",
      fontWeight: 900,
      cursor: "pointer",
      marginRight: 10,
      marginBottom: 10,
      boxShadow: "0 10px 22px rgba(37,99,235,0.18)",
    },
   buttonSecondary: {
  padding: isMobile ? "13px 14px" : "12px 16px",
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  WebkitTextFillColor: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  marginRight: 10,
  marginBottom: 10,
  boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
},
    buttonDanger: {
      padding: isMobile ? "13px 14px" : "12px 16px",
      borderRadius: 16,
      border: "1px solid #fecaca",
      background: "#fff",
      color: "#b91c1c",
      fontWeight: 800,
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
      gridTemplateColumns: isMobile
        ? "repeat(2, minmax(0, 1fr))"
        : "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    },
    statBox: {
      borderRadius: 18,
      padding: isMobile ? 14 : 16,
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
    },
    statValue: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: 900,
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
      gridTemplateColumns: isMobile
        ? "1fr"
        : "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
      alignItems: "end",
      marginBottom: 16,
    },
    eventCard: {
      borderRadius: 20,
      padding: isMobile ? 16 : 18,
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      marginBottom: 14,
      position: "relative",
      boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
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
      fontSize: isMobile ? 17 : 18,
      fontWeight: 900,
      lineHeight: 1.25,
    },
    metaGrid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr 1fr"
        : "repeat(auto-fit, minmax(180px, 1fr))",
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
      lineHeight: 1.5,
    },
    conflict: {
      color: "#b91c1c",
      fontWeight: 800,
      margin: "8px 0",
    },
    pickerWrap: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 320px)",
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
      minWidth: isMobile ? 100 : 760,
    },
    dayTimelineGrid: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: isMobile ? "56px 1fr" : "72px 1fr",
      minHeight: 1440,
    },
    timeColumn: {
      borderRight: "1px solid #e2e8f0",
      background: "#f8fafc",
    },
    timeSlot: {
      height: 60,
      borderBottom: "1px solid #eef2f7",
      padding: isMobile ? "4px 6px" : "4px 8px",
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
      minWidth: isMobile ? 860 : 1120,
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
      fontWeight: 800,
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
      left: isMobile ? 4 : 8,
      right: isMobile ? 4 : 8,
      borderRadius: 14,
      padding: isMobile ? 8 : 10,
      boxSizing: "border-box",
      overflow: "hidden",
      boxShadow: "0 8px 20px rgba(37, 99, 235, 0.12)",
      border: "1px solid rgba(37,99,235,0.15)",
      background:
        "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.12) 100%)",
      color: "#0f172a",
    },
    timelineEventTitle: {
      fontSize: isMobile ? 12 : 13,
      fontWeight: 900,
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
      gridTemplateColumns: isMobile
        ? "repeat(2, minmax(0, 1fr))"
        : "repeat(7, minmax(120px, 1fr))",
      gap: 10,
    },
    monthDayName: {
      fontSize: 12,
      fontWeight: 900,
      color: "#475569",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      padding: "4px 8px",
      textAlign: "center",
    },
    monthCell: {
      minHeight: isMobile ? 112 : 130,
      borderRadius: 18,
      border: "1px solid #e2e8f0",
      background: "#fff",
      padding: 12,
      boxSizing: "border-box",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
    },
    monthCellMuted: {
      background: "#f8fafc",
      color: "#94a3b8",
    },
    monthCellToday: {
      border: "2px solid #2563eb",
      boxShadow: "0 8px 20px rgba(37,99,235,0.10)",
    },
    monthCellHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    monthDayNumber: {
      fontWeight: 900,
      fontSize: 14,
    },
    monthCountBadge: {
      fontSize: 11,
      padding: "4px 8px",
      borderRadius: 999,
      background: "#eef2ff",
      color: "#4338ca",
      fontWeight: 900,
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
      gridTemplateColumns: isMobile
        ? "1fr"
        : "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 14,
    },
    yearMonthCard: {
      borderRadius: 20,
      border: "1px solid #e2e8f0",
      background: "#fff",
      padding: 14,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
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
    contextButton: {
   contextButton: {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  WebkitTextFillColor: "#0f172a",
  borderRadius: 12,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 14,
  lineHeight: 1.2,
  boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
},
    contextMenu: {
      position: "fixed",
      minWidth: 220,
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 16,
      boxShadow: "0 20px 40px rgba(15,23,42,0.18)",
      padding: 8,
      zIndex: 9999,
    },
    contextMenuItem: {
      width: "100%",
      textAlign: "left",
      padding: "10px 12px",
      border: "none",
      background: "transparent",
      borderRadius: 10,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
    },
    mobileSegment: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 8,
      marginBottom: 14,
    },
    mobileSegmentButton: {
      padding: "12px 10px",
      borderRadius: 14,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 800,
      fontSize: 13,
      cursor: "pointer",
      boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
    },
    mobileBottomBar: {
      position: "fixed",
      left: 12,
      right: 12,
      bottom: 12,
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 8,
      padding: 8,
      borderRadius: 22,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(226,232,240,0.9)",
      boxShadow: "0 18px 38px rgba(15,23,42,0.14)",
      zIndex: 999,
    },
    mobileBottomButton: {
  border: "none",
  background: "transparent",
  borderRadius: 14,
  padding: "10px 6px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
  color: "#334155",
  WebkitTextFillColor: "#334155",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1.2,
  minHeight: 52,
},
    mobileFab: {
      position: "fixed",
      right: 16,
      bottom: 92,
      width: 58,
      height: 58,
      borderRadius: 999,
      border: "none",
      background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
      color: "#fff",
      fontSize: 30,
      lineHeight: 1,
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 18px 30px rgba(37,99,235,0.28)",
      zIndex: 998,
    },
    quickStatsStrip: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: 10,
      marginBottom: 14,
    },
    quickStatCard: {
      borderRadius: 16,
      padding: 12,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      border: "1px solid #e2e8f0",
    },
    quickStatValue: {
      fontSize: 20,
      fontWeight: 900,
      marginTop: 4,
    },
  };

  const statusColors = {
    prévu: { background: "#fff7ed", color: "#c2410c", border: "1px solid #fdba74" },
    confirmé: { background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7" },
    terminé: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #93c5fd" },
    annulé: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" },
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
      sameDay(new Date(`${evt.date}T12:00:00`), currentDate)
    );

    return (
      <div style={styles.timelineShell}>
        <div style={styles.dayTimelineWrap}>
          <div style={styles.dayTimelineGrid}>
            <div style={styles.timeColumn}>{renderHourLabels()}</div>
            <div style={styles.dayCanvas}>
              {dayEvents.length === 0 ? (
                <div style={styles.timelineEmpty}>Aucun élément sur cette journée.</div>
              ) : (
                dayEvents.map((evt) => {
                  const start = getEffectiveStart(evt);
                  const end = getEffectiveEnd(evt);

                  return (
                    <div key={evt.id} style={getTimelineEventStyle(evt)}>
                      <div style={styles.timelineEventTitle}>{evt.title}</div>
                      <div style={styles.timelineEventMeta}>{formatRangeHour(start, end)}</div>
                      <div style={styles.timelineEventMeta}>
                        {evt.domain} · {evt.typeLabel}
                        {evt.subTypeLabel ? ` · ${evt.subTypeLabel}` : ""}
                      </div>
                      {evt.place ? <div style={styles.timelineEventMeta}>{evt.place}</div> : null}
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
                sameDay(new Date(`${evt.date}T12:00:00`), day)
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
                        <div style={styles.timelineEventMeta}>
                          {evt.typeLabel}
                          {evt.subTypeLabel ? ` · ${evt.subTypeLabel}` : ""}
                        </div>
                        {evt.withWho ? <div style={styles.timelineEventMeta}>{evt.withWho}</div> : null}
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
              sameDay(new Date(`${evt.date}T12:00:00`), day)
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
              >
                <div style={styles.monthCellHeader}>
                  <div style={styles.monthDayNumber}>{day.getDate()}</div>
                  {dayEvents.length > 0 ? (
                    <div style={styles.monthCountBadge}>{dayEvents.length} él.</div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {dayEvents.slice(0, 3).map((evt) => (
                    <div key={evt.id} style={styles.monthEventMini}>
                      {evt.startTime} · {evt.title}
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
      const d = new Date(`${evt.date}T12:00:00`);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    }).length;
  }

  function getMonthMiniDays(year, monthIndex) {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => {
      const day = new Date(year, monthIndex, i + 1);
      const count = timelineEvents.filter((evt) =>
        sameDay(new Date(`${evt.date}T12:00:00`), day)
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
            >
              <div style={styles.yearMonthTitle}>
                <strong>{monthDate.toLocaleDateString("fr-FR", { month: "long" })}</strong>
                <span style={styles.monthCountBadge}>{count} él.</span>
              </div>

              <div style={styles.yearMiniGrid}>
                {miniDays.map(({ day, count }) => (
                  <div
                    key={day.toISOString()}
                    style={{
                      ...styles.yearMiniCell,
                      background:
                        count === 0 ? "#f1f5f9" : count === 1 ? "#dbeafe" : count === 2 ? "#93c5fd" : "#2563eb",
                      border:
                        sameDay(day, new Date()) && day.getFullYear() === new Date().getFullYear()
                          ? "2px solid #7c3aed"
                          : "1px solid #e2e8f0",
                    }}
                    title={`${day.toLocaleDateString("fr-FR")} · ${count} élément(s)`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderMobileTimelineCards() {
    const grouped = timelineEvents.reduce((acc, evt) => {
      const key = evt.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(evt);
      return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort();

    if (sortedDates.length === 0) {
      return <div style={styles.timelineEmpty}>Aucun élément sur cette période.</div>;
    }

    return (
      <div style={{ display: "grid", gap: 12 }}>
        {sortedDates.map((dateKey) => (
          <div
            key={dateKey}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: 12,
              background: "#fff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <span style={styles.badge}>{dateKey}</span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {grouped[dateKey]
                .sort((a, b) => getDateTimeFromEvent(a) - getDateTimeFromEvent(b))
                .map((evt) => {
                  const start = getEffectiveStart(evt);
                  const end = getEffectiveEnd(evt);

                  return (
                    <div
                      key={evt.id}
                      style={{
                        borderRadius: 16,
                        padding: 12,
                        border: "1px solid #e2e8f0",
                        background: hasConflict(evt) ? "#fef2f2" : "#f8fafc",
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>{evt.title}</div>
                      <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
                        {formatRangeHour(start, end)}
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <span style={{ ...styles.inlineBadge, background: "#eef2ff", color: "#4338ca" }}>
                          {evt.domain}
                        </span>
                        <span style={{ ...styles.inlineBadge, background: "#f8fafc", color: "#334155" }}>
                          {evt.typeLabel}
                        </span>
                        {evt.subTypeLabel ? (
                          <span style={{ ...styles.inlineBadge, background: "#fff7ed", color: "#9a3412" }}>
                            {evt.subTypeLabel}
                          </span>
                        ) : null}
                      </div>

                      {evt.place ? (
                        <div style={{ fontSize: 13, color: "#475569" }}>📍 {evt.place}</div>
                      ) : null}
                      {evt.withWho ? (
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>👤 {evt.withWho}</div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    );
  }
    function renderTimeline() {
    if (isMobile && (viewMode === "jour" || viewMode === "semaine")) {
      return renderMobileTimelineCards();
    }

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

  function openContextMenu(e, evt) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      eventId: evt.id,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function getContextEvent() {
    return events.find((evt) => evt.id === contextMenu.eventId) || null;
  }

  function renderContextMenu() {
    if (!contextMenu.visible) return null;
    const evt = getContextEvent();
    if (!evt) return null;

    return (
      <div
        style={{
          ...styles.contextMenu,
          left: Math.min(contextMenu.x, window.innerWidth - 240),
          top: Math.min(contextMenu.y, window.innerHeight - 260),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={styles.contextMenuItem} onClick={() => editOccurrence(evt)}>
          Modifier cette occurrence
        </button>
        <button style={styles.contextMenuItem} onClick={() => duplicateEvent(evt)}>
          Dupliquer
        </button>
        {evt.seriesGroupId ? (
          <button style={styles.contextMenuItem} onClick={() => editSeries(evt)}>
            Modifier toute la série
          </button>
        ) : null}
        <button style={styles.contextMenuItem} onClick={() => deleteOccurrence(evt.id)}>
          Supprimer cette occurrence
        </button>
        {evt.seriesGroupId ? (
          <button
            style={{ ...styles.contextMenuItem, color: "#b91c1c" }}
            onClick={() => deleteSeries(evt.seriesGroupId)}
          >
            Supprimer toute la série
          </button>
        ) : null}
      </div>
    );
  }

    function renderMenu() {
    const items = [
      { key: "agenda", label: "Agenda", icon: "🗓️" },
      {
        key: "event",
        label:
          editingSeriesGroupId
            ? "Série"
            : editingEventId
              ? "Modifier"
              : "Nouveau",
        icon: "✏️",
      },
      { key: "models", label: "Modèles", icon: "🧩" },
      { key: "structure", label: "Chaînage", icon: "🪢" },
      { key: "stats", label: "Stats", icon: "📊" },
    ];

    if (isMobile) {
      return (
        <>
          <div style={styles.menuBar}>
            <button type="button" style={styles.buttonSecondary} onClick={exportData}>
              Export JSON
            </button>

            <button
              type="button"
              style={styles.buttonSecondary}
              onClick={() => fileInputRef.current?.click()}
            >
              Import JSON
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={importData}
            />
          </div>

          <div style={styles.mobileBottomBar}>
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                style={{
                  ...styles.mobileBottomButton,
                  background:
                    activeMenu === item.key
                      ? "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.12) 100%)"
                      : "transparent",
                  color: activeMenu === item.key ? "#1d4ed8" : "#334155",
                }}
                onClick={() => setActiveMenu(item.key)}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>{item.icon}</div>
                <div>{item.label}</div>
              </button>
            ))}
          </div>
        </>
      );
    }

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
    const domains = getDomains();
    const typeOptions = getTypes(eventForm.domain);
    const subTypeOptions = getSubTypes(eventForm.domain, eventForm.typeLabel);

    return (
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          {editingSeriesGroupId
            ? "Modifier toute la série"
            : editingEventId
              ? "Modifier cette occurrence"
              : "Créer un élément"}
        </h2>
        <p style={styles.sectionText}>
          Parcours optimisé : domaine, type, sous-type, modèle éventuel, puis planification.
        </p>

        <div style={styles.grid}>
          <div>
            <label style={styles.label}>Domaine</label>
            <select
              style={styles.input}
              name="domain"
              value={eventForm.domain}
              onChange={handleEventChange}
            >
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Type</label>
            <select
              style={styles.input}
              name="typeLabel"
              value={eventForm.typeLabel}
              onChange={handleEventChange}
            >
              {typeOptions.map((typeLabel) => (
                <option key={typeLabel} value={typeLabel}>
                  {typeLabel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Sous-type</label>
            <select
              style={styles.input}
              name="subTypeLabel"
              value={eventForm.subTypeLabel}
              onChange={handleEventChange}
            >
              <option value="">Aucun</option>
              {subTypeOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Modèle</label>
            <select
              style={styles.input}
              name="modelId"
              value={eventForm.modelId}
              onChange={(e) => applyModelToEvent(e.target.value)}
            >
              <option value="">Aucun modèle</option>
              {models
                .filter((m) => m.domain === eventForm.domain)
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
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
              placeholder="Ex. Réunion AVF / Conférence Nantes / Marche nordique"
            />
          </div>

          <div>
            <label style={styles.label}>Avec qui</label>
            <input
              style={styles.input}
              name="withWho"
              value={eventForm.withWho}
              onChange={handleEventChange}
              placeholder="personne, groupe, intervenant..."
            />
          </div>

          <div>
            <label style={styles.label}>Lieu</label>
            <input
              style={styles.input}
              name="place"
              value={eventForm.place}
              onChange={handleEventChange}
              placeholder="Nantes, Guérande..."
            />
          </div>

          <div>
            <label style={styles.label}>Canal</label>
            <input
              style={styles.input}
              name="channel"
              value={eventForm.channel}
              onChange={handleEventChange}
              placeholder="présentiel, visio, téléphone..."
            />
          </div>

          <div>
            <label style={styles.label}>Objectif</label>
            <input
              style={styles.input}
              name="objective"
              value={eventForm.objective}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Date *</label>
            <input
              style={styles.input}
              type="date"
              name="date"
              value={eventForm.date}
              onChange={handleEventChange}
            />
          </div>

          <div>
            <label style={styles.label}>Heure *</label>
            <input
              style={styles.input}
              type="time"
              name="startTime"
              value={eventForm.startTime}
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
              En modification d’occurrence, la récurrence est verrouillée.
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
          <button type="button" style={styles.buttonPrimary} onClick={saveEvent}>
            {editingSeriesGroupId ? "Enregistrer la série" : editingEventId ? "Enregistrer l’occurrence" : "Ajouter"}
          </button>

          <button type="button" style={styles.buttonSecondary} onClick={resetEventForm}>
            Réinitialiser
          </button>
        </div>
      </div>
    );
  }

  function renderModelsPanel() {
    const domains = getDomains();
    const typeOptions = getTypes(modelForm.domain);
    const subTypeOptions = getSubTypes(modelForm.domain, modelForm.typeLabel);

    return (
      <>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {editingModelId ? "Modifier un modèle" : "Créer un modèle"}
          </h2>
          <p style={styles.sectionText}>
            Les modèles accélèrent la saisie d’éléments récurrents ou standards.
          </p>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Libellé *</label>
              <input
                style={styles.input}
                name="label"
                value={modelForm.label}
                onChange={handleModelChange}
                placeholder="Ex. R2C · Activité · Marche nordique"
              />
            </div>

            <div>
              <label style={styles.label}>Domaine</label>
              <select
                style={styles.input}
                name="domain"
                value={modelForm.domain}
                onChange={handleModelChange}
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Type</label>
              <select
                style={styles.input}
                name="typeLabel"
                value={modelForm.typeLabel}
                onChange={handleModelChange}
              >
                {typeOptions.map((typeLabel) => (
                  <option key={typeLabel} value={typeLabel}>
                    {typeLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Sous-type</label>
              <select
                style={styles.input}
                name="subTypeLabel"
                value={modelForm.subTypeLabel}
                onChange={handleModelChange}
              >
                <option value="">Aucun</option>
                {subTypeOptions.map((sub) => (
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
                value={modelForm.defaultDuration}
                onChange={handleModelChange}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>Notes</label>
            <textarea
              style={styles.textarea}
              name="notes"
              value={modelForm.notes}
              onChange={handleModelChange}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <button type="button" style={styles.buttonPrimary} onClick={saveModel}>
              {editingModelId ? "Enregistrer le modèle" : "Ajouter le modèle"}
            </button>
            <button type="button" style={styles.buttonSecondary} onClick={resetModelForm}>
              Réinitialiser
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Catalogue des modèles</h2>

          {models.length === 0 ? (
            <p style={styles.subtle}>Aucun modèle enregistré.</p>
          ) : (
            <div style={styles.listCompact}>
              {models
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((model) => (
                  <div
                    key={model.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 14,
                      background: "#fff",
                    }}
                  >
                    <strong>{model.label}</strong>

                    <div style={{ marginTop: 8 }}>
                      <span style={{ ...styles.inlineBadge, background: "#eef2ff", color: "#4338ca" }}>
                        {model.domain}
                      </span>
                      <span style={{ ...styles.inlineBadge, background: "#f8fafc", color: "#334155" }}>
                        {model.typeLabel}
                      </span>
                      {model.subTypeLabel ? (
                        <span style={{ ...styles.inlineBadge, background: "#fff7ed", color: "#9a3412" }}>
                          {model.subTypeLabel}
                        </span>
                      ) : null}
                      <span style={{ ...styles.inlineBadge, background: "#f0fdf4", color: "#166534" }}>
                        {model.defaultDuration} min
                      </span>
                    </div>

                    {model.notes ? (
                      <div style={{ marginTop: 8, color: "#475569", fontSize: 14 }}>{model.notes}</div>
                    ) : null}

                    <div style={{ marginTop: 12 }}>
                      <button type="button" style={styles.buttonSecondary} onClick={() => editModel(model)}>
                        Modifier
                      </button>
                      <button type="button" style={styles.buttonDanger} onClick={() => deleteModel(model.id)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </>
    );
  }

  function addDomain() {
    const clean = String(newDomainName || "").trim();
    if (!clean) {
      alert("Le nom du domaine est obligatoire.");
      return;
    }
    if (structure[clean]) {
      alert("Ce domaine existe déjà.");
      return;
    }
    setStructure({
      ...structure,
      [clean]: {},
    });
    setNewDomainName("");
  }

  function addType() {
    const cleanDomain = String(newTypeDomain || "").trim();
    const cleanType = String(newTypeName || "").trim();
    if (!cleanDomain || !cleanType) {
      alert("Le domaine et le type sont obligatoires.");
      return;
    }
    const currentDomain = structure[cleanDomain] || {};
    if (currentDomain[cleanType]) {
      alert("Ce type existe déjà dans ce domaine.");
      return;
    }
    setStructure({
      ...structure,
      [cleanDomain]: {
        ...currentDomain,
        [cleanType]: [],
      },
    });
    setNewTypeName("");
  }

  function addSubType() {
    const cleanDomain = String(newSubDomain || "").trim();
    const cleanType = String(newSubTypeParent || "").trim();
    const cleanSub = String(newSubTypeName || "").trim();
    if (!cleanDomain || !cleanType || !cleanSub) {
      alert("Le domaine, le type et le sous-type sont obligatoires.");
      return;
    }
    const currentDomain = structure[cleanDomain] || {};
    const currentSubs = Array.isArray(currentDomain[cleanType]) ? currentDomain[cleanType] : [];
    if (currentSubs.includes(cleanSub)) {
      alert("Ce sous-type existe déjà.");
      return;
    }
    setStructure({
      ...structure,
      [cleanDomain]: {
        ...currentDomain,
        [cleanType]: [...currentSubs, cleanSub],
      },
    });
    setNewSubTypeName("");
  }

  function deleteDomain(domain) {
    const next = { ...structure };
    delete next[domain];
    setStructure(next);
  }

  function deleteType(domain, typeLabel) {
    const next = { ...structure };
    const domainObj = { ...(next[domain] || {}) };
    delete domainObj[typeLabel];
    next[domain] = domainObj;
    setStructure(next);
  }

  function deleteSubType(domain, typeLabel, subTypeLabel) {
    const next = { ...structure };
    const domainObj = { ...(next[domain] || {}) };
    const subs = Array.isArray(domainObj[typeLabel]) ? domainObj[typeLabel] : [];
    domainObj[typeLabel] = subs.filter((sub) => sub !== subTypeLabel);
    next[domain] = domainObj;
    setStructure(next);
  }

  function renderStructurePanel() {
    const domains = getDomains();
    const typeOptionsForSub = getTypes(newSubDomain);

    return (
      <>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Chaînage libre</h2>
          <p style={styles.sectionText}>
            Tu peux créer librement le référentiel : domaine → type → sous-type.
          </p>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>Nouveau domaine</label>
              <input
                style={styles.input}
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="Ex. Université permanente de Nantes"
              />
              <div style={{ marginTop: 10 }}>
                <button type="button" style={styles.buttonPrimary} onClick={addDomain}>
                  Ajouter domaine
                </button>
              </div>
            </div>

            <div>
              <label style={styles.label}>Domaine du nouveau type</label>
              <select
                style={styles.input}
                value={newTypeDomain}
                onChange={(e) => setNewTypeDomain(e.target.value)}
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>

              <label style={{ ...styles.label, marginTop: 12, display: "block" }}>Nouveau type</label>
              <input
                style={styles.input}
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ex. Sortie club"
              />

              <div style={{ marginTop: 10 }}>
                <button type="button" style={styles.buttonPrimary} onClick={addType}>
                  Ajouter type
                </button>
              </div>
            </div>

            <div>
              <label style={styles.label}>Domaine du sous-type</label>
              <select
                style={styles.input}
                value={newSubDomain}
                onChange={(e) => {
                  const nextDomain = e.target.value;
                  const nextTypes = getTypes(nextDomain);
                  setNewSubDomain(nextDomain);
                  setNewSubTypeParent(nextTypes[0] || "");
                }}
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>

              <label style={{ ...styles.label, marginTop: 12, display: "block" }}>Type parent</label>
              <select
                style={styles.input}
                value={newSubTypeParent}
                onChange={(e) => setNewSubTypeParent(e.target.value)}
              >
                {typeOptionsForSub.map((typeLabel) => (
                  <option key={typeLabel} value={typeLabel}>
                    {typeLabel}
                  </option>
                ))}
              </select>

              <label style={{ ...styles.label, marginTop: 12, display: "block" }}>Nouveau sous-type</label>
              <input
                style={styles.input}
                value={newSubTypeName}
                onChange={(e) => setNewSubTypeName(e.target.value)}
                placeholder="Ex. Guérande"
              />

              <div style={{ marginTop: 10 }}>
                <button type="button" style={styles.buttonPrimary} onClick={addSubType}>
                  Ajouter sous-type
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Référentiel actuel</h2>

          <div style={styles.listCompact}>
            {domains.map((domain) => (
              <div
                key={domain}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 18,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 18 }}>{domain}</strong>
                  </div>
                  <div>
                    <button type="button" style={styles.buttonDanger} onClick={() => deleteDomain(domain)}>
                      Supprimer domaine
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  {getTypes(domain).map((typeLabel) => (
                    <div
                      key={`${domain}-${typeLabel}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: 12,
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <strong>{typeLabel}</strong>
                        <button type="button" style={styles.buttonDanger} onClick={() => deleteType(domain, typeLabel)}>
                          Supprimer type
                        </button>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        {getSubTypes(domain, typeLabel).length === 0 ? (
                          <span style={styles.subtle}>Sans sous-type</span>
                        ) : (
                          getSubTypes(domain, typeLabel).map((sub) => (
                            <span
                              key={`${domain}-${typeLabel}-${sub}`}
                              style={{
                                ...styles.inlineBadge,
                                background: "#fff7ed",
                                color: "#9a3412",
                              }}
                            >
                              {sub}
                              <button
                                type="button"
                                onClick={() => deleteSubType(domain, typeLabel, sub)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontWeight: 900,
                                  color: "#9a3412",
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            Vue agenda ergonomique avec filtres, timeline, menu contextuel et actions rapides.
          </p>

          <div style={styles.quickStatsStrip}>
            <div style={styles.quickStatCard}>
              <div style={styles.subtle}>Éléments</div>
              <div style={styles.quickStatValue}>{filteredAgendaEvents.length}</div>
            </div>
            <div style={styles.quickStatCard}>
              <div style={styles.subtle}>Conflits</div>
              <div style={styles.quickStatValue}>{filteredAgendaEvents.filter((e) => hasConflict(e)).length}</div>
            </div>
            <div style={styles.quickStatCard}>
              <div style={styles.subtle}>Période</div>
              <div style={{ ...styles.quickStatValue, fontSize: 15 }}>{viewMode}</div>
            </div>
            <div style={styles.quickStatCard}>
              <div style={styles.subtle}>Aujourd’hui</div>
              <div style={{ ...styles.quickStatValue, fontSize: 15 }}>
                {new Date().toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>

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
                {mode === "jour" ? "Jour" : mode === "semaine" ? "Semaine" : mode === "mois" ? "Mois" : "Année"}
              </button>
            ))}
          </div>

          {renderPeriodPicker()}

          <p style={{ marginBottom: 0 }}>
            <strong>Période affichée :</strong> {getPeriodLabel()}
          </p>
        </div>

        {isMobile ? (
          <div style={styles.card}>
            <div style={styles.mobileSegment}>
              <button
                type="button"
                style={{
                  ...styles.mobileSegmentButton,
                  background: agendaMobileTab === "liste" ? "#0f172a" : "#fff",
                  color: agendaMobileTab === "liste" ? "#fff" : "#0f172a",
                  border: agendaMobileTab === "liste" ? "none" : "1px solid #cbd5e1",
                }}
                onClick={() => setAgendaMobileTab("liste")}
              >
                Liste
              </button>

              <button
                type="button"
                style={{
                  ...styles.mobileSegmentButton,
                  background: agendaMobileTab === "timeline" ? "#0f172a" : "#fff",
                  color: agendaMobileTab === "timeline" ? "#fff" : "#0f172a",
                  border: agendaMobileTab === "timeline" ? "none" : "1px solid #cbd5e1",
                }}
                onClick={() => setAgendaMobileTab("timeline")}
              >
                Timeline
              </button>

              <button
                type="button"
                style={{
                  ...styles.mobileSegmentButton,
                  background: agendaMobileTab === "filtres" ? "#0f172a" : "#fff",
                  color: agendaMobileTab === "filtres" ? "#fff" : "#0f172a",
                  border: agendaMobileTab === "filtres" ? "none" : "1px solid #cbd5e1",
                }}
                onClick={() => setAgendaMobileTab("filtres")}
              >
                Filtres
              </button>
            </div>

            {agendaMobileTab === "filtres" ? (
              <div>
                <h2 style={styles.sectionTitle}>Filtres</h2>

                <div style={styles.filterRow}>
                  <div>
                    <label style={styles.label}>Recherche</label>
                    <input
                      style={styles.input}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="titre, lieu, domaine, personne..."
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
                    <label style={styles.label}>Domaine</label>
                    <select
                      style={styles.input}
                      value={domainFilter}
                      onChange={(e) => {
                        const nextDomain = e.target.value;
                        setDomainFilter(nextDomain);
                        setTypeFilter("tous");
                        setSubTypeFilter("tous");
                      }}
                    >
                      <option value="tous">Tous</option>
                      {getDomains().map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Type</label>
                    <select
                      style={styles.input}
                      value={typeFilter}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setTypeFilter(nextType);
                        setSubTypeFilter("tous");
                      }}
                      disabled={domainFilter === "tous"}
                    >
                      <option value="tous">Tous</option>
                      {currentTypeOptionsForFilter.map((typeLabel) => (
                        <option key={typeLabel} value={typeLabel}>
                          {typeLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Sous-type</label>
                    <select
                      style={styles.input}
                      value={subTypeFilter}
                      onChange={(e) => setSubTypeFilter(e.target.value)}
                      disabled={domainFilter === "tous" || typeFilter === "tous"}
                    >
                      <option value="tous">Tous</option>
                      {currentSubTypeOptionsForFilter.map((subTypeLabel) => (
                        <option key={subTypeLabel} value={subTypeLabel}>
                          {subTypeLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "end" }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={showOnlyConflicts}
                        onChange={(e) => setShowOnlyConflicts(e.target.checked)}
                      />
                      Seulement conflits
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {agendaMobileTab === "timeline" ? (
              <div>
                <h2 style={styles.sectionTitle}>Timeline</h2>
                <p style={styles.sectionText}>Affichage mobile compact et lisible.</p>
                {renderTimeline()}
              </div>
            ) : null}

            {agendaMobileTab === "liste" ? (
              <div>
                <h2 style={styles.sectionTitle}>Liste des éléments</h2>

                {filteredAgendaEvents.length === 0 ? (
                  <p style={styles.subtle}>Aucun élément sur cette période.</p>
                ) : (
                  filteredAgendaEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={styles.eventCard}
                      onContextMenu={(e) => openContextMenu(e, evt)}
                    >
                      <div style={styles.eventHeader}>
                        <div>
                          <div style={styles.badge}>{evt.date}</div>
                          <h3 style={styles.eventTitle}>{evt.title}</h3>

                          <div style={{ marginBottom: 6 }}>
                            <span style={{ ...styles.inlineBadge, background: "#eef2ff", color: "#4338ca" }}>
                              {evt.domain}
                            </span>
                            <span style={{ ...styles.inlineBadge, background: "#f8fafc", color: "#334155" }}>
                              {evt.typeLabel}
                            </span>
                            {evt.subTypeLabel ? (
                              <span style={{ ...styles.inlineBadge, background: "#fff7ed", color: "#9a3412" }}>
                                {evt.subTypeLabel}
                              </span>
                            ) : null}
                            {evt.seriesGroupId ? (
                              <span style={{ ...styles.inlineBadge, background: "#faf5ff", color: "#7c3aed" }}>
                                Série
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                          <button type="button" style={styles.contextButton} onClick={(e) => openContextMenu(e, evt)}>
                            Actions ▾
                          </button>
                        </div>
                      </div>

                      {hasConflict(evt) && <p style={styles.conflict}>Conflit de planning détecté</p>}

                      <div style={styles.metaGrid}>
                        <div style={styles.metaBox}>
                          <strong>Heure</strong>
                          <div>{evt.startTime}</div>
                        </div>

                        <div style={styles.metaBox}>
                          <strong>Durée</strong>
                          <div>{evt.duration} min</div>
                        </div>

                        <div style={styles.metaBox}>
                          <strong>Mobilisé</strong>
                          <div>{formatMinutes(getMobilizedMinutes(evt))}</div>
                        </div>

                        <div style={styles.metaBox}>
                          <strong>Trajets</strong>
                          <div>avant {evt.travelBefore} / après {evt.travelAfter}</div>
                        </div>

                        {evt.withWho ? (
                          <div style={styles.metaBox}>
                            <strong>Avec qui</strong>
                            <div>{evt.withWho}</div>
                          </div>
                        ) : null}

                        {evt.place ? (
                          <div style={styles.metaBox}>
                            <strong>Lieu</strong>
                            <div>{evt.place}</div>
                          </div>
                        ) : null}
                      </div>

                      {evt.notes ? (
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
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Filtres</h2>

              <div style={styles.filterRow}>
                <div>
                  <label style={styles.label}>Recherche</label>
                  <input
                    style={styles.input}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="titre, lieu, domaine, personne..."
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
                  <label style={styles.label}>Domaine</label>
                  <select
                    style={styles.input}
                    value={domainFilter}
                    onChange={(e) => {
                      const nextDomain = e.target.value;
                      setDomainFilter(nextDomain);
                      setTypeFilter("tous");
                      setSubTypeFilter("tous");
                    }}
                  >
                    <option value="tous">Tous</option>
                    {getDomains().map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Type</label>
                  <select
                    style={styles.input}
                    value={typeFilter}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setTypeFilter(nextType);
                      setSubTypeFilter("tous");
                    }}
                    disabled={domainFilter === "tous"}
                  >
                    <option value="tous">Tous</option>
                    {currentTypeOptionsForFilter.map((typeLabel) => (
                      <option key={typeLabel} value={typeLabel}>
                        {typeLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Sous-type</label>
                  <select
                    style={styles.input}
                    value={subTypeFilter}
                    onChange={(e) => setSubTypeFilter(e.target.value)}
                    disabled={domainFilter === "tous" || typeFilter === "tous"}
                  >
                    <option value="tous">Tous</option>
                    {currentSubTypeOptionsForFilter.map((subTypeLabel) => (
                      <option key={subTypeLabel} value={subTypeLabel}>
                        {subTypeLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "end" }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={showOnlyConflicts}
                      onChange={(e) => setShowOnlyConflicts(e.target.checked)}
                    />
                    Seulement conflits
                  </label>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Timeline</h2>
              <p style={styles.sectionText}>Visualisation directe des créneaux et chevauchements.</p>

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
              <h2 style={styles.sectionTitle}>Liste des éléments</h2>

              {filteredAgendaEvents.length === 0 ? (
                <p style={styles.subtle}>Aucun élément sur cette période.</p>
              ) : (
                filteredAgendaEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={styles.eventCard}
                    onContextMenu={(e) => openContextMenu(e, evt)}
                  >
                    <div style={styles.eventHeader}>
                      <div>
                        <div style={styles.badge}>{evt.date}</div>
                        <h3 style={styles.eventTitle}>{evt.title}</h3>

                        <div style={{ marginBottom: 6 }}>
                          <span style={{ ...styles.inlineBadge, background: "#eef2ff", color: "#4338ca" }}>
                            {evt.domain}
                          </span>
                          <span style={{ ...styles.inlineBadge, background: "#f8fafc", color: "#334155" }}>
                            {evt.typeLabel}
                          </span>
                          {evt.subTypeLabel ? (
                            <span style={{ ...styles.inlineBadge, background: "#fff7ed", color: "#9a3412" }}>
                              {evt.subTypeLabel}
                            </span>
                          ) : null}
                          {evt.seriesGroupId ? (
                            <span style={{ ...styles.inlineBadge, background: "#faf5ff", color: "#7c3aed" }}>
                              Série
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                        <button type="button" style={styles.contextButton} onClick={(e) => openContextMenu(e, evt)}>
                          Actions ▾
                        </button>
                      </div>
                    </div>

                    {hasConflict(evt) && <p style={styles.conflict}>Conflit de planning détecté</p>}

                    <div style={styles.metaGrid}>
                      <div style={styles.metaBox}>
                        <strong>Heure</strong>
                        <div>{evt.startTime}</div>
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
                        <strong>Trajets</strong>
                        <div>avant {evt.travelBefore} / après {evt.travelAfter} min</div>
                      </div>

                      {evt.withWho ? (
                        <div style={styles.metaBox}>
                          <strong>Avec qui</strong>
                          <div>{evt.withWho}</div>
                        </div>
                      ) : null}

                      {evt.place ? (
                        <div style={styles.metaBox}>
                          <strong>Lieu</strong>
                          <div>{evt.place}</div>
                        </div>
                      ) : null}

                      {evt.channel ? (
                        <div style={styles.metaBox}>
                          <strong>Canal</strong>
                          <div>{evt.channel}</div>
                        </div>
                      ) : null}

                      {evt.objective ? (
                        <div style={styles.metaBox}>
                          <strong>Objectif</strong>
                          <div>{evt.objective}</div>
                        </div>
                      ) : null}
                    </div>

                    {evt.notes ? (
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
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </>
    );
  }

  function renderStatsPanel() {
    const range = getStatsRange();

    return (
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Statistiques</h2>
        <p style={styles.sectionText}>
          Statistiques sur la période affichée, sur semaine, mois, année, ou sur dates personnalisées.
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
            <div style={{ ...styles.input, display: "flex", alignItems: "center" }}>{range.label}</div>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.badge}>Éléments</div>
            <div style={styles.statValue}>{stats.count}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Temps activité</div>
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
            <div style={styles.badge}>Domaine dominant</div>
            <div style={{ ...styles.statValue, fontSize: 18 }}>{stats.topDomain}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Type dominant</div>
            <div style={{ ...styles.statValue, fontSize: 18 }}>{stats.topType}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Sous-type dominant</div>
            <div style={{ ...styles.statValue, fontSize: 18 }}>{stats.topSubType}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.badge}>Annulés</div>
            <div style={styles.statValue}>{stats.cancelled}</div>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.grid}>
          <div>
            <h3 style={{ marginTop: 0 }}>Répartition par domaine</h3>
            <div style={styles.listCompact}>
              {Object.keys(stats.byDomain).length === 0 ? (
                <p style={styles.subtle}>Aucune donnée.</p>
              ) : (
                Object.entries(stats.byDomain)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, value]) => (
                    <div
                      key={key}
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
                      <span>{key}</span>
                      <strong>{value}</strong>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>Répartition par type</h3>
            <div style={styles.listCompact}>
              {Object.keys(stats.byType).length === 0 ? (
                <p style={styles.subtle}>Aucune donnée.</p>
              ) : (
                Object.entries(stats.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, value]) => (
                    <div
                      key={key}
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
                      <span>{key}</span>
                      <strong>{value}</strong>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>Répartition par sous-type</h3>
            <div style={styles.listCompact}>
              {Object.keys(stats.bySubType).length === 0 ? (
                <p style={styles.subtle}>Aucune donnée.</p>
              ) : (
                Object.entries(stats.bySubType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, value]) => (
                    <div
                      key={key}
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
                      <span>{key}</span>
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
          <h1 style={styles.heroTitle}>Agenda v5 ergonomique</h1>
          <p style={styles.heroText}>
            Chaînage libre domaine → type → sous-type, modèles réutilisables, modification
            d’occurrence ou de série complète, menu contextuel, timeline et statistiques avancées.
          </p>
        {isMobile ? (
          <button
            type="button"
            style={styles.mobileFab}
            onClick={() => {
              resetEventForm();
              setActiveMenu("event");
            }}
            aria-label="Ajouter un élément"
            title="Ajouter un élément"
          >
            +
          </button>
        ) : null}
        </div>

        {renderMenu()}

        {activeMenu === "agenda" && renderAgendaPanel()}
        {activeMenu === "event" && renderEventForm()}
        {activeMenu === "models" && renderModelsPanel()}
        {activeMenu === "structure" && renderStructurePanel()}
        {activeMenu === "stats" && renderStatsPanel()}

        {renderContextMenu()}
      </div>
    </div>
  );
}

export default App;