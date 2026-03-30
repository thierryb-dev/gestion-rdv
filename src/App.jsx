import { useState, useEffect } from "react";

function App() {
  const [rdvs, setRdvs] = useState(() => {
  const saved = localStorage.getItem("rdvs");
  return saved ? JSON.parse(saved) : [];
});
useEffect(() => {
  localStorage.setItem("rdvs", JSON.stringify(rdvs));
}, [rdvs]);
  const [form, setForm] = useState({
    what: "",
    who: "",
    where: "",
    whenDate: "",
    whenStart: "",
    duration: 60,
    travelBefore: 0,
    travelAfter: 0,
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function addRdv() {
    if (!form.what || !form.whenDate || !form.whenStart) {
      alert("Champs obligatoires manquants");
      return;
    }

    setRdvs([...rdvs, { ...form, id: Date.now() }]);

    setForm({
      what: "",
      who: "",
      where: "",
      whenDate: "",
      whenStart: "",
      duration: 60,
      travelBefore: 0,
      travelAfter: 0,
    });
  }

  function deleteRdv(id) {
    setRdvs(rdvs.filter((r) => r.id !== id));
  }

  function generateTitle(r) {
    return `${r.what} ${r.who ? "avec " + r.who : ""} ${r.where ? "à " + r.where : ""}`;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Gestion des rendez-vous</h1>

      <h2>Créer un rendez-vous</h2>

      <input name="what" placeholder="Quoi" value={form.what} onChange={handleChange} /><br/>
      <input name="who" placeholder="Qui" value={form.who} onChange={handleChange} /><br/>
      <input name="where" placeholder="Où" value={form.where} onChange={handleChange} /><br/>
      <input type="date" name="whenDate" value={form.whenDate} onChange={handleChange} /><br/>
      <input type="time" name="whenStart" value={form.whenStart} onChange={handleChange} /><br/>
      <input type="number" name="duration" placeholder="Durée" value={form.duration} onChange={handleChange} /><br/>
      <input type="number" name="travelBefore" placeholder="Temps avant" value={form.travelBefore} onChange={handleChange} /><br/>
      <input type="number" name="travelAfter" placeholder="Temps après" value={form.travelAfter} onChange={handleChange} /><br/>

      <button onClick={addRdv}>Ajouter</button>

      <h2>Liste des rendez-vous</h2>

      {rdvs.map((r) => (
        <div key={r.id} style={{ border: "1px solid black", margin: 10, padding: 10 }}>
          <strong>{generateTitle(r)}</strong>
          <p>Date: {r.whenDate}</p>
          <p>Heure: {r.whenStart}</p>
          <p>Durée: {r.duration} min</p>
          <p>Transport: {r.travelBefore} / {r.travelAfter}</p>
          <button onClick={() => deleteRdv(r.id)}>Supprimer</button>
        </div>
      ))}
    </div>
  );
}

export default App;