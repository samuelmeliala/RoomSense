#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define DHTPIN 27
#define DHTTYPE DHT22
#define MQ135_PIN 34

DHT dht(DHTPIN, DHTTYPE);
BH1750 lightMeter;

float RLOAD = 10.0;
float RZERO = 25.91;  // Default fallback value
const float a = 116.6020682;
const float b = 2.769034857;

// WiFi Setup
const char* ssid = "POCO F7";
const char* password = "anakganteng69";
const char* serverUrl = "http://192.168.56.109:3000/sensor-data";

unsigned long previousMillis = 0;
const long interval = 5000;

// Calibration
bool isCalibrating = true;
unsigned long calibrationStartTime;
unsigned long calibrationDuration = 10000;  // 10 seconds
float rzeroSum = 0;
int calibrationCount = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  Wire.begin();
  lightMeter.begin();
  analogReadResolution(12);

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.println("Sensor reading with CO₂ ppm estimation...");
  Serial.println("Calibrating RZERO for 10 seconds... Make sure the air is clean.");
  calibrationStartTime = millis();
}

float getMQ135Resistance(int raw_adc) {
  float voltage = raw_adc * (3.3 / 4095.0);
  return ((3.3 - voltage) * RLOAD) / voltage;
}

float getPPM(float rs, float rzero) {
  return a * pow((rs / rzero), -b);
}

String classifyAirQuality(float ppm) {
  if (ppm <= 600) return "Good";
  else if (ppm <= 1000) return "Moderate";
  else if (ppm <= 2000) return "Unhealthy";
  else if (ppm <= 5000) return "Very Unhealthy";
  else return "Hazardous";
}

void loop() {
  unsigned long now = millis();

  // Calibration mode (first 10 seconds)
  if (isCalibrating) {
    if (now - calibrationStartTime <= calibrationDuration) {
      int adc = analogRead(MQ135_PIN);
      float rs = getMQ135Resistance(adc);
      float rzero = rs / pow(a / 400.0, 1.0 / b);  // Assume 400ppm in clean air

      rzeroSum += rzero;
      calibrationCount++;

      Serial.print("Calibrating... RZERO sample: ");
      Serial.println(rzero);

      delay(1000);  // Delay between calibration samples
      return;
    } else {
      RZERO = rzeroSum / calibrationCount;
      isCalibrating = false;
      Serial.print("Calibration complete. Final RZERO: ");
      Serial.println(RZERO);
    }
  }

  // Normal data reading
  if (now - previousMillis >= interval) {
    previousMillis = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    float lux = lightMeter.readLightLevel();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    int adc = analogRead(MQ135_PIN);
    float rs = getMQ135Resistance(adc);
    float co2_ppm = getPPM(rs, RZERO);
    String airQuality = classifyAirQuality(co2_ppm);

    Serial.print("Temp: ");
    Serial.print(temperature);
    Serial.print(" °C | Humidity: ");
    Serial.print(humidity);
    Serial.print(" % | Light : ");
    Serial.print(lux);
    Serial.print(" lux | Air Quality (Raw): ");
    Serial.print(adc); 
    Serial.print(" | CO₂ PPM: ");
    Serial.print(co2_ppm);
    Serial.print(" | Air Quality Index: ");
    Serial.println(airQuality);

    //send data to server
    sendDataToServer(temperature, humidity, co2_ppm, lux, airQuality);
  }


}

void sendDataToServer(float temperature, float humidity, float co2_ppm, float lux, String airQuality) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["co2"] = co2_ppm;
    doc["lux"] = lux;
    doc["air_quality"] = airQuality;

    String jsonData;
    serializeJson(doc, jsonData);

    int httpResponseCode = http.POST(jsonData);

    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Server response: " + response);
    }

    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}
