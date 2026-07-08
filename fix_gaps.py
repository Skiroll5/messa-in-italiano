import json
import os

def main():
    data_path = os.path.join("js", "data.json")
    print(f"Caricamento di {data_path}...")
    
    with open(data_path, "r", encoding="utf-8") as f:
        mass_data = json.load(f)
        
    sections = mass_data.get("sections", [])
    count = 0
    
    for section in sections:
        words = section.get("words_it", [])
        if not words:
            continue
            
        # Loop through all words except the last one
        for i in range(len(words) - 1):
            current_word = words[i]
            next_word = words[i + 1]
            
            # Update the end of the current word to match the start of the next word
            current_word["end"] = next_word["start"]
            
        count += 1
        
    print(f"Elaborate {count} sezioni.")
    
    print("Salvataggio modifiche...")
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(mass_data, f, ensure_ascii=False, indent=2)
        
    print("Fatto! Nessun gap tra le parole.")

if __name__ == "__main__":
    main()
