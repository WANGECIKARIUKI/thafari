import socketio


# ============================================================
# SOCKET.IO TEST CONFIGURATION
# ============================================================

# Put the latest access token from your login response here.
#
# IMPORTANT:
# Do not send your actual token in the chat.
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc5MDE5MzM0MCwianRpIjoiMDQyYjUyN2MtY2I1OS00ZDk3LWE3YmMtOWQ3MzJjMjliNjBkIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjkiLCJuYmYiOjE3OTAxOTMzNDAsImNzcmYiOiI0MjY0MmQ4ZC00YTcwLTQ0Y2ItOTU5OC01ZjdjOTUxOTQ5OWIiLCJleHAiOjE3OTAxOTQyNDB9.2LeuwXlIQl9oYT10u425mrcqLcBjT-z9Is93PkRHAUI"


# Create a Socket.IO client.
sio = socketio.Client()


# ============================================================
# CONNECTION
# ============================================================

@sio.event
def connect():

    print("✅ Connected to Thafari Socket.IO server!")

    # Join Conversation 1.
    #
    # Notice that we DO NOT send the access token here.
    # Authentication already happened when the connection
    # was established.
    sio.emit("join_conversation", {
        "conversation_id": 1
    })


# ============================================================
# JOINED CONVERSATION
# ============================================================

@sio.on("joined_conversation")
def joined_conversation(data):

    print("🎉 Joined conversation:")
    print(data)

    # Send a message after successfully joining
    # the conversation.
    sio.emit("send_message", {
        "conversation_id": 1,
        "content": "Hello from authenticated Socket.IO! 🦁⚡"
    })


# ============================================================
# NEW MESSAGE
# ============================================================

@sio.on("new_message")
def new_message(data):

    print("💬 New message received:")
    print(data)

    # Mark the conversation as read
    # after receiving the message.
    sio.emit("mark_messages_read", {
        "conversation_id": 1
    })

# ============================================================
# MESSAGES READ
# ============================================================

@sio.on("messages_read")
def messages_read(data):

    print("👀 Messages marked as read:")
    print(data)


# ============================================================
# USER READ MESSAGES
# ============================================================

@sio.on("user_read_messages")
def user_read_messages(data):

    print("👀 Another participant read the conversation:")
    print(data)    


# ============================================================
# SOCKET ERROR
# ============================================================

@sio.on("error")
def socket_error(data):

    print("❌ Socket error:")
    print(data)


# ============================================================
# DISCONNECT
# ============================================================

@sio.event
def disconnect():

    print("🔌 Disconnected from server")


# ============================================================
# CONNECT TO THAFARI
# ============================================================

sio.connect(
    "http://localhost:5000",

    # Send the JWT during the Socket.IO
    # connection handshake.
    auth={
        "access_token": ACCESS_TOKEN
    }
)


# Keep the Socket.IO connection alive
# so we can receive events.
sio.wait()