# Data Directory

This directory is gitignored and will contain:

## raw/
- CSV files from Kaggle/NYC TLC
- taxi_zone_lookup.csv
- Taxi Zones shapefile

## parquet/
- Processed trip data in Parquet format
- Partitioned by year/month

## artifacts/
- taxi_zones.geojson
- centroids.csv
- Other processed geospatial data

Follow the scripts in `backend/scripts/` to download and prepare the data.


