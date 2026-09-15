/**
 * ESP32 Hardware Bridge & Firebase Integration Generator
 * Renders hardware schematics, pinout tables, and generates dynamic ready-to-flash C++ Arduino firmware.
 */
class FirebaseESP32Bridge {
  constructor() {
    this.wifiSsid = 'Community_IoT_Mesh';
    this.wifiPass = 'EcoSmart2026!';
    this.firebaseHost = 'https://smart-waste-ecosystem.firebaseio.com';
    this.firebaseAuth = 'AIzaSyA8890_FirebaseSecretKeyToken';
  }

  generateArduinoCode() {
    return `/* 
 * Smart Decentralized Community Waste & Sanitization Ecosystem
 * Microcontroller Firmware for ESP32 Dev Board
 * Generated automatically by Dashboard Bridge Engine
 */

#include <WiFi.h>
#include <FirebaseESP32.h>
#include <ESP32Servo.h>
#include <DHT.h>

// ----------------------------------------------------
// Wi-Fi & Firebase Credentials Configuration
// ----------------------------------------------------
#define WIFI_SSID "${this.wifiSsid}"
#define WIFI_PASSWORD "${this.wifiPass}"
#define FIREBASE_HOST "${this.firebaseHost}"
#define FIREBASE_AUTH "${this.firebaseAuth}"

// ----------------------------------------------------
// ESP32 Hardware Pin Assignments
// ----------------------------------------------------
#define PIN_IR_PROXIMITY    32  // Digital IR Proximity Sensor
#define PIN_MOISTURE_ANALOG 34  // Analog Moisture Probe (ADC1_CH6)
#define PIN_INDUCTIVE_METAL 35  // Digital Inductive Proximity Sensor
#define PIN_SERVO_PWM       18  // PWM Servo Motor Arm
#define PIN_DHT_COMPOST     4   // DHT11/DHT22 Compost Temp & Humidity
#define PIN_PIR_SANITAION   19  // PIR Motion Sensor Usage Counter
#define PIN_RELAY_AERATION  23  // Relay for Compost Aeration Blower
#define PIN_RELAY_FLUSH     22  // Relay for Sanitization Disinfectant Solenoid

// Ultrasonic Bin Sensors
#define PIN_US_TRIG_1       12
#define PIN_US_ECHO_1       13

// Global Objects
Servo wasteSorterServo;
DHT dhtCompost(PIN_DHT_COMPOST, DHT11);
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// System Telemetry Variables
int servoPos = 90; // Default 90° (Wet), 0° (Dry), 180° (Metal)
unsigned long lastTelemetryUpdate = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("[SYSTEM] Initializing Smart Waste & Sanitization Node...");

  // Pin Modes Initialization
  pinMode(PIN_IR_PROXIMITY, INPUT);
  pinMode(PIN_MOISTURE_ANALOG, INPUT);
  pinMode(PIN_INDUCTIVE_METAL, INPUT);
  pinMode(PIN_PIR_SANITAION, INPUT);
  pinMode(PIN_RELAY_AERATION, OUTPUT);
  pinMode(PIN_RELAY_FLUSH, OUTPUT);
  pinMode(PIN_US_TRIG_1, OUTPUT);
  pinMode(PIN_US_ECHO_1, INPUT);

  digitalWrite(PIN_RELAY_AERATION, LOW);
  digitalWrite(PIN_RELAY_FLUSH, LOW);

  // Attach Servo Motor
  wasteSorterServo.attach(PIN_SERVO_PWM);
  wasteSorterServo.write(servoPos);

  // Initialize DHT Sensor
  dhtCompost.begin();

  // Connect to Community Wi-Fi Network
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[Wi-Fi] Connected! IP: " + WiFi.localIP().toString());

  // Initialize Firebase RTDB Bridge
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("[FIREBASE] RTDB Link Established.");
}

void loop() {
  // 1. Smart Waste Segregation Routine
  bool irDetected = digitalRead(PIN_IR_PROXIMITY) == LOW; // Active Low
  if (irDetected) {
    int rawMoisture = analogRead(PIN_MOISTURE_ANALOG);
    int moisturePct = map(rawMoisture, 4095, 1000, 0, 100);
    bool isMetal = digitalRead(PIN_INDUCTIVE_METAL) == HIGH;

    if (isMetal) {
      servoPos = 180; // Metal Bin
      Serial.println("[SORTER] Metal Detected! Servo -> 180°");
    } else if (moisturePct >= 40) {
      servoPos = 90;  // Wet/Organic Bin
      Serial.println("[SORTER] Wet Organic Detected! Servo -> 90°");
    } else {
      servoPos = 0;   // Dry Waste Bin
      Serial.println("[SORTER] Dry Waste Detected! Servo -> 0°");
    }

    wasteSorterServo.write(servoPos);
    Firebase.setInt(firebaseData, "/telemetry/sorter/servoAngle", servoPos);
    delay(2000); // Allow item to slide off
  }

  // 2. Periodic Telemetry Sync to Firebase (Every 3 seconds)
  if (millis() - lastTelemetryUpdate > 3000) {
    lastTelemetryUpdate = millis();

    // Read Ultrasonic Bin Height
    digitalWrite(PIN_US_TRIG_1, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_US_TRIG_1, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_US_TRIG_1, LOW);
    long duration = pulseIn(PIN_US_ECHO_1, HIGH);
    float distanceCm = duration * 0.034 / 2;
    float fillPct = constrain(((100.0 - distanceCm) / 100.0) * 100.0, 0, 100);

    // Read Composting Telemetry
    float tempC = dhtCompost.readTemperature();
    float humidity = dhtCompost.readHumidity();

    // Push to Firebase RTDB
    Firebase.setFloat(firebaseData, "/telemetry/bins/organicFillPct", fillPct);
    Firebase.setFloat(firebaseData, "/telemetry/composting/temperature", tempC);
    Firebase.setFloat(firebaseData, "/telemetry/composting/humidity", humidity);

    // Condition-Based Aeration Control
    if (tempC > 65.0) {
      digitalWrite(PIN_RELAY_AERATION, HIGH); // Blower Fan ON
      Firebase.setBool(firebaseData, "/telemetry/composting/aerationActive", true);
    } else if (tempC < 50.0) {
      digitalWrite(PIN_RELAY_AERATION, LOW);  // Blower Fan OFF
      Firebase.setBool(firebaseData, "/telemetry/composting/aerationActive", false);
    }
  }
}
`;
  }

  updateConfig(ssid, pass, host, authSecret) {
    this.wifiSsid = ssid || this.wifiSsid;
    this.wifiPass = pass || this.wifiPass;
    this.firebaseHost = host || this.firebaseHost;
    this.firebaseAuth = authSecret || this.firebaseAuth;

    this.renderCodeSnippet();
  }

  renderCodeSnippet() {
    const codeEl = document.getElementById('esp32-code-snippet');
    if (codeEl) {
      codeEl.textContent = this.generateArduinoCode();
    }
  }

  copyCodeToClipboard() {
    const code = this.generateArduinoCode();
    navigator.clipboard.writeText(code).then(() => {
      window.app.showToast('📋 ESP32 Arduino Firmware Code Copied to Clipboard!', 'success');
    }).catch(err => {
      window.app.showToast('Failed to copy code: ' + err, 'warning');
    });
  }
}

window.esp32Bridge = new FirebaseESP32Bridge();
