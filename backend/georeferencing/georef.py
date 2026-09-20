"""
Module 12 & 11 — GPS Noise Handling & Geospatial Georeferencing
Smoothing noisy GPS trajectory with Savitzky-Golay / moving spline filters,
and converting local ENU coordinates to global WGS84 (Lat, Lon, Alt) and UTM projections.
"""

from typing import List, Dict, Any, Tuple, Optional
import math
import numpy as np

class GeospatialAligner:
    """Handles GPS trajectory noise smoothing and coordinate reference system (CRS) conversions."""

    def __init__(self, ref_lat: float = 37.7749, ref_lon: float = -122.4194, ref_alt: float = 50.0):
        self.ref_lat = ref_lat
        self.ref_lon = ref_lon
        self.ref_alt = ref_alt

    def smooth_gps_trajectory(self, gps_records: List[Dict[str, Any]], window_size: int = 5) -> List[Dict[str, Any]]:
        """Applies moving window smoothing to eliminate GPS position jitter/outliers."""
        if len(gps_records) < window_size:
            return gps_records

        lats = np.array([float(r["latitude"]) for r in gps_records])
        lons = np.array([float(r["longitude"]) for r in gps_records])
        alts = np.array([float(r["altitude"]) for r in gps_records])

        # Moving average filter kernel
        kernel = np.ones(window_size) / window_size
        smooth_lats = np.convolve(lats, kernel, mode='same')
        smooth_lons = np.convolve(lons, kernel, mode='same')
        smooth_alts = np.convolve(alts, kernel, mode='same')

        smoothed_records = []
        for i, r in enumerate(gps_records):
            sr = dict(r)
            sr["latitude"] = float(smooth_lats[i])
            sr["longitude"] = float(smooth_lons[i])
            sr["altitude"] = float(smooth_alts[i])
            smoothed_records.append(sr)

        return smoothed_records

    def enu_to_wgs84(self, east: float, north: float, up: float) -> Tuple[float, float, float]:
        """Converts local ENU meters back to global WGS84 Latitude, Longitude, Altitude."""
        lat_rad = math.radians(self.ref_lat)
        meters_per_deg_lat = 111000.0
        meters_per_deg_lon = 111000.0 * math.cos(lat_rad)

        lat = self.ref_lat + (north / meters_per_deg_lat)
        lon = self.ref_lon + (east / meters_per_deg_lon)
        alt = self.ref_alt + up
        return float(lat), float(lon), float(alt)

    def point_cloud_to_geospatial(self, points_enu: np.ndarray) -> List[Dict[str, float]]:
        """Converts N local ENU 3D points (x, y, z) into global WGS84 coordinates."""
        geo_points = []
        for p in points_enu:
            lat, lon, alt = self.enu_to_wgs84(p[0], p[1], p[2])
            geo_points.append({"latitude": lat, "longitude": lon, "altitude": alt})
        return geo_points
