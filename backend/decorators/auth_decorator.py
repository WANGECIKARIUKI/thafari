from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import Flask, jsonify
from models.user import User

#the function means the admin is required to perform the function
#def admin_required():
    #def decorator(fn): #fn means function

        #create a wraps decorator: acts as a protector of the main function
        #@wraps(fn)
        #def wrapper(*args, **kwargs):
            #current_user_id = get_jwt_identity()
            #user = User.query.filter_by(id=current_user_id).first()
            #if user.role != "admin":
                #return jsonify({
                    #"message": "Access denied!"
                #}), 403

            #return fn(*args, **kwargs)
        #return wrapper
    #return decorator

#function that accepts more than one role
def roles_required(*roles): # collects all the roles available 
    #this receives the function that is being decorated
    def decorator(fn):
        #protects the main function
        @wraps(fn)
        #receives the function that is being wrapped
        def wrapper(*args, **kwargs):
            #get the user id from jwt token
            current_user_id = get_jwt_identity()
            #find user in the database
            user = User.query.filter_by(id=current_user_id).first()
            #if the user does not exist
            if not user:
                return jsonify({
                    "message": "User not found!"
                }), 404
            if user.role not in roles: # to check if the role is on the list of roles provided
                return jsonify({
                    "message": "Access denied!"
                }), 403
                #if user is authorized continue to the main function
            return fn(*args, **kwargs)
            #return the wrapper function
        return wrapper
        #return the decorator function
    return decorator               
