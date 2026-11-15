// Same list as the Cesium reference, plus a subjective `interest` score (0-1)
// for scientific value. Tune these freely: they drive the "interest" cost term.

export const LOCATIONS = [
  { name: "Jezero Crater", description: "Perseverance landing site", longitude: 77.58, latitude: 18.38, interest: 1.0 },
  { name: "Gale Crater", description: "Curiosity rover landing site", longitude: 137.8, latitude: -5.4, interest: 0.95 },
  { name: "Olympus Mons", description: "Largest volcano in the Solar System", longitude: 226.2, latitude: 18.65, interest: 0.7 },
  { name: "Valles Marineris", description: "One of the largest canyon systems in the Solar System", longitude: 301.4123, latitude: -14.0059, interest: 0.85 },
  { name: "Hellas Planitia", description: "One of the largest impact basins on Mars", longitude: 70.5025, latitude: -42.4301, interest: 0.6 },
  { name: "Isidis Planitia", description: "Ancient impact basin", longitude: 88.0, latitude: 12.0, interest: 0.7 },
  { name: "Utopia Planitia", description: "Vast northern impact basin", longitude: 110.0, latitude: 45.0, interest: 0.5 },
  { name: "Elysium Planitia", description: "NASA InSight lander region", longitude: 154.7372, latitude: 2.979, interest: 0.6 },
  { name: "Arsia Mons", description: "Large shield volcano", longitude: 239.91, latitude: -8.26, interest: 0.55 },
  { name: "Pavonis Mons", description: "Equatorial shield volcano", longitude: 247.0, latitude: 0.0, interest: 0.55 },
  { name: "Ascraeus Mons", description: "Large shield volcano", longitude: 255.92, latitude: 11.92, interest: 0.55 },
  { name: "Alba Mons", description: "Vast volcanic formation", longitude: 249.29, latitude: 41.08, interest: 0.5 },
  { name: "Argyre Planitia", description: "Large southern impact basin", longitude: 320.0, latitude: -50.0, interest: 0.6 },
  { name: "Apollinaris Mons", description: "Ancient volcanic mountain", longitude: 174.793, latitude: -9.1712, interest: 0.6 },
  { name: "Elysium Mons", description: "Large shield volcano", longitude: 147.2138, latitude: 25.0232, interest: 0.55 },
];

export function findLocation(name) {
  const n = String(name).trim().toLowerCase();
  return LOCATIONS.find((l) => l.name.toLowerCase() === n) ?? null;
}
