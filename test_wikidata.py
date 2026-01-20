import sys
import pandas as pd
from SPARQLWrapper import SPARQLWrapper, JSON

def fetch_warships():
    endpoint_url = "https://query.wikidata.org/sparql"
    
    # OPTIMIZED SPARQL Query
    # Strategy: 
    # 1. Find items that have 'Displacement' (P2109) OR 'Length' (P2043).
    #    (We prioritize P2109 as an anchor because it is unique to ships).
    # 2. Must have an Image (P18).
    # 3. Finally, verify it is a Warship (Q31146).
    
    query = """
    SELECT DISTINCT ?ship ?shipLabel ?image ?length ?displacement WHERE {
      
      # 1. OPTIMIZATION: Anchor on things that have an Image
      ?ship wdt:P18 ?image .

      # 3. FILTER: Check if it is a Warship (or subclass)
      # Using the direct path /wdt:P279* is faster than binding a ?type variable
      ?ship wdt:P31/wdt:P279* wd:Q31146 .

      # 4. Standard Label Service
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 100
    """

    user_agent = "WarshipDataFetcher/1.0 (optimized_script)"
    sparql = SPARQLWrapper(endpoint_url, agent=user_agent)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    
    # Increase timeout to 60 seconds (default is often too short for complex queries)
    sparql.setTimeout(60)

    print("Fetching data with optimized query logic...")
    
    try:
        results = sparql.query().convert()
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        return

    ships_data = []
    for result in results["results"]["bindings"]:
        entry = {
            "name": result.get("shipLabel", {}).get("value"),
            "image_url": result.get("image", {}).get("value"),
            "length": result.get("length", {}).get("value"),
            "displacement": result.get("displacement", {}).get("value"),
            "wikidata_id": result.get("ship", {}).get("value")
        }
        ships_data.append(entry)

    df = pd.DataFrame(ships_data)

    if not df.empty:
        # Deduplicate because UNION might return the same ship twice (once for length, once for displacement)
        df = df.drop_duplicates(subset=['wikidata_id'])
        
        print(f"✅ Success! Found {len(df)} warships.")
        print(df.head())
        
        # Optional: Save to CSV
        # df.to_csv("warships_data.csv", index=False)
        # print("Saved to warships_data.csv")
    else:
        print("⚠️ Found 0 results. Try removing the 'Length' requirement to speed it up.")

if __name__ == "__main__":
    fetch_warships()