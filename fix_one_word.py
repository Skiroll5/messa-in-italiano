import json
import os
import sys
import subprocess

try:
    from mutagen.mp3 import MP3
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mutagen"])
    from mutagen.mp3 import MP3

def main():
    data_path = os.path.join("js", "data.json")
    print(f"Loading {data_path}...")
    
    with open(data_path, "r", encoding="utf-8") as f:
        mass_data = json.load(f)
        
    sections = mass_data.get("sections", [])
    count = 0
    
    for section in sections:
        words = section.get("words_it", [])
        # Only process paragraphs with exactly 1 word
        if len(words) == 1:
            audio_rel_path = section.get("audio", "")
            if not audio_rel_path:
                continue
                
            audio_path = os.path.abspath(audio_rel_path)
            if not os.path.exists(audio_path):
                print(f"Audio file not found: {audio_path}")
                continue
                
            audio = MP3(audio_path)
            duration = round(audio.info.length, 2)
            
            words[0]["start"] = 0.0
            words[0]["end"] = duration
            print(f"Updated '{words[0]['word']}' -> start: 0.0, end: {duration}")
            count += 1
            
    print(f"Processed {count} 1-word sections.")
    
    print("Saving changes...")
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(mass_data, f, ensure_ascii=False, indent=2)
        
    print("Done! One-word paragraphs now cover the entire audio duration.")

if __name__ == "__main__":
    main()
