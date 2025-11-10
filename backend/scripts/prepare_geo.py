"""Prepare geospatial data - convert shapefile to GeoJSON.

This script reads the NYC Taxi Zones shapefile, simplifies geometries for
efficient web rendering, exports to GeoJSON, calculates zone centroids,
and copies files to the required locations.

Usage:
    python backend/scripts/03_prepare_geo.py
"""

import geopandas as gpd
import pandas as pd
from pathlib import Path
import shutil
import sys
import json

# Add project root to path
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))


def main():
    """Convert shapefile to GeoJSON and compute centroids."""

    # Define paths
    raw_dir = project_root / "data" / "raw"
    artifacts_dir = project_root / "data" / "artifacts"
    frontend_geo_dir = project_root / "frontend" / "public" / "geo"

    # Look for shapefile
    shp_candidates = list(raw_dir.rglob("*.shp"))

    if not shp_candidates:
        print(f"❌ No shapefile found in {raw_dir}")
        print("   Please download and extract the taxi zones shapefile first.")
        print("   See backend/scripts/01_download_data.md for instructions.")
        return 1

    # Use the first shapefile found
    shp_path = shp_candidates[0]
    print(f"✓ Found shapefile: {shp_path.relative_to(project_root)}")

    # Create output directories
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    frontend_geo_dir.mkdir(parents=True, exist_ok=True)

    print("\n📍 Reading shapefile with GeoPandas...")

    # Read shapefile
    try:
        gdf = gpd.read_file(shp_path)
    except Exception as e:
        print(f"❌ Error reading shapefile: {e}")
        return 1

    print(f"✓ Loaded {len(gdf)} taxi zones")
    print(f"   CRS: {gdf.crs}")

    # Ensure we have required columns
    if "LocationID" not in gdf.columns:
        # Try common alternatives
        location_col_candidates = ["OBJECTID", "location_i", "LocationId"]
        location_col = None
        for col in location_col_candidates:
            if col in gdf.columns:
                location_col = col
                gdf.rename(columns={col: "LocationID"}, inplace=True)
                break

        if location_col is None:
            print(f"❌ Could not find LocationID column. Available columns: {gdf.columns.tolist()}")
            return 1

    # Ensure proper CRS (WGS84 for web mapping)
    if gdf.crs.to_epsg() != 4326:
        print(f"\n🗺️  Reprojecting from {gdf.crs} to WGS84 (EPSG:4326)...")
        gdf = gdf.to_crs("EPSG:4326")
        print("✓ Reprojection complete")

    print("\n✂️  Simplifying geometries for web performance...")

    # Simplify geometries (tolerance in degrees, ~10 meters)
    gdf["geometry"] = gdf["geometry"].simplify(tolerance=0.0001, preserve_topology=True)

    print("✓ Geometries simplified")

    # Export to GeoJSON
    geojson_path = artifacts_dir / "taxi_zones.geojson"

    print(f"\n💾 Writing GeoJSON to {geojson_path.relative_to(project_root)}...")

    try:
        gdf.to_file(geojson_path, driver="GeoJSON")
    except Exception as e:
        print(f"❌ Error writing GeoJSON: {e}")
        return 1

    print("✓ GeoJSON created")

    # Calculate centroids
    print("\n📐 Computing zone centroids...")

    centroids = gdf.copy()
    centroids["geometry"] = centroids["geometry"].centroid

    # Extract coordinates
    centroids["longitude"] = centroids["geometry"].x
    centroids["latitude"] = centroids["geometry"].y

    # Create CSV with LocationID, longitude, latitude
    centroid_df = pd.DataFrame({
        "LocationID": centroids["LocationID"],
        "longitude": centroids["longitude"],
        "latitude": centroids["latitude"]
    })

    # Sort by LocationID for easy lookup
    centroid_df = centroid_df.sort_values("LocationID").reset_index(drop=True)

    centroids_path = artifacts_dir / "zone_centroids.csv"
    centroid_df.to_csv(centroids_path, index=False)

    print(f"✓ Centroids saved to {centroids_path.relative_to(project_root)}")

    # Copy GeoJSON to frontend
    frontend_geojson = frontend_geo_dir / "taxi_zones.geojson"

    print(f"\n📦 Copying GeoJSON to frontend: {frontend_geojson.relative_to(project_root)}...")

    try:
        shutil.copy2(geojson_path, frontend_geojson)
    except Exception as e:
        print(f"❌ Error copying to frontend: {e}")
        return 1

    print("✓ GeoJSON copied to frontend")

    # Print summary
    print("\n📈 Summary:")
    print(f"   Total zones: {len(gdf)}")
    print(f"   GeoJSON size: {geojson_path.stat().st_size / 1024:.1f} KB")
    print(f"   Centroids: {len(centroid_df)} locations")

    # Show a few example zones
    if "zone" in gdf.columns:
        print("\n   Example zones:")
        for _, row in gdf[["LocationID", "zone"]].head(5).iterrows():
            print(f"      - {row['LocationID']}: {row['zone']}")
    elif "Zone" in gdf.columns:
        print("\n   Example zones:")
        for _, row in gdf[["LocationID", "Zone"]].head(5).iterrows():
            print(f"      - {row['LocationID']}: {row['Zone']}")

    print("\n✅ Geospatial data preparation complete!")
    print("   You can now start the backend API and begin analysis.")

    return 0


if __name__ == "__main__":
    exit(main())

