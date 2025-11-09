"""Prepare trip data - convert CSV to Parquet with partitioning.

This script reads all yellow taxi trip CSV files from data/raw/, performs
cleaning and feature engineering, then writes partitioned Parquet files
for fast local analytics.

Handles both old schema (2015-2016 with lat/lon) and new schema (2017+ with LocationIDs).

Usage:
    python backend/scripts/02_prepare_trips.py
"""

import pandas as pd
import geopandas as gpd
from pathlib import Path
import sys
from shapely.geometry import Point
import warnings
warnings.filterwarnings('ignore')

# Add project root to path
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))


def load_taxi_zones():
    """Load taxi zones shapefile for spatial joins."""
    zones_path = project_root / "data" / "raw" / "taxi_zones" / "taxi_zones.shp"

    if not zones_path.exists():
        print(f"❌ Taxi zones shapefile not found at {zones_path}")
        print("   Please download it first using:")
        print("   curl -o data/raw/taxi_zones.zip https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip")
        print("   unzip data/raw/taxi_zones.zip -d data/raw/taxi_zones/")
        return None

    zones = gpd.read_file(zones_path)
    zones = zones.to_crs(epsg=4326)  # Ensure WGS84 projection
    return zones[['LocationID', 'geometry']]


def convert_coordinates_to_zones(df, zones_gdf, coord_type='pickup'):
    """
    Convert lat/lon coordinates to LocationIDs using spatial join.

    Args:
        df: DataFrame with coordinate columns
        zones_gdf: GeoDataFrame with taxi zones
        coord_type: 'pickup' or 'dropoff'

    Returns:
        Series with LocationIDs
    """
    if coord_type == 'pickup':
        lon_col = 'pickup_longitude'
        lat_col = 'pickup_latitude'
    else:
        lon_col = 'dropoff_longitude'
        lat_col = 'dropoff_latitude'

    # Filter invalid coordinates
    valid_coords = (
        (df[lat_col].notna()) &
        (df[lon_col].notna()) &
        (df[lat_col].between(-90, 90)) &
        (df[lon_col].between(-180, 180))
    )

    # Create points for valid coordinates
    geometry = [
        Point(lon, lat) if valid else None
        for lon, lat, valid in zip(df[lon_col], df[lat_col], valid_coords)
    ]

    # Create GeoDataFrame
    gdf = gpd.GeoDataFrame(
        df.index.to_series(),
        crs='EPSG:4326',
        geometry=geometry
    )

    # Perform spatial join
    joined = gpd.sjoin(gdf, zones_gdf, how='left', predicate='within')

    # Return LocationIDs in original order
    return joined['LocationID'].astype('Int32')


def detect_schema(csv_file):
    """Detect if CSV uses old (lat/lon) or new (LocationID) schema."""
    sample = pd.read_csv(csv_file, nrows=0)
    columns = set(sample.columns)

    has_location_ids = 'PULocationID' in columns and 'DOLocationID' in columns
    has_coordinates = 'pickup_longitude' in columns and 'pickup_latitude' in columns

    return 'new' if has_location_ids else 'old' if has_coordinates else 'unknown'


def process_old_schema_file(csv_file, zones_gdf, output_dir):
    """Process a single CSV file with old schema (lat/lon)."""
    print(f"   Processing {csv_file.name} (old schema - converting coordinates)...")

    # Define columns to read
    columns_to_read = [
        'tpep_pickup_datetime',
        'tpep_dropoff_datetime',
        'pickup_longitude',
        'pickup_latitude',
        'dropoff_longitude',
        'dropoff_latitude',
        'passenger_count',
        'trip_distance',
        'payment_type',
        'fare_amount',
        'tip_amount',
        'tolls_amount',
        'total_amount'
    ]

    # Read CSV in chunks to handle large files
    chunk_size = 500000
    chunks_processed = 0

    for chunk_df in pd.read_csv(csv_file, chunksize=chunk_size, usecols=columns_to_read, parse_dates=['tpep_pickup_datetime', 'tpep_dropoff_datetime']):

        chunks_processed += 1
        print(f"      Chunk {chunks_processed}: {len(chunk_df):,} rows", end='')

        # Convert coordinates to LocationIDs
        chunk_df['PULocationID'] = convert_coordinates_to_zones(chunk_df, zones_gdf, 'pickup')
        chunk_df['DOLocationID'] = convert_coordinates_to_zones(chunk_df, zones_gdf, 'dropoff')

        # Drop coordinate columns
        chunk_df = chunk_df.drop(columns=['pickup_longitude', 'pickup_latitude', 'dropoff_longitude', 'dropoff_latitude'])

        # Add missing columns with default values
        chunk_df['congestion_surcharge'] = 0.0
        chunk_df['airport_fee'] = 0.0

        # Process the chunk
        chunk_df = process_dataframe(chunk_df)

        # Write chunk to parquet
        write_chunk_to_parquet(chunk_df, output_dir)

        print(f" → {len(chunk_df):,} rows after cleaning")

    print(f"   ✓ Completed {csv_file.name}")


def process_new_schema_file(csv_file, output_dir):
    """Process a single CSV file with new schema (LocationIDs)."""
    print(f"   Processing {csv_file.name} (new schema)...")

    columns_to_read = [
        'tpep_pickup_datetime',
        'tpep_dropoff_datetime',
        'PULocationID',
        'DOLocationID',
        'passenger_count',
        'trip_distance',
        'payment_type',
        'fare_amount',
        'tip_amount',
        'tolls_amount',
        'total_amount',
        'congestion_surcharge',
        'airport_fee'
    ]

    # Read and process
    df = pd.read_csv(csv_file, usecols=columns_to_read, parse_dates=['tpep_pickup_datetime', 'tpep_dropoff_datetime'])
    df = process_dataframe(df)
    write_chunk_to_parquet(df, output_dir)

    print(f"   ✓ Completed {csv_file.name}: {len(df):,} rows")


def process_dataframe(df):
    """Apply feature engineering and data quality filters."""

    # Calculate trip duration in minutes
    df['trip_minutes'] = (df['tpep_dropoff_datetime'] - df['tpep_pickup_datetime']).dt.total_seconds() / 60

    # Extract temporal features
    df['hour'] = df['tpep_pickup_datetime'].dt.hour
    df['dow'] = df['tpep_pickup_datetime'].dt.dayofweek
    df['year'] = df['tpep_pickup_datetime'].dt.year
    df['month'] = df['tpep_pickup_datetime'].dt.month

    # Calculate fare per mile (guard against very short trips)
    df['fare_per_mile'] = df['fare_amount'] / df['trip_distance'].clip(lower=0.1)

    # Calculate tip percentage
    fare_base = (df['fare_amount'] + df['tolls_amount']).clip(lower=0.01)
    df['tip_pct'] = df['tip_amount'] / fare_base

    # Data quality filters
    df = df[
        (df['trip_distance'] > 0.1) &
        (df['trip_minutes'] >= 1) &
        (df['trip_minutes'] <= 300) &
        (df['fare_amount'] >= 0) &
        (df['PULocationID'].notna()) &  # Must have valid pickup location
        (df['DOLocationID'].notna())    # Must have valid dropoff location
    ].copy()

    # Optimize dtypes
    df['PULocationID'] = df['PULocationID'].astype('int32')
    df['DOLocationID'] = df['DOLocationID'].astype('int32')
    df['passenger_count'] = df['passenger_count'].astype('float32')
    df['trip_distance'] = df['trip_distance'].astype('float32')
    df['payment_type'] = df['payment_type'].astype('int32')
    df['fare_amount'] = df['fare_amount'].astype('float32')
    df['tip_amount'] = df['tip_amount'].astype('float32')
    df['tolls_amount'] = df['tolls_amount'].astype('float32')
    df['total_amount'] = df['total_amount'].astype('float32')
    df['congestion_surcharge'] = df['congestion_surcharge'].astype('float32')
    df['airport_fee'] = df['airport_fee'].astype('float32')
    df['trip_minutes'] = df['trip_minutes'].astype('float32')
    df['fare_per_mile'] = df['fare_per_mile'].astype('float32')
    df['tip_pct'] = df['tip_pct'].astype('float32')

    return df


def write_chunk_to_parquet(df, output_dir):
    """Write DataFrame to partitioned Parquet files."""

    # Group by year and month for partitioning
    for (year, month), group in df.groupby(['year', 'month']):
        partition_dir = output_dir / f"year={year}" / f"month={month}"
        partition_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        import uuid
        filename = partition_dir / f"part-{uuid.uuid4().hex[:8]}.parquet"

        # Write to parquet
        group.to_parquet(
            filename,
            engine='pyarrow',
            compression='snappy',
            index=False
        )


def main():
    """Convert raw CSV files to cleaned Parquet with partitioning."""

    # Define paths
    raw_dir = project_root / "data" / "raw"
    parquet_dir = project_root / "data" / "parquet" / "trips"

    # Check if raw data exists
    csv_files = sorted(raw_dir.glob("yellow_tripdata_*.csv"))

    if not csv_files:
        print(f"❌ No CSV files found in {raw_dir}")
        print("   Please download yellow taxi trip data files first.")
        return 1

    print(f"✓ Found {len(csv_files)} CSV file(s) to process")

    # Detect schema of first file
    schema_type = detect_schema(csv_files[0])
    print(f"✓ Detected schema type: {schema_type}")

    # Load taxi zones if needed for old schema
    zones_gdf = None
    if schema_type == 'old':
        print("\n📍 Loading taxi zones shapefile for coordinate conversion...")
        zones_gdf = load_taxi_zones()
        if zones_gdf is None:
            return 1
        print(f"✓ Loaded {len(zones_gdf)} taxi zones")

    # Create output directory
    parquet_dir.mkdir(parents=True, exist_ok=True)

    # Clear existing parquet files
    import shutil
    if parquet_dir.exists() and any(parquet_dir.iterdir()):
        print("\n🗑️  Clearing existing Parquet files...")
        for item in parquet_dir.iterdir():
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()

    print("\n📊 Processing CSV files...\n")

    # Process each file
    for csv_file in csv_files:
        try:
            if schema_type == 'old':
                process_old_schema_file(csv_file, zones_gdf, parquet_dir)
            else:
                process_new_schema_file(csv_file, parquet_dir)
        except Exception as e:
            print(f"   ❌ Error processing {csv_file.name}: {e}")
            continue

    print("\n✅ Success! Parquet files written to:", parquet_dir)

    # Print summary
    print("\n📈 Summary:")
    partitions = sorted([d for d in parquet_dir.rglob("year=*") if d.is_dir()])
    if partitions:
        years = sorted(set(p.parent.name if 'month=' in p.name else p.name for p in partitions))
        print(f"   Partitions created: {len(partitions)}")
        print(f"   Years: {', '.join(years[:10])}")

        # Count total parquet files
        parquet_files = list(parquet_dir.rglob("*.parquet"))
        print(f"   Total parquet files: {len(parquet_files)}")

    print("\n✓ Data preparation complete!")
    print("  You can now run backend/scripts/03_prepare_geo.py for geospatial data.")

    return 0


if __name__ == "__main__":
    exit(main())

