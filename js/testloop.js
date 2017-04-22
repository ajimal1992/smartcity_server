var state = true;
    for(var i = 0 ; i < 10 ; i++){
        setTimeout(function (){
            if (state == true) {
                //var url = "http://mylinkit.local:8001/?value=high"
		console.log("true");
            } else if (state == false) {
		console.log("false");
                //var url = "http://mylinkit.local:8001/?value=low"
            }
            //request(url, function(error, response, body) {
                // console.log('error:', error); // Print the error if one occurred
                // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                // console.log('body:', body); // Print the HTML for the Google homepage.
            //});
            state = !state

            //update the client of the lamppost states
        },2000);
    }
      //stopr

