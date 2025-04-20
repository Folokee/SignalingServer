const http = require('http');
const socket = require('websocket').server;
const server = http.createServer(()=>{});

server.listen(3700,"0.0.0.0",()=>{
    console.log('Server is running on port 3700');
})

const webSocket = new socket({httpServer : server});

const users = []

/*
user struct :
{
    email: String,
    connection: WebSocketConnection
}

*/

webSocket.on('request',(request)=>{
    const conn = request.accept()
    conn.on('message',(message)=>{
        const data = JSON.parse(message.utf8Data)
        console.log(data)
        switch(data.type){
            case "store_user":
                /* ===============================
                message struct:
                {
                    type: "store_user",
                    email: String
                }
                ==================================
                */
                const user = findUser(data.email)
                if (user != null){
                    //user already exists
                    conn.send(JSON.stringify({type: "store_response",status : "error", message : "User already exists"}))
                    return;
                }

                const newUser = {
                    email: data.email,
                    connection: conn
                }
                users.push(newUser)
                conn.send(JSON.stringify({type: "store_response", data : "User added successfully"}))
            break;
            case "start_call":
                /* ===============================
                message struct:
                {
                    type: "start_call",
                    target: Email of person to call,
                }
                ==================================
                */
                let userToCall = findUser(data.target)
                if (userToCall){
                    conn.send(JSON.stringify({
                        type : "call_response",
                        data : "user is online",
                    }))
                } else {
                    conn.send(JSON.stringify({
                        type : "call_response",
                        data : "user is not online"
                    }))
                }
            break;
            case "create_offer":
                /* ===============================
                message struct:
                {
                    type: "create_offer",
                    target: Email of person to call,
                    data : {
                        sdp : String
                    }
                }
                ==================================
                */
                let targetUser = findUser(data.target)
                if (targetUser) {
                    targetUser.connection.send(JSON.stringify({
                        type : "offer_received",
                        email: data.email, 
                        data : data.data.sdp
                    }))
                }
            break;
            case "create_answer":
                /* ===============================
                message struct:
                {
                    type: "create_answer",
                    target: Email of person who called,
                    data : {
                        sdp : String
                    }
                }
                ==================================
                */
                let userToRepond = findUser(data.target)
                if (userToRepond) {
                    userToRepond.connection.send(JSON.stringify({
                        type : "answer_received",
                        email: data.email,
                        data : data.data.sdp
                    }))
                }
            break;

            case "ice_candidate":
                /* ===============================
                message struct:
                {
                    type: "ice_candidate",
                    target: Email of person to call,
                    data : {
                        sdpMLineIndex : Number,
                        sdpMid : String,
                        sdpCandidate : String
                    }
                }
                ==================================
                */
                const userToReceiveIce = findUser(data.target)
                if (userToReceiveIce) {
                    userToReceiveIce.connection.send(JSON.stringify({
                        type : "ice_candidate",
                        email: data.email,
                        data : {
                            sdpMLineIndex : data.data.sdpMLineIndex,
                            sdpMid : data.data.sdpMid,
                            sdpCandidate : data.data.sdpCandidate
                        }
                    }))
                }
            

        }
    })
    //remove user once he disconnects
    conn.on('close', () =>{
        users.forEach(user => {
            if (user.connection === conn) {
                users.splice(users.indexOf(user), 1)
                console.log('Users:', users)
            }
        })
    })

})

const findUser = (email) => {
    for (let i =0; i<users.length; i++) {
        if (users[i].email === email) {
            return users[i];
        }
    }
}