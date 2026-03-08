// ── MOOD CONFIG ──
const MOOD_CONFIG = {
  work: {
    label: "Work & Study Spots",
    types: ["cafe", "library", "book_store"],
    keywords: "cafe coworking quiet study",
    emoji: "💼"
  },
  date: {
    label: "Date Night Places",
    types: ["restaurant", "bar", "night_club"],
    keywords: "romantic fine dining",
    emoji: "💑"
  },
  quick: {
    label: "Quick Bites",
    types: ["fast_food_restaurant", "meal_takeaway", "bakery", "sandwich_shop"],
    keywords: "fast food quick bite takeaway",
    emoji: "⚡"
  },
  budget: {
    label: "Budget-Friendly Spots",
    types: ["restaurant", "cafe", "food"],
    keywords: "cheap affordable budget food",
    emoji: "💸"
  },
  social: {
    label: "Great for Groups",
    types: ["restaurant", "bar", "amusement_park", "bowling_alley"],
    keywords: "group family gathering party",
    emoji: "🎉"
  }
};

// ── STATE ──
let map = null;
let autocomplete = null;
let userLatLng = null;
let selectedMood = null;
let markers = [];

// ── DOM ──
const findLocationBtn  = document.getElementById("findLocationBtn");
const searchBtn        = document.getElementById("searchBtn");
const locationInput    = document.getElementById("locationInput");
const locationStatus   = document.getElementById("locationStatus");
const mapSection       = document.getElementById("map-section");
const moodSection      = document.getElementById("mood-section");
const resultsSection   = document.getElementById("results-section");
const placesList       = document.getElementById("placesList");
const resultsTitle     = document.getElementById("resultsTitle");
const resultsStatus    = document.getElementById("resultsStatus");
const changeMoodBtn    = document.getElementById("changeMoodBtn");
const modalOverlay     = document.getElementById("modalOverlay");
const modalClose       = document.getElementById("modalClose");
const modalBody        = document.getElementById("modalBody");

// ── INIT MAP ──
window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 28.6139, lng: 77.2090 },
    zoom: 13,
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "simplified" }] },
      { elementType: "geometry", stylers: [{ color: "#f5f5f0" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d8e8" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
      { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fafafa" }] },
    ]
  });

  autocomplete = new google.maps.places.Autocomplete(locationInput, {
    types: ["geocode", "establishment"]
  });

  autocomplete.addListener("place_changed", function () {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) {
      setStatus(locationStatus, "⚠️ Couldn't find that place. Try again.");
      return;
    }
    const latLng = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };
    onLocationFound(latLng, place.name || locationInput.value);
  });
};

// ── LOCATION HANDLERS ──
findLocationBtn.addEventListener("click", function () {
  if (!navigator.geolocation) {
    setStatus(locationStatus, "⚠️ Geolocation not supported by your browser.");
    return;
  }
  setStatus(locationStatus, "📡 Detecting your location…");
  findLocationBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      onLocationFound(latLng, "your location");
    },
    (err) => {
      findLocationBtn.disabled = false;
      if (err.code === err.PERMISSION_DENIED) {
        setStatus(locationStatus, "🚫 Location access denied. Try searching instead.");
      } else {
        setStatus(locationStatus, "⚠️ Couldn't get location. Try searching instead.");
      }
    }
  );
});

searchBtn.addEventListener("click", triggerSearch);
locationInput.addEventListener("keydown", (e) => { if (e.key === "Enter") triggerSearch(); });

function triggerSearch() {
  const query = locationInput.value.trim();
  if (!query) { setStatus(locationStatus, "✏️ Please type a location first."); return; }

  setStatus(locationStatus, `🔎 Searching for "${query}"…`);
  searchBtn.disabled = true;

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: query }, function (results, status) {
    searchBtn.disabled = false;
    if (status === "OK" && results.length > 0) {
      const latLng = {
        lat: results[0].geometry.location.lat(),
        lng: results[0].geometry.location.lng()
      };
      onLocationFound(latLng, query);
    } else {
      setStatus(locationStatus, "😕 Couldn't find that location. Try being more specific.");
    }
  });
}

function onLocationFound(latLng, label) {
  userLatLng = latLng;
  findLocationBtn.disabled = false;

  // Show map
  mapSection.style.display = "block";
  map.setCenter(latLng);
  map.setZoom(14);

  // Drop user marker
  new google.maps.Marker({
    position: latLng,
    map: map,
    title: "You",
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: "#2d6a4f",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2.5
    }
  });

  setStatus(locationStatus, `✅ Got it! Now pick your mood below.`);

  // Show mood section
  moodSection.style.display = "block";
  moodSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // Reset results
  resultsSection.style.display = "none";
  selectedMood = null;
  document.querySelectorAll(".mood-card").forEach(c => c.classList.remove("active"));
}

// ── MOOD SELECTION ──
document.querySelectorAll(".mood-card").forEach(card => {
  card.addEventListener("click", function () {
    if (!userLatLng) {
      setStatus(locationStatus, "📍 Please set your location first.");
      document.getElementById("location-section").scrollIntoView({ behavior: "smooth" });
      return;
    }

    document.querySelectorAll(".mood-card").forEach(c => c.classList.remove("active"));
    this.classList.add("active");
    selectedMood = this.dataset.mood;

    searchPlaces(selectedMood);
  });
});

changeMoodBtn.addEventListener("click", function () {
  resultsSection.style.display = "none";
  selectedMood = null;
  document.querySelectorAll(".mood-card").forEach(c => c.classList.remove("active"));
  moodSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ── SEARCH PLACES ──
function searchPlaces(mood) {
  const config = MOOD_CONFIG[mood];

  // Show results section with skeleton
  resultsSection.style.display = "block";
  resultsTitle.textContent = `${config.emoji} ${config.label}`;
  setStatus(resultsStatus, "");
  showSkeletons();
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // Clear old markers
  markers.forEach(m => m.setMap(null));
  markers = [];

  const service = new google.maps.places.PlacesService(map);
  const request = {
    location: userLatLng,
    radius: 3000,
    type: config.types[0],
    rankBy: google.maps.places.RankBy.PROMINENCE
  };

  service.nearbySearch(request, function (results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
      renderPlaces(results.slice(0, 10));
    } else {
      placesList.innerHTML = "";
      setStatus(resultsStatus, "😕 No places found nearby for this mood. Try a different location.");
    }
  });
}

// ── RENDER PLACES ──
function renderPlaces(places) {
  placesList.innerHTML = "";

  places.forEach((place, i) => {
    const dist = userLatLng ? getDistance(userLatLng, {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    }) : null;

    const isOpen = place.opening_hours ? place.opening_hours.isOpen() : null;
    const rating = place.rating || null;
    const price  = place.price_level != null ? "₹".repeat(place.price_level + 1) : null;
    const type   = place.types ? place.types[0].replace(/_/g, " ") : "";

    const card = document.createElement("div");
    card.className = "place-card";
    card.style.animationDelay = `${i * 0.05}s`;

    card.innerHTML = `
      <div class="place-info">
        <div class="place-name">${place.name}</div>
        <div class="place-type">${type}</div>
        <div class="place-meta">
          ${rating ? `<span class="badge rating">⭐ ${rating}</span>` : ""}
          ${isOpen === true  ? `<span class="badge open">● Open now</span>` : ""}
          ${isOpen === false ? `<span class="badge closed">● Closed</span>` : ""}
          ${price ? `<span class="badge price">${price}</span>` : ""}
        </div>
        ${place.vicinity ? `<div class="place-address">📍 ${place.vicinity}</div>` : ""}
      </div>
      <div class="place-actions">
        ${dist ? `<span class="place-distance">${dist}</span>` : ""}
        <button class="btn-directions" onclick="openDirections('${place.geometry.location.lat()}','${place.geometry.location.lng()}', event)">
          🗺 Directions
        </button>
      </div>
    `;

    card.addEventListener("click", () => openModal(place, dist));
    placesList.appendChild(card);

    // Add map marker
    const marker = new google.maps.Marker({
      position: place.geometry.location,
      map: map,
      title: place.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#e76f51",
        fillOpacity: 0.9,
        strokeColor: "#fff",
        strokeWeight: 2
      }
    });

    const infoWin = new google.maps.InfoWindow({
      content: `<div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;padding:2px 4px;">${place.name}${rating ? `<br><span style="color:#f57f17">⭐ ${rating}</span>` : ""}</div>`
    });

    marker.addListener("click", () => infoWin.open(map, marker));
    markers.push(marker);
  });

  map.panTo(userLatLng);
}

// ── MODAL ──
function openModal(place, dist) {
  const isOpen = place.opening_hours ? place.opening_hours.isOpen() : null;
  const rating = place.rating || null;
  const price  = place.price_level != null ? "₹".repeat(place.price_level + 1) : null;
  const type   = place.types ? place.types[0].replace(/_/g, " ") : "";
  const phone  = place.formatted_phone_number || null;
  const lat    = place.geometry.location.lat();
  const lng    = place.geometry.location.lng();

  modalBody.innerHTML = `
    <div class="modal-name">${place.name}</div>
    <div class="modal-type">${type}</div>
    <div class="modal-badges">
      ${rating ? `<span class="badge rating">⭐ ${rating} stars</span>` : ""}
      ${isOpen === true  ? `<span class="badge open">● Open now</span>` : ""}
      ${isOpen === false ? `<span class="badge closed">● Closed</span>` : ""}
      ${price ? `<span class="badge price">${price}</span>` : ""}
      ${dist  ? `<span class="badge">📍 ${dist} away</span>` : ""}
    </div>
    ${place.vicinity ? `<div class="modal-address">🏠 <span>${place.vicinity}</span></div>` : ""}
    <div class="modal-actions">
      <button class="btn-directions" onclick="openDirections('${lat}','${lng}', event)">🗺 Get Directions</button>
      ${phone ? `<button class="btn-call" onclick="window.open('tel:${phone}')">📞 ${phone}</button>` : ""}
    </div>
  `;

  modalOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", function (e) {
  if (e.target === modalOverlay) closeModal();
});

function closeModal() {
  modalOverlay.style.display = "none";
  document.body.style.overflow = "";
}

// ── DIRECTIONS ──
window.openDirections = function (lat, lng, e) {
  if (e) e.stopPropagation();
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
};

// ── HELPERS ──
function getDistance(from, to) {
  const R = 6371000;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng/2)**2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`;
}

function toRad(deg) { return deg * Math.PI / 180; }

function setStatus(el, msg) { el.textContent = msg; }

function showSkeletons() {
  placesList.innerHTML = Array(5).fill(`
    <div class="skeleton-card">
      <div class="skeleton" style="height:16px;width:60%;"></div>
      <div class="skeleton" style="height:12px;width:35%;margin-top:4px;"></div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <div class="skeleton" style="height:22px;width:60px;border-radius:30px;"></div>
        <div class="skeleton" style="height:22px;width:80px;border-radius:30px;"></div>
      </div>
    </div>
  `).join("");
}
