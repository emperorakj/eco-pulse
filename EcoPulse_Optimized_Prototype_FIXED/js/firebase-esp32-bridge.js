(function () {
  'use strict';

  class FirebaseESP32Bridge {
    constructor() {
      this.wifiSsid = 'YOUR_WIFI_SSID';
      this.wifiPass = 'YOUR_WIFI_PASSWORD';
      this.firebaseHost = 'https://YOUR_PROJECT-default-rtdb.firebaseio.com';
      this.firebaseAuth = 'YOUR_FIREBASE_TOKEN';
      this.generatedCode = '';
    }

    updateConfig(ssid, pass, host, auth) {
      this.wifiSsid = String(ssid || 'YOUR_WIFI_SSID');
      this.wifiPass = String(pass || 'YOUR_WIFI_PASSWORD');
      this.firebaseHost = String(host || 'https://YOUR_PROJECT-default-rtdb.firebaseio.com');
      this.firebaseAuth = String(auth || 'YOUR_FIREBASE_TOKEN');
      this.generatedCode = this.generateArduinoCode();
      this.renderCodeSnippet();
      window.app?.showToast('⚡ Firmware configuration updated locally. No credentials are stored by the dashboard.', 'success');
    }

    generateArduinoCode() {
      const esc = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      return `/*
 * EcoPulse ESP32 Reference Firmware
 * Prototype reference only — dashboard currently uses simulated telemetry.
 * Never commit real Wi-Fi/Firebase credentials to source control.
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ESP32Servo.h>
#include <DHT.h>

#define IR_PIN 32
#define MOISTURE_PIN 34
#define INDUCTIVE_PIN 35
#define SERVO_PIN 18
#define ULTRASONIC_TRIG 12
#define ULTRASONIC_ECHO 13
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define FAN_RELAY 23
#define FLUSH_RELAY 22

const char* WIFI_SSID = "${esc(this.wifiSsid)}";
const char* WIFI_PASSWORD = "${esc(this.wifiPass)}";
const char* DATABASE_URL = "${esc(this.firebaseHost)}";
const char* FIREBASE_TOKEN = "${esc(this.firebaseAuth)}";

Servo sorterServo;
DHT dht(DHT_PIN, DHT_TYPE);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

float readDistanceCm() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);

  long duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
  if (duration == 0) return -1;
  return duration * 0.0343f / 2.0f;
}

void setup() {
  Serial.begin(115200);

  pinMode(IR_PIN, INPUT);
  pinMode(INDUCTIVE_PIN, INPUT);
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
  pinMode(FAN_RELAY, OUTPUT);
  pinMode(FLUSH_RELAY, OUTPUT);

  digitalWrite(FAN_RELAY, LOW);
  digitalWrite(FLUSH_RELAY, LOW);

  sorterServo.attach(SERVO_PIN);
  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }

  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = FIREBASE_TOKEN;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  bool objectDetected = digitalRead(IR_PIN) == LOW;
  bool isMetal = digitalRead(INDUCTIVE_PIN) == HIGH;
  int rawMoisture = analogRead(MOISTURE_PIN);

  int moisturePct = map(rawMoisture, 4095, 1000, 0, 100);
  moisturePct = constrain(moisturePct, 0, 100);

  int servoAngle = 0;
  if (objectDetected) {
    if (isMetal) servoAngle = 180;
    else if (moisturePct >= 40) servoAngle = 90;
  }

  sorterServo.write(servoAngle);

  float distanceCm = readDistanceCm();
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (distanceCm >= 0 && distanceCm <= 100) {
    float fillPct = constrain((100.0f - distanceCm) / 100.0f * 100.0f, 0.0f, 100.0f);
    Firebase.RTDB.setFloat(&fbdo, "/telemetry/bins/organicFillPct", fillPct);
  }

  if (!isnan(temp)) {
    Firebase.RTDB.setFloat(&fbdo, "/telemetry/composting/temp", temp);
    digitalWrite(FAN_RELAY, temp > 65 ? HIGH : temp < 50 ? LOW : digitalRead(FAN_RELAY));
  }

  if (!isnan(humidity)) {
    Firebase.RTDB.setFloat(&fbdo, "/telemetry/composting/humidity", humidity);
  }

  Firebase.RTDB.setInt(&fbdo, "/telemetry/sorter/servoAngle", servoAngle);
  Firebase.RTDB.setInt(&fbdo, "/telemetry/sorter/moisturePct", moisturePct);
  Firebase.RTDB.setBool(&fbdo, "/telemetry/sorter/metalDetected", isMetal);

  delay(3000);
}
`;
    }

    renderCodeSnippet() {
      const pre = document.getElementById('esp32-code-snippet');
      if (!pre) return;
      this.generatedCode = this.generatedCode || this.generateArduinoCode();
      pre.textContent = this.generatedCode;
    }

    async copyCodeToClipboard() {
      this.generatedCode = this.generatedCode || this.generateArduinoCode();
      try {
        await navigator.clipboard.writeText(this.generatedCode);
        window.app?.showToast('📋 Firmware copied to clipboard.', 'success');
      } catch {
        window.app?.showToast('Clipboard access unavailable. Select and copy the firmware manually.', 'warning');
      }
    }
  }

  window.esp32Bridge = new FirebaseESP32Bridge();
})();
