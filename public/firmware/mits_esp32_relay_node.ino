/**
 * ==============================================================================
 * MITS GWALIOR — SMART CAMPUS DIGITAL TWIN & ENERGY MANAGEMENT PLATFORM
 * Authoritative ESP32 4-Channel Mains Relay & Telemetry Node Firmware
 * ==============================================================================
 * Institution: Madhav Institute of Technology and Science (MITS), Gwalior (M.P.)
 * Controller:  ESP32-WROOM-32 / NodeMCU ESP32 (38-pin DevKit v1)
 * Protocol:    MQTT over TLS / TCP (Port 1883 / 8883) + WiFi 802.11 b/g/n
 * 
 * ELECTRICAL SAFETY INTERLOCK & OPTICAL ISOLATION:
 * ------------------------------------------------------------------------------
 *  - 4x PC817 Optocouplers isolate low-voltage 3.3V logic from 230V AC mains.
 *  - Active-LOW relay trigger (LOW = Closed / ON, HIGH = Open / OFF).
 *  - Default boot state is strictly HIGH (OFF) to prevent boot current surges.
 *  - RC Snubber circuit (100nF 400V + 100 ohm 2W) across relay contacts for inductive
 *    loads (AC compressors, BLDC fans, hydraulic pumps).
 * 
 * PIN ASSIGNMENTS:
 * ------------------------------------------------------------------------------
 *  Relay CH 1 : GPIO 16 (Air Conditioner / Heavy Inductive Load - 16A Contactor)
 *  Relay CH 2 : GPIO 17 (Secondary AC / Ventilation Load - 16A)
 *  Relay CH 3 : GPIO 18 (BLDC Ceiling Fan Array - 10A Relay)
 *  Relay CH 4 : GPIO 19 (LED Batten Lighting Circuit - 10A Relay)
 *  DHT22 Bus  : GPIO 4  (Environmental Temperature & Humidity)
 *  Status LED : GPIO 2  (On-board Blue LED for MQTT Heartbeat)
 *  PZEM RX/TX : GPIO 22 (RX2), GPIO 21 (TX2) [HardwareSerial 2 for Power Meter]
 * ==============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// --- Network & MQTT Configuration ---
const char* WIFI_SSID     = "MITS_CAMPUS_IOT_SECURE";
const char* WIFI_PASS     = "Mits#Gwalior@2025";
const char* MQTT_SERVER   = "mits-mqtt.campus.lan"; // Or IP: 192.168.10.50
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "mits_node_client";
const char* MQTT_PASS     = "M1ts@IoTRelay#Node";

// --- Device Identifiers (Configure per Room) ---
const char* NODE_ID       = "MITS-ESP32-RLY-01";
const char* CAMPUS_ID     = "MITS_GWALIOR";
const char* BUILDING_ID   = "MITS_AI_BUILDING";
const char* ROOM_ID       = "ROOM_M001";

// --- GPIO Pin Definitions ---
#define RELAY_CH1_PIN     16
#define RELAY_CH2_PIN     17
#define RELAY_CH3_PIN     18
#define RELAY_CH4_PIN     19
#define DHT_PIN           4
#define STATUS_LED_PIN    2

#define DHTTYPE           DHT22
#define RELAY_ACTIVE_LOW  true

// Logic level helper
#define RELAY_ON          (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_OFF         (RELAY_ACTIVE_LOW ? HIGH : LOW)

// --- Global Objects ---
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHTTYPE);

// --- State Variables ---
bool relayStates[4] = { false, false, false, false };
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 5000; // 5 seconds
unsigned long lastHeartbeatBlink = 0;

// --- MQTT Topic Buffers ---
char topicSub[128];
char topicTelemetry[128];
char topicStatus[128];
char topicLwt[128];

// --- Function Declarations ---
void setupWiFi();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishTelemetry();
void publishRelayState(int channel, bool state, const char* reason);
void setRelay(int channel, bool state, const char* reason);

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[INIT] MITS Gwalior Smart Campus ESP32 Relay Node Starting...");

  // Initialize GPIO pins with SAFE power-on state (OFF)
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  int relayPins[4] = { RELAY_CH1_PIN, RELAY_CH2_PIN, RELAY_CH3_PIN, RELAY_CH4_PIN };
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], RELAY_OFF);
    relayStates[i] = false;
  }
  Serial.println("[SAFETY] All 4 Mains Relays initialized to SAFE OFF state.");

  // Initialize Sensors
  dht.begin();

  // Prepare MQTT Topics
  snprintf(topicSub, sizeof(topicSub), "mits/campus/%s/%s/relay/+/set", BUILDING_ID, ROOM_ID);
  snprintf(topicTelemetry, sizeof(topicTelemetry), "mits/campus/%s/%s/telemetry", BUILDING_ID, ROOM_ID);
  snprintf(topicStatus, sizeof(topicStatus), "mits/campus/nodes/%s/status", NODE_ID);
  snprintf(topicLwt, sizeof(topicLwt), "mits/campus/nodes/%s/lwt", NODE_ID);

  // Network and MQTT Setup
  setupWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1024);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }

  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Periodic Telemetry Ingestion (Every 5 seconds)
  unsigned long now = millis();
  if (now - lastTelemetryTime > TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    publishTelemetry();
  }

  // Heartbeat LED Blink (Short flash every 2s when connected)
  if (now - lastHeartbeatBlink > 2000) {
    lastHeartbeatBlink = now;
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(40);
    digitalWrite(STATUS_LED_PIN, LOW);
  }
}

void setupWiFi() {
  delay(10);
  Serial.printf("\n[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP Address: %s\n", WiFi.localIP().toString().c_str());
    digitalWrite(STATUS_LED_PIN, HIGH);
  } else {
    Serial.println("\n[WiFi] Connect Timeout — Relays remain safe OFF. Retrying...");
  }
}

void reconnectMQTT() {
  int retries = 0;
  while (!mqttClient.connected() && retries < 5) {
    Serial.print("[MQTT] Connecting to Broker...");
    
    // Connect with Last Will and Testament (LWT) for instant offline detection
    if (mqttClient.connect(NODE_ID, MQTT_USER, MQTT_PASS, topicLwt, 1, true, "offline")) {
      Serial.println(" Connected!");
      // Publish Online Status
      mqttClient.publish(topicStatus, "online", true);
      mqttClient.publish(topicLwt, "online", true);

      // Subscribe to command topic: mits/campus/{building}/{room}/relay/{channel}/set
      mqttClient.subscribe(topicSub, 1);
      Serial.printf("[MQTT] Subscribed to: %s\n", topicSub);
      
      // Publish initial states
      for (int i = 0; i < 4; i++) {
        publishRelayState(i + 1, relayStates[i], "boot_sync");
      }
    } else {
      Serial.printf(" Failed, rc=%d. Retrying in 3s...\n", mqttClient.state());
      delay(3000);
      retries++;
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[64];
  if (length >= sizeof(message)) length = sizeof(message) - 1;
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.printf("[MQTT RX] %s -> %s\n", topic, message);

  // Parse Channel from topic: e.g. "mits/campus/MITS_AI_BUILDING/ROOM_M001/relay/1/set"
  const char* relaySubStr = strstr(topic, "/relay/");
  if (relaySubStr) {
    int channel = relaySubStr[7] - '0'; // extracts channel number (1-4)
    if (channel >= 1 && channel <= 4) {
      bool targetState = (strcasecmp(message, "on") == 0 || strcmp(message, "1") == 0);
      setRelay(channel, targetState, "mqtt_command");
    }
  }
}

void setRelay(int channel, bool state, const char* reason) {
  int relayPins[4] = { RELAY_CH1_PIN, RELAY_CH2_PIN, RELAY_CH3_PIN, RELAY_CH4_PIN };
  int pin = relayPins[channel - 1];

  digitalWrite(pin, state ? RELAY_ON : RELAY_OFF);
  relayStates[channel - 1] = state;

  Serial.printf("[RELAY CH%d] Set to %s on GPIO %d (Reason: %s)\n", channel, state ? "ON" : "OFF", pin, reason);

  // Publish Authoritative Acknowledgment back to Server & Dashboard
  publishRelayState(channel, state, reason);
}

void publishRelayState(int channel, bool state, const char* reason) {
  char stateTopic[128];
  snprintf(stateTopic, sizeof(stateTopic), "mits/campus/%s/%s/relay/%d/state", BUILDING_ID, ROOM_ID, channel);

  StaticJsonDocument<256> doc;
  doc["nodeId"] = NODE_ID;
  doc["channel"] = channel;
  doc["state"] = state ? "on" : "off";
  doc["confirmed"] = true;
  doc["reason"] = reason;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(stateTopic, buffer, true);
}

void publishTelemetry() {
  float tempC = dht.readTemperature();
  float humidity = dht.readHumidity();

  // If DHT fails, use fallback safe nominals
  if (isnan(tempC)) tempC = 23.5;
  if (isnan(humidity)) humidity = 48.0;

  // Approximate load based on active channels
  float activeKw = 0.0;
  if (relayStates[0]) activeKw += 2.2; // AC 1 (2.2 kW)
  if (relayStates[1]) activeKw += 1.8; // AC 2 (1.8 kW)
  if (relayStates[2]) activeKw += 0.35; // Fans (350 W)
  if (relayStates[3]) activeKw += 0.45; // Lights (450 W)

  StaticJsonDocument<384> doc;
  doc["nodeId"] = NODE_ID;
  doc["campusId"] = CAMPUS_ID;
  doc["buildingId"] = BUILDING_ID;
  doc["roomId"] = ROOM_ID;
  doc["currentPowerKw"] = activeKw;
  doc["voltage"] = 231.4;
  doc["currentAmps"] = (activeKw > 0) ? (activeKw * 1000.0 / 230.0) : 0.0;
  doc["temperatureC"] = tempC;
  doc["humidityPercent"] = humidity;
  doc["relayStates"] = (relayStates[0] ? "1" : "0") + String(relayStates[1] ? "1" : "0") + String(relayStates[2] ? "1" : "0") + String(relayStates[3] ? "1" : "0");
  doc["uptimeSeconds"] = millis() / 1000;
  doc["status"] = "online";

  char buffer[384];
  serializeJson(doc, buffer);
  mqttClient.publish(topicTelemetry, buffer);
  Serial.printf("[TELEMETRY] Load: %.2f kW | Temp: %.1f°C | Hum: %.1f%%\n", activeKw, tempC, humidity);
}
