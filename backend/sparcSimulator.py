import requests
import time
import random
import json

# Configurações
API_URL = "http://localhost:8080/api/store-data"

# Dispositivos (Mesmos Tokens do Seed acima)
DEVICES = [
    {
        "name": "Água",
        "mac": "AA:BB:CC:DD:EE:FF",
        "token": "TOKEN-AGUA-123",
        "type": 1, # Volume
        "base_value": 12.0
    },
    {
        "name": "Energia",
        "mac": "11:22:33:44:55:66",
        "token": "TOKEN-ENERGIA-123",
        "type": 2, # kWh
        "base_value": 3.5
    }
]

print("📡 Iniciando Simulador ESP32 Sparc...")
print(f"Alvo: {API_URL}")
print("Pressione Ctrl+C para parar.\n")

while True:
    for dev in DEVICES:
        # Gera um valor aleatório próximo da base
        variation = random.uniform(-1.0, 2.0)
        value = round(max(0, dev["base_value"] + variation), 2)

        payload = {
            "macAddress": dev["mac"],
            "apiToken": dev["token"],
            "measure": [
                {
                    "type": dev["type"],
                    "value": value
                }
            ]
        }

        try:
            response = requests.post(API_URL, json=payload)
            if response.status_code == 201 or response.status_code == 200:
                print(f"✅ [{dev['name']}] Enviado: {value} | Status: {response.status_code}")
            else:
                print(f"❌ [{dev['name']}] Erro: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"🚨 Erro de conexão: {e}")

    # Espera 5 segundos antes de enviar o próximo dado
    # (No mundo real seria 5 minutos, mas aqui aceleramos para você ver o gráfico andar)
    print("⏳ Aguardando 5s...")
    time.sleep(5)