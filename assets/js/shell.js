const ICONES = {
  commandes: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>',
  ramassage: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V21H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
  reception: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
  lots: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  retours: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  performance: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-7"/></svg>',
  caisse: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  "ma-caisse": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  utilisateurs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  vehicules: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14M5 17a2 2 0 1 1-4 0m4 0a2 2 0 1 0 4 0m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0 4 0M3 17V9l2-5h12l3 5v8"/></svg>',
  hubs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1"/></svg>',
  zones: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  "clients-pro": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-9M14 17H5M17 21l4-4-4-4M7 3L3 7l4 4"/></svg>',
  abonnement: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  paiements: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  personnalisation: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>'
};

export const NAV_ITEMS = [
  { groupe: "Flux", id: "commandes", label: "Commandes", roles: ["agent", "admin", "super_admin"] },
  { groupe: "Flux", id: "ramassage", label: "Ramassage", roles: ["agent", "admin", "super_admin"] },
  { groupe: "Flux", id: "reception", label: "Réception hub", roles: ["agent", "admin", "super_admin"] },
  { groupe: "Flux", id: "lots", label: "Lots & livraison", roles: ["agent", "admin", "super_admin"] },
  { groupe: "Flux", id: "retours", label: "Retours à traiter", roles: ["agent", "admin", "super_admin"] },
  { groupe: "Suivi", id: "performance", label: "Performance", roles: ["admin", "super_admin"] },
  { groupe: "Suivi", id: "ma-caisse", label: "Ma caisse", roles: ["agent"] },
  { groupe: "Suivi", id: "caisse", label: "Caisse", roles: ["admin", "super_admin"] },
  { groupe: "Administration", id: "utilisateurs", label: "Utilisateurs", roles: ["admin", "super_admin"] },
  { groupe: "Administration", id: "vehicules", label: "Véhicules", roles: ["admin", "super_admin"] },
  { groupe: "Administration", id: "hubs", label: "Hubs", roles: ["admin", "super_admin"] },
  { groupe: "Administration", id: "zones", label: "Zones et tarifs", roles: ["agent", "admin", "super_admin"] },
  { groupe: "Administration", id: "clients-pro", label: "Clients pro", roles: ["admin", "super_admin"] },
  { groupe: "Administration", id: "abonnement", label: "Abonnement", roles: ["admin", "super_admin"] },
  { groupe: "Administration", id: "paiements", label: "Paiements", roles: ["admin", "super_admin"] },
  { groupe: "Administration", id: "personnalisation", label: "Personnalisation", roles: ["admin", "super_admin"] }
];

export function rendreSidebar(profil, ongletActif, compteurs = {}) {
  const items = NAV_ITEMS.filter((i) => i.roles.includes(profil.role));
  let groupePrecedent = null;
  const html = items.map((item) => {
    const enTeteGroupe = item.groupe !== groupePrecedent ? `<div class="sidebar-groupe">${item.groupe}</div>` : "";
    groupePrecedent = item.groupe;
    const n = compteurs[item.id] || 0;
    return `${enTeteGroupe}
      <button class="sidebar-lien" data-panel="${item.id}" aria-current="${item.id === ongletActif}">
        ${ICONES[item.id] || ""}<span>${item.label}</span>
        ${n > 0 ? `<span class="sidebar-bulle">${n > 99 ? "99+" : n}</span>` : ""}
      </button>`;
  }).join("");
  document.querySelector("#sidebar-nav").innerHTML = html;
  document.querySelector("#pied-nom").textContent = profil.nom;
}
