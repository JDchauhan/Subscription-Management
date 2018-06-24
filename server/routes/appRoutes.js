'use strict';
module.exports = function(app) {
    var mongoose = require('mongoose');
    var Vendor = require('../models/vendorModel');
    var User = require('../models/userModel');

    Vendor = mongoose.model('vendor');

    var jwt = require('jsonwebtoken');
    var bcrypt = require('bcryptjs');
    var config = require('../config');
    var VerifyToken = require('./VerifyToken');

    var User = {};
    var arr = [];

    Vendor.find({},function(err, vendors){
        if(err)
          res.send({"err": "unexpectedError", "code": "404"});
        
        vendors.forEach(vendor => {
          arr.push(vendor._id);
          var User1 = require('../models/userModel')(vendor._id);
          var User1 = mongoose.model('v' + vendor._id + 'user');
          User[vendor._id] = User1;
        });
        console.log(arr);
        console.log("API is ready to use now!");
      });
    

    // Routes
    app.get("/", function(req, res){
        res.send({statusCode: 200, status: "OK"});
    });

    app.get('/logout', function(req, res) {
        res.send({statusCode: 200, auth: false, token: null});
    });

    app.get("/vendors/secret", VerifyToken, function(req, res) {
        if(req.userId.length !== 24){
            return res.send({statusCode: 500, auth: false, message: 'Failed to authenticate token.'});
        }
        Vendor.findById(req.userId, 
            { password: 0 }, // projection
            function (err, vendor) {
                if (err) return res.send({statusCode: 500, status: "There was a problem finding the user"}); 
                if (!vendor) return res.send({statusCode: 404, status: "No User Found"});
                
                return res.send({statusCode: 200, vendor: vendor});
        });
    });

    app.post("/vendors/register", function (req, res){
        var hashedPassword = bcrypt.hashSync(req.body.password, 8);
    
        Vendor.create({
            username: req.body.username, password: hashedPassword, name: req.body.name, email: req.body.email,
            mobile: req.body.mobile, country: req.body.country, state: req.body.state,
            city: req.body.city, pincode: req.body.pincode
        },
        function (err, vendor) {
            if (err){
                if((err.name && err.name == "UserExistsError") || (err.code && err.code == 11000)){
                    return res.send({"statusCode":500, "status":"UserExistsError", "index":""});
                }else if(err.name && err.name == "ValidationError"){
                    return res.send({"statusCode":500, "status":"ValidationFailed", "index":Object.keys(err.errors)});
                }else if(err.name && err.name == "CastError"){
                    return res.send({"statusCode":500, "status":"CastError", "index":err.path});
                }else{
                    console.log(err);
                    return res.send({"statusCode":500, "status":"UnexpectedError"});
                }
            }
            // create a token
            var token = jwt.sign({ id:vendor._id }, config.secret, {
                expiresIn: 86400 // expires in 24 hours
            });
          
            arr.push(vendor._id);
            var User1 = require('../models/userModel')(vendor._id);
            var User1 = mongoose.model('v' + vendor._id + 'user');
            User[vendor._id] = User1;
            
            res.send({statusCode: 200, auth: true, token: token});
        });
    });

    app.post("/vendors/login", function (req, res){
        Vendor.findOne({ username: req.body.username }, function (err, vendor) {
            if (err) return res.send({statusCode: 500, status: "Error on the server"});
            if (!vendor) return res.send({statusCode: 404, status: "No User Found"});
            var passwordIsValid = bcrypt.compareSync(req.body.password, vendor.password);
            if (!passwordIsValid) return res.send({statusCode: 401, auth: false, token: null});
            var token = jwt.sign({ id: vendor._id }, config.secret, {
               expiresIn: 86400 // expires in 24 hours
            });
            res.send({statusCode: 200, auth: true, token: token});
        });
    });


    // user Routes
    app.post("/users/register", function (req, res){
        var hashedPassword = bcrypt.hashSync(req.body.password, 8);
        if(req.body.v_id.length !== 24){
            return res.send({"statusCode":422, "status":"Unprocessable Entity", message:"Incorrect v_id"});
        }
        var v_id = mongoose.Types.ObjectId(req.body.v_id);
        var UserConstructor = User[v_id];

        UserConstructor.create({
            username: req.body.username, password: hashedPassword,
            name: req.body.name, email: req.body.email, mobile: req.body.mobile,
            country: req.body.country, state: req.body.state, city: req.body.city,
            pincode: req.body.pincode
        },
        function (err, user) {
            if (err){
                if((err.name && err.name == "UserExistsError") || (err.code && err.code == 11000)){
                    return res.send({"statusCode":500, "status":"UserExistsError", "index":""});
                }else if(err.name && err.name == "ValidationError"){
                    return res.send({"statusCode":500, "status":"ValidationFailed", "index":Object.keys(err.errors)});
                }else if(err.name && err.name == "CastError"){
                    return res.send({"statusCode":500, "status":"CastError", "index":err.path});
                }else{
                    console.log(err);
                    return res.send({"statusCode":500, "status":"UnexpectedError"});
                }
            }
            // create a token
            var token = jwt.sign({ id: v_id + user._id }, config.secret, {
                expiresIn: 86400 // expires in 24 hours
            });
            res.send({statusCode: 200, auth: true, token: token});
        });
    });

    app.post("/users/login", function (req, res){
        if(req.body.v_id.length !== 24){
            return res.send({"statusCode":422, "status":"Unprocessable Entity", message:"Incorrect v_id"});
        }
        var v_id = mongoose.Types.ObjectId(req.body.v_id);
        var UserConstructor = User[v_id];

        UserConstructor.findOne({ username: req.body.username }, function (err, user) {
            if (err) return res.send({statusCode: 500, status: "Error on the server"});
            if (!user) return res.send({statusCode: 404, status: "No User Found"});
            var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
            if (!passwordIsValid) return res.send({statusCode: 401, auth: false, token: null});
            var token = jwt.sign({ id: v_id + user._id }, config.secret, {
               expiresIn: 86400 // expires in 24 hours
            });
            res.send({statusCode: 200, auth: true, token: token});
        });
    });

    app.get("/users/secret", VerifyToken, function(req, res) {

        if(req.userId.length !== 48){
            return res.send({statusCode: 500, auth: false, message: 'Failed to authenticate token.'});
        }
        var v_id = mongoose.Types.ObjectId(req.userId.substr(0,24));
        req.userId = mongoose.Types.ObjectId(req.userId.substr(24,48));
        var UserConstructor = User[v_id];

        UserConstructor.findById(req.userId, 
            { password: 0 }, // projection
            function (err, user) {
                if (err) return res.send({statusCode: 500, status: "There was a problem finding the user"}); 
                if (!user) return res.send({statusCode: 404, status: "No User Found"});
                
                res.send({statusCode: 200, user: user});
        });
    });

    app.get('users/logout', function(req, res) {
        res.send({statusCode: 200, auth: false, token: null});
    });


    app.get('*', function(req, res) {
        res.send({statusCode: 404, status: "Not Found"});
    });

    app.post('*', function(req, res) {
        res.send({statusCode: 404, status: "Not Found"});
    });

};  