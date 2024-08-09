const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        require:true
    },
    name:{
        type:String,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    publicId:{
        type:String,
        required:true
    },
    carouselImages:[],
    discount:{
        type:Number,
        required:true
    },
    locality:{
        type: String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

const Product = mongoose.model("Product",productSchema);

module.exports = Product;

