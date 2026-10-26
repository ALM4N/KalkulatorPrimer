(() => {
  "use strict";
  const SIPKA_CM = 600;
  const $ = id => document.getElementById(id);
  let stavke = [];
  let sledeciId = 1;
  let poslednjiPlan = null;

  const forma = $("unosForma");
  const duzinaInput = $("duzina");
  const kolicinaInput = $("kolicina");
  const poruka = $("poruka");
  const format = n => Number(n.toFixed(2)).toLocaleString("sr-RS", {minimumFractionDigits: 0, maximumFractionDigits: 2});
  const cm = n => `${format(n)} cm`;
  const tipIzabran = () => document.querySelector('input[name="tipProfila"]:checked').value;
  const ojacanjeIzabrano = tip => document.querySelector(`input[name="ojacanje${tip === "krilo" ? "Krilo" : "Stok"}"]:checked`).value;
  const nazivTipa = tip => tip === "krilo" ? "Krilo prozora" : "Štok prozora";
  const nazivGrupe = g => `${nazivTipa(g.tip)} · ojačanje ${g.ojacanje} mm`;

  function porukaPrikazi(tekst, uspeh = false) {
    poruka.textContent = tekst;
    poruka.className = `message${uspeh ? " success" : ""}`;
  }
  function osveziPrikazOjacanja() {
    const tip = tipIzabran();
    $("velicinaKrilo").hidden = tip !== "krilo";
    $("velicinaStok").hidden = tip !== "stok";
  }
  document.querySelectorAll('input[name="tipProfila"]').forEach(r => r.addEventListener("change", osveziPrikazOjacanja));
  osveziPrikazOjacanja();

  function osveziListu() {
    const telo = $("listaKomada");
    telo.replaceChildren();
    $("praznaLista").hidden = stavke.length > 0;
    $("tabelaKomada").hidden = stavke.length === 0;
    stavke.forEach(stavka => {
      const tr = document.createElement("tr");
      const tdTip = document.createElement("td");
      tdTip.textContent = `${nazivTipa(stavka.tip)} · ${stavka.ojacanje} mm`;
      const tdD = document.createElement("td");
      const inputD = document.createElement("input");
      inputD.type = "number"; inputD.min = "0.1"; inputD.max = String(SIPKA_CM); inputD.step = "any";
      inputD.value = stavka.duzina; inputD.setAttribute("aria-label", "Dužina u centimetrima");
      inputD.addEventListener("change", () => {
        const value = Number(inputD.value);
        if (!Number.isFinite(value) || value <= 0 || value > SIPKA_CM) {
          porukaPrikazi("Dužina mora biti veća od 0 i najviše 600 cm."); inputD.value = stavka.duzina; return;
        }
        stavka.duzina = value; invalidatePlan(); porukaPrikazi("Dužina je izmenjena. Ponovo oslikaj plan.", true); osveziListu();
      });
      tdD.append(inputD);
      const tdK = document.createElement("td");
      const inputK = document.createElement("input");
      inputK.type = "number"; inputK.min = "1"; inputK.max = "100000"; inputK.step = "1";
      inputK.value = stavka.kolicina; inputK.setAttribute("aria-label", "Količina komada");
      inputK.addEventListener("change", () => {
        const value = Number(inputK.value);
        if (!Number.isSafeInteger(value) || value < 1 || value > 100000) {
          porukaPrikazi("Količina mora biti ceo broj između 1 i 100000."); inputK.value = stavka.kolicina; return;
        }
        const otherCount = stavke.filter(s => s.id !== stavka.id && s.tip === stavka.tip && s.ojacanje === stavka.ojacanje && Math.abs(s.duzina - stavka.duzina) < 1e-9).reduce((sum, s) => sum + s.kolicina, 0);
        if (otherCount + value > 100000) { porukaPrikazi("Ukupna količina za ovu dimenziju ne može biti veća od 100000."); inputK.value = stavka.kolicina; return; }
        stavka.kolicina = value; invalidatePlan(); porukaPrikazi("Količina je izmenjena. Ponovo oslikaj plan.", true); osveziListu();
      });
      tdK.append(inputK);
      const tdUk = document.createElement("td"); tdUk.textContent = cm(stavka.duzina * stavka.kolicina);
      const tdA = document.createElement("td"); const actions = document.createElement("div"); actions.className = "actions";
      const btnBrisi = document.createElement("button"); btnBrisi.className = "small-btn delete"; btnBrisi.type = "button"; btnBrisi.textContent = "Obriši";
      btnBrisi.setAttribute("aria-label", `Obriši stavku ${nazivTipa(stavka.tip)}, ojačanje ${stavka.ojacanje} mm, ${cm(stavka.duzina)}`);
      btnBrisi.addEventListener("click", () => { stavke = stavke.filter(s => s.id !== stavka.id); invalidatePlan(); osveziListu(); porukaPrikazi("Stavka je obrisana.", true); });
      actions.append(btnBrisi); tdA.append(actions); tr.append(tdTip, tdD, tdK, tdUk, tdA); telo.append(tr);
    });
  }
  function invalidatePlan() { poslednjiPlan = null; }

  forma.addEventListener("submit", e => {
    e.preventDefault();
    const duzina = Number(duzinaInput.value);
    const kolicina = Number(kolicinaInput.value);
    if (!Number.isFinite(duzina) || duzina <= 0) { porukaPrikazi("Unesi dužinu veću od 0 cm."); duzinaInput.focus(); return; }
    if (duzina > SIPKA_CM) { porukaPrikazi("Komad ne može biti duži od standardne šipke od 600 cm."); duzinaInput.focus(); return; }
    if (!Number.isSafeInteger(kolicina) || kolicina < 1 || kolicina > 100000) { porukaPrikazi("Količina mora biti ceo broj od 1 do 100000."); kolicinaInput.focus(); return; }
    const tip = tipIzabran();
    const ojacanje = ojacanjeIzabrano(tip);
    const existing = stavke.find(s => s.tip === tip && s.ojacanje === ojacanje && Math.abs(s.duzina - duzina) < 1e-9);
    if (existing) {
      if (existing.kolicina + kolicina > 100000) { porukaPrikazi("Ukupna količina za ovu dimenziju ne može biti veća od 100000."); return; }
      existing.kolicina += kolicina;
    } else stavke.push({ id: sledeciId++, duzina, kolicina, tip, ojacanje });
    invalidatePlan(); osveziListu();
    porukaPrikazi(`Dodato: ${kolicina} × ${cm(duzina)} · ${nazivTipa(tip)} · ojačanje ${ojacanje} mm.`, true);
    duzinaInput.value = ""; kolicinaInput.value = "1"; duzinaInput.focus();
  });

  $("obrisiSve").addEventListener("click", () => {
    if (!stavke.length) return;
    if (!confirm("Obrisati sve unete dimenzije?")) return;
    stavke = []; invalidatePlan(); osveziListu(); $("rezultati").hidden = true; porukaPrikazi("Lista je ispražnjena.", true);
  });

  // Optimizes each distinct profile/reinforcement combination separately so
  // stock and sash reinforcement pieces are never mixed on the same bar.
  function izracunajPlanGrupe(stavkeGrupe, tip, ojacanje) {
    const komadi = []; let idKomada = 1;
    for (const s of stavkeGrupe) for (let i = 0; i < s.kolicina; i++) komadi.push({ id: idKomada++, duzina: s.duzina });
    komadi.sort((a, b) => b.duzina - a.duzina);
    const sipke = [];
    for (const komad of komadi) {
      let najbolja = -1, najmanjiOstatak = Infinity;
      for (let i = 0; i < sipke.length; i++) {
        const preostalo = SIPKA_CM - sipke[i].zauzeto;
        if (komad.duzina <= preostalo + 1e-9 && preostalo - komad.duzina < najmanjiOstatak) { najbolja = i; najmanjiOstatak = preostalo - komad.duzina; }
      }
      if (najbolja === -1) sipke.push({ komadi: [komad], zauzeto: komad.duzina });
      else { sipke[najbolja].komadi.push(komad); sipke[najbolja].zauzeto += komad.duzina; }
    }
    const ukupnoKomada = komadi.reduce((sum, k) => sum + k.duzina, 0);
    return { tip, ojacanje, sipke, ukupnoKomada, ostatakUkupno: sipke.reduce((sum, s) => sum + SIPKA_CM - s.zauzeto, 0), komadaUkupno: komadi.length,
      ostaci: sipke.map((s, i) => ({ sipka: i + 1, duzina: SIPKA_CM - s.zauzeto, tip, ojacanje })) };
  }
  function izracunajPlan() {
    const keys = [...new Map(stavke.map(s => [`${s.tip}|${s.ojacanje}`, {tip:s.tip, ojacanje:s.ojacanje}])).values()];
    const grupe = keys.map(g => izracunajPlanGrupe(stavke.filter(s => s.tip === g.tip && s.ojacanje === g.ojacanje), g.tip, g.ojacanje));
    const sipkeSve = []; let ukupnoKomada = 0, ukupnaDuzina = 0, ostatakUkupno = 0, komadaUkupno = 0;
    grupe.forEach(g => { g.sipke.forEach((s, i) => sipkeSve.push({...s, tip:g.tip, ojacanje:g.ojacanje, lokalniBroj:i+1})); ukupnoKomada += g.ukupnoKomada; ostatakUkupno += g.ostatakUkupno; komadaUkupno += g.komadaUkupno; });
    ukupnaDuzina = ukupnoKomada;
    const totalBars = sipkeSve.length;
    return {grupe, sipke:sipkeSve, ukupnoKomada, ukupnaDuzina, ostatakUkupno, komadaUkupno, iskoriscenost: totalBars ? ukupnoKomada/(totalBars*SIPKA_CM)*100 : 0,
      ostaci: grupe.flatMap(g => g.ostaci.map(o => ({...o, grupaNaziv:nazivGrupe(g)}))) };
  }

  const boje = ["#f7b267", "#82c7b2", "#8db7e8", "#d4a5e8", "#f08c87", "#c4d66b", "#f1cf70", "#9bcbc9"];
  function oslikajPlan(plan) {
    const sema = $("sema"); sema.replaceChildren();
    let globalIndex = 0;
    plan.grupe.forEach(grupa => {
      const heading = document.createElement("h3"); heading.className = "plan-group-heading"; heading.textContent = nazivGrupe(grupa); sema.append(heading);
      grupa.sipke.forEach((sipka, i) => {
        const card = document.createElement("article"); card.className = "bar-card";
        const title = document.createElement("div"); title.className = "bar-title";
        const name = document.createElement("strong"); name.textContent = `Šipka ${i + 1}`;
        const detail = document.createElement("span"); detail.textContent = `${sipka.komadi.length} kom. · iskorišćeno ${cm(sipka.zauzeto)} · ostatak ${cm(SIPKA_CM - sipka.zauzeto)}`;
        title.append(name, detail);
        const bar = document.createElement("div"); bar.className = "bar"; bar.setAttribute("role", "img");
        bar.setAttribute("aria-label", `${nazivGrupe(grupa)}, šipka ${i + 1}, iskorišćeno ${cm(sipka.zauzeto)}, ostatak ${cm(SIPKA_CM - sipka.zauzeto)}`);
        sipka.komadi.forEach(komad => {
          const piece = document.createElement("div"); piece.className = "piece"; piece.style.flex = `0 0 ${(komad.duzina / SIPKA_CM * 100)}%`; piece.style.background = boje[globalIndex++ % boje.length];
          const label = document.createElement("span"); label.className = "piece-label"; label.textContent = cm(komad.duzina);
          const sub = document.createElement("small"); sub.textContent = `komad ${komad.id}`; piece.title = cm(komad.duzina); piece.append(label, sub); bar.append(piece);
        });
        const ost = SIPKA_CM - sipka.zauzeto;
        if (ost > 1e-8) { const scrap = document.createElement("div"); scrap.className = "piece"; scrap.style.flex = `0 0 ${(ost / SIPKA_CM * 100)}%`; scrap.style.background = "#e7ecef"; scrap.style.color = "#5b6871";
          const label = document.createElement("span"); label.className = "piece-label"; label.textContent = cm(ost); const sub = document.createElement("small"); sub.textContent = "ostatak"; scrap.title = `Iskoristiv ostatak: ${cm(ost)}`; scrap.append(label, sub); bar.append(scrap); }
        const legend = document.createElement("div"); legend.className = "bar-legend"; const start = document.createElement("span"); start.textContent = "0 cm"; const end = document.createElement("span"); end.textContent = "600 cm"; legend.append(start, end); card.append(title, bar, legend); sema.append(card);
      });
    });
    const ostaci = $("ostaci"); ostaci.replaceChildren();
    const korisni = plan.ostaci.filter(o => o.duzina > 0.000001);
    if (!korisni.length) { const empty = document.createElement("span"); empty.className = "scrap none"; empty.textContent = "Nema ostataka — šipke su iskorišćene u potpunosti."; ostaci.append(empty); }
    else korisni.forEach(o => { const item = document.createElement("span"); item.className = "scrap"; item.textContent = `${o.grupaNaziv} · šipka ${o.sipka}: ${cm(o.duzina)}`; ostaci.append(item); });
  }

  $("oslikaj").addEventListener("click", () => {
    if (!stavke.length) { porukaPrikazi("Prvo dodaj bar jednu dimenziju."); return; }
    try {
      poslednjiPlan = izracunajPlan();
      $("brojSipki").textContent = poslednjiPlan.sipke.length;
      $("ukupnaDuzina").textContent = cm(poslednjiPlan.ukupnaDuzina);
      $("ukupniOstatak").textContent = cm(poslednjiPlan.ostatakUkupno);
      $("iskoriscenost").textContent = `${format(poslednjiPlan.iskoriscenost)}%`;
      oslikajPlan(poslednjiPlan); $("rezultati").hidden = false;
      porukaPrikazi(`Plan napravljen: ${poslednjiPlan.komadaUkupno} komada raspoređeno na ${poslednjiPlan.sipke.length} šipki. Različiti tipovi ojačanja su odvojeni.`, true);
    } catch (err) { porukaPrikazi(err.message || "Došlo je do greške pri proračunu."); }
  });
  $("stampaj").addEventListener("click", () => window.print());
  $("izvezi").addEventListener("click", () => {
    if (!poslednjiPlan) { porukaPrikazi("Prvo oslikaj plan, pa onda izvezi podatke."); return; }
    const data = { datum:new Date().toISOString(), standardnaSipkaCm:SIPKA_CM, sirinaRezaMm:0, jedinicaUnosa:"cm",
      stavke:stavke.map(({duzina,kolicina,tip,ojacanje}) => ({duzinaCm:duzina,kolicina,tipProfila:nazivTipa(tip),ojacanjeMm:Number(ojacanje)})),
      ukupnoSipki:poslednjiPlan.sipke.length, ukupnaDuzinaKomadaCm:poslednjiPlan.ukupnaDuzina, ukupniOstatakCm:poslednjiPlan.ostatakUkupno,
      iskoriscenostProcenat:Number(poslednjiPlan.iskoriscenost.toFixed(2)),
      plan:poslednjiPlan.grupe.map(g => ({tipProfila:nazivTipa(g.tip),ojacanjeMm:Number(g.ojacanje),sipke:g.sipke.map((s,i)=>({sipka:i+1,komadiCm:s.komadi.map(k=>k.duzina),iskoriscenoCm:s.zauzeto,ostatakCm:SIPKA_CM-s.zauzeto}))})) };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json;charset=utf-8"}); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="plan-secenja.json"; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  osveziListu();
})();
