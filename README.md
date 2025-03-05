# 🚀 專案安裝指南

此專案包含後端（Python / Flask / LLM 模型）與前端（Node.js / npm）部分，請依下方步驟安裝與執行。

---

## ✅ 環境需求
- Python 3.9+
- Node.js (建議 LTS 版本，例如 18.x)
- NVIDIA GPU (若需模型加速)
- pip, npm

---

# 🔹 1️⃣ 後端安裝（Python）

### 📌 1-1. 安裝 PyTorch

請依你的系統與顯卡支援對應版本的 PyTorch。  
官方指引工具 👉 [https://pytorch.org/get-started/locally/](https://pytorch.org/get-started/locally/)

#### GPU 版（CUDA 11.8）：
```bash
pip install torch==2.1.0+cu118 torchvision==0.16.0+cu118 torchaudio==2.1.0+cu118 -f https://download.pytorch.org/whl/torch_stable.html
```

#### CPU 版：
```bash
pip install torch==2.1.0+cpu torchvision==0.16.0+cpu torchaudio==2.1.0+cpu -f https://download.pytorch.org/whl/torch_stable.html
```

---

### 📌 1-2. 安裝 Python 套件

請在專案根目錄執行：

```bash
pip install -r requirements.txt
```

---

### 📌 1-3. 啟動後端服務
進入後端資料夾`backend/`：
```bash
python main.py
```
後端服務將在 `http://localhost:5000/` 運行。

---

# 🔹 2️⃣ 前端安裝（npm）

### 📌 2-1. 確認 Node.js 環境
確認 Node.js 和 npm 版本：
```bash
node -v
npm -v
```
若尚未安裝，請到官方網站下載安裝 👉 [https://nodejs.org/en](https://nodejs.org/en)

---

### 📌 2-2. 安裝前端依賴
進入前端資料夾`frontend/`：

```bash
cd frontend
npm install
```

---

### 📌 2-3. 開發與執行
| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器（開啟後會在 `http://localhost:5173/`） |
| `npm run build` | 打包生產環境 |
| `npm run start` | 啟動生產環境伺服器（若有設定） |

---

# 📝 補充說明
- 後端 Flask 服務通常在 `5000` port，vite前端在 `5173` port，請注意跨域（CORS）設定。
- `bitsandbytes` 與模型量化需 GPU 支援，確保驅動與 CUDA 環境正確。
- 請將訓練後的模型放入到backend資料夾中並在`main.py`載入對應的路徑
---

