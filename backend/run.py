"""
run.py file
purpose: i. to start the application(server)
"""

#import the function that creates and configures the flask application

from app import create_app

#create an instance of the function

app = create_app()

#start the server
if __name__ == "__main__":
    app.run(debug=True)