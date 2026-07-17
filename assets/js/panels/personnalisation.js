import {
  lireCodeEntreprise, listerPersonnalisation, uploaderPersonnalisation, supprimerPersonnalisation,
  lireTextesPersonnalisesEntreprise, definirTextePersonnalise, retirerTextePersonnalise
} from "../repository.js";
import { afficherFlash, escapeHtml } from "../ui.js";

export const titre = "Personnalisation";
export const sousTitre = "Remplace les images et les textes de ta page d'envoi de colis par les tiens.";

const SLOTS_IMAGES = [
  { cle: "mode-moto", label: "Mode moto (avec traçabilité)" },
  { cle: "mode-velo", label: "Mode vélo" },
  { cle: "mode-van", label: "Mode van" },
  { cle: "formulaire-1", label: "Arrière-plan du formulaire (1)" },
  { cle: "formulaire-2", label: "Arrière-plan du formulaire (2)" }
];

// Textes par défaut affichés si le tenant n'a rien personnalisé — juste
// pour montrer un exemple dans les champs vides du formulaire, jamais
// enregistrés tels quels tant que la personne ne valide pas.
const TEXTES_PAR_DEFAUT = {
  "mode-moto": { titre: "Rapide, et suivi en direct.", sousTitre: "Nos livreurs moto sont faits pour l'urgence — et vous suivez chaque étape en temps réel." },
  "mode-velo": { titre: "Agile en ville.", sousTitre: "Pour les trajets courts, le vélo se faufile là où rien d'autre ne passe." },
  "mode-van": { titre: "Volumineux ? Aucun souci.", sousTitre: "Nos vans prennent le relais pour les envois plus lourds ou en grande quantité." }
};

export async function monter(conteneur, actionsContainer, profil) {
  const codeEntreprise = await lireCodeEntreprise(profil.id_entreprise);

  async function rafraichir() {
    const [existants, textes] = await Promise.all([
      listerPersonnalisation(codeEntreprise),
      lireTextesPersonnalisesEntreprise()
    ]);
    const aExiste = (variant, cle) => existants.some((c) => c === `${codeEntreprise}/${variant}/${cle}.webp`);
    const texteDe = (cle) => textes.find((t) => t.cle === cle) || {};

    conteneur.innerHTML = `
      <div class="bloc-tableau" style="margin-bottom:20px;">
        <div class="tableau-titre">Textes d'accroche</div>
        <p class="sous-titre" style="margin-bottom:14px;">
          Les 3 phrases affichées sur les images de présentation (moto, vélo, van). Laisse vide pour revenir au texte par défaut.
        </p>
        ${["mode-moto", "mode-velo", "mode-van"].map((cle) => {
          const t = texteDe(cle);
          const defaut = TEXTES_PAR_DEFAUT[cle];
          return `
            <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--ligne);">
              <label style="font-size:12.5px;font-weight:700;color:var(--ink-soft);">${SLOTS_IMAGES.find((s) => s.cle === cle).label}</label>
              <input data-texte-titre="${cle}" placeholder="${escapeHtml(defaut.titre)}" value="${escapeHtml(t.titre || "")}" style="width:100%;margin:6px 0;padding:9px 12px;border:1px solid var(--ligne);border-radius:8px;">
              <textarea data-texte-sous="${cle}" placeholder="${escapeHtml(defaut.sousTitre)}" rows="2" style="width:100%;padding:9px 12px;border:1px solid var(--ligne);border-radius:8px;font-family:inherit;resize:vertical;">${escapeHtml(t.sous_titre || "")}</textarea>
              <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
                <button class="btn btn-discret btn-petit" data-enregistrer-texte="${cle}">Enregistrer</button>
              </div>
            </div>`;
        }).join("")}
      </div>

      <p class="sous-titre" style="margin-bottom:16px;">
        Format WebP ou JPEG, moins de 2 Mo. Desktop : 1600×900 environ. Téléphone : 900×1600 environ
        (une vraie photo verticale, pas juste l'image desktop recadrée).
      </p>
      ${SLOTS_IMAGES.map((slot) => `
        <div class="bloc-tableau" style="margin-bottom:14px;">
          <div class="tableau-titre">${slot.label}</div>
          <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:10px;">
            ${["desktop", "mobile"].map((variant) => `
              <div style="flex:1;min-width:220px;">
                <div style="font-size:12.5px;color:var(--ink-soft);font-weight:700;margin-bottom:6px;">
                  ${variant === "desktop" ? "Ordinateur" : "Téléphone"}
                  ${aExiste(variant, slot.cle) ? ' · <span style="color:var(--valide);">personnalisée</span>' : ' · <span style="color:var(--ink-soft);">par défaut</span>'}
                </div>
                <input type="file" accept="image/webp,image/jpeg,image/png" data-slot="${slot.cle}" data-variant="${variant}" style="font-size:12.5px;">
                ${aExiste(variant, slot.cle) ? `<button class="btn btn-discret btn-petit" data-retirer-image="${slot.cle}" data-variant-retirer="${variant}" style="margin-top:6px;">Retirer, revenir à l'image par défaut</button>` : ""}
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    `;

    conteneur.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener("change", async () => {
        const fichier = input.files[0];
        if (!fichier) return;
        if (fichier.size > 2 * 1024 * 1024) {
          afficherFlash("Image trop lourde (max 2 Mo).", true);
          input.value = "";
          return;
        }
        const r = await uploaderPersonnalisation(codeEntreprise, input.dataset.variant, input.dataset.slot, fichier);
        if (r.ok) { afficherFlash("Image mise à jour"); rafraichir(); }
        else afficherFlash(r.message, true);
      });
    });

    conteneur.querySelectorAll("[data-retirer-image]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Revenir à l'image par défaut pour cet emplacement ?")) return;
        btn.disabled = true;
        const r = await supprimerPersonnalisation(codeEntreprise, btn.dataset.variantRetirer, btn.dataset.retirerImage);
        if (r.ok) { afficherFlash("Image par défaut restaurée"); rafraichir(); }
        else { afficherFlash(r.message, true); btn.disabled = false; }
      });
    });

    conteneur.querySelectorAll("[data-enregistrer-texte]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cle = btn.dataset.enregistrerTexte;
        const titreVal = conteneur.querySelector(`[data-texte-titre="${cle}"]`).value.trim();
        const sousVal = conteneur.querySelector(`[data-texte-sous="${cle}"]`).value.trim();
        btn.disabled = true;
        const r = !titreVal && !sousVal
          ? await retirerTextePersonnalise(cle)
          : await definirTextePersonnalise(cle, titreVal, sousVal);
        if (r.ok) { afficherFlash("Texte mis à jour"); rafraichir(); }
        else { afficherFlash(r.message, true); btn.disabled = false; }
      });
    });
  }

  await rafraichir();
}
