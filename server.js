var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
//either use cloud service port or local port:3000
var port = process.env.PORT || 8000;
//import firmata library
var firmata = require("firmata");
var SerialPort = require("serialport");
var request = require('request');


//define lamppost pin assignments here
var lamp_pins = [5, 6, 7];
var boot_pin = 13;
var lamp_states = [];

//open port 8000
server.listen(port, function() {
    console.log('Server listening at port %d', port);
});

//host the index file
app.use(express.static(__dirname));

var board = new firmata.Board("/dev/lampposts", function(err) {
    //boot-up indicator
    board.pinMode(boot_pin, board.MODES.OUTPUT);
    board.digitalWrite(boot_pin, 1);
    
    io.on('connection', function(socket) {
        //send all the current states of the lamppost if new client is open
        //this is to prevent the UI from displaying the defualt view "all off" every time the client is refreshed
        io.emit("lamp_states", lamp_states);

        if (err) {
            console.log(err);
            return;
        }

        //initialize lamppost pins
        for (i = 0; i < lamp_pins.length; i++) {
            board.pinMode(lamp_pins[i], board.MODES.OUTPUT);
        }

        // turn on/off the led when something is received from client
        socket.on("lamppost", function(lamppost_data) {
            if (parseInt(lamppost_data.id) == 3) {
                toggleRealLampPost(lamppost_data.state);
            } else {
                var pin = lamp_pins[parseInt(lamppost_data.id)];

                //turn on/off the correct lamppost by id
                board.digitalWrite(pin, lamppost_data.state);
            }
            //remember the states of the lamppost
            lamp_states[lamppost_data.id] = lamppost_data.state;
	    io.emit("lamp_states", lamp_states);
        });
    });
});


var sensorsport = new SerialPort('/dev/sensors', {
    baudrate: 115200,
    parser: SerialPort.parsers.readline('\n')
});


sensorsport.on('data', function(data) {
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


var trafficport = new SerialPort('/dev/trafficlights', {
    baudrate: 115200,
    parser: SerialPort.parsers.readline('\n')
});


trafficport.on('data', function(data) {
    //sensors object
    var trafficlight = {
        trafficlight1: null,
        trafficlight2: null
    }
    //parse data from serialport
    trafficlight.trafficlight1 = data.substring(0, data.indexOf('a'));
    trafficlight.trafficlight2 = data.substring(data.indexOf('a') + 2, data.indexOf('b'));
    console.log(trafficlight);
    //send the data to the client
    io.emit("trafficlight", trafficlight);
});


app.get('/lamppost', function(request, response) {
    //this opens an API for external app to control real lamp post
    var state = request.query.state;
    //convert string to real booleans
    if (state == 'true')
        state = true;
    else if (state == 'false')
        state = false;
    response.end("Received Lamp Post State: " + state);
    toggleRealLampPost(state);
});

function toggleRealLampPost(state) {
    //localhost:8000/lamppost?state=true
    if (state == true) {
        var url = "http://mylinkit.local:8001/?value=high"
    } else if (state == false) {
        var url = "http://mylinkit.local:8001/?value=low"
    }

    request(url, function(error, response, body) {
        // console.log('error:', error); // Print the error if one occurred
        // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        // console.log('body:', body); // Print the HTML for the Google homepage.
    });
    //stopre lamp post states
    lamp_states[3] = state;

    //update the client of the lamppost states
    io.emit("lamp_states", lamp_states);
}
