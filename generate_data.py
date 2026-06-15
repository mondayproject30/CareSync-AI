import os
import pandas as pd
import numpy as np

# Set seed for reproducibility
np.random.seed(42)

# Dynamic path resolution to work from any Cwd
base_dir = os.path.dirname(os.path.abspath(__file__))
output_csv = os.path.join(base_dir, "..", "data", "thermal_data.csv")
os.makedirs(os.path.dirname(output_csv), exist_ok=True)

rows = []
for _ in range(1000):
    age        = np.random.randint(20, 90)
    region     = np.random.choice(["Forehead", "Chest", "Abdomen", "Full Body"])
    hour       = np.random.randint(0, 24)
    temp       = np.random.choice([
        np.random.uniform(34.0, 36.4),   # Low
        np.random.uniform(36.5, 37.5),   # Normal
        np.random.uniform(37.6, 39.4),   # Warning
        np.random.uniform(39.5, 42.0),   # Critical
    ], p=[0.1, 0.5, 0.25, 0.15])
    
    # Label mapping:
    # 0 = Normal / Low
    # 1 = Warning
    # 2 = Critical
    if temp >= 39.5:
        label = 2  # Critical
    elif temp >= 37.6:
        label = 1  # Warning
    else:
        label = 0  # Normal/Low
        
    rows.append({
        "temperature": round(temp, 1),
        "age": age,
        "hour": hour,
        "region_encoded": ["Forehead", "Chest", "Abdomen", "Full Body"].index(region),
        "label": label
    })

df = pd.DataFrame(rows)
df.to_csv(output_csv, index=False)
print(f"Data generated! Shape: {df.shape}")
print(df["label"].value_counts())
