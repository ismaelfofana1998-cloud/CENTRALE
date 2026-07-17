import { garantirAccesCentrale, deconnecterCentrale } from "./auth.js";
import {
  listerColisAValider, validerDepot, validerRetourRecu,
  listerColisEnRecuperation, validerRecuperationColis, listerLivreursActifs,
  listerRetoursEnRecuperation, validerRecuperationRetour
} from "./repository.js";
import { afficherFlash, escapeHtml, libelleMotif } from "./ui.js";

const elContenu = document.querySelector("#contenu");
const elBoutonsOnglet = document.querySelectorAll(".onglet");
let ongletActif = "A_VALIDER";
let profil = null;
let nomsLivreurs = {};

(async () => {
  profil = await garantirAccesCentrale();
  if (!profil) return;
  document.querySelector("#topbar-nom").textContent = profil.nom || "Hub";

  const livreurs = await listerLivreursActifs().catch(() => []);
  nomsLivreurs = Object.fromEntries(livreurs.map((l) => [l.id_utilisateur, l.nom]));

  await rafraichirTout();
})();

document.querySelector("#btn-deconnexion").addEventListener("click", deconnecterCentrale);

elBoutonsOnglet.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.onglet === ongletActif) return;
    ongletActif = btn.dataset.onglet;
    elBoutonsOnglet.forEach((b) => b.setAttribute("aria-current", String(b === btn)));
    rendreOnglet();
  });
});

let colisAValider = [];
let colisARecuperer = [];
let retoursARecuperer = [];

async function rafraichirTout() {
  const idHubAgent = profil?.role === "agent" ? profil.id_hub_affecte : null;
  const [colis, colisRecup, retours] = await Promise.all([
    listerColisAValider(idHubAgent).catch(() => []),
    listerColisEnRecuperation().catch(() => []),
    listerRetoursEnRecuperation().catch(() => [])
  ]);
  colisAValider = colis;
  colisARecuperer = colisRecup;
  retoursARecuperer = retours.filter((c) => c.statut === "RETOUR_RECUP_DEMANDEE");

  const badgeValider = document.querySelector("#badge-valider");
  badgeValider.textContent = String(colisAValider.length);
  badgeValider.hidden = colisAValider.length === 0;
  const badgeLots = document.querySelector("#badge-lots");
  const totalLots = colisARecuperer.length + retoursARecuperer.length;
  badgeLots.textContent = String(totalLots);
  badgeLots.hidden = totalLots === 0;

  rendreOnglet();
}

function messageVide(texte) {
  return `<div class="etat-vide-hub">${texte}</div>`;
}

// ============================================================================
// Cartes glissantes : on fait glisser la carte vers la gauche pour révéler
// les actions dessous (comme les mails sur iPhone). L'action ne se
// déclenche jamais au simple glissement — il faut ensuite taper le bouton
// révélé — pour éviter toute validation par accident.
// ============================================================================
function brancherGlissement(carteEl) {
  const front = carteEl.querySelector(".carte-swipe");
  const largeurRevele = carteEl.querySelector(".carte-actions-revelees").offsetWidth;
  let depart = null;
  let decalageInitial = 0;
  let ouverte = false;

  function placer(x, animer) {
    front.style.transition = animer ? "transform 0.18s ease" : "none";
    front.style.transform = `translateX(${x}px)`;
  }

  front.addEventListener("pointerdown", (e) => {
    depart = e.clientX;
    decalageInitial = ouverte ? -largeurRevele : 0;
    front.setPointerCapture(e.pointerId);
  });
  front.addEventListener("pointermove", (e) => {
    if (depart === null) return;
    const delta = e.clientX - depart;
    const x = Math.min(0, Math.max(-largeurRevele, decalageInitial + delta));
    placer(x, false);
  });
  function relacher(e) {
    if (depart === null) return;
    const delta = e.clientX - depart;
    depart = null;
    const seuil = -largeurRevele / 2;
    const positionFinale = decalageInitial + delta;
    ouverte = positionFinale < seuil;
    placer(ouverte ? -largeurRevele : 0, true);
  }
  front.addEventListener("pointerup", relacher);
  front.addEventListener("pointercancel", relacher);

  // Taper la carte pendant qu'elle est ouverte la referme, sans agir.
  front.addEventListener("click", (e) => {
    if (ouverte) { e.preventDefault(); ouverte = false; placer(0, true); }
  });
}

function rendreOnglet() {
  if (ongletActif === "A_VALIDER") rendreAValider();
  else rendreLots();
}

function rendreAValider() {
  if (!colisAValider.length) {
    elContenu.innerHTML = messageVide("Rien à valider pour le moment.");
    return;
  }
  elContenu.innerHTML = `<div class="liste-cartes-hub">${colisAValider.map((c) => {
    const estDepot = c.statut === "DEPOT_DEMANDE";
    return `
    <div class="carte-glissante" data-id="${escapeHtml(c.id_colis)}">
      <div class="carte-actions-revelees">
        ${estDepot
          ? `<button class="action-validation action-ok" data-action="valider-depot">Valider<br>dépôt</button>`
          : `<button class="action-validation action-ok" data-action="valider-retour-recu">Confirmer<br>réception</button>`}
      </div>
      <div class="carte-swipe">
        <div class="carte-corps">
          <div class="carte-titre">${escapeHtml(c.id_colis)}</div>
          <div class="carte-sous">${escapeHtml(c.destinataire_nom)}${c.code_zone ? " · " + escapeHtml(c.code_zone) : ""}</div>
          ${!estDepot ? `<div class="carte-motif">${escapeHtml(libelleMotif(c.motif_retour))}</div>` : ""}
        </div>
        <div class="carte-indice-glisser" aria-hidden="true">‹‹</div>
      </div>
    </div>`;
  }).join("")}</div>`;

  elContenu.querySelectorAll(".carte-glissante").forEach((carteEl) => {
    brancherGlissement(carteEl);
    carteEl.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => agirSurColis(carteEl.dataset.id, btn.dataset.action));
    });
  });
}

async function agirSurColis(idColis, action) {
  if (action === "valider-depot") {
    const r = await validerDepot(idColis);
    if (r.ok) { afficherFlash("Dépôt validé"); rafraichirTout(); } else afficherFlash(r.message, true);
    return;
  }
  // La décision (reprogrammer / retour expéditeur) se prend maintenant dans
  // le panneau desktop "Retours à traiter" — ici on ne fait que confirmer
  // que le colis est bien arrivé physiquement au hub.
  const r = await validerRetourRecu(idColis);
  if (r.ok) { afficherFlash("Retour reçu — décision à prendre dans Retours à traiter"); rafraichirTout(); }
  else afficherFlash(r.message, true);
}

function rendreLots() {
  if (!colisARecuperer.length && !retoursARecuperer.length) {
    elContenu.innerHTML = messageVide("Rien à récupérer au hub pour le moment.");
    return;
  }
  const cartesColis = colisARecuperer.map((c) => `
    <div class="carte-glissante" data-id="${c.id_colis}" data-type="colis">
      <div class="carte-actions-revelees">
        <button class="action-validation action-ok" data-action="valider-recuperation">Valider<br>ce colis</button>
      </div>
      <div class="carte-swipe">
        <div class="carte-corps">
          <div class="carte-titre">${escapeHtml(c.id_colis)}</div>
          <div class="carte-sous">${nomsLivreurs[c.id_livreur] || "Livreur"} · ${escapeHtml(c.destinataire_nom)}${c.code_zone ? " · " + escapeHtml(c.code_zone) : ""}</div>
        </div>
        <div class="carte-indice-glisser" aria-hidden="true">‹‹</div>
      </div>
    </div>`).join("");
  const cartesRetours = retoursARecuperer.map((c) => `
    <div class="carte-glissante" data-id="${c.id_colis}" data-type="retour">
      <div class="carte-actions-revelees">
        <button class="action-validation action-danger" data-action="valider-recuperation-retour">Valider<br>récupération</button>
      </div>
      <div class="carte-swipe">
        <div class="carte-corps">
          <div class="carte-titre">${escapeHtml(c.id_colis)} · Retour</div>
          <div class="carte-sous">${nomsLivreurs[c.id_livreur_retour] || "Livreur"} · ${escapeHtml(c.destinataire_nom)}</div>
        </div>
        <div class="carte-indice-glisser" aria-hidden="true">‹‹</div>
      </div>
    </div>`).join("");

  elContenu.innerHTML = `<div class="liste-cartes-hub">${cartesColis}${cartesRetours}</div>`;

  elContenu.querySelectorAll(".carte-glissante").forEach((carteEl) => {
    brancherGlissement(carteEl);
    carteEl.querySelector("[data-action]").addEventListener("click", async () => {
      const r = carteEl.dataset.type === "retour"
        ? await validerRecuperationRetour(carteEl.dataset.id)
        : await validerRecuperationColis(carteEl.dataset.id);
      if (r.ok) { afficherFlash("Récupération validée"); rafraichirTout(); }
      else afficherFlash(r.message, true);
    });
  });
}
