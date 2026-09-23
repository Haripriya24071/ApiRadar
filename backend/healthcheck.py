import sys
import urllib.request

def check_health():
    url = "http://localhost:8000/ping"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ApiRadar-HealthCheck"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                print("Healthcheck OK (200)")
                sys.exit(0)
            else:
                print(f"Healthcheck failed with status code: {response.status}")
                sys.exit(1)
    except Exception as e:
        print(f"Healthcheck failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_health()
