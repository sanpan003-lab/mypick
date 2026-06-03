import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { Leaf, LocateFixed, Map as MapIcon, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { TreeDetails } from '../types/trees';
import { getPickPhoto } from '../services/localStorageDB';
import { fetchPublicTreesInBounds, BoundingBox } from '../services/communityPins';
import { motion, AnimatePresence } from 'motion/react';
import { SearchBar } from './SearchBar';

export interface Pin {
  id: string;
  uid: string;
  lat: number;
  lng: number;
  details: TreeDetails;
  locationDescription?: string;
  notes?: string;
  imageUrl?: string;
  photoUrl?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  address?: string;
  dateAdded: string;
  isPublic?: boolean;
  sharedByUserId?: string;
  savedByUsers?: string[];
}

export interface NoteEntry {
  id: string;
  uid: string;
  date: string;
  title: string;
  content: string;
  photos: string[];
  photoCount?: number;
  weather?: {
    temp: number;
    condition: string;
  };
  harvest?: {
    amount: string;
    item: string;
  };
  mood: string;
  phenologyEvents: string[];
  treeId?: string;
}

// ─── Marker icon factories ─────────────────────────────────────────────────────

/** Green = personal pin (owner). Dark green = this user's pin, lighter = others. */
const createPersonalIcon = (name: string, isOwner: boolean) => {
  const html = renderToString(
    <div className="flex flex-col items-center -ml-4 -mt-12">
      <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm mb-1 whitespace-nowrap border tracking-wider uppercase ${isOwner ? 'bg-[#0a3610] text-[#fdfbf7] border-[#052e16]' : 'bg-[#fdfbf7] text-[#0a3610] border-[#e8e4d9]'}`}>
        {name}
      </div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-[#fdfbf7] ${isOwner ? 'bg-[#0a3610]' : 'bg-[#1a5e24]'}`}>
        <Leaf size={14} className={isOwner ? 'text-[#fdfbf7]' : 'text-white'} />
      </div>
    </div>
  );
  return new L.DivIcon({
    html,
    className: 'custom-div-icon',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  });
};

/** Amber/gold = community pin. Distinct globe icon. */
const createCommunityIcon = (name: string) => {
  const html = renderToString(
    <div className="flex flex-col items-center -ml-4 -mt-12">
      <div className="text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm mb-1 whitespace-nowrap border tracking-wider uppercase bg-amber-500 text-white border-amber-600">
        {name}
      </div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-[#fdfbf7] bg-amber-500">
        <Globe size={14} className="text-white" />
      </div>
    </div>
  );
  return new L.DivIcon({
    html,
    className: 'custom-div-icon',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  });
};

const createUserLocationIcon = () => {
  const html = renderToString(
    <div className="relative flex items-center justify-center">
      <div className="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping" />
      <div className="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
    </div>
  );
  return new L.DivIcon({
    html,
    className: 'user-location-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// ─── Map controller ───────────────────────────────────────────────────────────

interface MapControllerProps {
  center: [number, number];
  onMove?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: BoundingBox) => void;
}

function MapController({ center, onMove, onBoundsChange }: MapControllerProps) {
  const map = useMap();
  const didMount = useRef(false);

  useEffect(() => {
    const currentCenter = map.getCenter();
    const distance = Math.sqrt(
      Math.pow(currentCenter.lat - center[0], 2) +
      Math.pow(currentCenter.lng - center[1], 2)
    );
    if (distance > 0.00001) {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [center, map]);

  const emitBounds = useCallback(() => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    });
  }, [map, onBoundsChange]);

  useMapEvents({
    moveend: () => {
      if (onMove) {
        const c = map.getCenter();
        onMove(c.lat, c.lng);
      }
      emitBounds();
    },
    zoomend: emitBounds,
  });

  // Emit bounds on first render
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      // Wait a tick for the map to fully initialize
      const id = setTimeout(emitBounds, 400);
      return () => clearTimeout(id);
    }
  }, [emitBounds]);

  return null;
}

export type MapStyle = 'standard' | 'satellite' | 'terrain';

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194];

function MapTreeImage({ pin }: { pin: Pin }) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    getPickPhoto(pin.id, 0).then(url => url && setLocalUrl(url));
  }, [pin.id]);

  const src = pin.imageUrls?.[0] ?? pin.imageUrl ?? localUrl;
  if (!src) return null;

  return (
    <div className="w-full shrink-0 rounded-t-xl overflow-hidden" style={{ height: '8rem' }}>
      <img
        src={src}
        alt={pin.details.commonName}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function GroupedPopupContent({ group, onSelectPin }: { group: Pin[]; onSelectPin?: (pin: Pin) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const pin = group[currentIndex];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? group.length - 1 : prev - 1));
  };
  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === group.length - 1 ? 0 : prev + 1));
  };

  const isCommunity = pin.isPublic && pin.uid !== 'local';

  return (
    <div className="max-w-xs font-sans relative">
      {group.length > 1 && (
        <div className="absolute top-2 right-2 z-20 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full font-bold">
          {currentIndex + 1} / {group.length}
        </div>
      )}

      {/* Community badge */}
      {isCommunity && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
          <Globe size={9} />
          Community
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          drag={group.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, { offset }) => {
            if (offset.x < -50) handleNext();
            else if (offset.x > 50) handlePrev();
          }}
          className="w-full flex flex-col"
        >
          <MapTreeImage pin={pin} />
          {/* Text block — normal block flow, always below image */}
          <div className="flex flex-col gap-2 px-3 pt-3 pb-1">
            <h3 className="font-serif italic text-xl text-[#0a3610] leading-tight">{pin.details.commonName}</h3>
            {pin.details.scientificName && (
              <p className="text-xs font-bold text-[#6b4c3a] uppercase tracking-wider leading-tight">{pin.details.scientificName}</p>
            )}
            {pin.details.description && (
              <p className="text-sm line-clamp-3 text-gray-700 leading-snug">{pin.details.description}</p>
            )}
            {pin.locationDescription && (
              <p className="text-xs text-[#0a3610] font-medium">📍 {pin.locationDescription}</p>
            )}
            {pin.notes && (
              <p className="text-xs text-gray-600 italic border-t border-[#e8e4d9] pt-2">"{pin.notes}"</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={e => {
                  e.stopPropagation();
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                  const url = isIOS
                    ? `http://maps.apple.com/?daddr=${pin.lat},${pin.lng}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`;
                  window.open(url, '_blank');
                }}
                className="flex-1 bg-[#0a3610] text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-[#052e16] transition-colors"
              >
                <MapIcon size={13} />
                Navigate
              </button>

              {onSelectPin && (
                <button
                  onClick={e => { e.stopPropagation(); onSelectPin(pin); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors ${isCommunity ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[#f4f1e8] hover:bg-[#e8e4d9] text-[#0a3610]'}`}
                >
                  <Leaf size={13} />
                  Details
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {group.length > 1 && (
        <div className="flex justify-between mt-2 border-t border-[#e8e4d9] pt-2 px-1">
          <button onClick={handlePrev} className="p-1.5 bg-[#f4f1e8] rounded-full text-[#0a3610] hover:bg-[#e8e4d9] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] text-gray-500 flex items-center uppercase tracking-widest font-bold">Swipe to see more</span>
          <button onClick={handleNext} className="p-1.5 bg-[#f4f1e8] rounded-full text-[#0a3610] hover:bg-[#e8e4d9] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Legend pill ──────────────────────────────────────────────────────────────

function MapLegend({ communityCount }: { communityCount: number }) {
  if (communityCount === 0) return null;
  return (
    <div className="absolute bottom-24 left-4 z-30 flex flex-col gap-1.5 pointer-events-none">
      <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-[#e8e4d9]">
        <div className="w-3 h-3 rounded-full bg-[#0a3610]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#0a3610]">My Trees</span>
      </div>
      <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-[#e8e4d9]">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">{communityCount} Community</span>
      </div>
    </div>
  );
}

// ─── PickMap component ────────────────────────────────────────────────────────

interface PickMapProps {
  pins: Pin[];
  userLocation: [number, number] | null;
  center?: [number, number];
  isConfirmingLocation?: boolean;
  onCenterChange?: (lat: number, lng: number) => void;
  onLocateMe?: () => void;
  mapStyle?: MapStyle;
  filterQuery?: string;
  onFilterChange?: (q: string) => void;
  onSelectPin?: (pin: Pin) => void;
}

export function PickMap({
  pins,
  userLocation,
  center: propCenter,
  isConfirmingLocation,
  onCenterChange,
  onLocateMe,
  mapStyle = 'standard',
  filterQuery = '',
  onFilterChange,
  onSelectPin,
}: PickMapProps) {
  const center = propCenter || userLocation || DEFAULT_CENTER;
  const [communityPins, setCommunityPins] = useState<Pin[]>([]);
  const fetchAbortRef = useRef<number>(0);

  // Fetch community pins when bounds change (debounced)
  const handleBoundsChange = useCallback((bounds: BoundingBox) => {
    const generation = ++fetchAbortRef.current;
    fetchPublicTreesInBounds(bounds).then(pins => {
      if (fetchAbortRef.current === generation) {
        setCommunityPins(pins);
      }
    });
  }, []);

  // Filter personal pins by search query
  const filteredPins = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter(p =>
      p.details.commonName.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q) ||
      p.locationDescription?.toLowerCase().includes(q) ||
      p.details.scientificName?.toLowerCase().includes(q)
    );
  }, [pins, filterQuery]);

  // Build combined pin list: personal first, then community (deduplicated by id)
  const personalIds = useMemo(() => new Set(pins.map(p => p.id)), [pins]);
  const filteredCommunity = useMemo(
    () => communityPins.filter(cp => !personalIds.has(cp.id)),
    [communityPins, personalIds]
  );

  // Group nearby pins together
  const groupedPersonal = useMemo(() => groupByProximity(filteredPins), [filteredPins]);
  const groupedCommunity = useMemo(() => groupByProximity(filteredCommunity), [filteredCommunity]);

  const getTileLayer = () => {
    switch (mapStyle) {
      case 'satellite':
        return <TileLayer attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />;
      case 'terrain':
        return <TileLayer attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" />;
      default:
        return <TileLayer attribution='&copy; <a href="https://carto.com/">Carto</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />;
    }
  };

  return (
    <div className="relative w-full h-full">
      {!isConfirmingLocation && onFilterChange && (
        <>
          <SearchBar value={filterQuery} onChange={onFilterChange} />
          {filterQuery && (
            <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-[25] bg-[#0a3610] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
              {filteredPins.length} {filteredPins.length === 1 ? 'tree' : 'trees'} found
            </div>
          )}
        </>
      )}

      <MapContainer center={center} zoom={15} className="w-full h-full z-0" zoomControl={false}>
        {getTileLayer()}
        <MapController center={center} onMove={onCenterChange} onBoundsChange={handleBoundsChange} />

        {/* User location */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={createUserLocationIcon()} zIndexOffset={1000}>
              <Popup><div className="text-xs font-bold text-blue-600">You are here</div></Popup>
            </Marker>
            <Circle center={userLocation} radius={100} pathOptions={{ fillColor: 'blue', fillOpacity: 0.1, color: 'transparent' }} />
          </>
        )}

        {/* Personal pins — green */}
        {groupedPersonal.map((group, i) => (
          <Marker
            key={`personal-${i}`}
            position={[group[0].lat, group[0].lng]}
            icon={createPersonalIcon(group.length > 1 ? `${group.length} Trees` : group[0].details.commonName, true)}
            zIndexOffset={200}
          >
            <Popup className="custom-popup">
              <GroupedPopupContent group={group} onSelectPin={onSelectPin} />
            </Popup>
          </Marker>
        ))}

        {/* Community pins — amber */}
        {groupedCommunity.map((group, i) => (
          <Marker
            key={`community-${i}`}
            position={[group[0].lat, group[0].lng]}
            icon={createCommunityIcon(group.length > 1 ? `${group.length} Trees` : group[0].details.commonName)}
            zIndexOffset={100}
          >
            <Popup className="custom-popup">
              <GroupedPopupContent group={group} onSelectPin={onSelectPin} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <MapLegend communityCount={filteredCommunity.length} />

      {/* Recenter button */}
      {userLocation && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            if (onLocateMe) onLocateMe();
            else onCenterChange?.(userLocation[0], userLocation[1]);
          }}
          className="absolute top-24 right-4 z-30 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-[#0a3610] active:scale-95 transition-transform border border-[#e8e4d9] touch-none"
          title="Recenter to my location"
        >
          <LocateFixed size={20} className="fill-none" />
        </button>
      )}
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function groupByProximity(pins: Pin[]): Pin[][] {
  const groups: Pin[][] = [];
  const threshold = 0.0001; // ~11 m
  for (const pin of pins) {
    const existing = groups.find(g =>
      Math.abs(g[0].lat - pin.lat) < threshold &&
      Math.abs(g[0].lng - pin.lng) < threshold
    );
    if (existing) existing.push(pin);
    else groups.push([pin]);
  }
  return groups;
}
