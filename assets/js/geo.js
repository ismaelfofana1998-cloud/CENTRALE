// ============================================================================
// Géocodage et autocomplétion d'adresse — LocationIQ (données OpenStreetMap).
//
// IMPORTANT, pourquoi ce n'est pas l'API publique Nominatim directement :
// la politique d'usage de Nominatim (operations.osmfoundation.org/policies/
// nominatim) interdit explicitement l'autocompletion "as you type" sur son
// API publique — implémenter ça côté client sur nominatim.openstreetmap.org
// est listé noir sur blanc comme un usage strictement interdit, bannissable.
// LocationIQ résout ça : mêmes données OpenStreetMap (donc la même
// couverture détaillée d'Abidjan), mais un vrai contrat commercial dont
// l'autocomplétion est un usage explicitement prévu et autorisé, avec un
// palier gratuit confortable (5000 requêtes/jour) largement suffisant pour
// démarrer.
//
// Le token (LOCATIONIQ_TOKEN dans config.public.js) est fait pour tourner
// côté navigateur (LocationIQ déconseille même les restrictions par IP pour
// ce cas d'usage, puisque les requêtes partent du téléphone de la personne,
// pas de ton serveur) — comme la clé anon Supabase, la maîtrise des coûts se
// fait via les quotas du compte, pas en cachant le token.
//
// Si LOCATIONIQ_TOKEN n'est pas encore renseigné, toutes les fonctions se
// dégradent en douceur (aucune suggestion, mais la saisie manuelle et les
// coordonnées GPS brutes restent toujours disponibles).
// ============================================================================

const ABIDJAN_VIEWBOX = "-4.20,5.55,-3.75,5.05"; // left,top,right,bottom (compatible Nominatim/LocationIQ)

function tokenLocationIQ() {
  return window.APP_CONFIG?.LOCATIONIQ_TOKEN || "";
}

export function debounce(fn, delaiMs) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delaiMs);
  };
}

export async function rechercherAdresses(texte) {
  const token = tokenLocationIQ();
  if (!token || !texte || texte.trim().length < 3) return [];
  try {
    const url = `https://api.locationiq.com/v1/autocomplete?key=${token}` +
      `&q=${encodeURIComponent(texte)}&countrycodes=ci&viewbox=${ABIDJAN_VIEWBOX}&bounded=1&limit=5&accept-language=fr&addressdetails=1`;
    const reponse = await fetch(url);
    if (!reponse.ok) return [];
    const resultats = await reponse.json();
    return (Array.isArray(resultats) ? resultats : []).map((r) => ({
      label: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      // Commune/quartier détecté par LocationIQ (Nominatim), pour suggérer
      // automatiquement une zone tarifaire — voir deviserZone().
      commune: r.address?.suburb || r.address?.city_district || r.address?.neighbourhood || r.address?.city || null
    })).filter((r) => r.label && !Number.isNaN(r.lat) && !Number.isNaN(r.lon));
  } catch {
    return [];
  }
}

export async function geocoderInverse(lat, lon) {
  const token = tokenLocationIQ();
  if (!token) return null;
  try {
    const url = `https://api.locationiq.com/v1/reverse?key=${token}&lat=${lat}&lon=${lon}&format=json&accept-language=fr&addressdetails=1`;
    const reponse = await fetch(url);
    if (!reponse.ok) return null;
    const resultat = await reponse.json();
    return {
      label: resultat?.display_name || null,
      commune: resultat?.address?.suburb || resultat?.address?.city_district || resultat?.address?.neighbourhood || resultat?.address?.city || null
    };
  } catch {
    return null;
  }
}

// Essaie de faire correspondre la commune détectée par le géocodeur (ex.
// "Cocody", "Yopougon") à une zone tarifaire existante, par comparaison de
// texte simple (sous-chaîne, insensible à la casse/accents). Retourne le
// code_zone si une correspondance raisonnable est trouvée, sinon null — on
// ne force jamais un choix, juste une pré-sélection que la personne peut
// toujours changer, pour éviter tout risque de mauvaise tarification.
export function deviserZone(commune, zonesDisponibles) {
  if (!commune) return null;
  const normaliser = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const communeNorm = normaliser(commune);
  const trouvee = zonesDisponibles.find((z) => {
    const descNorm = normaliser(z.description || "");
    const codeNorm = normaliser(z.code_zone || "");
    return (descNorm && (communeNorm.includes(descNorm) || descNorm.includes(communeNorm)))
        || (codeNorm && (communeNorm.includes(codeNorm) || codeNorm.includes(communeNorm)));
  });
  return trouvee?.code_zone || null;
}

// Géolocalise l'appareil et remplit le champ adresse (avec repli sur les
// coordonnées brutes si la conversion en adresse lisible échoue).
export function localiserMoi(boutonEl, champInputEl, onLocalise) {
  if (!navigator.geolocation) {
    boutonEl.textContent = "Localisation indisponible";
    return;
  }
  const texteInitial = boutonEl.textContent;
  boutonEl.disabled = true;
  boutonEl.textContent = "Localisation…";
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const resultat = await geocoderInverse(latitude, longitude);
      champInputEl.value = resultat?.label || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      onLocalise?.({ lat: latitude, lng: longitude, commune: resultat?.commune || null });
      boutonEl.disabled = false;
      boutonEl.textContent = "Position utilisée ✓";
      setTimeout(() => { boutonEl.textContent = texteInitial; }, 2200);
    },
    () => {
      boutonEl.disabled = false;
      boutonEl.textContent = "Position refusée — saisis ton adresse";
      setTimeout(() => { boutonEl.textContent = texteInitial; }, 2600);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Branche un champ adresse texte sur l'autocomplétion : une liste de
// suggestions cliquables apparaît sous le champ pendant la saisie.
export function brancherAutocompletion(champInputEl, listeSuggestionsEl, onChoix) {
  const rechercheDebattue = debounce(async (texte) => {
    const resultats = await rechercherAdresses(texte);
    if (!resultats.length) { listeSuggestionsEl.innerHTML = ""; listeSuggestionsEl.hidden = true; return; }
    listeSuggestionsEl.innerHTML = resultats.map((r, i) =>
      `<button type="button" class="suggestion-adresse" data-index="${i}">${escapeHtmlLocal(r.label)}</button>`
    ).join("");
    listeSuggestionsEl.hidden = false;
    listeSuggestionsEl.querySelectorAll("[data-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = resultats[Number(btn.dataset.index)];
        champInputEl.value = r.label;
        listeSuggestionsEl.innerHTML = "";
        listeSuggestionsEl.hidden = true;
        onChoix?.({ lat: r.lat, lng: r.lon, commune: r.commune || null });
      });
    });
  }, 400);

  champInputEl.addEventListener("input", () => {
    onChoix?.(null); // l'adresse est retapée à la main : on ne garde plus un GPS obsolète
    rechercheDebattue(champInputEl.value);
  });
  champInputEl.addEventListener("blur", () => {
    setTimeout(() => { listeSuggestionsEl.hidden = true; }, 150); // laisse le clic sur une suggestion aboutir
  });
}

function escapeHtmlLocal(texte) {
  const div = document.createElement("div");
  div.textContent = String(texte ?? "");
  return div.innerHTML;
}
