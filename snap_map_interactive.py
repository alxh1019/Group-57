import pandas as pd
import altair as alt
from vega_datasets import data

# --------------------------
# Load SNAP data
# --------------------------
benefits = pd.read_csv("snap-benefits-9.csv", encoding="latin1")
households = pd.read_csv("snap-households-9.csv", encoding="latin1")
persons = pd.read_csv("snap-persons-9.csv", encoding="latin1")


for df in (benefits, households, persons):
    df.rename(columns={"State": "state"}, inplace=True)

df = benefits.merge(households, on="state").merge(persons, on="state")
df["snap_per_household"] = df["TotalBenefits"] / df["Households"]
df["snap_per_person"] = df["TotalBenefits"] / df["Persons"]
df["state"] = df["state"].str.title()

# --------------------------
# Load US States TopoJSON
# --------------------------
states = alt.topo_feature(data.us_10m.url, 'states')

# --------------------------
# Merge state names with IDs
# --------------------------
# Altair uses numeric state IDs, need mapping
import json
us_states_json = json.loads(requests.get("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json").text)
state_id_map = {s['properties']['name']: s['id'] for s in states['features']} if 'features' in states else {}

# --------------------------
# Choropleth
# --------------------------
chart = alt.Chart(states).mark_geoshape().encode(
    color='snap_per_household:Q',
    tooltip=['state:N', 'snap_per_household:Q', 'snap_per_person:Q']
).transform_lookup(
    lookup='id',
    from_=alt.LookupData(df, 'state', ['snap_per_household', 'snap_per_person'])
).project('albersUsa').properties(
    width=800,
    height=500,
    title="SNAP per Household"
)

chart

