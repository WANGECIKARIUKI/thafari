"""
run.py file
purpose:
i. Start the Thafari application server.
"""

# Import the function that creates and configures the Flask application
from app import create_app

# Import the Socket.IO instance
from extensions import socketio


# Create the Flask application
app = create_app()


# Start the server
if __name__ == "__main__":

    # Start the application using Flask-SocketIO
    socketio.run(
        app,
        debug=True
    )