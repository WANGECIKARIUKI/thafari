#authentication route
#use Blueprint to make the project clean

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (create_access_token, jwt_required, get_jwt_identity)
from sqlalchemy import or_
from extensions import db
from models.user import User
from decorators.auth_decorator import roles_required

#create blueprint
auth_bp = Blueprint(
    "auth",
    __name__
)

#register end point
#@ is a decorator
@auth_bp.route("/register", methods=["POST"])
def register():
    #receive data sent from the client/postman
    data = request.get_json()
    #extract individual data
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    #validate first_name
    if not first_name:
        return jsonify({
            "message": "First name is required"
        }), 400

    #validate last_name
    if not last_name:
        return jsonify({
            "message": "Last name is required."
        }), 400

    #validate password
    if not password:
        return jsonify({
            "message": "Password is required."
        }), 400

    #validate username
    if not username:
        return jsonify({
            "message": "Username is required."
        }), 400       

    #validate email
    if not email:
        return jsonify({
            "message": "Email is required."
        }), 400  

    if not role:
        return jsonify({
            "message": "Role is required."
        }), 400     

#check if email exists
    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        return jsonify({
        "message": "email already exists."
        }), 400

#check if username exists
    existing_username = User.query.filter_by(username=username).first()
    if existing_username:
        return jsonify({
        "message": "username already exists"
        }), 400

#create a new user
    new_user = User(
        first_name=first_name,
        last_name=last_name,
        username=username,
        email=email,
        role=role
    )
    #hash the password
    new_user.set_password(password)

    #save user to the database
    db.session.add(new_user)
    db.session.commit()
    #return successful message
    return jsonify({
        "message": "New user registered."
    }), 201

#login endpoint
@auth_bp.route("/login", methods=["POST"])
def login():
    #receive login data
    data = request.get_json()

    #extract login credentials
    login = data.get("login")
    password = data.get("password")

     #validations
    if not login:
        return jsonify({
            "message": "Email or Username is required."
        }), 400

    if not password:
        return jsonify({
            "message": "Password is required."
        }), 400

    #check if user exists using email or username
    user = User.query.filter(or_(
        User.email == login,
        User.username == login
    )).first()
    if not user:
        return jsonify({
            "message": "invalid email/username or password."
        }), 401
    #check password    
    if not user.check_password(password):
        return jsonify({
            "message": "invalid email/username or password."
        }), 401

    #create access token(JWT)
    access_token = create_access_token(
        identity=str(user.id)
    )

    return jsonify({
        "message": "login successful!",
        "access_token": access_token,
        "user":{
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }), 200

#get logged in user & create protected api

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
@roles_required()
def get_me():
    '''def get_current_user_id():
        return int(get_jwt_identity())'''
    current_user_id = int(get_jwt_identity())
    #find user that is logged in
    user = User.query.filter_by(id=current_user_id).first()
    #authorization logic

    if user.role not in roles_required:
        return jsonify({
            "message": "Access denied!"
        }), 403
    return jsonify({
        "user":{
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "email": user.email,
        "phone_number": user.phone_number,
        "role": user.role,
        "is_verified": user.is_verified
    }}), 200

