import socketio


# ============================================================
# USER TOKENS
# ============================================================

# User 9 = customer
# Get a fresh access token by logging in as the customer.
CUSTOMER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc5MDI0ODI5NSwianRpIjoiNzQwNGEwM2UtZDFmNy00YWQwLTg5YzctOGQ0YThkYjgzZmRmIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjkiLCJuYmYiOjE3OTAyNDgyOTUsImNzcmYiOiJlOTFjYWZjNi05YTBlLTQ1YTAtYmYyNS1iZDgzZjFiYzU0ODQiLCJleHAiOjE3OTAyNDkxOTV9.F1KqUFxiVRA4EtnrtD_S04r4x7Wz7cIikGcYnTXtUz4"


# User 8 = tour operator
# Get a fresh access token by logging in as the tour operator.
OPERATOR_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc5MDI0ODMzNywianRpIjoiNzE3YmE2MTUtMDZlZS00YTU2LWJjYTQtZmRlNzY4ZjY3N2M4IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjgiLCJuYmYiOjE3OTAyNDgzMzcsImNzcmYiOiJhMmNkODc4Zi03NDA3LTRhNmItODc0Yy0wYmZiNjI4OTc3MzQiLCJleHAiOjE3OTAyNDkyMzd9.ugco6WEtgE_lLBbnU66GEmCDyXnQ6ks69yMpDBvO2Fs"


# ============================================================
# CUSTOMER SOCKET.IO CLIENT
# ============================================================

customer = socketio.Client()


@customer.event
def connect():
    print("\n🟢 CUSTOMER CONNECTED")

    # Customer joins Conversation 1
    customer.emit("join_conversation", {
        "conversation_id": 1
    })

@customer.on("new_notification")
def customer_new_notification(data):

    print("\n🔔 CUSTOMER RECEIVED NOTIFICATION:")
    print(data)    


@customer.on("joined_conversation")
def customer_joined(data):
    print("👤 Customer joined conversation:")
    print(data)


@customer.on("new_message")
def customer_new_message(data):
    print("\n💬 CUSTOMER RECEIVED MESSAGE:")
    print(data)


@customer.on("messages_read")
def customer_messages_read(data):
    print("\n👀 CUSTOMER MARKED MESSAGES AS READ:")
    print(data)


@customer.on("user_read_messages")
def customer_user_read(data):
    print("\n👀 CUSTOMER RECEIVED READ RECEIPT:")
    print(data)


@customer.on("error")
def customer_error(data):
    print("\n❌ CUSTOMER ERROR:")
    print(data)    


@customer.event
def disconnect():
    print("\n🔴 CUSTOMER DISCONNECTED")


# ============================================================
# OPERATOR SOCKET.IO CLIENT
# ============================================================

operator = socketio.Client()


@operator.event
def connect():
    print("\n🔵 OPERATOR CONNECTED")

    # Operator joins Conversation 1
    operator.emit("join_conversation", {
        "conversation_id": 1
    })

@operator.on("new_notification")
def operator_new_notification(data):

    print("\n🔔 OPERATOR RECEIVED NOTIFICATION:")
    print(data)    


@operator.on("joined_conversation")
def operator_joined(data):
    print("👤 Operator joined conversation:")
    print(data)


"""@operator.on("new_message")
def operator_new_message(data):
    print("\n💬 OPERATOR RECEIVED MESSAGE:")
    print(data)"""


@operator.on("new_message")
def operator_new_message(data):

    print("\n💬 OPERATOR RECEIVED MESSAGE:")
    print(data)

    # Operator has received and read the message.
    operator.emit("mark_messages_read", {
        "conversation_id": 1
    })


@operator.on("messages_read")
def operator_messages_read(data):
    print("\n👀 OPERATOR MARKED MESSAGES AS READ:")
    print(data)


@operator.on("user_read_messages")
def operator_user_read(data):
    print("\n👀 OPERATOR RECEIVED READ RECEIPT:")
    print(data)


@operator.on("error")
def operator_error(data):
    print("\n❌ OPERATOR ERROR:")
    print(data)    


@operator.event
def operator_disconnect():
    print("\n🔴 OPERATOR DISCONNECTED")


# ============================================================
# CONNECT CUSTOMER
# ============================================================

print("🔌 Connecting customer...")

customer.connect(
    "http://localhost:5000",
    auth={
        "access_token": CUSTOMER_TOKEN
    }
)


# ============================================================
# CONNECT OPERATOR
# ============================================================

print("🔌 Connecting operator...")

operator.connect(
    "http://localhost:5000",
    auth={
        "access_token": OPERATOR_TOKEN
    }
)


# ============================================================
# SEND MESSAGE FROM CUSTOMER
# ============================================================

print("\n📨 Customer sending message...")

customer.emit("send_message", {
    "conversation_id": 1,
    "content": "Hello Martha! This is a live customer message. 🦁⚡"
})


# ============================================================
# KEEP CONNECTIONS ALIVE
# ============================================================

customer.wait()