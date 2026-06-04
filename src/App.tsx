import { useState, useEffect } from 'react';
import { PickMap, Pin, NoteEntry } from './components/PickMap';
import { LoadingLeaf } from './components/LoadingLeaf';
import { TopBar } from './components/TopBar';
import { BottomNav, Tab } from './components/BottomNav';
import { ConfirmLocationSheet } from './components/ConfirmLocationSheet';
import { SaveLocationForm } from './components/SaveLocationForm';
import { SuccessOverlay } from './components/SuccessOverlay';
import { ChangelogOverlay } from './components/ChangelogOverlay';
import { MyTrees } from './components/MyTrees';
import { TreeProfile } from './components/TreeProfile';
import { MyNotes } from './components/MyNotes';
import { Sidebar } from './components/Sidebar';
import { ErrorModal } from './components/ErrorModal';
import { MapStyle } from './components/PickMap';
import { fetchAddress } from './services/geocoding';
import { AnimatePresence } from 'motion/react';
import {
  getAllPicks, savePick, deletePick, replaceAllPicks,
  getAllNotes, saveNote, deleteNote, replaceAllNotes,
  savePickPhoto, deletePhotosForId,
  saveNotePhoto,
} from './services/localStorageDB';
import { backupToDrive, restoreFromDrive, PopupBlockedError } from './services/googleDriveBackup';
import { publishTree } from './services/communityPins';

const CURRENT_USER_ID = 'local';

export default function App() {
  const [picks, setPicks] = useState<Pin[]>([]);
  const [journal, setJournal] = useState<NoteEntry[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('explorer');
  const [selectedTree, setSelectedTree] = useState<Pin | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCloneSuccess, setShowCloneSuccess] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  // Pending deep-link tree ID to open after DB is ready
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#\/tree\/(.+)$/);
    return match ? match[1] : null;
  });

  // Drive sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLabel, setSyncLabel] = useState('');
  const [syncDone, setSyncDone] = useState<{ treeCount: number; noteCount: number } | null>(null);

  // Map / location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [currentAddress, setCurrentAddress] = useState('Finding address...');
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);
  const [isFillingDetails, setIsFillingDetails] = useState(false);
  const [mapFilter, setMapFilter] = useState('');

  // App settings
  const [appSettings, setAppSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('appSettings');
      return saved ? JSON.parse(saved) : { mapStyle: 'standard' as MapStyle, notificationsEnabled: false };
    } catch {
      return { mapStyle: 'standard' as MapStyle, notificationsEnabled: false };
    }
  });

  if (asyncError) throw asyncError;

  // ─── Boot: load from IndexedDB ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [loadedPicks, loadedNotes] = await Promise.all([getAllPicks(), getAllNotes()]);
        setPicks(loadedPicks);
        setJournal(loadedNotes);
        // Resolve deep link after data is ready
        if (pendingDeepLinkId) {
          const target = loadedPicks.find(p => p.id === pendingDeepLinkId);
          if (target) {
            setSelectedTree(target);
          } else {
            // Pin not in local collection — create a stub so the profile opens
            // with a "Save to My Journal" prompt (uid differs from CURRENT_USER_ID)
            setSelectedTree({
              id: pendingDeepLinkId,
              uid: 'shared',
              lat: 0,
              lng: 0,
              details: { commonName: 'Shared Tree' },
              dateAdded: new Date().toISOString(),
            });
          }
          setPendingDeepLinkId(null);
          // Clear the hash so refreshes don't re-open the deep link
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (e) {
        console.error('Failed to load local data', e);
      } finally {
        setIsDbReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
  }, [appSettings]);

  // ─── PWA install prompt ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // ─── Geolocation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc: [number, number] = [coords.latitude, coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
      },
      (e) => console.error('Location error', e),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setUserLocation([coords.latitude, coords.longitude]),
      (e) => console.error('Watch error', e),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Reverse-geocode when confirming location
  useEffect(() => {
    if (!isConfirmingLocation) return;
    const timer = setTimeout(async () => {
      const addr = await fetchAddress(mapCenter[0], mapCenter[1]);
      setCurrentAddress(addr);
    }, 500);
    return () => clearTimeout(timer);
  }, [mapCenter, isConfirmingLocation]);

  // ─── Tab navigation ──────────────────────────────────────────────────────────
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedTree(null);
    if (tab === 'save_location') {
      setIsConfirmingLocation(true);
      setIsFillingDetails(false);
      if (userLocation) setMapCenter(userLocation);
    } else {
      setIsConfirmingLocation(false);
      setIsFillingDetails(false);
    }
  };

  // ─── Save pin ────────────────────────────────────────────────────────────────
  // ─── Weather lookup (Open-Meteo, no API key required) ──────────────────────
  const WMO_CONDITIONS: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Violent showers',
    85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm',
    96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ hail',
  };

  const fetchWeather = async (lat: number, lng: number): Promise<{ temp: number; condition: string } | undefined> => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const data = await res.json();
      const temp = data?.current?.temperature_2m;
      const code = data?.current?.weather_code;
      if (typeof temp !== 'number') return undefined;
      return { temp: Math.round(temp), condition: WMO_CONDITIONS[code] ?? 'Unknown' };
    } catch (err) {
      console.warn('[weather] lookup failed:', err);
      return undefined;
    }
  };

  // ─── Auto-create a journal entry when a brand-new tree is saved ────────────
  const createAutoJournalEntry = async (pick: Pin) => {
    try {
      const weather = await fetchWeather(pick.lat, pick.lng);
      const now = new Date();
      const id = crypto.randomUUID();
      const locationLine = pick.address || pick.locationDescription || 'Location not specified';
      const entry: NoteEntry = {
        id,
        uid: 'local',
        date: now.toISOString(),
        title: `Discovered ${pick.details.commonName}`,
        content: `Added ${pick.details.commonName} to the map on ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.\n\nLocation: ${locationLine}\n${weather ? `Weather: ${weather.temp}°F, ${weather.condition}` : ''}\n\n— Your thoughts:\n`,
        photos: [],
        weather,
        mood: '',
        phenologyEvents: ['Planted / Discovered'],
        treeId: pick.id,
      };
      await saveNote(entry);
      setJournal(prev => [...prev, entry]);
    } catch (err) {
      console.warn('[auto-journal] failed:', err);
    }
  };

  const handleSaveLocation = async (pick: Pin, base64Photos: string[]) => {
    await savePick(pick);
    // Auto-create a journal entry for this new find (silent, background)
    createAutoJournalEntry(pick);
    setPicks(prev => {
      if (prev.some(p => p.id === pick.id)) return prev;
      return [...prev, pick];
    });
    // Publish to community feed if user opted in
    if (pick.isPublic) {
      publishTree(pick).catch(err => console.warn('[community] publish failed:', err));
    }
    setIsFillingDetails(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setActiveTab('explorer');
    }, 2000);
  };

  // ─── Delete tree ─────────────────────────────────────────────────────────────
  const handleDeleteTree = async (id: string, closeProfile?: () => void) => {
    if (closeProfile) closeProfile();
    await deletePick(id);
    await deletePhotosForId(id);
    setPicks(prev => prev.filter(p => p.id !== id));
    if (selectedTree?.id === id) setSelectedTree(null);
  };

  // ─── Edit tree ───────────────────────────────────────────────────────────────
  const handleEditTree = async (updatedPin: Pin) => {
    // Bug 3 fix: extract any newly added base64 images from imageUrls,
    // persist them to the photo store keyed by index, then strip them from the
    // pin row (photos are loaded back via getPickPhoto, not from pin.imageUrls).
    const base64Photos = (updatedPin.imageUrls ?? []).filter(u => u.startsWith('data:'));
    if (base64Photos.length > 0) {
      // Delete old photos first so gaps don't occur when count shrinks
      await deletePhotosForId(updatedPin.id);
      for (let i = 0; i < base64Photos.length; i++) {
        await savePickPhoto(updatedPin.id, i, base64Photos[i]);
      }
    }
    // Strip raw base64 from the stored pin row (keeps row size small)
    const pinToSave: Pin = { ...updatedPin, imageUrls: [] };
    await savePick(pinToSave);
    setPicks(prev => prev.map(p => p.id === updatedPin.id ? pinToSave : p));
    if (selectedTree?.id === updatedPin.id) setSelectedTree(pinToSave);
  };

  // ─── Clone shared tree into local collection ─────────────────────────────────
  const handleCloneTree = async (sourcePin: Pin) => {
    const clonedId = crypto.randomUUID();
    const cloned: Pin = {
      ...sourcePin,
      id: clonedId,
      uid: CURRENT_USER_ID,
      dateAdded: new Date().toISOString(),
      // Drop any remote image URLs that won't be accessible locally
      imageUrls: sourcePin.imageUrls?.filter(u => u.startsWith('data:')) ?? [],
    };
    await savePick(cloned);
    setPicks(prev => {
      if (prev.some(p => p.id === clonedId)) return prev;
      return [...prev, cloned];
    });
    setShowCloneSuccess(true);
    setTimeout(() => setShowCloneSuccess(false), 2500);
  };

  // ─── Journal ─────────────────────────────────────────────────────────────────
  const handleAddJournalEntry = async (entry: NoteEntry) => {
    const id = crypto.randomUUID();
    const saved: NoteEntry = { ...entry, id, uid: 'local' };

    if (saved.photos && saved.photos.length > 0) {
      for (let i = 0; i < saved.photos.length; i++) {
        await saveNotePhoto(id, i, saved.photos[i]);
      }
      saved.photos = saved.photos.map((_, i) => `note_${id}_${i}`);
    }

    await saveNote(saved);
    setJournal(prev => [...prev, saved]);
  };

  const handleDeleteJournalEntry = async (id: string) => {
    await deleteNote(id);
    await deletePhotosForId(`note_${id}`);
    setJournal(prev => prev.filter(n => n.id !== id));
  };

  const handleUpdateJournalEntry = async (updated: NoteEntry) => {
    await saveNote(updated);
    setJournal(prev => prev.map(n => (n.id === updated.id ? updated : n)));
  };

  // ─── Upload photo (local base64) ─────────────────────────────────────────────
  const handleUploadPhoto = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ─── Google Drive backup ─────────────────────────────────────────────────────
  const handleDriveBackup = async () => {
    setIsSyncing(true);
    setSyncDone(null);
    setSyncProgress(0);
    try {
      const result = await backupToDrive(picks, journal, ({ current, total, label }) => {
        setSyncProgress(Math.round((current / total) * 100));
        setSyncLabel(label);
      });
      setSyncDone({ treeCount: result.treeCount, noteCount: result.noteCount });
    } catch (err) {
      if (err instanceof PopupBlockedError) {
        // Let the Sidebar's local handler show the inline banner
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setModalError(`Drive backup failed:\n\n${msg}`);
    } finally {
      setIsSyncing(false);
      setSyncLabel('');
    }
  };

  // ─── Google Drive restore ────────────────────────────────────────────────────
  const handleDriveRestore = async () => {
    setIsSyncing(true);
    setSyncLabel('Connecting to Google Drive...');
    try {
      const { picks: restored, notes: restoredNotes } = await restoreFromDrive();
      await replaceAllPicks(restored);
      await replaceAllNotes(restoredNotes);
      setPicks(restored);
      setJournal(restoredNotes);
      setSyncDone({ treeCount: restored.length, noteCount: restoredNotes.length });
    } catch (err) {
      if (err instanceof PopupBlockedError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setModalError(`Drive restore failed:\n\n${msg}`);
    } finally {
      setIsSyncing(false);
      setSyncLabel('');
    }
  };

  // ─── Local JSON backup / restore ────────────────────────────────────────────
  const handleLocalBackup = async () => {
    const { getAllPhotos } = await import('./services/localStorageDB');
    const photos = await getAllPhotos();
    const blob = new Blob(
      [JSON.stringify({ picks, notes: journal, photos, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orchard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLocalRestore = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const restoredPicks: Pin[] = data.picks || [];
      const restoredNotes: NoteEntry[] = data.notes || [];

      await replaceAllPicks(restoredPicks);
      await replaceAllNotes(restoredNotes);

      if (data.photos) {
        const { restorePhotos } = await import('./services/localStorageDB');
        await restorePhotos(data.photos);
      }

      setPicks(restoredPicks);
      setJournal(restoredNotes);
      setSyncDone({ treeCount: restoredPicks.length, noteCount: restoredNotes.length });
    } catch (err) {
      setModalError('Failed to restore backup. The file may be corrupt or in an invalid format.');
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const loc: [number, number] = [coords.latitude, coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => setModalError('Could not get your current location. Please check your browser location permissions.'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }
  };

  const handleCancel = () => {
    setIsConfirmingLocation(false);
    setIsFillingDetails(false);
    setActiveTab('explorer');
  };

  const handleToggleNotifications = async () => {
    if (!appSettings.notificationsEnabled && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') setAppSettings({ ...appSettings, notificationsEnabled: true });
    } else {
      setAppSettings({ ...appSettings, notificationsEnabled: false });
    }
  };

  if (!isDbReady) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-[#fdfbf7]">
        <LoadingLeaf message="Loading your orchard..." />
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full min-h-screen bg-gray-200">
      <div className="w-full sm:max-w-md bg-[#fdfbf7] h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          pickCount={picks.length}
          mapStyle={appSettings.mapStyle}
          onMapStyleChange={(style) => setAppSettings({ ...appSettings, mapStyle: style })}
          notificationsEnabled={appSettings.notificationsEnabled}
          onToggleNotifications={handleToggleNotifications}
          onChangelogClick={() => { setIsSidebarOpen(false); setShowChangelog(true); }}
          onInstall={deferredPrompt ? handleInstall : undefined}
          onLocalBackup={handleLocalBackup}
          onLocalRestore={handleLocalRestore}
          onDriveBackup={handleDriveBackup}
          onDriveRestore={handleDriveRestore}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          syncLabel={syncLabel}
          syncDone={syncDone}
          onDismissSyncDone={() => setSyncDone(null)}
        />

        <div className="flex-1 relative flex flex-col overflow-hidden">
          {(activeTab === 'explorer' || isConfirmingLocation || isFillingDetails) && (
            <PickMap
              pins={picks}
              userLocation={userLocation}
              center={mapCenter}
              isConfirmingLocation={isConfirmingLocation}
              onCenterChange={(lat, lng) => setMapCenter([lat, lng])}
              onLocateMe={handleLocateMe}
              mapStyle={appSettings.mapStyle}
              filterQuery={mapFilter}
              onFilterChange={setMapFilter}
              onSelectPin={(pin) => setSelectedTree(pin)}
            />
          )}

          {activeTab === 'mytrees' && (
            <MyTrees
              pins={picks}
              userLocation={userLocation}
              onViewOnMap={(pin) => { setMapCenter([pin.lat, pin.lng]); setActiveTab('explorer'); }}
              onSelectTree={(pin) => setSelectedTree(pin)}
              onDeleteTree={handleDeleteTree}
            />
          )}

          {activeTab === 'journal' && (
            <MyNotes
              entries={journal}
              onAddEntry={handleAddJournalEntry}
              onDeleteEntry={handleDeleteJournalEntry}
              onUpdateEntry={handleUpdateJournalEntry}
            />
          )}

          {isConfirmingLocation && !isFillingDetails && (
            <ConfirmLocationSheet
              lat={mapCenter[0]}
              lng={mapCenter[1]}
              address={currentAddress}
              onCancel={handleCancel}
              onNext={() => { setIsConfirmingLocation(false); setIsFillingDetails(true); }}
              onEdit={handleLocateMe}
              onManualChange={(lat, lng) => { setMapCenter([lat, lng]); setUserLocation([lat, lng]); }}
            />
          )}

          {isFillingDetails && (
            <SaveLocationForm
              lat={mapCenter[0]}
              lng={mapCenter[1]}
              address={currentAddress}
              onSave={handleSaveLocation}
              onCancel={handleCancel}
            />
          )}
        </div>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

        {showSuccess && <SuccessOverlay />}

        {showCloneSuccess && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#0a3610] text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Tree added to your collection!
          </div>
        )}

        <ChangelogOverlay isOpen={showChangelog} onClose={() => setShowChangelog(false)} />

        <ErrorModal error={modalError} onClose={() => setModalError(null)} />

        <AnimatePresence>
          {selectedTree && (
            <TreeProfile
              pin={selectedTree}
              onClose={() => setSelectedTree(null)}
              onViewOnMap={(pin) => { setMapCenter([pin.lat, pin.lng]); setActiveTab('explorer'); setSelectedTree(null); }}
              onDeleteTree={handleDeleteTree}
              onEditTree={handleEditTree}
              onAddJournalEntry={handleAddJournalEntry}
              onUpdateJournalEntry={handleUpdateJournalEntry}
              onDeleteJournalEntry={handleDeleteJournalEntry}
              onUploadPhoto={handleUploadPhoto}
              journalEntries={journal.filter(e => e.treeId === selectedTree.id)}
              onCloneTree={handleCloneTree}
              currentUserId={CURRENT_USER_ID}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
