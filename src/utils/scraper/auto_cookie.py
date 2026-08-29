"""
PC 브라우저(Chrome, Edge, Whale, Brave 등)의 로컬 쿠키 저장소에서
blablalink.com 로그인 세션 쿠키를 자동으로 추출하여 scraper/.session_cookie 에 저장하는 스크립트.
"""

import os
import sys
import json
import sqlite3
import shutil
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
COOKIE_FILE = os.path.join(HERE, ".session_cookie")

# Windows 브라우저 쿠키 경로
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", "")
BROWSER_PATHS = [
    ("Chrome", os.path.join(LOCAL_APPDATA, r"Google\Chrome\User Data\Default\Network\Cookies")),
    ("Edge", os.path.join(LOCAL_APPDATA, r"Microsoft\Edge\User Data\Default\Network\Cookies")),
    ("Whale", os.path.join(LOCAL_APPDATA, r"Naver\Naver Whale\User Data\Default\Network\Cookies")),
    ("Brave", os.path.join(LOCAL_APPDATA, r"BraveSoftware\Brave-Browser\User Data\Default\Network\Cookies")),
    ("Chrome_Profile1", os.path.join(LOCAL_APPDATA, r"Google\Chrome\User Data\Profile 1\Network\Cookies")),
    ("Edge_Profile1", os.path.join(LOCAL_APPDATA, r"Microsoft\Edge\User Data\Profile 1\Network\Cookies")),
]

def decrypt_windows_cookie(encrypted_value, key):
    try:
        # DPAPI 또는 AES-GCM 복호화 시도
        if encrypted_value[:3] == b'v10' or encrypted_value[:3] == b'v11':
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
            nonce = encrypted_value[3:15]
            ciphertext = encrypted_value[15:]
            aesgcm = AESGCM(key)
            return aesgcm.decrypt(nonce, ciphertext, None).decode('utf-8')
        else:
            import win32crypt
            return win32crypt.CryptUnprotectData(encrypted_value, None, None, None, 0)[1].decode('utf-8')
    except Exception:
        return ""

def get_browser_key(browser_type):
    try:
        import win32crypt
        import base64
        local_state_path = ""
        if "Chrome" in browser_type:
            local_state_path = os.path.join(LOCAL_APPDATA, r"Google\Chrome\User Data\Local State")
        elif "Edge" in browser_type:
            local_state_path = os.path.join(LOCAL_APPDATA, r"Microsoft\Edge\User Data\Local State")
        elif "Whale" in browser_type:
            local_state_path = os.path.join(LOCAL_APPDATA, r"Naver\Naver Whale\User Data\Local State")
        elif "Brave" in browser_type:
            local_state_path = os.path.join(LOCAL_APPDATA, r"BraveSoftware\Brave-Browser\User Data\Local State")

        if not os.path.exists(local_state_path):
            return None

        with open(local_state_path, "r", encoding="utf-8") as f:
            local_state = json.load(f)
        encrypted_key = base64.b64decode(local_state["os_crypt"]["encrypted_key"])
        encrypted_key = encrypted_key[5:] # DPAPI prefix 제거
        return win32crypt.CryptUnprotectData(encrypted_key, None, None, None, 0)[1]
    except Exception:
        return None

def extract_cookies():
    print("🔍 PC 브라우저에서 blablalink 로그인 세션 쿠키를 검색하는 중...")
    
    # 1. browser_cookie3 라이브러리가 있으면 우선 사용
    try:
        import browser_cookie3
        for loader in [browser_cookie3.chrome, browser_cookie3.edge, browser_cookie3.opera, browser_cookie3.brave]:
            try:
                cj = loader(domain_name='blablalink.com')
                cookies = {c.name: c.value for c in cj}
                if 'game_token' in cookies or 'game_openid' in cookies:
                    cookie_str = "; ".join([f"{k}={v}" for k, v in cookies.items()])
                    print(f"✅ browser_cookie3 로 세션 쿠키 발견!")
                    return cookie_str
            except Exception:
                pass
    except ImportError:
        pass

    # 2. 직접 SQLite DB 및 DPAPI 복호화 시도
    for name, path in BROWSER_PATHS:
        if not os.path.exists(path):
            continue
        try:
            key = get_browser_key(name)
            if not key:
                continue

            tmp_dir = tempfile.mkdtemp()
            tmp_db = os.path.join(tmp_dir, "Cookies.db")
            shutil.copyfile(path, tmp_db)

            conn = sqlite3.connect(tmp_db)
            cursor = conn.cursor()
            cursor.execute("SELECT name, encrypted_value FROM cookies WHERE host_key LIKE '%blablalink.com%'")
            
            cookies = {}
            for cookie_name, enc_val in cursor.fetchall():
                val = decrypt_windows_cookie(enc_val, key)
                if val:
                    cookies[cookie_name] = val

            conn.close()
            shutil.rmtree(tmp_dir, ignore_errors=True)

            if 'game_token' in cookies or 'game_openid' in cookies:
                cookie_str = "; ".join([f"{k}={v}" for k, v in cookies.items()])
                print(f"✅ {name} 브라우저에서 blablalink 세션 쿠키 발견!")
                return cookie_str
        except Exception as e:
            continue

    return None

def main():
    cookie_str = extract_cookies()
    if not cookie_str:
        print("\n❌ PC 브라우저에서 blablalink.com 로그인 세션을 찾지 못했습니다.")
        print("💡 먼저 Chrome 또는 Edge 브라우저에서 https://www.blablalink.com 에 로그인한 후 다시 실행해주세요.")
        return 1

    with open(COOKIE_FILE, "w", encoding="utf-8") as f:
        f.write(cookie_str + "\n")

    print(f"\n🎉 성공! 세션 쿠키가 {COOKIE_FILE} 에 자동 저장되었습니다.")
    print("이제 시뮬레이터 또는 profile_fetch.py 에서 자유롭게 동기화할 수 있습니다!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
