import json
import os

def main():
    data_path = os.path.join("js", "data.json")
    print(f"Loading {data_path}...")
    
    with open(data_path, "r", encoding="utf-8") as f:
        mass_data = json.load(f)
        
    sections = mass_data.get("sections", [])
    count = 0
    
    for section in sections:
        words = section.get("words_it", [])
        if words:
            # Set the first word's start time to 0.0
            if words[0]["start"] != 0.0:
                words[0]["start"] = 0.0
                count += 1
            
    print(f"Updated {count} sections where the first word did not start at 0.0.")
    
    print("Saving changes...")
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(mass_data, f, ensure_ascii=False, indent=2)
        
    print("Done! The first word of every paragraph now starts at 0.0.")

if __name__ == "__main__":
    main()
