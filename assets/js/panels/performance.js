import { lirePerformanceDuJour, lirePerformanceEntreprise } from "../repository.js";
import { escapeHtml, formaterFcfa } from "../ui.js";

export const titre = "Performance";
export const sousTitre = "Ramassages, livraisons et marge du jour, par livreur.";

export async function monter(conteneur, actionsContainer) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  actionsContainer.innerHTML = `<input type="date" id="date-perf" value="${aujourdhui}" style="height:38px;border:1.5px solid var(--ligne);border-radius:8px;padding:0 10px;">`;

  async function rafraichir(jour) {
    const [parLivreur, entreprise] = await Promise.all([lirePerformanceDuJour(jour), lirePerformanceEntreprise(jour)]);

    conteneur.innerHTML = `
      <div class="grille-kpi">
        <div class="carte-kpi"><div class="valeur">${entreprise.ramassages}</div><div class="label">Ramassages</div></div>
        <div class="carte-kpi"><div class="valeur">${entreprise.livraisons}</div><div class="label">Livraisons</div></div>
        <div class="carte-kpi"><div class="valeur">${formaterFcfa(entreprise.ca)}</div><div class="label">CA livré (FCFA)</div></div>
        <div class="carte-kpi"><div class="valeur">${formaterFcfa(entreprise.charges)}</div><div class="label">Charges (FCFA)</div></div>
        <div class="carte-kpi"><div class="valeur ${entreprise.marge < 0 ? "negatif" : "positif"}">${formaterFcfa(entreprise.marge)}</div><div class="label">Marge (FCFA)</div></div>
      </div>
      <div class="bloc-tableau">
        <div class="tableau-titre">Par livreur</div>
        ${parLivreur.length ? `
          <table class="donnees">
            <thead><tr><th>Livreur</th><th>Ramassages</th><th>Livraisons</th><th>CA</th><th>Salaire</th><th>Charges</th><th>Véhicule</th><th>Marge</th></tr></thead>
            <tbody>
              ${parLivreur.map((p) => `
                <tr>
                  <td>${escapeHtml(p.nom)}</td>
                  <td>${p.nb_ramassages}</td>
                  <td>${p.nb_livraisons}</td>
                  <td class="cellule-donnee">${formaterFcfa(p.ca_livre)}</td>
                  <td class="cellule-donnee">${formaterFcfa(p.salaire_jour)}</td>
                  <td class="cellule-donnee">${formaterFcfa(p.charges_livreur + Number(p.charges_vehicule || 0))}</td>
                  <td>${p.type_vehicule || "—"}</td>
                  <td class="cellule-donnee" style="color:${p.marge_jour < 0 ? "var(--alerte)" : "var(--valide)"};">${formaterFcfa(p.marge_jour)}</td>
                </tr>`).join("")}
            </tbody>
          </table>` : `<div class="etat-vide-tableau">Aucune activité ce jour-là.</div>`}
      </div>
    `;
  }

  actionsContainer.querySelector("#date-perf").addEventListener("change", (e) => rafraichir(e.target.value));
  await rafraichir(aujourdhui);
  return () => {};
}
