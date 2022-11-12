
var fs = require('fs');
var crypto = require("crypto");


module.exports = function (socket) {
    // Create a Socket.IO instance, passing it our server
    var listOfAllSockets = [];
    var listOfWaitingSockets = [];
    var runningGames = [];

    console.log("Connected to socket.io")
    // Add a connect listener
    socket.on('connection', function (client) {
        console.log('Connection to client established  ', client.id);

        var regiData = "somedata";
        client.emit('registerPlayer', regiData);


        // Success!  Now listen to messages to be received
        client.on('chat', function (event) {
            console.log('Received message from client on room : ', client.rooms, " and event is : ", event);
            var currentRoom = Object.keys(client.rooms)[1];
            socket.to(currentRoom).emit("chat", event);

        });

        client.on('beep1', function (event) {
            // console.log(' beep received : '  );

            client.emit('boop1', event);

        });

        client.on('registerPlayer', function (event) {
            console.log("register recd : ", event);
            console.log('Register recieved of : ', event.deviceID, " with criteria : ", event.matchMakeCriteria);
            client.deviceID = event.deviceID;
            client.matchMakeCriteria = event.matchMakeCriteria;

            MatchMake(client);

        });

        client.on('disconnect', function (reason) {
            console.log({ reason })
            console.log('Server has disconnected');
            OnDisconnect(client);
        });
    });


    function MatchMake(client) {
        /*
           var isPrevGameRunning = false;
            runningGames.forEach(element => {
                console.log("this game is found : " , element);
    
                element.connectedDeviceId.forEach(element1 => {
    
                    if (element1 == client.deviceID)
                    {
                        isPrevGameRunning = true;
    
                        client.join(element.name, ()=> {
                            client.joinedRoom = true;
                            client.roomID = element.name;
                            listOfAllSockets.push(client  );
    
                            console.log("connected to same room");
                        });
                       return;
                    }
    
                });
    
                if (isPrevGameRunning == true)
                {
                    return;
                }
    
            });
    
            if (isPrevGameRunning == true)
            {
                return;
            }
        */
        var isAlreadyPresent = false;
        listOfWaitingSockets.forEach(element => {
            if (element.deviceID == client.deviceID) {
                console.log("device id mathced at waitng :  ", element.deviceID);
                isAlreadyPresent = true;
            }

        });

        if (isAlreadyPresent == true) {
            return;
        }

        listOfAllSockets.forEach(element => {
            if (element.deviceID == client.deviceID) {
                console.log("device id mathced at all :  ", element.deviceID);

                isAlreadyPresent = true;
            }

        });

        if (isAlreadyPresent == true) {
            return;
        }


        var matchAvailable = false;

        listOfWaitingSockets.forEach(element => {
            console.log(client.deviceID + " with matchMakeCriteria " + client.matchMakeCriteria + " comparing with " + element.matchMakeCriteria);
            if (element.matchMakeCriteria == client.matchMakeCriteria && element.id != client.id && element.joinedRoom == true) {

                matchAvailable = true;

                client.join(Object.keys(element.rooms)[1], () => {
                    let rooms = Object.keys(client.rooms);
                    console.log(" new second user has joined the room ", rooms);
                    client.joinedRoom = true;
                    client.roomID = Object.keys(element.rooms)[1];
                    listOfAllSockets.push(element);
                    listOfAllSockets.push(client);
                    //   var game={};
                    // game.name = Object.keys(element.rooms)[1];
                    //game.connectedDeviceId =[element.deviceID , client.deviceID];

                    //runningGames.push(game);

                    var index1 = listOfWaitingSockets.indexOf(element);
                    listOfWaitingSockets.splice(index1, 1);

                    var jsonObject = new Object;

                    jsonObject.owner = client.deviceID;;
                    var jsonString = JSON.stringify(jsonObject);
                    console.log(jsonObject)
                    socket.to(Object.keys(element.rooms)[1]).emit("GameStart", jsonObject);




                    return;

                });

            }


        });

        if (matchAvailable == false) {
            client.join(crypto.randomBytes(15).toString('hex'), () => {

                let rooms = Object.keys(client.rooms);
                console.log(" new first user has joined the room ", rooms);
                client.joinedRoom = true;
                client.roomID = Object.keys(client.rooms)[1];
                listOfWaitingSockets.push(client);
            });
        }
    }


    function OnDisconnect(client) {
        console.log("somebody disconnected");
        listOfWaitingSockets.forEach(element => {
            if (element.id == client.id) {
                listOfWaitingSockets.splice(listOfWaitingSockets.indexOf(element), 1);
                console.log("found at waiting");

            }


        });


        listOfAllSockets.forEach(element => {
            if (element.id == client.id) {

                var data = "SombodyLeft";

                console.log("found at all");

                socket.to(element.roomID).emit("OpponentLeft", data);
                console.log("Opponent Left emmited to : ", element.roomID);

                listOfAllSockets.splice(listOfAllSockets.indexOf(element), 1);

                //return;
                //broadcasts

            }


        });

        var indices = [];
        listOfWaitingSockets.forEach(element => {
            if (element.deviceID == client.deviceID) {
                indices.push(listOfWaitingSockets.indexOf(element));

            }
        });

        indices.forEach(element => {

            listOfWaitingSockets.splice(element, 1);

        });

        indices = [];

        listOfAllSockets.forEach(element => {
            if (element.deviceID == client.deviceID) {
                indices.push(listOfAllSockets.indexOf(element));

            }
        });

        indices.forEach(element => {

            listOfAllSockets.splice(element, 1);

        });
    }
}