import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Plus, Minus, Loader2, SortAsc } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { fetchRepeaterBookRaw, repeaterToChannel, type RepeaterResult } from '../lib/repeaterbook';
import type { MemoryChannel } from '../lib/types';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RepeaterBookPageProps {
  onAddChannels: (channels: MemoryChannel[]) => void;
}

function MapRecenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], map.getZoom()); }, [lat, lon, map]);
  return null;
}

export function RepeaterBookPage({ onAddChannels }: RepeaterBookPageProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [country, setCountry] = useState('Spain');
  const [state, setState] = useState('');
  const [band, setBand] = useState<'ALL' | 'VHF' | 'UHF'>('ALL');
  const [radius, setRadius] = useState(100);
  const [loading, setLoading] = useState(false);
  const [repeaters, setRepeaters] = useState<RepeaterResult[]>([]);
  const [selected, setSelected] = useState<RepeaterResult | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'frequency'>('distance');

  // Get user location on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { /* silently fail */ }
    );
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await fetchRepeaterBookRaw(country, state, band, userCoords?.lat, userCoords?.lon);
      setRepeaters(results);
      setSelected(null);
      if (results.length === 0) toast.error(t('repeaterBook.noResults'));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = repeaters;
    if (userCoords && radius < 500) {
      list = list.filter(r => r.distance !== undefined && r.distance <= radius);
    }
    if (sortBy === 'distance') list = [...list].sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    else list = [...list].sort((a, b) => a.frequency - b.frequency);
    return list;
  }, [repeaters, radius, sortBy, userCoords]);

  const mapCenter = useMemo(() => {
    if (selected) return { lat: selected.lat, lon: selected.lon };
    if (userCoords) return userCoords;
    return { lat: 41.39, lon: 2.17 }; // Barcelona fallback
  }, [selected, userCoords]);

  const handleAdd = (r: RepeaterResult) => {
    const ch = repeaterToChannel(r);
    onAddChannels([ch]);
    toast.success(t('repeaterBook.added', { callsign: r.callsign || r.city }));
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel — search + list */}
      <div className="w-[420px] shrink-0 flex flex-col border-r border-w-border bg-w-bg-elev overflow-hidden">
        {/* Search controls */}
        <div className="p-4 border-b border-w-border flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-w-accent shrink-0" />
            <h2 className="text-sm font-bold text-w-fg">{t('repeaterBook.title')}</h2>
          </div>

          <div className="flex gap-2">
            <input
              type="text" value={country} onChange={(e) => setCountry(e.target.value)}
              placeholder={t('repeaterBook.country')}
              className="flex-1 bg-w-bg border border-w-border text-xs text-w-fg rounded-theme-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-w-accent"
            />
            <input
              type="text" value={state} onChange={(e) => setState(e.target.value)}
              placeholder={t('repeaterBook.state')}
              className="w-28 bg-w-bg border border-w-border text-xs text-w-fg rounded-theme-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-w-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <select value={band} onChange={(e) => setBand(e.target.value as any)}
              className="bg-w-bg border border-w-border text-xs text-w-fg rounded-theme-md px-2 py-1.5 outline-none cursor-pointer">
              <option value="ALL">ALL</option>
              <option value="VHF">VHF</option>
              <option value="UHF">UHF</option>
            </select>

            <button onClick={handleSearch} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-w-accent text-white text-xs font-bold rounded-theme-md hover:brightness-110 disabled:opacity-40 transition-colors">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {t('repeaterBook.search')}
            </button>
          </div>

          {/* Radius slider */}
          {userCoords && repeaters.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-w-fg-faint uppercase">{t('repeaterBook.radius')}</span>
              <input type="range" min={5} max={500} value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="flex-1 h-1.5 appearance-none bg-w-bg-sunken rounded-full"
                style={{ accentColor: 'var(--w-accent)' }}
              />
              <span className="text-[10px] font-mono font-bold text-w-fg-soft w-14 text-right">{radius} km</span>
            </div>
          )}

          {/* Sort + count */}
          {repeaters.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-w-fg-faint">
                {t('repeaterBook.count', { count: filtered.length })}
              </span>
              <button onClick={() => setSortBy(s => s === 'distance' ? 'frequency' : 'distance')}
                className="flex items-center gap-1 text-[10px] font-mono text-w-fg-mute hover:text-w-fg-soft">
                <SortAsc className="w-3 h-3" />
                {sortBy === 'distance' ? t('repeaterBook.sortDistance') : t('repeaterBook.sortFreq')}
              </button>
            </div>
          )}
        </div>

        {/* Repeater list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((r, i) => (
            <div
              key={`${r.callsign}-${r.frequency}-${i}`}
              onClick={() => setSelected(r)}
              className={`px-4 py-3 border-b border-w-border-soft cursor-pointer transition-colors ${
                selected === r ? 'bg-w-accent-soft/30' : 'hover:bg-w-bg-hover'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-w-accent-fg">{r.callsign || '—'}</span>
                    {r.distance !== undefined && (
                      <span className="text-[10px] font-mono text-w-fg-faint">{r.distance.toFixed(1)} km</span>
                    )}
                  </div>
                  <p className="text-[11px] text-w-fg-soft truncate">{r.city}{r.region ? `, ${r.region}` : ''}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold text-w-fg">{r.frequency.toFixed(4)}</span>
                    {r.pl && <span className="text-[10px] px-1.5 py-0.5 rounded bg-w-bg-sunken border border-w-border font-mono text-w-fg-mute">PL {r.pl}</span>}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleAdd(r); }}
                  className="shrink-0 flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold text-w-accent-fg border border-w-accent rounded-theme-md hover:bg-w-accent-soft/30 transition-colors">
                  <Plus className="w-3 h-3" /> {t('repeaterBook.add')}
                </button>
              </div>

              {/* Expanded detail when selected */}
              {selected === r && (
                <div className="mt-3 pt-3 border-t border-w-border-soft grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-w-fg-faint uppercase">{t('repeaterBook.detail.freq')}</span>
                    <p className="text-w-fg font-bold">{r.frequency.toFixed(6)}</p>
                  </div>
                  <div>
                    <span className="text-w-fg-faint uppercase">{t('repeaterBook.detail.input')}</span>
                    <p className="text-w-fg font-bold">{r.inputFreq > 0 ? r.inputFreq.toFixed(6) : '—'}</p>
                  </div>
                  <div>
                    <span className="text-w-fg-faint uppercase">{t('repeaterBook.detail.offset')}</span>
                    <p className="text-w-fg font-bold">
                      {r.inputFreq > 0 && r.inputFreq !== r.frequency
                        ? `${r.inputFreq > r.frequency ? '+' : ''}${(r.inputFreq - r.frequency).toFixed(3)}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-w-fg-faint uppercase">PL</span>
                    <p className="text-w-fg font-bold">{r.pl || '—'}</p>
                  </div>
                  <div>
                    <span className="text-w-fg-faint uppercase">TSQ</span>
                    <p className="text-w-fg font-bold">{r.tsq || '—'}</p>
                  </div>
                  <div>
                    <span className="text-w-fg-faint uppercase">{t('repeaterBook.detail.mode')}</span>
                    <p className="text-w-fg font-bold">FM</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lon]}
          zoom={9}
          className="w-full h-full"
          style={{ background: 'var(--w-bg-sunken)' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter lat={mapCenter.lat} lon={mapCenter.lon} />
          {filtered.filter(r => r.lat && r.lon).map((r, i) => (
            <Marker
              key={`${r.callsign}-${r.frequency}-${i}`}
              position={[r.lat, r.lon]}
              eventHandlers={{ click: () => setSelected(r) }}
            >
              <Popup>
                <strong>{r.callsign}</strong><br />
                {r.frequency.toFixed(4)} MHz<br />
                {r.city}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
