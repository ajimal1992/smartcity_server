float temp = 24.04;
float humidity = 67.46;
int intensity = 1;
int carpark = 1;

void setup(){
    Serial.begin(115200);
}

void loop(){
     temp = temp + 0.1;
     humidity = humidity + 0.1;
     intensity = 1;
     carpark = 1;

    Serial.print(temp);
    Serial.print('t');
    Serial.print(humidity);
    Serial.print("h");
    Serial.print(intensity);
    Serial.print("i");
    Serial.print(carpark);
    Serial.println("c");
    delay(250);
}