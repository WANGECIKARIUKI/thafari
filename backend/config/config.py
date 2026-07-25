"""Configuration file
purpose: store configuration settings.
responsibilities: keep sensitive data from being accessible.  2. configure flask.  3. Load environment variables"""

#import the operation system module; helps read the environment variable

import os

#import load_dotenv helps read the .env files

from dotenv import load_dotenv

#read/load environment variable from .env file

load_dotenv()

#create a class for configuration, this also helps in storing application settings

class Config:
#create the env settings
#Secret key for security
    SECRET_KEY = os.getenv("SECRET_KEY")

#database configs
    DB_HOST = os.getenv("DB_HOST")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_PORT = os.getenv("DB_PORT")

#sqlalchemy connection string(build the database sqlalchemy to connect with msql)
    SQLALCHEMY_DATABASE_URI = (
    #f is an f string
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@"
    f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

#disable modification for high performance
SQLALCHEMY_TRACK_MODIFICATIONS = False
