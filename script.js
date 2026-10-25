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
  const izabraniTip = () => document.querySelector('input[name="tipProfila"]:checked').value;
  const nazivTipa = tip => tip === "krilo" ? "Krilo prozora" : "Štok prozora";

  const format = n => Number(n.toFixed(2)).toLocaleString("sr-RS", {
    minimumFractionDigits: 0, maximumFractionDigits: 2
  });
  const cm = n => `${format(n)} cm`;
  function porukaPrikazi(tekst, uspeh = false) {
    poruka.textContent = tekst;
    poruka.className = `message${uspeh ? " success" : ""}`;
  }

  document.querySelectorAll('input[name="tipProfila"]').forEach(input => {
    input.addEventListener("change", () => {
      porukaPrikazi(`Izabran je profil: ${nazivTipa(izabraniTip())}.`, true);
    });
  });

  function osveziListu() {
    const telo = $("listaKomada");
    telo.replaceChildren();
    $("praznaLista").hidden = stavke.length > 0;
    $("tabelaKomada").hidden = stavke.length === 0;
    stavke.forEach(stavka => {
      const tr = document.createElement("tr");
      const tdTip = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `type-badge${stavka.tip === "stok" ? " stok" : ""}`;
      badge.textContent = nazivTipa(stavka.tip);
      tdTip.append(badge);

      const tdD = document.createElement("td");
      const inputD = document.createElement("input");
      inputD.type = "number"; inputD.min = "0.1"; inputD.step = "any";
      inputD.value = stavka.duzina; inputD.setAttribute("aria-label", "Dužina u centimetrima");
      inputD.addEventListener("change", () => {
        const value = Number(inputD.value);
        if (!Number.isFinite(value) || value <= 0 || value > SIPKA_CM) {
          porukaPrikazi("Dužina mora biti veća od 0 i najviše 600 cm.");
          inputD.value = stavka.duzina; return;
        }
        stavka.duzina = value; spojiIsteStavke(); poslednjiPlan = null;
        porukaPrikazi("Dužina je izmenjena. Ponovo oslikaj plan.", true); osveziListu();
      });
      tdD.append(inputD);

      const tdK = document.createElement("td");
      const inputK = document.createElement("input");
      inputK.type = "number"; inputK.min = "1"; inputK.step = "1";
      inputK.value = stavka.kolicina; inputK.setAttribute("aria-label", "Količina komada");
      inputK.addEventListener("change", () => {
        const value = Number(inputK.value);
        if (!Number.isSafeInteger(value) || value < 1 || value > 100000) {
          porukaPrikazi("Količina mora biti ceo broj između 1 i 100000.");
          inputK.value = stavka.kolicina; return;
        }
        stavka.kolicina = value; spojiIsteStavke(); poslednjiPlan = null;
        porukaPrikazi("Količina je izmenjena. Ponovo oslikaj plan.", true); osveziListu();
      });
      tdK.append(inputK);
      const tdUk = document.createElement("td");
      tdUk.textContent = cm(stavka.duzina * stavka.kolicina);
      const tdA = document.createElement("td");
      const actions = document.createElement("div"); actions.className = "actions";
      const btnBrisi = document.createElement("button");
      btnBrisi.className = "small-btn delete"; btnBrisi.type = "button"; btnBrisi.textContent = "Obriši";
      btnBrisi.setAttribute("aria-label", `Obriši stavku ${nazivTipa(stavka.tip)}, ${cm(stavka.duzina)}`);
      btnBrisi.addEventListener("click", () => {
        stavke = stavke.filter(s => s.id !== stavka.id);
        poslednjiPlan = null; osveziListu(); porukaPrikazi("Stavka je obrisana.", true);
      });
      actions.append(btnBrisi); tdA.append(actions);
      tr.append(tdTip, tdD, tdK, tdUk, tdA); telo.append(tr);
    });
  }

  function spojiIsteStavke() {
    const spojene = [];
    for (const s of stavke) {
      const postojeca = spojene.find(x => x.tip === s.tip && Math.abs(x.duzina - s.duzina) < 1e-9);
      if (postojeca) postojeca.kolicina += s.kolicina;
      else spojene.push({...s});
    }
    stavke = spojene;
  }

  forma.addEventListener("submit", e => {
    e.preventDefault();
    const duzina = Number(duzinaInput.value);
    const kolicina = Number(kolicinaInput.value);
    const tip = izabraniTip();
    if (!Number.isFinite(duzina) || duzina <= 0) {
      porukaPrikazi("Unesi dužinu veću od 0 cm."); duzinaInput.focus(); return;
    }
    if (duzina > SIPKA_CM) {
      porukaPrikazi("Komad ne može biti duži od standardne šipke od 600 cm."); duzinaInput.focus(); return;
    }
    if (!Number.isSafeInteger(kolicina) || kolicina < 1 || kolicina > 100000) {
      porukaPrikazi("Količina mora biti ceo broj od 1 do 100000."); kolicinaInput.focus(); return;
    }
    const existing = stavke.find(s => s.tip === tip && Math.abs(s.duzina - duzina) < 1e-9);
    if (existing) {
      if (existing.kolicina + kolicina > 100000) {
        porukaPrikazi("Ukupna količina za ovaj tip i dimenziju ne može biti veća od 100000."); return;
      }
      existing.kolicina += kolicina;
    } else stavke.push({ id: sledeciId++, duzina, kolicina, tip });
    poslednjiPlan = null; osveziListu();
    porukaPrikazi(`Dodato: ${nazivTipa(tip)} · ${kolicina} × ${cm(duzina)}.`, true);
    duzinaInput.value = ""; kolicinaInput.value = "1"; duzinaInput.focus();
  });

  $("obrisiSve").addEventListener("click", () => {
    if (!stavke.length) return;
    if (!confirm("Obrisati sve unete dimenzije?")) return;
    stavke = []; poslednjiPlan = null; osveziListu();
    $("rezultati").hidden = true; porukaPrikazi("Lista je ispražnjena.", true);
  });

  // Optimizacija se radi odvojeno za krilo i štok, jer su to različiti profili.
  // Best-Fit Decreasing je heuristika i ne garantuje globalni optimum u svakom slučaju.
  function rasporediTip(stavkeTipa, tip) {
    const komadi = [];
    let idKomada = 1;
    for (const s of stavkeTipa) {
      for (let i = 0; i < s.kolicina; i++) komadi.push({ id: idKomada++, duzina: s.duzina, tip });
    }
    komadi.sort((a, b) => b.duzina - a.duzina);
    const sipke = [];
    for (const komad of komadi) {
      let najbolja = -1, najmanjiOstatak = Infinity;
      for (let i = 0; i < sipke.length; i++) {
        const preostalo = SIPKA_CM - sipke[i].zauzeto;
        if (komad.duzina <= preostalo + 1e-9 && preostalo - komad.duzina < najmanjiOstatak) {
          najbolja = i; najmanjiOstatak = preostalo - komad.duzina;
        }
      }
      if (najbolja === -1) sipke.push({ komadi: [komad], zauzeto: komad.duzina, tip });
      else { sipke[najbolja].komadi.push(komad); sipke[najbolja].zauzeto += komad.duzina; }
    }
    return sipke;
  }

  function izracunajPlan() {
    const krilo = stavke.filter(s => s.tip === "krilo");
    const stok = stavke.filter(s => s.tip === "stok");
    const sipke = [
      ...rasporediTip(krilo, "krilo"),
      ...rasporediTip(stok, "stok")
    ];
    if (!sipke.length) return null;
    const ukupnoKomada = stavke.reduce((sum, s) => sum + s.duzina * s.kolicina, 0);
    const ostatakUkupno = sipke.reduce((sum, s) => sum + SIPKA_CM - s.zauzeto, 0);
    let globalniBroj = 0;
    const ostaci = sipke.map(s => ({ sipka: ++globalniBroj, tip: s.tip, duzina: SIPKA_CM - s.zauzeto }));
    return {
      sipke, ukupnoKomada, ostatakUkupno,
      iskoriscenost: ukupnoKomada / (sipke.length * SIPKA_CM) * 100,
      komadaUkupno: stavke.reduce((sum, s) => sum + s.kolicina, 0), ostaci
    };
  }

  const boje = ["#f7b267", "#82c7b2", "#8db7e8", "#d4a5e8", "#f08c87", "#c4d66b", "#f1cf70", "#9bcbc9"];
  function oslikajPlan(plan) {
    const sema = $("sema"); sema.replaceChildren();
    const brojevi = { krilo: 0, stok: 0 };
    plan.sipke.forEach((sipka, i) => {
      brojevi[sipka.tip]++;
      const card = document.createElement("article"); card.className = "bar-card";
      const title = document.createElement("div"); title.className = "bar-title";
      const name = document.createElement("strong"); name.textContent = `${nazivTipa(sipka.tip)} · šipka ${brojevi[sipka.tip]}`;
      const detail = document.createElement("span");
      detail.textContent = `${sipka.komadi.length} kom. · iskorišćeno ${cm(sipka.zauzeto)} · ostatak ${cm(SIPKA_CM - sipka.zauzeto)}`;
      title.append(name, detail);
      const bar = document.createElement("div"); bar.className = "bar"; bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", `${nazivTipa(sipka.tip)}, šipka ${brojevi[sipka.tip]}, iskorišćeno ${cm(sipka.zauzeto)}, ostatak ${cm(SIPKA_CM - sipka.zauzeto)}`);
      sipka.komadi.forEach((komad, j) => {
        const piece = document.createElement("div"); piece.className = "piece";
        piece.style.flex = `0 0 ${(komad.duzina / SIPKA_CM * 100)}%`;
        piece.style.background = boje[j % boje.length];
        const label = document.createElement("span"); label.className = "piece-label"; label.textContent = cm(komad.duzina);
        const sub = document.createElement("small"); sub.textContent = `komad ${komad.id}`;
        piece.title = `${nazivTipa(sipka.tip)} · ${cm(komad.duzina)}`; piece.append(label, sub); bar.append(piece);
      });
      const ost = SIPKA_CM - sipka.zauzeto;
      if (ost > 1e-8) {
        const scrap = document.createElement("div"); scrap.className = "piece";
        scrap.style.flex = `0 0 ${(ost / SIPKA_CM * 100)}%`; scrap.style.background = "#e7ecef"; scrap.style.color = "#5b6871";
        const label = document.createElement("span"); label.className = "piece-label"; label.textContent = cm(ost);
        const sub = document.createElement("small"); sub.textContent = "ostatak";
        scrap.title = `Iskoristiv ostatak: ${cm(ost)}`; scrap.append(label, sub); bar.append(scrap);
      }
      const legend = document.createElement("div"); legend.className = "bar-legend";
      const start = document.createElement("span"); start.textContent = "0 cm";
      const end = document.createElement("span"); end.textContent = "600 cm";
      legend.append(start, end); card.append(title, bar, legend); sema.append(card);
    });
    const ostaci = $("ostaci"); ostaci.replaceChildren();
    const korisni = plan.ostaci.filter(o => o.duzina > 0.000001);
    if (!korisni.length) {
      const empty = document.createElement("span"); empty.className = "scrap none";
      empty.textContent = "Nema ostataka — šipke su iskorišćene u potpunosti."; ostaci.append(empty);
    } else {
      korisni.forEach(o => {
        const item = document.createElement("span"); item.className = "scrap";
        item.textContent = `${nazivTipa(o.tip)} · šipka ${o.sipka}: ${cm(o.duzina)}`; ostaci.append(item);
      });
    }
  }

  $("oslikaj").addEventListener("click", () => {
    if (!stavke.length) { porukaPrikazi("Prvo dodaj bar jednu dimenziju."); return; }
    try {
      poslednjiPlan = izracunajPlan();
      $("brojSipki").textContent = poslednjiPlan.sipke.length;
      $("ukupnaDuzina").textContent = cm(poslednjiPlan.ukupnoKomada);
      $("ukupniOstatak").textContent = cm(poslednjiPlan.ostatakUkupno);
      $("iskoriscenost").textContent = `${format(poslednjiPlan.iskoriscenost)}%`;
      oslikajPlan(poslednjiPlan); $("rezultati").hidden = false;
      porukaPrikazi(`Plan napravljen: ${poslednjiPlan.komadaUkupno} komada raspoređeno na ${poslednjiPlan.sipke.length} šipki. Krilo i štok su odvojeni.`, true);
    } catch (err) { porukaPrikazi(err.message || "Došlo je do greške pri proračunu."); }
  });

  $("stampaj").addEventListener("click", () => window.print());
  $("izvezi").addEventListener("click", () => {
    if (!poslednjiPlan) { porukaPrikazi("Prvo oslikaj plan, pa onda izvezi podatke."); return; }
    const brojevi = { krilo: 0, stok: 0 };
    const data = {
      datum: new Date().toISOString(), standardnaSipkaCm: SIPKA_CM, sirinaRezaMm: 0, jedinicaUnosa: "cm",
      stavke: stavke.map(({duzina, kolicina, tip}) => ({tipProfila: nazivTipa(tip), tip, duzinaCm: duzina, kolicina})),
      ukupnoSipki: poslednjiPlan.sipke.length, ukupnaDuzinaKomadaCm: poslednjiPlan.ukupnoKomada,
      ukupniOstatakCm: poslednjiPlan.ostatakUkupno, iskoriscenostProcenat: Number(poslednjiPlan.iskoriscenost.toFixed(2)),
      plan: poslednjiPlan.sipke.map(s => ({
        tipProfila: nazivTipa(s.tip), brojSipkeZaTip: ++brojevi[s.tip], komadiCm: s.komadi.map(k => k.duzina),
        iskoriscenoCm: s.zauzeto, ostatakCm: SIPKA_CM - s.zauzeto
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "plan-secenja.json"; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  osveziListu();
})();
