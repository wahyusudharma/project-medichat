import os
import sqlite3
import pandas as pd
import faiss
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, CrossEncoder
from huggingface_hub import InferenceClient, hf_hub_download
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from dotenv import load_dotenv

# --- 1. KONFIGURASI ---
load_dotenv()
DATASET_ID = "gekina/dataset_qna"
REPO_ID = "Qwen/Qwen2.5-7B-Instruct"
HF_TOKEN = os.getenv("HF_TOKEN")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

app = FastAPI()

# --- SETUP CORS (PENTING) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = InferenceClient(model=REPO_ID, token=HF_TOKEN)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# --- 2. DATABASE INIT ---
DB_PATH = "/data/users.db" if os.path.exists("/data") else "users.db"

def get_password_hash(password):
    return pwd_context.hash(password)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users 
                 (username TEXT PRIMARY KEY, password TEXT, full_name TEXT)''')
    try:
        c.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
    except: pass 
    try:
        c.execute("ALTER TABLE users ADD COLUMN email TEXT")
    except: pass

    c.execute("SELECT role FROM users WHERE username='admin'")
    res = c.fetchone()
    if res:
        if res[0] != 'admin':
            c.execute("UPDATE users SET role='admin' WHERE username='admin'")
    else:
        admin_pass = get_password_hash("admin123")
        c.execute("INSERT INTO users (username, password, full_name, role, email) VALUES (?, ?, ?, ?, ?)", 
                  ("admin", admin_pass, "Super Admin", "admin", "admin@medichat.com"))
    conn.commit()
    conn.close()

init_db()

# --- 3. LOAD AI MODELS ---
print("⏳ Memuat Model Embedding (E5-Base)...")
embedder = SentenceTransformer("intfloat/multilingual-e5-base", device="cpu")

print("⏳ Memuat Reranker High-Accuracy (BGE-M3)...")
reranker = CrossEncoder("BAAI/bge-reranker-v2-m3", device="cpu")

print(f"⏳ Mendownload data dari {DATASET_ID}...")
df_chunks = pd.DataFrame()
index = None

try:
    parquet_path = hf_hub_download(repo_id=DATASET_ID, filename="chunks_data.parquet", repo_type="dataset", token=HF_TOKEN)
    faiss_path = hf_hub_download(repo_id=DATASET_ID, filename="alodokter_index.faiss", repo_type="dataset", token=HF_TOKEN)
    
    df_chunks = pd.read_parquet(parquet_path)
    index = faiss.read_index(faiss_path)
    
    print(f"✅ Database Medis Siap! Total baris: {len(df_chunks)}")
except Exception as e:
    print(f"⚠️ Gagal Load Data: {e}")

# --- 4. AUTH FUNCTIONS ---
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid")
    return username

async def get_current_admin(username: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT role FROM users WHERE username=?", (username,))
    res = c.fetchone()
    conn.close()
    if not res or res[0] != 'admin': raise HTTPException(status_code=403, detail="Akses ditolak.")
    return username

# --- MODELS ---
class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    email: str 

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserSelfUpdate(BaseModel):
    full_name: Optional[str] = None
    new_password: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = [] 

# --- 5. API ENDPOINTS ---

@app.post("/api/register")
def register(user: UserRegister):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        hashed_pw = get_password_hash(user.password[:50])
        c.execute("INSERT INTO users (username, password, full_name, role, email) VALUES (?, ?, ?, ?, ?)", 
                  (user.username, hashed_pw, user.full_name, "user", user.email))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username sudah dipakai")
    except Exception as e:
        print(f"Error Register: {e}")
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        conn.close()
    return {"message": "Registrasi berhasil"}

@app.post("/api/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT password, full_name, role, email FROM users WHERE username=?", (form_data.username,))
    res = c.fetchone()
    conn.close()
    
    if not res or not verify_password(form_data.password[:50], res[0]):
        raise HTTPException(status_code=401, detail="Username atau Password salah")
    
    user_role = "admin" if form_data.username == "admin" else res[2]
    user_email = res[3] if res[3] else ""
    
    access_token = create_access_token(data={"sub": form_data.username, "role": user_role})
    return {"access_token": access_token, "token_type": "bearer", "full_name": res[1], "role": user_role, "email": user_email}

@app.put("/api/users/me")
def update_self(data: UserSelfUpdate, username: str = Depends(get_current_user)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE username=?", (username,))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if data.full_name: c.execute("UPDATE users SET full_name=? WHERE username=?", (data.full_name, username))
    if data.new_password: c.execute("UPDATE users SET password=? WHERE username=?", (get_password_hash(data.new_password), username))
    conn.commit()
    conn.close()
    return {"message": "Profil berhasil diperbarui"}

# --- ADMIN API ---
@app.get("/api/admin/users")
def get_all_users(admin: str = Depends(get_current_admin)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT username, full_name, role, email FROM users")
    users = [{"username": r[0], "full_name": r[1], "role": r[2], "email": r[3]} for r in c.fetchall()]
    conn.close()
    return users

# --- PERBAIKAN: MENDEFINISIKAN CURSOR 'c' ---
@app.delete("/api/admin/users/{username}")
def delete_user(username: str, admin: str = Depends(get_current_admin)):
    if username == "admin": raise HTTPException(status_code=400, detail="Tidak bisa hapus Super Admin")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor() # FIXED: Definisi cursor ditambahkan
    
    try:
        c.execute("DELETE FROM users WHERE username=?", (username,))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Gagal menghapus user: {str(e)}")
    
    conn.close()
    return {"message": f"User {username} dihapus"}

@app.put("/api/admin/users/{username}")
def update_user(username: str, user_data: UserUpdate, admin: str = Depends(get_current_admin)):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if user_data.full_name: c.execute("UPDATE users SET full_name=? WHERE username=?", (user_data.full_name, username))
    if user_data.password: c.execute("UPDATE users SET password=? WHERE username=?", (get_password_hash(user_data.password), username))
    conn.commit()
    conn.close()
    return {"message": "Update berhasil"}

# --- FUNGSI GUARDRAIL (BALANCED VERSION) ---
def check_is_medical(query: str) -> bool:
    """
    Menilai apakah pertanyaan berhubungan dengan medis.
    Prompt dibuat lebih inklusif agar tidak memblokir pertanyaan borderline.
    """
    classification_prompt = (
        "Anda adalah sistem klasifikasi topik otomatis.\n"
        "Tugas: Tentukan apakah pertanyaan user ada hubungannya (langsung atau tidak langsung) dengan:\n"
        "- Kesehatan (Fisik/Mental)\n"
        "- Penyakit & Gejala\n"
        "- Obat & Pengobatan\n"
        "- Biologi Manusia\n"
        "- Gaya Hidup Sehat (Diet, Olahraga untuk kesehatan)\n\n"
        "INSTRUKSI: Jawab 'YA' jika ada sedikit saja hubungan dengan kesehatan. Jawab 'TIDAK' hanya jika 100% tidak relevan (seperti Coding, Politik, Matematika).\n\n"
        f"Pertanyaan: {query}\n"
        "Jawaban (YA/TIDAK):"
    )
    
    try:
        response = client.chat_completion(
            messages=[{"role": "user", "content": classification_prompt}],
            max_tokens=5, 
            temperature=0.0
        )
        answer = response.choices[0].message.content.strip().upper()
        # Logika: Default ke True (YA) jika AI ragu atau menjawab selain TIDAK
        return "TIDAK" not in answer 
    except:
        # Fail-Safe: Jika Guardrail error, IZINKAN lewat
        return True 

# --- CHAT API (BALANCED FILTERING) ---
@app.post("/api/chat")
def chat(req: ChatRequest, username: str = Depends(get_current_user)):
    # 0. Cek Database
    if index is None: 
        return {"response": "Maaf, database medis sedang offline.", "urls": []}

    # --- LANGKAH 1: LLM GUARDRAIL ---
    is_medical = check_is_medical(req.message)
    
    if not is_medical:
        return {
            "response": "Maaf, saya adalah asisten medis (MediChat). Saya hanya dilatih untuk menjawab pertanyaan seputar kesehatan dan kedokteran.",
            "urls": []
        }

    # 1. Deteksi Kolom URL
    url_col_name = None
    for col in df_chunks.columns:
        if col.lower() in ['url', 'link', 'source', 'referensi']:
            url_col_name = col
            break

    # 2. Context Rewriting
    search_query = req.message
    if req.history:
        last_user_msg = next((h['content'] for h in reversed(req.history) if h['role'] == 'user'), "")
        if last_user_msg:
            search_query = f"{last_user_msg} {req.message}"
            search_query = search_query[-500:]

    # 3. Retrieval FAISS
    try:
        q_emb = embedder.encode([f"query: {search_query}"], normalize_embeddings=True)
        D, I = index.search(q_emb, k=15) # Ambil lebih banyak kandidat
    except Exception as e:
        print(f"Error FAISS: {e}")
        return {"response": "Terjadi kendala teknis.", "urls": []}
    
    candidates = []
    candidate_indices = []
    seen = set()
    text_col = 'jawaban_bersih' if 'jawaban_bersih' in df_chunks.columns else 'chunk_text'

    for idx in I[0]:
        if idx < len(df_chunks):
            p_id = df_chunks.iloc[idx]['parent_id'] if 'parent_id' in df_chunks.columns else idx
            if p_id not in seen:
                candidates.append(df_chunks.iloc[idx][text_col])
                candidate_indices.append(idx)
                seen.add(p_id)

    # 4. Reranking & Thresholding
    final_context = []
    final_indices = []
    
    if candidates:
        try:
            pairs = [[search_query, doc] for doc in candidates]
            scores = reranker.predict(pairs)
            combined = sorted(list(zip(candidates, scores, candidate_indices)), key=lambda x: x[1], reverse=True)
            
            # === BALANCED THRESHOLD: -0.5 ===
            # Tidak seketat 0.15, tapi membuang sampah (-2.0 ke bawah)
            top_results = [item for item in combined[:3] if item[1] > -0.5]
            
            final_context = [item[0] for item in top_results]
            final_indices = [item[2] for item in top_results]
        
        except Exception as e:
            # Fail-secure
            print(f"Reranker Error: {e}")
            final_context = [] 

    # 5. HARD STOP
    if not final_context:
        return {
            "response": "Mohon maaf, meskipun pertanyaan Anda terkait medis, saya belum menemukan referensi spesifik yang pas di database saya. Bisa coba formulasi ulang pertanyaannya?",
            "urls": []
        }

    # 6. Ambil URL
    source_urls = []
    if url_col_name and final_indices:
        try:
            raw_urls = df_chunks.iloc[final_indices][url_col_name].unique().tolist()
            source_urls = [str(u) for u in raw_urls if isinstance(u, str) and len(u) > 5]
        except: pass

    # 7. Generate Jawaban (LLM)
    context_str = "\n\n".join(final_context)
    
    system_prompt = (
        "Anda adalah Asisten Medis Profesional bernama MediChat.\n"
        "INSTRUKSI:\n"
        "1. Jawab pertanyaan berdasarkan 'KONTEKS MEDIS' di bawah.\n"
        "2. Jika informasi di konteks kurang lengkap, jelaskan apa yang ada saja.\n"
        "3. GUNAKAN BAHASA INDONESIA.\n"
        f"KONTEKS MEDIS:\n{context_str}"
    )

    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": req.message}]
    
    try:
        response = client.chat_completion(
            messages, 
            max_tokens=1024, 
            temperature=0.1, 
            top_p=0.9
        )
        answer = response.choices[0].message.content
        return {"response": answer, "urls": source_urls}
    
    except Exception as e:
        print(f"ERROR LLM: {e}")
        return {"response": "Mohon maaf, terjadi gangguan koneksi.", "urls": []}

# --- SERVE REACT ---
current_dir = os.path.dirname(os.path.abspath(__file__))
build_dir = os.path.join(current_dir, "build")
if not os.path.exists(build_dir):
    build_dir = os.path.join(os.path.dirname(current_dir), "build")

static_dir = os.path.join(build_dir, "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    file_path = os.path.join(build_dir, full_path)
    if full_path != "" and os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(build_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "File index.html tidak ditemukan. Pastikan sudah build frontend."}