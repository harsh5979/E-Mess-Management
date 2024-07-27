const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
    username:{
        type:String,
        required:true
    },

    password:{
        type:String,
        required:true
    },
    isadmin:{
        type:Boolean,
        default:true
    }

})

module.exports = new mongoose.model("AdminUser",UserSchema);