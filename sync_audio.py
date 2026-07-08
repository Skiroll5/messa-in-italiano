import os
import json
import whisper
import warnings
import re
import imageio_ffmpeg

# Add ffmpeg to PATH for whisper
os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
# Suppress warnings
warnings.filterwarnings("ignore")

def similarity(w1, w2):
    w1 = re.sub(r'[^a-z0-9àèéìòù]', '', w1.lower())
    w2 = re.sub(r'[^a-z0-9àèéìòù]', '', w2.lower())
    if w1 == w2: return 0
    if w1 in w2 or w2 in w1: return 0.4
    
    len1 = len(w1)
    len2 = len(w2)
    if len1 == 0 or len2 == 0: return 1
    
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    for i in range(len1 + 1): matrix[i][0] = i
    for j in range(len2 + 1): matrix[0][j] = j
    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if w1[i-1] == w2[j-1] else 1
            matrix[i][j] = min(matrix[i-1][j] + 1, matrix[i][j-1] + 1, matrix[i-1][j-1] + cost)
    return matrix[len1][len2] / max(len1, len2)

def align_words(target_text, whisper_words):
    target_words = [w for w in re.split(r'\s+', target_text) if w]
    if not whisper_words:
        return [{"word": w, "start": i * 0.5, "end": (i + 1) * 0.5} for i, w in enumerate(target_words)]

    n = len(target_words)
    m = len(whisper_words)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(n + 1): dp[i][0] = i
    for j in range(m + 1): dp[0][j] = j
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = similarity(target_words[i-1], whisper_words[j-1]["word"])
            dp[i][j] = min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost)
            
    i, j = n, m
    aligned = [None] * n
    
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            cost = similarity(target_words[i-1], whisper_words[j-1]["word"])
            if dp[i][j] == dp[i-1][j-1] + cost:
                aligned[i-1] = whisper_words[j-1]
                i -= 1; j -= 1
                continue
        if i > 0 and dp[i][j] == dp[i-1][j] + 1:
            aligned[i-1] = None
            i -= 1
            continue
        if j > 0 and dp[i][j] == dp[i][j-1] + 1:
            j -= 1
            continue
        if i > 0:
            aligned[i-1] = None
            i -= 1
        else:
            j -= 1

    result = []
    for k in range(n):
        result.append({
            "word": target_words[k],
            "start": aligned[k]["start"] if aligned[k] else None,
            "end": aligned[k]["end"] if aligned[k] else None
        })

    for k in range(n):
        if result[k]["start"] is None:
            prev_t = 0
            for p in range(k-1, -1, -1):
                if result[p]["end"] is not None:
                    prev_t = result[p]["end"]
                    break
            
            next_t = None
            next_idx = k
            for nx in range(k+1, n):
                if result[nx]["start"] is not None:
                    next_t = result[nx]["start"]
                    next_idx = nx
                    break
            
            if next_t is None:
                result[k]["start"] = prev_t
                result[k]["end"] = prev_t + 0.5
            else:
                gap = next_t - prev_t
                steps = next_idx - k + 1
                step_size = gap / steps
                
                cur = prev_t
                for idx in range(k, next_idx):
                    result[idx]["start"] = round(cur, 2)
                    cur += step_size
                    result[idx]["end"] = round(cur, 2)
                k = next_idx - 1

    return result

def main():
    print("Loading data.json...")
    data_path = os.path.join("js", "data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        mass_data = json.load(f)

    print("Loading Whisper model (small)... this may take a moment.")
    model = whisper.load_model("small")

    total = len(mass_data["sections"])
    for i, section in enumerate(mass_data["sections"]):
        if "audio" not in section or "text" not in section or "it" not in section["text"]:
            continue
            
        if "words_it" in section:
            print(f"[{i+1}/{total}] Skipping already synced: {section['id']}")
            continue

        audio_file = section["audio"]
        if not os.path.exists(audio_file):
            print(f"[{i+1}/{total}] Audio file not found: {audio_file}")
            continue

        print(f"[{i+1}/{total}] Processing: {os.path.basename(audio_file)}")
        try:
            result = model.transcribe(audio_file, language="it", word_timestamps=True)
            ai_words = []
            for seg in result.get("segments", []):
                for w in seg.get("words", []):
                    ai_words.append({
                        "word": w["word"].strip(),
                        "start": w["start"],
                        "end": w["end"]
                    })
            
            final_words = align_words(section["text"]["it"], ai_words)
            section["words_it"] = final_words
            print(f"  -> Success! Aligned {len(final_words)} words.")
            
            # Save incrementally just in case it crashes
            with open(data_path, "w", encoding="utf-8") as f:
                json.dump(mass_data, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            print(f"  -> Error: {e}")

    print("Finished syncing all audio files!")

if __name__ == "__main__":
    main()
