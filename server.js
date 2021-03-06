//cvar express = require('express');
//cvar app = express();

//cvar server = require('http').createServer(app);

    var fs = require('fs'),
    //https = require('https'),
    express = require('express'),
    app = express();
	
	var server = require('http').createServer(app);

 /* --used HTTP instead of HTTPS due to certificate issues. TODO: Implement HTTPS 
 var server  = https.createServer({
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem')
    }, app);
	*/

var io = require('socket.io')(server);
//either use cloud service port or local port:3000
//cvar port = process.env.PORT || 8443;
//import firmata library
var firmata = require("firmata");
var SerialPort = require("serialport");
var request = require('request');




server.listen(55555, function() {
    console.log('Server listening at port %d', 55555);
});

/*
    app.get('/', function (req, res) {
      res.header('Content-type', 'text/html');
      return res.end('<h1>Hello, Secure World!</h1>');
    });
*/

//define lamppost pin assignments here
var lamp_pins = [5, 6, 7];
var boot_pin = 13;
var lamp_states = [0,0,0];
var trigger_is_done = true;


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

            //trigger real lamp post if cluster 3 is triggered
            if (parseInt(lamppost_data.id) == 2)
                toggleRealLampPost(lamppost_data.state);

            var id = parseInt(lamppost_data.id)
            toggleFakeLampPost(id, lamppost_data.state);
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
        geolocation: null,
        speeding: null,
        carpark: null
    }
    //parse data from serialport
    sensors.temperature = data.substring(0, data.indexOf('t'));
    sensors.humidity = data.substring(data.indexOf('t') + 1, data.indexOf('h'));
    sensors.intensity = data.substring(data.indexOf('h') + 1, data.indexOf('i'));
    sensors.speeding = data.substring(data.indexOf('i') + 1, data.indexOf('s'));
    sensors.geolocation = data.substring(data.indexOf('s') + 1, data.indexOf('g'));
    sensors.carpark = data.substring(data.indexOf('g') + 1, data.indexOf('c'));

    if(sensors.speeding == "1")
    {
        console.log("triggered");
        notifySpeeding();
    }
    // console.log(sensors);

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
        trafficlight2: null,
    }

    var ambulance;

    //parse data from serialport
    trafficlight.trafficlight1 = data.substring(0, data.indexOf('a'));
    trafficlight.trafficlight2 = data.substring(data.indexOf('a') + 1, data.indexOf('b'));
    ambulance = data.substring(data.indexOf('b') + 1, data.indexOf('t'));

    //send the data to the client

    //this block is to filter the data from sending continuously
    //only send to client if ambulance data is parsed. Otherwise send traffic light data
    if(ambulance ==  1){
        io.emit("ambulance", ambulance);
        // console.log(ambulance);
    }

    else{
        io.emit("trafficlight", trafficlight);
        console.log(trafficlight);
    }
});


app.get('/lamppost', function(request, response) {
    //smartcity.local:8000/lamppost?state=true
    //this opens an API for external app to control real lamp post
    var state = request.query.state;
    //convert string to real booleans
    if (state == 'true')
        state = true;
    else if (state == 'false')
        state = false;
    response.end("Received Lamp Post State: " + state);
    toggleRealLampPost(state);
    toggleFakeLampPost(2,state);
});

app.get('/states', function(request, response) {
	console.log("Testing.");
	var JSONres = {
		states: lamp_states
	};
	
	//console.log("testing with log");
	console.log(JSONres);
    response.json(JSONres); 
});

app.get('/toggleState', function(request, response) {
	//http://localhost:55555/toggleState?state=true&index=0
	var state = request.query.state;
	var index = request.query.index;
	var JSONres = {
		index: index,
		state: state
	};
	
	if (state == 'true')
        state = true;
    else if (state == 'false')
        state = false;
    //toggleRealLampPost(state);
    toggleFakeLampPost(index,state);
	console.log("Received state: " + state + ", index: " + index);
	
	response.json(JSONres); //Send an OK response
	
});

function toggleRealLampPost(state) {
    if (state == true) {
        var url = "http://mylinkit.local:8001/?value=high"
    } else if (state == false) {
        var url = "http://mylinkit.local:8001/?value=low"
    }
    try{
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
    catch(err){
        console.log(err);
    }

}

function toggleFakeLampPost(id, state){
    //turn on/off the correct lamppost by id
    var pin = lamp_pins[id];
	
    board.digitalWrite(pin, state);

    //remember the states of the lamppost
    lamp_states[id] = state;
    io.emit("lamp_states", lamp_states);
}

function notifySpeeding(){
    var state = true;
    var counter = 0;
    var speed_trigger = setInterval(function (){
        counter = counter + 1;

        if (state == true) {
            // board.pinMode(boot_pin, board.MODES.OUTPUT);
            board.digitalWrite(7, true);
            var url = "http://mylinkit.local:8001/?value=high"
        } else if (state == false) {

            board.digitalWrite(7, false);
            var url = "http://mylinkit.local:8001/?value=low"
        }
        //DELETE THIS BLOCK IF LAMPPOST IS DOWN!!!!
        //PANIC MODE STARTS HERE
        try{
            request(url, function(error, response, body) {
                // console.log('error:', error); // Print the error if one occurred
                // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                // console.log('body:', body); // Print the HTML for the Google homepage.
            });
        }
        catch(err){
            console.log(err);
        }
        //PANIC MODE ENDS HERE
        state = !state
        if(counter == 10){
            // return;
            clearInterval(speed_trigger);
            toggleRealLampPost(lamp_states[3]);
            board.digitalWrite(7, lamp_states[2]);
        }
    },200);
}

