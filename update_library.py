import os
import json
import hashlib
import re

AUDIO_DIR = "assets/audio"
LIBRARY_FILE = os.path.join("js", "library.json")

ROLE_MAP = {
    "01 - الكاهن": "priest",
    "02 - الشماس": "deacon",
    "03 - الشعب": "congregation"
}

def generate_id(role, filename):
    # Extract number if present
    match = re.match(r'^(\d+)', filename)
    num = match.group(1).zfill(3) if match else "000"
    
    # Generate a short hash of the filename to ensure uniqueness
    hash_str = hashlib.md5(filename.encode('utf-8')).hexdigest()[:8]
    return f"{role}_{num}_{hash_str}"

def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    if os.path.exists(LIBRARY_FILE):
        with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
            library = json.load(f)
    else:
        library = {
            "roles": {
                "priest": {"it": "Sacerdote", "ar": "الكاهن"},
                "deacon": {"it": "Diacono", "ar": "الشماس"},
                "congregation": {"it": "Popolo", "ar": "الشعب"}
            },
            "sections": []
        }
    
    existing_audios = {sec["audio"]: sec for sec in library["sections"]}
    new_sections = []
    added_count = 0
    
    for folder_name, role_id in ROLE_MAP.items():
        folder_path = os.path.join(AUDIO_DIR, folder_name)
        if not os.path.exists(folder_path):
            continue
            
        for file in os.listdir(folder_path):
            if file.lower().endswith(".mp3"):
                audio_path = f"assets/audio/{folder_name}/{file}"
                
                # If it already exists, keep it
                if audio_path in existing_audios:
                    new_sections.append(existing_audios[audio_path])
                else:
                    # It's a new file
                    # Extract arabic text from filename (remove number prefix and .mp3)
                    ar_text = re.sub(r'^\d+\s*-\s*', '', file)
                    ar_text = re.sub(r'\.mp3$', '', ar_text, flags=re.IGNORECASE)
                    
                    new_sec = {
                        "id": generate_id(role_id, file),
                        "role": role_id,
                        "audio": audio_path,
                        "text": {
                            "it": "",
                            "ar": ar_text.strip()
                        }
                    }
                    new_sections.append(new_sec)
                    added_count += 1
                    print(f"Added new file: {audio_path}")
                    
    # Sort them nicely by file name
    def sort_key(sec):
        filename = sec["audio"].split("/")[-1]
        match = re.match(r'^(\d+)', filename)
        num = int(match.group(1)) if match else 999
        return (sec["role"], num, filename)
        
    new_sections.sort(key=sort_key)
    
    library["sections"] = new_sections
    
    with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
        json.dump(library, f, ensure_ascii=False, indent=2)
        
    print(f"\nDone! Added {added_count} new files to library.json.")

if __name__ == "__main__":
    main()
