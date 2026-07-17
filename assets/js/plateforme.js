import { garantirAccesCentrale, deconnecterCentrale } from "./auth.js";
import { listerEntreprises, creerEntreprise, desactiverEntreprise, reactiverEntreprise, definirEssai, creerUtilisateur } from "./repository.js";
import { afficherFlash, escapeHtml, ouvrirModale, fermerModale } from "./ui.js";

const conteneur = document.querySelector("#contenu-panneau");
const actionsContainer = document.querySelector("#actions-panneau");

(async () => {
  const profil = await garantirAccesCentrale();
  if (!profil) return;

  // Cette page n'est pas juste "un panneau de plus" : elle représente
  // l'éditeur du logiciel, pas une entreprise cliente (même IKIGAI Livraison
  // n'y a pas sa place en tant que telle). Réservée au rôle super_admin —
  // un admin/agent d'une entreprise cliente est renvoyé vers son espace.
  if (profil.role !== "super_admin") {
    alert("Cette page est réservée au super-admin (l'éditeur du logiciel). Tu es redirigé vers ton espace centrale.");
    window.location.href = "./centrale.html";
    return;
  }

  document.querySelector("#topbar-nom").textContent = profil.nom || "Super admin";
  document.querySelector("#btn-deconnexion").addEventListener("click", deconnecterCentrale);
  document.querySelector("#sous-titre-panneau").textContent =
    "Onboarding des sociétés qui utilisent IKMS en tant que plateforme SaaS.";

  actionsContainer.innerHTML = `<button class="btn btn-primaire" id="btn-nouvelle-entreprise">+ Nouvelle entreprise</button>`;

  async function rafraichir() {
    const entreprises = await listerEntreprises();
    conteneur.innerHTML = `
      <div class="bloc-tableau">
        ${entreprises.length ? `
          <table class="donnees">
            <thead><tr><th>Code</th><th>Nom</th><th>Utilisateurs</th><th>Commandes</th><th>Abonnement</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              ${entreprises.map((e) => `
                <tr>
                  <td class="cellule-donnee">${escapeHtml(e.code_entreprise)}</td>
                  <td>${escapeHtml(e.nom)}</td>
                  <td class="cellule-donnee">${e.nb_utilisateurs}</td>
                  <td class="cellule-donnee">${e.nb_commandes}</td>
                  <td>${libelleEssai(e.essai_expire_le)}</td>
                  <td>${e.actif ? '<span class="tampon valide">Active</span>' : '<span class="tampon alerte">Désactivée</span>'}</td>
                  <td class="cellule-actions">
                    <button class="btn btn-discret btn-petit" data-utilisateur="${e.id_entreprise}">+ Utilisateur</button>
                    <button class="btn btn-discret btn-petit" data-abonnement="${e.id_entreprise}">Abonnement</button>
                    ${e.actif
                      ? `<button class="btn btn-alerte btn-petit" data-desactiver="${e.id_entreprise}">Désactiver</button>`
                      : `<button class="btn btn-discret btn-petit" data-reactiver="${e.id_entreprise}">Réactiver</button>`}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>` : `<div class="etat-vide-tableau">Aucune entreprise pour le moment.</div>`}
      </div>`;

    conteneur.querySelectorAll("[data-desactiver]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Désactiver cette entreprise ? Ses utilisateurs ne pourront plus se connecter.")) return;
        const r = await desactiverEntreprise(btn.dataset.desactiver);
        if (r.ok) { afficherFlash("Entreprise désactivée"); rafraichir(); } else afficherFlash(r.message, true);
      });
    });
    conteneur.querySelectorAll("[data-reactiver]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const r = await reactiverEntreprise(btn.dataset.reactiver);
        if (r.ok) { afficherFlash("Entreprise réactivée"); rafraichir(); } else afficherFlash(r.message, true);
      });
    });
    conteneur.querySelectorAll("[data-utilisateur]").forEach((btn) => {
      btn.addEventListener("click", () => ouvrirFormulaireUtilisateur(btn.dataset.utilisateur, entreprises.find((e) => e.id_entreprise === btn.dataset.utilisateur)));
    });
    conteneur.querySelectorAll("[data-abonnement]").forEach((btn) => {
      btn.addEventListener("click", () => ouvrirFormulaireAbonnement(btn.dataset.abonnement, entreprises.find((e) => e.id_entreprise === btn.dataset.abonnement)));
    });
  }

  function libelleEssai(essaiExpireLe) {
    if (!essaiExpireLe) return `<span class="tampon valide">Plan payant</span>`;
    const joursRestants = Math.ceil((new Date(essaiExpireLe) - new Date()) / 86400000);
    if (joursRestants > 0) return `<span class="tampon attente">Essai · ${joursRestants} j</span>`;
    return `<span class="tampon alerte">Essai terminé</span>`;
  }

  function ouvrirFormulaireUtilisateur(idEntreprise, entreprise) {
    ouvrirModale(`
      <h2>Nouvel utilisateur — ${escapeHtml(entreprise?.nom || "")}</h2>
      <p class="sous-titre" style="margin-bottom:10px;">Crée un agent, un admin ou un livreur directement pour cette entreprise.</p>
      <p class="message-erreur" id="erreur-utilisateur"></p>
      <div class="formulaire">
        <div class="champ"><label>Nom</label><input id="u-nom" placeholder="Nom complet"></div>
        <div class="champ"><label>Email</label><input id="u-email" type="email" placeholder="nom@exemple.com"></div>
        <div class="champ"><label>Téléphone (optionnel)</label><input id="u-telephone" placeholder="07..."></div>
        <div class="champ"><label>Mot de passe provisoire</label><input id="u-password" type="text" placeholder="Au moins 6 caractères"></div>
        <div class="champ">
          <label>Rôle</label>
          <select id="u-role">
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="livreur">Livreur</option>
          </select>
        </div>
      </div>
      <div class="actions-bas">
        <button class="btn btn-discret" id="btn-annuler">Annuler</button>
        <button class="btn btn-primaire" id="btn-enregistrer">Créer</button>
      </div>
    `, (boite) => {
      boite.querySelector("#btn-annuler").addEventListener("click", fermerModale);
      boite.querySelector("#btn-enregistrer").addEventListener("click", async (e) => {
        const erreur = boite.querySelector("#erreur-utilisateur");
        const nom = boite.querySelector("#u-nom").value.trim();
        const email = boite.querySelector("#u-email").value.trim();
        const password = boite.querySelector("#u-password").value;
        if (!nom || !email || !password) {
          erreur.textContent = "Nom, email et mot de passe sont obligatoires.";
          erreur.classList.add("visible");
          return;
        }
        e.currentTarget.disabled = true;
        const r = await creerUtilisateur({
          nom, email, password,
          telephone: boite.querySelector("#u-telephone").value.trim(),
          role: boite.querySelector("#u-role").value,
          id_entreprise: idEntreprise
        });
        if (r.ok) { afficherFlash("Utilisateur créé"); fermerModale(); rafraichir(); }
        else { erreur.textContent = r.message; erreur.classList.add("visible"); e.currentTarget.disabled = false; }
      });
    });
  }

  function ouvrirFormulaireAbonnement(idEntreprise, entreprise) {
    ouvrirModale(`
      <h2>Abonnement — ${escapeHtml(entreprise?.nom || "")}</h2>
      <p class="sous-titre" style="margin-bottom:10px;">${libelleEssaiTexte(entreprise?.essai_expire_le)}</p>
      <p class="message-erreur" id="erreur-abonnement"></p>
      <div class="formulaire">
        <div class="champ">
          <label>Prolonger l'essai de</label>
          <select id="ab-jours">
            <option value="7">7 jours</option>
            <option value="14">14 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
          </select>
        </div>
      </div>
      <div class="actions-bas">
        <button class="btn btn-discret" id="btn-annuler">Fermer</button>
        <button class="btn btn-discret" id="btn-plan-payant">Passer en plan payant (sans limite)</button>
        <button class="btn btn-primaire" id="btn-prolonger">Prolonger l'essai</button>
      </div>
    `, (boite) => {
      boite.querySelector("#btn-annuler").addEventListener("click", fermerModale);
      boite.querySelector("#btn-prolonger").addEventListener("click", async (e) => {
        const jours = Number(boite.querySelector("#ab-jours").value);
        e.currentTarget.disabled = true;
        const r = await definirEssai(idEntreprise, jours);
        if (r.ok) { afficherFlash(`Essai prolongé de ${jours} jours`); fermerModale(); rafraichir(); }
        else { boite.querySelector("#erreur-abonnement").textContent = r.message; boite.querySelector("#erreur-abonnement").classList.add("visible"); e.currentTarget.disabled = false; }
      });
      boite.querySelector("#btn-plan-payant").addEventListener("click", async (e) => {
        if (!confirm("Retirer la limite d'essai pour cette entreprise (plan payant actif) ?")) return;
        e.currentTarget.disabled = true;
        const r = await definirEssai(idEntreprise, null);
        if (r.ok) { afficherFlash("Entreprise passée en plan payant"); fermerModale(); rafraichir(); }
        else { boite.querySelector("#erreur-abonnement").textContent = r.message; boite.querySelector("#erreur-abonnement").classList.add("visible"); e.currentTarget.disabled = false; }
      });
    });
  }

  function libelleEssaiTexte(essaiExpireLe) {
    if (!essaiExpireLe) return "Plan payant actif, aucune limite d'essai.";
    const joursRestants = Math.ceil((new Date(essaiExpireLe) - new Date()) / 86400000);
    return joursRestants > 0
      ? `Essai en cours — ${joursRestants} jour${joursRestants > 1 ? "s" : ""} restant${joursRestants > 1 ? "s" : ""}.`
      : "Essai terminé.";
  }

  function ouvrirFormulaire() {
    ouvrirModale(`
      <h2>Nouvelle entreprise cliente</h2>
      <p class="sous-titre" style="margin-bottom:10px;">
        Crée l'entreprise et son premier compte administrateur en une fois.
        Cet admin pourra ensuite créer ses propres agents, livreurs, zones et tarifs.
      </p>
      <p class="message-erreur" id="erreur-entreprise"></p>
      <div class="formulaire">
        <div class="champ"><label>Code entreprise</label><input id="e-code" placeholder="EXPRESSCI" style="text-transform:uppercase;"></div>
        <div class="champ"><label>Nom commercial</label><input id="e-nom" placeholder="Express CI Livraison"></div>
        <hr style="border:none;border-top:1px solid var(--ligne);margin:6px 0;">
        <div class="champ"><label>Nom de l'administrateur</label><input id="a-nom" placeholder="Nom complet"></div>
        <div class="champ"><label>Email de l'administrateur</label><input id="a-email" type="email" placeholder="admin@exemple.com"></div>
        <div class="champ"><label>Téléphone (optionnel)</label><input id="a-telephone" placeholder="07..."></div>
        <div class="champ"><label>Mot de passe provisoire</label><input id="a-password" type="text" placeholder="Au moins 6 caractères"></div>
      </div>
      <div class="actions-bas">
        <button class="btn btn-discret" id="btn-annuler">Annuler</button>
        <button class="btn btn-primaire" id="btn-enregistrer">Créer</button>
      </div>
    `, (boite) => {
      boite.querySelector("#btn-annuler").addEventListener("click", fermerModale);
      boite.querySelector("#btn-enregistrer").addEventListener("click", async (e) => {
        const erreur = boite.querySelector("#erreur-entreprise");
        const codeEntreprise = boite.querySelector("#e-code").value.trim();
        const nom = boite.querySelector("#e-nom").value.trim();
        const adminNom = boite.querySelector("#a-nom").value.trim();
        const adminEmail = boite.querySelector("#a-email").value.trim();
        const adminTelephone = boite.querySelector("#a-telephone").value.trim();
        const adminMotDePasse = boite.querySelector("#a-password").value;

        if (!codeEntreprise || !nom || !adminNom || !adminEmail || !adminMotDePasse) {
          erreur.textContent = "Tous les champs sont obligatoires (sauf téléphone).";
          erreur.classList.add("visible");
          return;
        }
        if (adminMotDePasse.length < 6) {
          erreur.textContent = "Le mot de passe doit contenir au moins 6 caractères.";
          erreur.classList.add("visible");
          return;
        }

        e.currentTarget.disabled = true;
        e.currentTarget.textContent = "Création…";
        const r = await creerEntreprise({ codeEntreprise, nom, adminNom, adminEmail, adminTelephone, adminMotDePasse });
        if (r.ok) {
          afficherFlash(`Entreprise "${r.entreprise.code_entreprise}" créée`);
          fermerModale();
          rafraichir();
        } else {
          erreur.textContent = r.message;
          erreur.classList.add("visible");
          e.currentTarget.disabled = false;
          e.currentTarget.textContent = "Créer";
        }
      });
    });
  }

  actionsContainer.querySelector("#btn-nouvelle-entreprise").addEventListener("click", ouvrirFormulaire);
  await rafraichir();
})();
