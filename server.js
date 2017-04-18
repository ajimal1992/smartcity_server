var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
//either use cloud service port or local port:3000
var port = process.env.PORT || 8000;
//import firmata library
var Board = require("firmata");
var SerialPort = require("serialport");


//define lamppost pin assignments here
var lamp_pins = [5, 6, 7];
var lamp_states = [];

//open port 8000
server.listen(port, function() {
    console.log('Server listening at port %d', port);
});

//host the index file
app.use(express.static(__dirname));

Board.requestPort(function(error, port) {
    var board = new Board(port.comName);
    board.on("ready", function() {
        io.on('connection', function(socket) {

            //send all the current states of the lamppost if new client is open
            //this is to prevent the UI from displaying the defualt view "all off" every time the client is refreshed
            io.emit("lamp_states", lamp_states)

            if (error) {
                console.log(error);
                return;
            }

            //initialize lamppost pins
            for (i = 0; i < lamp_pins.length; i++) {
                board.pinMode(lamp_pins[i], board.MODES.OUTPUT);
            }

            // turn on/off the led when something is received from client
            socket.on("lamppost", function(lamppost_data) {
                var pin = lamp_pins[parseInt(lamppost_data.id)];
                //turn on/off the correct lamppost by id
                board.digitalWrite(pin, lamppost_data.state);
                //remember the states of the lamppost
                lamp_states[lamppost_data.id] = lamppost_data.state;
            });
        });
    });
});


var port = new SerialPort('/dev/ttyACM1', {
    baudrate: 115200,
    parser: SerialPort.parsers.readline('\n')
});


port.on('data', function(data) {
    //sensors object
    var sensors = {
        temperature: null,
        humididty: null,
        intensity: null,
        carpark: null
    }
    //parse data from serialport
    sensors.temperature = data.substring(0, data.indexOf('t'));
    sensors.humidity = data.substring(data.indexOf('t') + 1, data.indexOf('h'));
    sensors.intensity = data.substring(data.indexOf('h') + 1, data.indexOf('i'));
    sensors.carpark = data.substring(data.indexOf('i') + 1, data.indexOf('c'));

    console.log(sensors);
    //send the data to the client
    io.emit("sensors", sensors);
});