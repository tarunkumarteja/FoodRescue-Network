import React, { useEffect, useRef, useState } from 'react';

export default function MapView({ listings = [], organizations = [], activeDeliveries = [], onSelectListing }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [filterType, setFilterType] = useState('ALL'); // ALL, DONOR, RECIPIENT, DELIVERIES

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if Leaflet window.L is available
    if (typeof window.L === 'undefined') {
      console.warn("Leaflet not yet loaded from CDN.");
      return;
    }

    const L = window.L;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Initialize Map at Bengaluru center
    const map = L.map(mapContainerRef.current).setView([12.9716, 77.6100], 13);
    mapInstanceRef.current = map;

    // Tile Layer: OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom Icons using SVG
    const createCustomIcon = (emoji, bgColor) => L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          background-color: ${bgColor};
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        ">
          ${emoji}
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20]
    });

    const donorIcon = createCustomIcon('🏪', '#16a34a'); // Green
    const recipientIcon = createCustomIcon('💚', '#0284c7'); // Blue
    const volunteerIcon = createCustomIcon('🚚', '#d97706'); // Orange

    // Plot Donors & Surplus Listings
    if (filterType === 'ALL' || filterType === 'DONOR') {
      listings.forEach(listing => {
        if (listing.latitude && listing.longitude) {
          const marker = L.marker([listing.latitude, listing.longitude], { icon: donorIcon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: inherit; font-size: 13px; max-width: 220px;">
              <span style="background: #dcfce7; color: #166534; font-weight: bold; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">
                SURPLUS AVAILABLE
              </span>
              <h4 style="font-weight: bold; margin: 6px 0 2px; color: #0f172a; font-size: 14px;">${listing.title}</h4>
              <p style="margin: 0; color: #475569; font-size: 12px;"><strong>${listing.quantity}</strong> ${listing.unit_of_measure} available</p>
              <p style="margin: 4px 0; color: #64748b; font-size: 11px;">📍 ${listing.pickup_address}</p>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #059669; font-weight: 600;">
                Storage: ${listing.storage_condition}
              </div>
            </div>
          `);
        }
      });
    }

    // Plot Recipient NGOs
    if (filterType === 'ALL' || filterType === 'RECIPIENT') {
      organizations.filter(o => o.organization_type === 'RECIPIENT').forEach(ngo => {
        if (ngo.latitude && ngo.longitude) {
          const marker = L.marker([ngo.latitude, ngo.longitude], { icon: recipientIcon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: inherit; font-size: 13px; max-width: 220px;">
              <span style="background: #e0f2fe; color: #0369a1; font-weight: bold; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">
                VERIFIED RECIPIENT
              </span>
              <h4 style="font-weight: bold; margin: 6px 0 2px; color: #0f172a; font-size: 14px;">${ngo.name}</h4>
              <p style="margin: 0; color: #475569; font-size: 12px;">Daily Capacity: <strong>${ngo.capacity} packets</strong></p>
              <p style="margin: 4px 0; color: #64748b; font-size: 11px;">📍 ${ngo.address}</p>
              <p style="margin: 0; color: #0284c7; font-size: 11px;">📞 ${ngo.contact_phone}</p>
            </div>
          `);
        }
      });
    }

    // Plot Active Volunteer Delivery Route (Slide 12: Royal Spice -> Asha Jyothi)
    if (filterType === 'ALL' || filterType === 'DELIVERIES') {
      const donorCoords = [12.9716, 77.6006];
      const ngoCoords = [12.9634, 77.6012];
      const midpoint = [(donorCoords[0] + ngoCoords[0]) / 2, (donorCoords[1] + ngoCoords[1]) / 2];

      const polyline = L.polyline([donorCoords, ngoCoords], {
        color: '#d97706',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8
      }).addTo(map);

      const riderMarker = L.marker(midpoint, { icon: volunteerIcon }).addTo(map);
      riderMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <span style="background: #fef3c7; color: #92400e; font-weight: bold; font-size: 10px; padding: 2px 6px; border-radius: 9999px;">
            DISPATCH ACTIVE
          </span>
          <h4 style="font-weight: bold; margin: 6px 0 2px; color: #0f172a;">Delivery #1 (30 Packets Biryani)</h4>
          <p style="margin: 0; color: #475569; font-size: 11px;">Rider: Arun Teja</p>
          <p style="margin: 4px 0 0; color: #16a34a; font-size: 11px; font-weight: 600;">✓ OTP Handover Verified</p>
        </div>
      `);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [listings, organizations, filterType]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span>🗺️</span> Interactive Food Rescue Map (Leaflet)
          </h3>
          <p className="text-xs text-slate-500">
            Real-time geospatial visualization of food donors, recipient shelters, and volunteer transit
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'ALL' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All Markers
          </button>
          <button
            onClick={() => setFilterType('DONOR')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${filterType === 'DONOR' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Donors
          </button>
          <button
            onClick={() => setFilterType('RECIPIENT')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${filterType === 'RECIPIENT' ? 'bg-white text-sky-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
            NGOs
          </button>
          <button
            onClick={() => setFilterType('DELIVERIES')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${filterType === 'DELIVERIES' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Active Deliveries
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-[450px] rounded-xl border border-slate-200 overflow-hidden z-10 shadow-inner"
      />

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><strong className="text-emerald-700">🏪 Green:</strong> Food Donors</span>
          <span className="flex items-center gap-1"><strong className="text-sky-700">💚 Blue:</strong> Recipient Shelters</span>
          <span className="flex items-center gap-1"><strong className="text-amber-700">🚚 Orange:</strong> Volunteer En Route</span>
        </div>
        <span>Coordinates: Bengaluru Central (12.9716° N, 77.6006° E)</span>
      </div>
    </div>
  );
}
