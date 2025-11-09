# Step 1: Download Data

This guide explains how to download the required datasets for the NYC Yellow Taxi Dashboard.

## Overview

You'll need three types of data:
1. **NYC Yellow Taxi Trip Records** (CSV files)
2. **Taxi Zone Lookup CSV** (zone metadata)
3. **Taxi Zones Shapefile** (geographic boundaries)

All data should be placed in the `data/raw/` directory.

---

## 1. NYC Yellow Taxi Trip Records

### Option A: Kaggle (Recommended for beginners)

1. **Sign up/Login to Kaggle**: https://www.kaggle.com/
2. **Download the dataset**: https://www.kaggle.com/datasets/elemento/nyc-yellow-taxi-trip-data
3. **Select files**: Choose one or more monthly CSV files (e.g., `yellow_tripdata_2023-01.csv`)
   - Start with a single year (12 files) to keep size manageable
   - Each file is approximately 200-500 MB
4. **Place in**: `data/raw/yellow_tripdata_YYYY-MM.csv`

### Option B: NYC TLC (Direct from source)

1. **Visit**: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page
2. **Navigate to**: Yellow Taxi Trip Records section
3. **Download**: Monthly parquet or CSV files
   - Format: `yellow_tripdata_YYYY-MM.csv` or `.parquet`
4. **Place in**: `data/raw/`

### Using wget or curl (Linux/Mac)

```bash
# Create raw data directory
mkdir -p data/raw

# Example: Download January 2023
wget https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-01.parquet \
  -O data/raw/yellow_tripdata_2023-01.parquet

# Or for CSV (if available)
curl -o data/raw/yellow_tripdata_2023-01.csv \
  https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-01.csv
```

**Note**: If you download parquet files, you'll need to convert them to CSV first or modify the preparation script.

---

## 2. Taxi Zone Lookup CSV

This file maps LocationID to borough and zone names.

### Download

```bash
# Direct download
curl -o data/raw/taxi_zone_lookup.csv \
  https://d37ci6vzurychx.cloudfront.net/misc/taxi+_zone_lookup.csv
```

**Or manually**:
1. Visit: https://d37ci6vzurychx.cloudfront.net/misc/taxi+_zone_lookup.csv
2. Save as: `data/raw/taxi_zone_lookup.csv`

---

## 3. Taxi Zones Shapefile

This shapefile contains the geographic boundaries of taxi zones for mapping.

### Download & Extract

```bash
# Download shapefile (ZIP format)
curl -o data/raw/taxi_zones.zip \
  https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip

# Extract to raw directory
unzip data/raw/taxi_zones.zip -d data/raw/taxi_zones/

# Clean up zip file (optional)
rm data/raw/taxi_zones.zip
```

**Or manually**:
1. Download: https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip
2. Extract to: `data/raw/taxi_zones/`
3. Ensure you have these files:
   - `taxi_zones.shp`
   - `taxi_zones.shx`
   - `taxi_zones.dbf`
   - `taxi_zones.prj` (and other shapefile components)

---

## Expected Directory Structure

After downloading all data, your `data/raw/` directory should look like this:

```
data/raw/
├── yellow_tripdata_2023-01.csv
├── yellow_tripdata_2023-02.csv
├── yellow_tripdata_2023-03.csv
├── ... (more monthly files)
├── taxi_zone_lookup.csv
└── taxi_zones/
    ├── taxi_zones.shp
    ├── taxi_zones.shx
    ├── taxi_zones.dbf
    ├── taxi_zones.prj
    └── ... (other shapefile components)
```

---

## Verification

### Check if files are present

```bash
# List CSV files
ls -lh data/raw/yellow_tripdata_*.csv

# Check lookup file
ls -lh data/raw/taxi_zone_lookup.csv

# Check shapefile
ls -lh data/raw/taxi_zones/*.shp
```

### Check file sizes

- Each monthly CSV should be **200-600 MB**
- Lookup CSV should be **~13 KB**
- Shapefile (.shp) should be **~300 KB**

---

## Data Size Considerations

### Storage Requirements

- **Single month**: ~500 MB (CSV)
- **Full year**: ~5-6 GB (12 months)
- **Multiple years**: Plan accordingly (2023 + 2022 = ~12 GB)

### Recommendations

1. **First-time users**: Start with 1-3 months to test the pipeline
2. **Full analysis**: Download a complete year (12 months)
3. **Historical analysis**: Download multiple years as needed

---

## Troubleshooting

### Issue: Download fails or is very slow

- **Solution**: Try using a download manager or wget with resume capability:
  ```bash
  wget -c [URL]  # -c flag allows resuming interrupted downloads
  ```

### Issue: Parquet files instead of CSV

- **Solution**: Either:
  1. Convert parquet to CSV using pandas:
     ```python
     import pandas as pd
     df = pd.read_parquet('data/raw/yellow_tripdata_2023-01.parquet')
     df.to_csv('data/raw/yellow_tripdata_2023-01.csv', index=False)
     ```
  2. Or modify `02_prepare_trips.py` to read parquet files directly

### Issue: Shapefile won't extract

- **Solution**: Ensure you have unzip installed:
  ```bash
  # Mac (via Homebrew)
  brew install unzip

  # Ubuntu/Debian
  sudo apt-get install unzip
  ```

---

## Next Steps

Once you've downloaded all required data:

1. **Verify files are present** in `data/raw/`
2. **Run the preparation scripts**:
   ```bash
   # Convert CSV to Parquet (partitioned)
   python backend/scripts/02_prepare_trips.py

   # Process geospatial data
   python backend/scripts/03_prepare_geo.py
   ```

3. **Start the backend API**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

---

## Additional Resources

- **NYC TLC Data Dictionary**: https://www.nyc.gov/assets/tlc/downloads/pdf/data_dictionary_trip_records_yellow.pdf
- **Taxi Zone Map**: https://www.nyc.gov/assets/tlc/downloads/pdf/taxi_zone_map_manhattan.pdf
- **TLC Open Data**: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page

