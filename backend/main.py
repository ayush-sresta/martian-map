
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow your Next.js frontend to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MARS_RADIUS = 3396190

MARS_LOCATIONS = [
    {"name": "Jezero Crater", "description": "Perseverance landing site", "longitude": 77.58, "latitude": 18.38},
    {"name": "Gale Crater", "description": "Curiosity rover landing site", "longitude": 137.8, "latitude": -5.4},
    {"name": "Olympus Mons", "description": "Largest volcano in the Solar System", "longitude": 226.2, "latitude": 18.65},
    {"name": "Valles Marineris", "description": "One of the largest canyon systems in the Solar System", "longitude": 301.4123, "latitude": -14.0059},
    {"name": "Hellas Planitia", "description": "One of the largest impact basins on Mars", "longitude": 70.5025, "latitude": -42.4301},
    {"name": "Isidis Planitia", "description": "Ancient impact basin", "longitude": 88.0, "latitude": 12.0},
    {"name": "Utopia Planitia", "description": "Vast northern impact basin", "longitude": 110.0, "latitude": 45.0},
    {"name": "Elysium Planitia", "description": "NASA InSight lander region", "longitude": 154.7372, "latitude": 2.979},
    {"name": "Arsia Mons", "description": "Large shield volcano", "longitude": 239.91, "latitude": -8.26},
    {"name": "Pavonis Mons", "description": "Equatorial shield volcano", "longitude": 247.0, "latitude": 0.0},
    {"name": "Ascraeus Mons", "description": "Large shield volcano", "longitude": 255.92, "latitude": 11.92},
    {"name": "Alba Mons", "description": "Vast volcanic formation", "longitude": 249.29, "latitude": 41.08},
    {"name": "Argyre Planitia", "description": "Large southern impact basin", "longitude": 320.0, "latitude": -50.0},
    {"name": "Apollinaris Mons", "description": "Ancient volcanic mountain", "longitude": 174.793, "latitude": -9.1712},
    {"name": "Elysium Mons", "description": "Large shield volcano", "longitude": 147.2138, "latitude": 25.0232}
]

@app.get("/")
def home():
    return {"message": "Mars API is running"}

@app.get("/api/locations")
def get_locations():
    return {
        "radius": MARS_RADIUS,
        "locations": MARS_LOCATIONS
    }
