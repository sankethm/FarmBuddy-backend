
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const app = express();
const port = 80;
const cors = require("cors");
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");




mongoose.connect("mongodb+srv://sharadarh:sharada@cluster0.gl2pbgk.mongodb.net/").then(() => {
    console.log("connected to MongoDB")
}).catch((err) => {
    console.log("Error connecting to MongoDB", err)
})

cloudinary.config({
    cloud_name:"dseybsbxn",
    api_key:"973468177515389",
    api_secret:"T_7NyTilRWFEQTD55prrMW14LTE"
})

app.listen(port, () => {
    console.log("server is running on port 8000")
})

const User = require("./models/user");
const Order = require("./models/order");
const Product = require("./models/product");

async function handleUpload(file){

    const res = await cloudinary.uploader.upload(file)
    .then((res)=>{console.log("in",res)}).catch((error)=>{console.log("err",error)})
    console.log("res",res)
    return res;
}

const storage = new multer.memoryStorage();
const upload = multer({storage});

const sendVerificationEmail = async (email, verificationToken, res) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            //user:"sharadahiremath777@gmail.com",
            //pass:"ypgv bkeb uvpl yqf"
            user: "hmsanket.926@gmail.com",
            pass: "izrc fwpc llii soap"
        }
    })

    const mailOptions = {
        from: "FarmBuddy",
        to: email,
        subject: "Email Verification",
        text: `Please click the following link to verify your email : http://192.168.43.129:8000/verify/${verificationToken}`
    }

    try {
        await transporter.sendMail(mailOptions)
        res.status(200).json({ message: "Registered Successfully" });
    } catch (error) {
        console.log("Error sending verification email", error)
    }
}

app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const newUser = new User({ name, email, password });

        newUser.verificationToken = crypto.randomBytes(20).toString("hex");

        await newUser.save();

        sendVerificationEmail(newUser.email, newUser.verificationToken, res);

    } catch (error) {
        console.log("error registering user", error);
        res.status(500).json({ message: "Registration failed" })
    }
})

app.get("/verify/:token", async (req, res) => {
    try {
        const token = req.params.token;

        const user = await User.findOne({ verificationToken: token })

        if (!user) {
            return res.status(404).json({ message: "Invalid Verificatin Token" })
        }

        user.verified = true;
        user.verificationToken = undefined;

        await user.save();

        res.status(200).json({ message: "Email Verified Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Email Verification Failed" })
    }
});

const generateSecretKey = () => {
    const secretKey = crypto.randomBytes(32).toString("hex");
    return secretKey;
}

const secretKey = generateSecretKey();

//endpoint to login the user!
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        //check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        //check if password is correct
        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid password" });
        }

        //generate a token
        const token = jwt.sign({ userId: user._id }, secretKey);
        res.status(200).json({ token })
    } catch (error) {
        res.status(500).json({ message: "Login Failed" })
    }
})

app.post("/addresses", async (req, res) => {
    try {
        const { userId, address } = req.body;
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        user.addresses.push(address)
        await user.save();
        res.status(200).json({ message: "Address added successfully" })
    } catch (error) {
        console.log("error",error)
        res.status(500).json({ message: "Error adding address" })
    }
})
//endpoint to get all the addresses of a particular user
app.get("/addresses/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const addresses = user.addresses;
        res.status(200).json({ addresses });
    } catch (error) {
        res.status(500).json({ message: "Error retrieveing the addresses" });
    }
});

//endpoint to store all the orders
app.post("/orders", async (req, res) => {
    try {
        const { userId, cartItems, shippingAddress, paymentMethod,totalPrice } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        //create an array of product objects from the cart Items
        const products = cartItems.map((item) => ({
            name: item.name,
            quantity: parseInt(item.quantity),
            price: parseInt(item.price),
            image: item.image
        }));

        //create a new order
        const order = new Order({
            user: userId,
            products: products,
            totalPrice: totalPrice,
            shippingAddress: shippingAddress,
            paymentMethod: paymentMethod
        })

        await order.save();
        res.status(200).json({ message: "Oredre created successfully!" })


    } catch (error) {
        console.log("error creating orders", error);
        res.status(500).json({ message: "Error creating orders" });
    }
});

//get the user profile
app.get("/profile/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving the user profile" })
    }
});

app.get("/orders/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const orders = await Order.find({ user: userId }).populate("user");
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "No orders found for this user" });
        }

        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({ message: "Error" });
    }
})

app.post("/createProduct",async (req, res)=>{
    try{
        const productData = req.body.product
        const user = await User.findById(productData.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        let carouselImages = [];
        carouselImages.push(productData.imageUrl)
        const product = new Product({
            user: productData.userId,
            name: productData.name,
            quantity:productData.quantity,
            price:productData.price,
            category:productData.category,
            discount:productData.discount,
            locality:productData.locality,
            image:productData.imageUrl,
            publicId:productData.publicId,
            carouselImages:carouselImages
        })

        await product.save();
        res.status(200).json({ message: "Product created successfully!" })

    }catch{
        res.status(500).json({ message: "Error creating product" });
    }
})

app.get("/getAllProducts", async (req, res) => {
    try {
        const products = await Product.find({})
        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ message: "Error retrieveing all products" });
    }
});
app.get("/getAllProducts/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const products = await Product.find({user:userId})
        console.log("...",products)
        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ message: "Error retrieveing all products for the user" });
    }
});

app.post("/deleteImage",async (req, res)=>{
    try{
        
        cloudinary.uploader.destroy(req.body.old_public_id)
        res.status(500).json({ message: "Image replaced" });
    }catch{
        res.status(500).json({ message: "Error creating product" });
    }
})
app.post("/editProduct",async (req, res)=>{
    try{
        const productData = req.body.product
        const product = await Product.findById(productData.productId);
        if (!product) {
            return res.status(404).json({ message: "product not found" })
        }
        let carouselImages = [];
        carouselImages.push(productData.imageUrl)
        const newProduct = {
            name: productData.name,
            quantity:productData.quantity,
            price:productData.price,
            category:productData.category,
            discount:productData.discount,
            locality:productData.locality,
            image:productData.imageUrl,
            publicId:productData.publicId,
            carouselImages:carouselImages
        }

        await Product.findByIdAndUpdate({_id:productData.productId},{...newProduct})
        res.status(200).json({ message: "Product edited successfully!" })

    }catch{
        res.status(500).json({ message: "Error in editing product" });
    }
})

app.post("/deleteProduct",async (req, res)=>{
    try{
        const productData = req.body.product
        const product = await Product.findById(productData.productId);
        if (!product) {
            return res.status(404).json({ message: "product not found" })
        }

        await Product.findByIdAndDelete({_id:productData.productId})
        await cloudinary.uploader.destroy(productData.publicId)
        res.status(200).json({ message: "Product deleted successfully!" })

    }catch{
        res.status(500).json({ message: "Error in deleting product" });
    }
})
